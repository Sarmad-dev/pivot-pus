/**
 * Data Enrichment Service
 * 
 * Combines campaign and market data into enriched datasets
 * Implements data quality scoring, validation, and fallback mechanisms
 */

import {
  CampaignDataset,
  MarketDataset,
  EnrichedDataset,
  ExternalAPIData,
  DataQualityScore,
  ValidationResult,
  MarketContext,
  ExternalDataSource
} from "../../../types/simulation";
import { Id } from "../../../../convex/_generated/dataModel";
import { CampaignDataAggregator } from "./CampaignDataAggregator";
import { MarketDataAggregator } from "./MarketDataAggregator";
import { dataQualityValidator } from "../validation";
import { InsufficientDataError, DataValidationError, errorHandler } from "../errors";

export interface DataEnrichmentConfig {
  enableMarketData: boolean;
  enableExternalAPIs: boolean;
  fallbackToCache: boolean;
  minDataQualityThreshold: number;
  maxEnrichmentTimeMs: number;
  requireMinimumDataSources: number;
}

export interface EnrichmentResult {
  dataset: EnrichedDataset;
  enrichmentSummary: {
    sourcesUsed: string[];
    sourcesSkipped: string[];
    dataQualityScore: DataQualityScore;
    enrichmentTime: number;
    fallbacksUsed: string[];
  };
}

export class DataEnrichmentService {
  private config: DataEnrichmentConfig;
  private campaignAggregator: CampaignDataAggregator;
  private marketAggregator: MarketDataAggregator;

  constructor(
    config: Partial<DataEnrichmentConfig> = {},
    campaignAggregator?: CampaignDataAggregator,
    marketAggregator?: MarketDataAggregator
  ) {
    this.config = {
      enableMarketData: true,
      enableExternalAPIs: true,
      fallbackToCache: true,
      minDataQualityThreshold: 0.6,
      maxEnrichmentTimeMs: 30000, // 30 seconds
      requireMinimumDataSources: 1,
      ...config
    };

    this.campaignAggregator = campaignAggregator || new CampaignDataAggregator();
    this.marketAggregator = marketAggregator || new MarketDataAggregator();
  }

