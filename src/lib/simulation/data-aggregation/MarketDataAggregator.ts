/**
 * Market Data Aggregator
 * 
 * Handles external API integration setup for market intelligence
 * Implements API key management, rate limiting, and caching mechanisms
 */

import {
  MarketDataset,
  CompetitorMetric,
  TrendData,
  BenchmarkData,
  VolatilityIndex,
  ExternalDataSource,
  ExternalDataSourceConfig,
  SEMrushCompetitorData,
  GoogleTrendsData,
  SocialMediaMetrics,
  MarketContext
} from "../../../types/simulation";
import { Id } from "../../../../convex/_generated/dataModel";
import { RateLimitError, ModelAPIError, InsufficientDataError } from "../errors";

export interface MarketDataAggregatorConfig {
  enableCaching: boolean;
  cacheExpiryHours: number;
  rateLimitBuffer: number; // Percentage buffer for rate limits (0.1 = 10%)
  fallbackToCache: boolean;
  maxRetries: number;
}

export interface APIConnector {
  name: string;
  isEnabled: boolean;
  testConnection(): Promise<boolean>;
  fetchData(context: MarketContext): Promise<any>;
  getRateLimit(): { requests: number; period: number; remaining: number };
}

export class MarketDataAggregator {
  private config: MarketDataAggregatorConfig;
  private connectors: Map<string, APIConnector> = new Map();
  private rateLimitTracking: Map<string, { count: number; resetTime: number }> = new Map();
  private cache: Map<string, { data: any; expiresAt: number }> = new Map();

  constructor(config: Partial<MarketDataAggregatorConfig> = {}) {
    this.config = {
      enableCaching: true,
      cacheExpiryHours: 6,
      rateLimitBuffer: 0.1,
      fallbackToCache: true,
      maxRetries: 3,
      ...config
    };
  }

