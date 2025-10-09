/**
 * Campaign Data Aggregator
 * 
 * Fetches and structures campaign data from existing Convex tables
 * Implements data validation and completeness checking
 */

import { ConvexError } from "convex/values";
import { 
  CampaignDataset, 
  CampaignData, 
  PerformanceMetric, 
  AudienceData, 
  CreativeData, 
  BudgetData,
  ValidationResult,
  DataQualityScore
} from "../../../types/simulation";
import { Id } from "../../../../convex/_generated/dataModel";
import { dataQualityValidator } from "../validation";
import { InsufficientDataError, DataValidationError } from "../errors";

export interface CampaignDataAggregatorConfig {
  includeHistoricalPerformance: boolean;
  historicalDays: number;
  validateCompleteness: boolean;
  minDataQualityScore: number;
}

export class CampaignDataAggregator {
  private config: CampaignDataAggregatorConfig;

  constructor(config: Partial<CampaignDataAggregatorConfig> = {}) {
    this.config = {
      includeHistoricalPerformance: true,
      historicalDays: 30,
      validateCompleteness: true,
      minDataQualityScore: 0.6,
      ...config
    };
  }

  /**
   * Aggregate complete campaign dataset from Convex tables
   */
  async aggregateCampaignData(
    campaignId: Id<"campaigns">,
    convexQuery: any // Convex query function
  ): Promise<CampaignDataset> {
    try {
      // Fetch campaign details
      const campaign = await this.fetchCampaignDetails(campaignId, convexQuery);
      if (!campaign) {
        throw new InsufficientDataError(
          `Campaign not found: ${campaignId}`,
          ['campaign'],
          ['campaign']
        );
      }

      // Fetch historical performance data
      const historicalPerformance = this.config.includeHistoricalPerformance
        ? await this.fetchHistoricalPerformance(campaignId, convexQuery)
        : [];

      // Extract audience insights from campaign data
      const audienceInsights = this.extractAudienceInsights(campaign);

      // Extract creative assets information
      const creativeAssets = this.extractCreativeAssets(campaign);

      // Calculate budget allocation data
      const budgetAllocation = this.calculateBudgetAllocation(campaign);

      const dataset: CampaignDataset = {
        campaign,
        historicalPerformance,
        audienceInsights,
        creativeAssets,
        budgetAllocation
      };

      // Validate dataset completeness if enabled
      if (this.config.validateCompleteness) {
        await this.validateDatasetCompleteness(dataset);
      }

      return dataset;

    } catch (error) {
      if (error instanceof InsufficientDataError || error instanceof DataValidationError) {
        throw error;
      }
      throw new DataValidationError(
        `Failed to aggregate campaign data: ${error instanceof Error ? error.message : String(error)}`,
        'campaign_aggregation',
        { campaignId, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Fetch campaign details from Convex campaigns table
   */
  private async fetchCampaignDetails(
    campaignId: Id<"campaigns">,
    convexQuery: any
  ): Promise<CampaignData> {
    const campaignDoc = await convexQuery("campaigns:get", { id: campaignId });
    
    if (!campaignDoc) {
      throw new InsufficientDataError(
        `Campaign ${campaignId} not found`,
        ['campaign'],
        ['campaign']
      );
    }

    return {
      id: campaignDoc._id,
      name: campaignDoc.name,
      description: campaignDoc.description || '',
      budget: campaignDoc.budget,
      currency: campaignDoc.currency,
      startDate: new Date(campaignDoc.startDate),
      endDate: new Date(campaignDoc.endDate),
      status: campaignDoc.status,
      category: campaignDoc.category,
      channels: campaignDoc.channels || [],
      audiences: campaignDoc.audiences || [],
      kpis: campaignDoc.kpis || []
    };
  }

  /**
   * Fetch historical performance metrics
   * Note: This would typically come from a separate performance metrics table
   * For now, we'll generate mock data based on campaign configuration
   */
  private async fetchHistoricalPerformance(
    campaignId: Id<"campaigns">,
    convexQuery: any
  ): Promise<PerformanceMetric[]> {
    // In a real implementation, this would query a performance metrics table
    // For now, we'll return empty array as no historical data exists yet
    
    // TODO: Implement actual historical performance data fetching when
    // performance tracking is implemented in the system
    
    return [];
  }

  /**
   * Extract audience insights from campaign configuration
   */
  private extractAudienceInsights(campaign: CampaignData): AudienceData {
    // Calculate total audience size from all configured audiences
    const totalSize = campaign.audiences.reduce(
      (sum, audience) => sum + (audience.estimatedSize || 0), 
      0
    );

    // Aggregate demographics from all audiences
    const allInterests = campaign.audiences.flatMap(a => a.demographics.interests);
    const allLocations = campaign.audiences.flatMap(a => a.demographics.location);
    
    // Calculate age range (use widest range from all audiences)
    const ageRanges = campaign.audiences.map(a => a.demographics.ageRange);
    const minAge = Math.min(...ageRanges.map(range => range[0]));
    const maxAge = Math.max(...ageRanges.map(range => range[1]));

    // Extract unique values
    const uniqueInterests = [...new Set(allInterests)];
    const uniqueLocations = [...new Set(allLocations)];

    return {
      totalSize,
      demographics: {
        ageRange: [minAge, maxAge],
        gender: 'mixed', // Default since we don't have detailed gender data
        locations: uniqueLocations,
        interests: uniqueInterests
      },
      engagementPatterns: {
        peakHours: [9, 12, 18, 20], // Default peak hours
        peakDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        seasonality: {
          'Q1': 0.9,
          'Q2': 1.1,
          'Q3': 0.8,
          'Q4': 1.2
        }
      }
    };
  }

  /**
   * Extract creative assets information from campaign
   */
  private extractCreativeAssets(campaign: CampaignData): CreativeData[] {
    // In the current schema, creative assets aren't explicitly stored
    // We'll infer from campaign description and channels
    
    const creativeAssets: CreativeData[] = [];

    // Generate placeholder creative data based on channels
    campaign.channels.forEach((channel, index) => {
      creativeAssets.push({
        id: `creative_${index}`,
        type: this.inferCreativeType(channel.type),
        content: `${campaign.name} - ${channel.type} creative`,
        performance: {
          ctr: 0, // Will be populated from historical data when available
          engagement: 0,
          sentiment: 0.5 // Neutral default
        }
      });
    });

    return creativeAssets;
  }

  /**
   * Infer creative type from channel type
   */
  private inferCreativeType(channelType: string): 'image' | 'video' | 'text' | 'carousel' {
    const videoChannels = ['youtube', 'tiktok', 'instagram_reels'];
    const imageChannels = ['instagram', 'facebook', 'pinterest'];
    const textChannels = ['twitter', 'linkedin'];

    if (videoChannels.includes(channelType.toLowerCase())) return 'video';
    if (imageChannels.includes(channelType.toLowerCase())) return 'image';
    if (textChannels.includes(channelType.toLowerCase())) return 'text';
    
    return 'image'; // Default
  }

  /**
   * Calculate budget allocation data from campaign configuration
   */
  private calculateBudgetAllocation(campaign: CampaignData): BudgetData {
    const allocated: Record<string, number> = {};
    const spent: Record<string, number> = {};
    const remaining: Record<string, number> = {};

    // Extract budget allocation from channels
    campaign.channels.forEach(channel => {
      allocated[channel.type] = channel.budget;
      spent[channel.type] = 0; // No spending data available yet
      remaining[channel.type] = channel.budget;
    });

    // Also include budget allocation from campaign budgetAllocation if available
    // Note: budgetAllocation is stored in the campaign channels array in current schema

    return {
      total: campaign.budget,
      allocated,
      spent,
      remaining
    };
  }

  /**
   * Validate dataset completeness and quality
   */
  private async validateDatasetCompleteness(dataset: CampaignDataset): Promise<void> {
    // Check required fields
    const requiredFields = ['campaign.id', 'campaign.name', 'campaign.budget'];
    const missingFields: string[] = [];

    requiredFields.forEach(field => {
      const value = this.getNestedValue(dataset, field);
      if (value === undefined || value === null || value === '') {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      throw new InsufficientDataError(
        `Missing required campaign data fields: ${missingFields.join(', ')}`,
        requiredFields,
        missingFields
      );
    }

    // Validate budget consistency
    this.validateBudgetConsistency(dataset);

    // Validate audience data
    this.validateAudienceData(dataset);

    // Check data quality score if historical data is available
    if (dataset.historicalPerformance.length > 0) {
      const qualityScore = this.calculateDataQualityScore(dataset);
      if (qualityScore.overall < this.config.minDataQualityScore) {
        throw new DataValidationError(
          `Data quality score ${qualityScore.overall} below minimum threshold ${this.config.minDataQualityScore}`,
          'data_quality',
          qualityScore
        );
      }
    }
  }

  /**
   * Validate budget allocation consistency
   */
  private validateBudgetConsistency(dataset: CampaignDataset): void {
    const { campaign, budgetAllocation } = dataset;
    
    const totalAllocated = Object.values(budgetAllocation.allocated)
      .reduce((sum, amount) => sum + amount, 0);

    // Allow 10% variance for rounding differences
    const variance = Math.abs(totalAllocated - campaign.budget) / campaign.budget;
    if (variance > 0.1) {
      throw new DataValidationError(
        `Budget allocation mismatch: allocated ${totalAllocated}, campaign budget ${campaign.budget}`,
        'budget_consistency',
        { totalAllocated, campaignBudget: campaign.budget, variance }
      );
    }
  }

  /**
   * Validate audience data completeness
   */
  private validateAudienceData(dataset: CampaignDataset): void {
    const { audienceInsights } = dataset;

    if (audienceInsights.totalSize <= 0) {
      throw new DataValidationError(
        'Audience size must be greater than 0',
        'audience_size',
        { totalSize: audienceInsights.totalSize }
      );
    }

    if (audienceInsights.demographics.interests.length === 0) {
      throw new DataValidationError(
        'At least one audience interest must be specified',
        'audience_interests',
        { interests: audienceInsights.demographics.interests }
      );
    }

    if (audienceInsights.demographics.locations.length === 0) {
      throw new DataValidationError(
        'At least one target location must be specified',
        'audience_locations',
        { locations: audienceInsights.demographics.locations }
      );
    }
  }

  /**
   * Calculate data quality score for the dataset
   */
  private calculateDataQualityScore(dataset: CampaignDataset): DataQualityScore {
    const completeness = this.calculateCompleteness(dataset);
    const accuracy = this.calculateAccuracy(dataset);
    const freshness = this.calculateFreshness(dataset);
    const consistency = this.calculateConsistency(dataset);

    return {
      completeness,
      accuracy,
      freshness,
      consistency,
      overall: (completeness + accuracy + freshness + consistency) / 4
    };
  }

  private calculateCompleteness(dataset: CampaignDataset): number {
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

  private calculateAccuracy(dataset: CampaignDataset): number {
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

  private calculateFreshness(dataset: CampaignDataset): number {
    // For campaign data, freshness is based on how recently the campaign was created/updated
    // Since we don't have updatedAt in the current schema, we'll use a default score
    return 0.8; // Assume reasonably fresh data
  }

  private calculateConsistency(dataset: CampaignDataset): number {
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
   * Get data quality summary for reporting
   */
  async getDataQualitySummary(dataset: CampaignDataset): Promise<{
    score: DataQualityScore;
    issues: string[];
    recommendations: string[];
  }> {
    const score = this.calculateDataQualityScore(dataset);
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Identify issues and recommendations based on scores
    if (score.completeness < 0.8) {
      issues.push('Incomplete campaign data');
      recommendations.push('Ensure all required campaign fields are populated');
    }

    if (score.accuracy < 0.8) {
      issues.push('Data accuracy concerns detected');
      recommendations.push('Review budget values and date ranges for accuracy');
    }

    if (score.consistency < 0.8) {
      issues.push('Data consistency issues found');
      recommendations.push('Verify budget allocation matches channel configuration');
    }

    if (dataset.historicalPerformance.length === 0) {
      issues.push('No historical performance data available');
      recommendations.push('Historical data would improve prediction accuracy');
    }

    return { score, issues, recommendations };
  }
}