  /**
   * Create enriched dataset by combining campaign and market data
   */
  async enrichCampaignData(
    campaignId: Id<"campaigns">,
    externalDataSources: ExternalDataSource[],
    convexQuery: any,
    convexMutation?: any
  ): Promise<EnrichmentResult> {
    const startTime = Date.now();
    const sourcesUsed: string[] = [];
    const sourcesSkipped: string[] = [];
    const fallbacksUsed: string[] = [];

    try {
      // Step 1: Aggregate campaign data
      const campaignDataset = await this.aggregateCampaignData(campaignId, convexQuery);
      sourcesUsed.push('campaign_data');

      // Step 2: Create market context from campaign data
      const marketContext = this.createMarketContext(campaignDataset);

      // Step 3: Aggregate market data (if enabled)
      let marketDataset: MarketDataset = {
        competitorActivity: [],
        seasonalTrends: [],
        industryBenchmarks: [],
        marketVolatility: { overall: 0.5, byChannel: {}, byAudience: {}, factors: [] }
      };

      if (this.config.enableMarketData && externalDataSources.length > 0) {
        try {
          marketDataset = await this.aggregateMarketData(
            marketContext, 
            externalDataSources, 
            convexQuery
          );
          sourcesUsed.push('market_data');
        } catch (error) {
          console.warn('Market data aggregation failed, using fallback:', error);
          sourcesSkipped.push('market_data');
          fallbacksUsed.push('empty_market_data');
        }
      } else {
        sourcesSkipped.push('market_data');
      }

      // Step 4: Fetch external API data (if enabled)
      let externalData: ExternalAPIData[] = [];
      if (this.config.enableExternalAPIs) {
        try {
          externalData = await this.fetchExternalData(marketContext, externalDataSources);
          if (externalData.length > 0) {
            sourcesUsed.push('external_apis');
          }
        } catch (error) {
          console.warn('External API data fetch failed:', error);
          sourcesSkipped.push('external_apis');
          fallbacksUsed.push('no_external_data');
        }
      } else {
        sourcesSkipped.push('external_apis');
      }

      // Step 5: Merge and validate data
      const enrichedDataset = await this.mergeDataSources(
        campaignDataset,
        marketDataset,
        externalData
      );

      // Step 6: Calculate data quality score
      const dataQualityScore = await this.calculateDataQuality(enrichedDataset);

      // Step 7: Validate minimum quality threshold
      await this.validateDataQuality(enrichedDataset, dataQualityScore);

      const enrichmentTime = Date.now() - startTime;

      // Check if enrichment took too long
      if (enrichmentTime > this.config.maxEnrichmentTimeMs) {
        console.warn(`Data enrichment took ${enrichmentTime}ms, exceeding threshold of ${this.config.maxEnrichmentTimeMs}ms`);
      }

      return {
        dataset: enrichedDataset,
        enrichmentSummary: {
          sourcesUsed,
          sourcesSkipped,
          dataQualityScore,
          enrichmentTime,
          fallbacksUsed
        }
      };

    } catch (error) {
      const enrichmentTime = Date.now() - startTime;
      
      // Handle enrichment failure with fallback
      if (this.config.fallbackToCache) {
        const fallbackResult = await this.handleEnrichmentFailure(
          campaignId, 
          error instanceof Error ? error : new Error(String(error)), 
          convexQuery
        );
        
        return {
          dataset: fallbackResult,
          enrichmentSummary: {
            sourcesUsed: ['fallback_cache'],
            sourcesSkipped: sourcesUsed.concat(sourcesSkipped),
            dataQualityScore: await this.calculateDataQuality(fallbackResult),
            enrichmentTime,
            fallbacksUsed: ['complete_fallback']
          }
        };
      }

      throw new DataValidationError(
        `Data enrichment failed: ${error instanceof Error ? error.message : String(error)}`,
        'enrichment_failure',
        { campaignId, error: error instanceof Error ? error.message : String(error), enrichmentTime }
      );
    }
  }

  /**
   * Aggregate campaign data using CampaignDataAggregator
   */
  private async aggregateCampaignData(
    campaignId: Id<"campaigns">,
    convexQuery: any
  ): Promise<CampaignDataset> {
    try {
      return await this.campaignAggregator.aggregateCampaignData(campaignId, convexQuery);
    } catch (error) {
      throw new InsufficientDataError(
        `Failed to aggregate campaign data: ${error instanceof Error ? error.message : String(error)}`,
        ['campaign_data'],
        ['campaign_data']
      );
    }
  }

  /**
   * Create market context from campaign dataset
   */
  private createMarketContext(campaignDataset: CampaignDataset): MarketContext {
    const { campaign, audienceInsights } = campaignDataset;

    // Extract keywords from campaign name, description, and audience interests
    const keywords = [
      ...campaign.name.toLowerCase().split(/\s+/),
      ...campaign.description.toLowerCase().split(/\s+/),
      ...audienceInsights.demographics.interests.map(i => i.toLowerCase())
    ].filter(keyword => keyword.length > 2); // Filter out short words

    // Remove duplicates and common stop words
    const stopWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'];
    const uniqueKeywords = [...new Set(keywords)].filter(k => !stopWords.includes(k));

    // Determine industry from campaign category
    const industryMap: Record<string, string> = {
      'pr': 'public_relations',
      'content': 'content_marketing',
      'social': 'social_media',
      'paid': 'digital_advertising',
      'mixed': 'integrated_marketing'
    };

    // Extract region from audience locations
    const primaryRegion = audienceInsights.demographics.locations[0] || 'US';

    // Generate competitor domains (simplified - in real implementation would be more sophisticated)
    const competitors = this.generateCompetitorList(campaign.category, uniqueKeywords.slice(0, 3));

    return {
      industry: industryMap[campaign.category] || 'general',
      region: primaryRegion,
      timeframe: {
        start: campaign.startDate,
        end: campaign.endDate
      },
      competitors,
      keywords: uniqueKeywords.slice(0, 10) // Limit to top 10 keywords
    };
  }