  /**
   * Fetch comprehensive market dataset for simulation context
   */
  async fetchMarketData(
    context: MarketContext,
    dataSources: ExternalDataSource[],
    convexQuery: any
  ): Promise<MarketDataset> {
    const marketData: MarketDataset = {
      competitorActivity: [],
      seasonalTrends: [],
      industryBenchmarks: [],
      marketVolatility: {
        overall: 0.5,
        byChannel: {},
        byAudience: {},
        factors: []
      }
    };

    // Initialize enabled connectors
    await this.initializeConnectors(dataSources, convexQuery);

    // Fetch data from each enabled source
    const dataFetchPromises = Array.from(this.connectors.entries()).map(
      async ([sourceName, connector]) => {
        if (!connector.isEnabled) return null;

        try {
          return await this.fetchFromSource(sourceName, connector, context);
        } catch (error) {
          console.warn(`Failed to fetch data from ${sourceName}:`, error);
          return null;
        }
      }
    );

    const results = await Promise.allSettled(dataFetchPromises);
    
    // Process successful results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        const sourceName = Array.from(this.connectors.keys())[index];
        this.mergeSourceData(marketData, sourceName, result.value);
      }
    });

    // Calculate market volatility based on collected data
    marketData.marketVolatility = this.calculateMarketVolatility(marketData);

    return marketData;
  }

  /**
   * Initialize API connectors based on configured data sources
   */
  private async initializeConnectors(
    dataSources: ExternalDataSource[],
    convexQuery: any
  ): Promise<void> {
    for (const source of dataSources) {
      if (!source.enabled) continue;

      try {
        const connector = await this.createConnector(source, convexQuery);
        this.connectors.set(source.source, connector);
      } catch (error) {
        console.warn(`Failed to initialize connector for ${source.source}:`, error);
      }
    }
  }

  /**
   * Create appropriate connector based on source type
   */
  private async createConnector(
    source: ExternalDataSource,
    convexQuery: any
  ): Promise<APIConnector> {
    switch (source.source) {
      case 'semrush':
        return new SEMrushConnector(source.config, convexQuery);
      case 'google_trends':
        return new GoogleTrendsConnector(source.config, convexQuery);
      case 'twitter_api':
        return new TwitterConnector(source.config, convexQuery);
      case 'facebook_api':
        return new FacebookConnector(source.config, convexQuery);
      default:
        return new GenericAPIConnector(source.source, source.config, convexQuery);
    }
  }

  /**
   * Fetch data from a specific source with rate limiting and caching
   */
  private async fetchFromSource(
    sourceName: string,
    connector: APIConnector,
    context: MarketContext
  ): Promise<any> {
    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.getCachedData(sourceName, context);
      if (cached) {
        return cached;
      }
    }

    // Check rate limits
    await this.checkRateLimit(sourceName, connector);

    // Fetch fresh data
    const data = await connector.fetchData(context);

    // Cache the result
    if (this.config.enableCaching) {
      this.cacheData(sourceName, context, data);
    }

    // Update rate limit tracking
    this.updateRateLimitTracking(sourceName);

    return data;
  }

  /**
   * Check and enforce rate limits
   */
  private async checkRateLimit(sourceName: string, connector: APIConnector): Promise<void> {
    const rateLimit = connector.getRateLimit();
    const tracking = this.rateLimitTracking.get(sourceName);

    if (!tracking) {
      this.rateLimitTracking.set(sourceName, {
        count: 0,
        resetTime: Date.now() + rateLimit.period * 1000
      });
      return;
    }

    // Reset counter if period has elapsed
    if (Date.now() > tracking.resetTime) {
      tracking.count = 0;
      tracking.resetTime = Date.now() + rateLimit.period * 1000;
    }

    // Check if we're approaching rate limit
    const bufferLimit = rateLimit.requests * (1 - this.config.rateLimitBuffer);
    if (tracking.count >= bufferLimit) {
      const waitTime = tracking.resetTime - Date.now();
      throw new RateLimitError(
        `Rate limit approaching for ${sourceName}. Wait ${waitTime}ms`,
        sourceName,
        waitTime
      );
    }
  }

  /**
   * Update rate limit tracking after successful request
   */
  private updateRateLimitTracking(sourceName: string): void {
    const tracking = this.rateLimitTracking.get(sourceName);
    if (tracking) {
      tracking.count++;
    }
  }

  /**
   * Get cached data if available and not expired
   */
  private getCachedData(sourceName: string, context: MarketContext): any | null {
    const cacheKey = this.generateCacheKey(sourceName, context);
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    return null;
  }

  /**
   * Cache data with expiry
   */
  private cacheData(sourceName: string, context: MarketContext, data: any): void {
    const cacheKey = this.generateCacheKey(sourceName, context);
    const expiresAt = Date.now() + (this.config.cacheExpiryHours * 60 * 60 * 1000);

    this.cache.set(cacheKey, { data, expiresAt });
  }

  /**
   * Generate cache key from source and context
   */
  private generateCacheKey(sourceName: string, context: MarketContext): string {
    const contextStr = JSON.stringify({
      industry: context.industry,
      region: context.region,
      timeframe: context.timeframe,
      competitors: context.competitors.sort(),
      keywords: context.keywords.sort()
    });

    return `${sourceName}:${Buffer.from(contextStr).toString('base64')}`;
  }

  /**
   * Merge data from specific source into market dataset
   */
  private mergeSourceData(marketData: MarketDataset, sourceName: string, sourceData: any): void {
    switch (sourceName) {
      case 'semrush':
        this.mergeSEMrushData(marketData, sourceData);
        break;
      case 'google_trends':
        this.mergeGoogleTrendsData(marketData, sourceData);
        break;
      case 'twitter_api':
      case 'facebook_api':
        this.mergeSocialMediaData(marketData, sourceData);
        break;
      default:
        this.mergeGenericData(marketData, sourceName, sourceData);
    }
  }

  /**
   * Merge SEMrush competitor data
   */
  private mergeSEMrushData(marketData: MarketDataset, data: SEMrushCompetitorData[]): void {
    data.forEach(competitor => {
      marketData.competitorActivity.push({
        competitor: competitor.domain,
        metric: 'traffic',
        value: competitor.traffic.total,
        date: new Date(),
        source: 'semrush'
      });

      marketData.competitorActivity.push({
        competitor: competitor.domain,
        metric: 'ad_spend',
        value: competitor.ad_spend_estimate,
        date: new Date(),
        source: 'semrush'
      });

      marketData.competitorActivity.push({
        competitor: competitor.domain,
        metric: 'market_share',
        value: competitor.market_share,
        date: new Date(),
        source: 'semrush'
      });
    });
  }

  /**
   * Merge Google Trends data
   */
  private mergeGoogleTrendsData(marketData: MarketDataset, data: GoogleTrendsData[]): void {
    data.forEach(trendData => {
      trendData.interest_over_time.forEach(point => {
        marketData.seasonalTrends.push({
          keyword: trendData.keyword,
          trend: point.value / 100, // Normalize to 0-1
          date: new Date(point.date),
          region: trendData.geo,
          category: 'search_interest'
        });
      });
    });
  }

  /**
   * Merge social media data
   */
  private mergeSocialMediaData(marketData: MarketDataset, data: SocialMediaMetrics[]): void {
    data.forEach(socialData => {
      marketData.competitorActivity.push({
        competitor: socialData.platform,
        metric: 'engagement_rate',
        value: socialData.metrics.engagement_rate,
        date: new Date(),
        source: socialData.platform
      });

      marketData.competitorActivity.push({
        competitor: socialData.platform,
        metric: 'sentiment_score',
        value: socialData.metrics.sentiment_score,
        date: new Date(),
        source: socialData.platform
      });
    });
  }

  /**
   * Merge generic API data
   */
  private mergeGenericData(marketData: MarketDataset, sourceName: string, data: any): void {
    // Handle generic data structure - this would be customized based on API
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (item.metric && item.value !== undefined) {
          marketData.competitorActivity.push({
            competitor: item.competitor || 'unknown',
            metric: item.metric,
            value: item.value,
            date: new Date(item.date || Date.now()),
            source: sourceName
          });
        }
      });
    }
  }

  /**
   * Calculate market volatility index based on collected data
   */
  private calculateMarketVolatility(marketData: MarketDataset): VolatilityIndex {
    const factors: string[] = [];
    let overallVolatility = 0.5; // Default neutral volatility

    // Analyze competitor activity volatility
    const competitorMetrics = marketData.competitorActivity;
    if (competitorMetrics.length > 0) {
      const recentActivity = competitorMetrics.filter(
        m => Date.now() - m.date.getTime() < 7 * 24 * 60 * 60 * 1000 // Last 7 days
      );

      if (recentActivity.length > competitorMetrics.length * 0.3) {
        overallVolatility += 0.2;
        factors.push('High competitor activity');
      }
    }

    // Analyze trend volatility
    const trends = marketData.seasonalTrends;
    if (trends.length > 0) {
      const trendValues = trends.map(t => t.trend);
      const trendVariance = this.calculateVariance(trendValues);
      
      if (trendVariance > 0.3) {
        overallVolatility += 0.15;
        factors.push('High search trend volatility');
      }
    }

    // Calculate channel-specific volatility
    const byChannel: Record<string, number> = {};
    const channelGroups = this.groupBy(competitorMetrics, 'source');
    
    Object.entries(channelGroups).forEach(([channel, metrics]) => {
      const values = metrics.map(m => m.value);
      const variance = this.calculateVariance(values);
      byChannel[channel] = Math.min(1, variance);
    });

    // Calculate audience-specific volatility (simplified)
    const byAudience: Record<string, number> = {
      'general': overallVolatility,
      'targeted': overallVolatility * 0.8 // Targeted audiences typically less volatile
    };

    return {
      overall: Math.min(1, Math.max(0, overallVolatility)),
      byChannel,
      byAudience,
      factors
    };
  }

  /**
   * Calculate variance of numeric array
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  /**
   * Group array by property
   */
  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key]);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  /**
   * Test all configured connectors
   */
  async testConnections(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [sourceName, connector] of this.connectors) {
      try {
        results[sourceName] = await connector.testConnection();
      } catch (error) {
        console.error(`Connection test failed for ${sourceName}:`, error);
        results[sourceName] = false;
      }
    }

    return results;
  }

  /**
   * Get rate limit status for all connectors
   */
  getRateLimitStatus(): Record<string, { remaining: number; resetTime: number }> {
    const status: Record<string, { remaining: number; resetTime: number }> = {};

    for (const [sourceName, connector] of this.connectors) {
      const rateLimit = connector.getRateLimit();
      const tracking = this.rateLimitTracking.get(sourceName);

      if (tracking) {
        status[sourceName] = {
          remaining: Math.max(0, rateLimit.requests - tracking.count),
          resetTime: tracking.resetTime
        };
      } else {
        status[sourceName] = {
          remaining: rateLimit.requests,
          resetTime: Date.now() + rateLimit.period * 1000
        };
      }
    }

    return status;
  }

  /**
   * Clear cache for specific source or all sources
   */
  clearCache(sourceName?: string): void {
    if (sourceName) {
      const keysToDelete = Array.from(this.cache.keys()).filter(key => 
        key.startsWith(`${sourceName}:`)
      );
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }
}