  /**
   * Generate competitor list based on industry and keywords
   */
  private generateCompetitorList(category: string, keywords: string[]): string[] {
    // This is a simplified implementation
    // In production, this would use a more sophisticated competitor identification system
    const competitorBases: Record<string, string[]> = {
      'pr': ['prweb.com', 'businesswire.com', 'prnewswire.com'],
      'content': ['hubspot.com', 'contentking.com', 'buzzsumo.com'],
      'social': ['hootsuite.com', 'buffer.com', 'sproutsocial.com'],
      'paid': ['google.com', 'facebook.com', 'linkedin.com'],
      'mixed': ['salesforce.com', 'adobe.com', 'oracle.com']
    };

    return competitorBases[category] || ['example.com', 'competitor.com'];
  }

  /**
   * Aggregate market data using MarketDataAggregator
   */
  private async aggregateMarketData(
    marketContext: MarketContext,
    externalDataSources: ExternalDataSource[],
    convexQuery: any
  ): Promise<MarketDataset> {
    try {
      return await this.marketAggregator.fetchMarketData(
        marketContext,
        externalDataSources,
        convexQuery
      );
    } catch (error) {
      console.warn('Market data aggregation failed:', error);
      // Return empty market dataset as fallback
      return {
        competitorActivity: [],
        seasonalTrends: [],
        industryBenchmarks: [],
        marketVolatility: { overall: 0.5, byChannel: {}, byAudience: {}, factors: [] }
      };
    }
  }

  /**
   * Fetch external API data
   */
  private async fetchExternalData(
    marketContext: MarketContext,
    externalDataSources: ExternalDataSource[]
  ): Promise<ExternalAPIData[]> {
    const externalData: ExternalAPIData[] = [];

    // For now, return empty array as external APIs are not fully implemented
    // In production, this would make actual API calls to configured sources
    
    return externalData;
  }

  /**
   * Merge campaign, market, and external data into enriched dataset
   */
  private async mergeDataSources(
    campaignDataset: CampaignDataset,
    marketDataset: MarketDataset,
    externalData: ExternalAPIData[]
  ): Promise<EnrichedDataset> {
    // Calculate initial data quality score
    const dataQuality = await this.calculateDataQuality({
      ...campaignDataset,
      marketData: marketDataset,
      externalData,
      dataQuality: { completeness: 0, accuracy: 0, freshness: 0, consistency: 0, overall: 0 }
    });

    return {
      ...campaignDataset,
      marketData: marketDataset,
      externalData,
      dataQuality
    };
  }

  /**
   * Calculate comprehensive data quality score
   */
  private async calculateDataQuality(dataset: EnrichedDataset): Promise<DataQualityScore> {
    // Calculate individual quality components
    const completeness = this.calculateCompleteness(dataset);
    const accuracy = this.calculateAccuracy(dataset);
    const freshness = this.calculateFreshness(dataset);
    const consistency = this.calculateConsistency(dataset);
    const overall = (completeness + accuracy + freshness + consistency) / 4;

    // Apply penalties for validation errors
    const validationResult = dataQualityValidator.validateDataset(dataset);
    const errorPenalty = validationResult.errors.length * 0.1;
    const warningPenalty = validationResult.warnings.length * 0.05;

    return {
      completeness: Math.max(0, completeness - errorPenalty),
      accuracy: Math.max(0, accuracy - errorPenalty),
      freshness: Math.max(0, freshness - warningPenalty),
      consistency: Math.max(0, consistency - errorPenalty),
      overall: Math.max(0, overall - errorPenalty - warningPenalty)
    };
  }

  private calculateCompleteness(dataset: EnrichedDataset): number {
    const requiredFields = [
      'campaign.id', 'campaign.name', 'campaign.budget', 'campaign.startDate',
      'campaign.endDate', 'audienceInsights.totalSize', 'budgetAllocation.total'
    ];

    let completedFields = 0;
    requiredFields.forEach(field => {
      const value = this.getNestedValue(dataset, field);
      if (value !== undefined && value !== null && value !== '') {
        completedFields++;
      }
    });

    return completedFields / requiredFields.length;
  }

  private calculateAccuracy(dataset: EnrichedDataset): number {
    let accuracyScore = 1.0;

    // Check for negative budget values
    if (dataset.campaign.budget <= 0) {
      accuracyScore -= 0.3;
    }

    // Check for unrealistic audience size
    if (dataset.audienceInsights.totalSize > 1000000000) { // 1 billion
      accuracyScore -= 0.2;
    }

    // Check for valid date ranges
    if (dataset.campaign.startDate >= dataset.campaign.endDate) {
      accuracyScore -= 0.3;
    }

    return Math.max(0, accuracyScore);
  }

  private calculateFreshness(dataset: EnrichedDataset): number {
    // For campaign data, freshness is based on how recently the campaign was created/updated
    // Since we don't have updatedAt in the current schema, we'll use a default score
    return 0.8; // Assume reasonably fresh data
  }

  private calculateConsistency(dataset: EnrichedDataset): number {
    let consistencyScore = 1.0;

    // Check budget allocation consistency
    const totalAllocated = Object.values(dataset.budgetAllocation.allocated)
      .reduce((sum, amount) => sum + amount, 0);
    const budgetVariance = Math.abs(totalAllocated - dataset.campaign.budget) / dataset.campaign.budget;
    
    if (budgetVariance > 0.05) { // 5% tolerance
      consistencyScore -= budgetVariance;
    }

    // Check channel consistency
    const campaignChannels = new Set(dataset.campaign.channels.map(c => c.type));
    const budgetChannels = new Set(Object.keys(dataset.budgetAllocation.allocated));
    const channelMismatch = campaignChannels.size !== budgetChannels.size;
    
    if (channelMismatch) {
      consistencyScore -= 0.2;
    }

    return Math.max(0, consistencyScore);
  }

  /**
   * Get nested object value by dot notation path
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Validate data quality meets minimum threshold
   */
  private async validateDataQuality(
    dataset: EnrichedDataset,
    dataQuality: DataQualityScore
  ): Promise<void> {
    if (dataQuality.overall < this.config.minDataQualityThreshold) {
      throw new DataValidationError(
        `Data quality score ${dataQuality.overall.toFixed(2)} below minimum threshold ${this.config.minDataQualityThreshold}`,
        'insufficient_data_quality',
        { 
          actualScore: dataQuality.overall,
          threshold: this.config.minDataQualityThreshold,
          breakdown: dataQuality
        }
      );
    }

    // Check if we have minimum required data sources
    const availableSources = [
      dataset.campaign ? 1 : 0,
      dataset.historicalPerformance.length > 0 ? 1 : 0,
      dataset.marketData.competitorActivity.length > 0 ? 1 : 0,
      dataset.externalData.length > 0 ? 1 : 0
    ].reduce((sum, val) => sum + val, 0);

    if (availableSources < this.config.requireMinimumDataSources) {
      throw new InsufficientDataError(
        `Insufficient data sources: ${availableSources} available, ${this.config.requireMinimumDataSources} required`,
        ['campaign', 'historical', 'market', 'external'],
        []
      );
    }
  }