// ============================================================================
// API Connector Implementations
// ============================================================================

/**
 * Base API Connector class
 */
abstract class BaseAPIConnector implements APIConnector {
  public name: string;
  public isEnabled: boolean;
  protected config: ExternalDataSourceConfig;
  protected convexQuery: any;

  constructor(name: string, config: ExternalDataSourceConfig, convexQuery: any) {
    this.name = name;
    this.config = config;
    this.convexQuery = convexQuery;
    this.isEnabled = config.enabled;
  }

  abstract testConnection(): Promise<boolean>;
  abstract fetchData(context: MarketContext): Promise<any>;

  getRateLimit(): { requests: number; period: number; remaining: number } {
    return {
      requests: this.config.rateLimit.requests,
      period: this.config.rateLimit.period,
      remaining: this.config.rateLimit.requests // Simplified - would track actual usage
    };
  }

  protected async makeAPIRequest(url: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new ModelAPIError(
        `API request failed: ${response.statusText}`,
        this.name,
        response.status
      );
    }

    return response.json();
  }
}

/**
 * SEMrush API Connector
 */
class SEMrushConnector extends BaseAPIConnector {
  constructor(config: ExternalDataSourceConfig, convexQuery: any) {
    super('semrush', config, convexQuery);
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test with a simple API call
      await this.makeAPIRequest(`${this.config.endpoint}/test`);
      return true;
    } catch (error) {
      return false;
    }
  }

  async fetchData(context: MarketContext): Promise<SEMrushCompetitorData[]> {
    const competitorData: SEMrushCompetitorData[] = [];

    for (const competitor of context.competitors) {
      try {
        const data = await this.makeAPIRequest(
          `${this.config.endpoint}/domain/${competitor}/overview`
        );

        competitorData.push({
          domain: competitor,
          traffic: {
            organic: data.organic_traffic || 0,
            paid: data.paid_traffic || 0,
            total: (data.organic_traffic || 0) + (data.paid_traffic || 0)
          },
          keywords: {
            organic_count: data.organic_keywords || 0,
            paid_count: data.paid_keywords || 0,
            top_keywords: data.top_keywords || []
          },
          ad_spend_estimate: data.ad_spend || 0,
          market_share: data.market_share || 0
        });
      } catch (error) {
        console.warn(`Failed to fetch SEMrush data for ${competitor}:`, error);
      }
    }

    return competitorData;
  }
}