  /**
   * Handle enrichment failure with fallback mechanisms
   */
  private async handleEnrichmentFailure(
    campaignId: Id<"campaigns">,
    error: Error,
    convexQuery: any
  ): Promise<EnrichedDataset> {
    console.warn('Attempting fallback data enrichment:', error.message);

    try {
      // Try to get basic campaign data at minimum
      const campaignDataset = await this.campaignAggregator.aggregateCampaignData(
        campaignId, 
        convexQuery
      );

      // Create minimal enriched dataset
      const fallbackDataset: EnrichedDataset = {
        ...campaignDataset,
        marketData: {
          competitorActivity: [],
          seasonalTrends: [],
          industryBenchmarks: [],
          marketVolatility: { overall: 0.5, byChannel: {}, byAudience: {}, factors: ['fallback_mode'] }
        },
        externalData: [],
        dataQuality: {
          completeness: 0.4, // Reduced due to missing market data
          accuracy: 0.8,     // Campaign data should be accurate
          freshness: 0.6,    // Assume reasonably fresh
          consistency: 0.7,  // Internal consistency should be good
          overall: 0.575     // Average of above
        }
      };

      return fallbackDataset;

    } catch (fallbackError) {
      throw new InsufficientDataError(
        `Complete enrichment failure: ${error.message}. Fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        ['campaign', 'market', 'external'],
        ['campaign', 'market', 'external']
      );
    }
  }

  /**
   * Get enrichment recommendations based on current data quality
   */
  async getEnrichmentRecommendations(
    dataset: EnrichedDataset
  ): Promise<{
    recommendations: string[];
    missingDataSources: string[];
    qualityImprovements: string[];
  }> {
    const recommendations: string[] = [];
    const missingDataSources: string[] = [];
    const qualityImprovements: string[] = [];

    // Check for missing historical data
    if (dataset.historicalPerformance.length === 0) {
      missingDataSources.push('historical_performance');
      recommendations.push('Add historical performance tracking to improve prediction accuracy');
    }

    // Check for missing market data
    if (dataset.marketData.competitorActivity.length === 0) {
      missingDataSources.push('competitor_data');
      recommendations.push('Configure competitor tracking APIs for market intelligence');
    }

    if (dataset.marketData.seasonalTrends.length === 0) {
      missingDataSources.push('trend_data');
      recommendations.push('Enable Google Trends integration for seasonal insights');
    }

    // Check for missing external data
    if (dataset.externalData.length === 0) {
      missingDataSources.push('external_apis');
      recommendations.push('Configure external API integrations for enhanced market data');
    }

    // Quality-based recommendations
    if (dataset.dataQuality.completeness < 0.8) {
      qualityImprovements.push('Complete missing campaign configuration fields');
    }

    if (dataset.dataQuality.accuracy < 0.8) {
      qualityImprovements.push('Review and validate campaign budget and targeting data');
    }

    if (dataset.dataQuality.freshness < 0.7) {
      qualityImprovements.push('Update campaign data more frequently');
    }

    if (dataset.dataQuality.consistency < 0.8) {
      qualityImprovements.push('Ensure budget allocation matches channel configuration');
    }

    return {
      recommendations,
      missingDataSources,
      qualityImprovements
    };
  }

  /**
   * Preview enrichment without full processing (for UI feedback)
   */
  async previewEnrichment(
    campaignId: Id<"campaigns">,
    externalDataSources: ExternalDataSource[],
    convexQuery: any
  ): Promise<{
    estimatedQuality: number;
    availableSources: string[];
    estimatedTime: number;
    recommendations: string[];
  }> {
    try {
      // Quick campaign data check
      const campaignDataset = await this.campaignAggregator.aggregateCampaignData(
        campaignId, 
        convexQuery
      );

      const availableSources = ['campaign_data'];
      let estimatedQuality = 0.4; // Base score for campaign data only

      // Check external data source availability
      const enabledSources = externalDataSources.filter(s => s.enabled);
      if (enabledSources.length > 0) {
        availableSources.push('external_apis');
        estimatedQuality += 0.2;
      }

      // Check for historical data
      if (campaignDataset.historicalPerformance.length > 0) {
        availableSources.push('historical_data');
        estimatedQuality += 0.3;
      }

      // Estimate processing time based on sources
      const baseTime = 2000; // 2 seconds base
      const sourceTime = enabledSources.length * 3000; // 3 seconds per external source
      const estimatedTime = baseTime + sourceTime;

      const recommendations = await this.getEnrichmentRecommendations({
        ...campaignDataset,
        marketData: { competitorActivity: [], seasonalTrends: [], industryBenchmarks: [], marketVolatility: { overall: 0.5, byChannel: {}, byAudience: {}, factors: [] } },
        externalData: [],
        dataQuality: { completeness: estimatedQuality, accuracy: 0.8, freshness: 0.7, consistency: 0.8, overall: estimatedQuality }
      });

      return {
        estimatedQuality: Math.min(1, estimatedQuality),
        availableSources,
        estimatedTime,
        recommendations: recommendations.recommendations
      };

    } catch (error) {
      return {
        estimatedQuality: 0.2,
        availableSources: [],
        estimatedTime: 5000,
        recommendations: ['Fix campaign data issues before proceeding with enrichment']
      };
    }
  }
}