/**
 * Google Trends API Connector
 */
class GoogleTrendsConnector extends BaseAPIConnector {
  constructor(config: ExternalDataSourceConfig, convexQuery: any) {
    super('google_trends', config, convexQuery);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.makeAPIRequest(`${this.config.endpoint}/test`);
      return true;
    } catch (error) {
      return false;
    }
  }

  async fetchData(context: MarketContext): Promise<GoogleTrendsData[]> {
    const trendsData: GoogleTrendsData[] = [];

    for (const keyword of context.keywords) {
      try {
        const data = await this.makeAPIRequest(
          `${this.config.endpoint}/trends?keyword=${encodeURIComponent(keyword)}&geo=${context.region}`
        );

        trendsData.push({
          keyword,
          timeframe: `${context.timeframe.start.toISOString()}_${context.timeframe.end.toISOString()}`,
          geo: context.region,
          interest_over_time: data.interest_over_time || [],
          related_queries: data.related_queries || [],
          rising_queries: data.rising_queries || []
        });
      } catch (error) {
        console.warn(`Failed to fetch Google Trends data for ${keyword}:`, error);
      }
    }

    return trendsData;
  }
}

/**
 * Twitter API Connector
 */
class TwitterConnector extends BaseAPIConnector {
  constructor(config: ExternalDataSourceConfig, convexQuery: any) {
    super('twitter_api', config, convexQuery);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.makeAPIRequest(`${this.config.endpoint}/2/users/me`);
      return true;
    } catch (error) {
      return false;
    }
  }

  async fetchData(context: MarketContext): Promise<SocialMediaMetrics[]> {
    // Implementation would fetch Twitter metrics
    // For now, return mock data structure
    return [{
      platform: 'twitter',
      metrics: {
        mentions: 0,
        sentiment_score: 0.5,
        engagement_rate: 0,
        reach: 0,
        impressions: 0
      },
      trending_topics: [],
      competitor_activity: []
    }];
  }
}

/**
 * Facebook API Connector
 */
class FacebookConnector extends BaseAPIConnector {
  constructor(config: ExternalDataSourceConfig, convexQuery: any) {
    super('facebook_api', config, convexQuery);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.makeAPIRequest(`${this.config.endpoint}/me`);
      return true;
    } catch (error) {
      return false;
    }
  }

  async fetchData(context: MarketContext): Promise<SocialMediaMetrics[]> {
    // Implementation would fetch Facebook metrics
    // For now, return mock data structure
    return [{
      platform: 'facebook',
      metrics: {
        mentions: 0,
        sentiment_score: 0.5,
        engagement_rate: 0,
        reach: 0,
        impressions: 0
      },
      trending_topics: [],
      competitor_activity: []
    }];
  }
}

/**
 * Generic API Connector for custom sources
 */
class GenericAPIConnector extends BaseAPIConnector {
  async testConnection(): Promise<boolean> {
    try {
      await this.makeAPIRequest(`${this.config.endpoint}/health`);
      return true;
    } catch (error) {
      return false;
    }
  }

  async fetchData(context: MarketContext): Promise<any> {
    return this.makeAPIRequest(`${this.config.endpoint}/data`, {
      method: 'POST',
      body: JSON.stringify(context)
    });
  }
}