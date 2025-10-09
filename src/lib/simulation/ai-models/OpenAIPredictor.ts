/**
 * OpenAI GPT-4o Integration for Campaign Performance Prediction
 * 
 * This module implements the OpenAI GPT-4o integration for generating
 * campaign performance trajectories and scenario predictions.
 */

import OpenAI from 'openai';
import { 
  EnrichedDataset, 
  PredictionOutput, 
  TrajectoryPoint, 
  ConfidenceInterval, 
  FeatureImportance, 
  ModelMetadata,
  ModelError,
  PerformanceMetric
} from '../../../types/simulation';
import { SimulationError } from '../errors';

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  dangerouslyAllowBrowser?: boolean;
}

export interface GPTPromptContext {
  campaign: {
    name: string;
    budget: number;
    duration: number;
    channels: string[];
    category: string;
  };
  audience: {
    size: number;
    demographics: string;
    interests: string[];
  };
  historical: {
    avgCTR: number;
    avgImpressions: number;
    avgEngagement: number;
    trendDirection: 'increasing' | 'decreasing' | 'stable';
  };
  market: {
    competitorActivity: string;
    seasonalFactors: string;
    industryTrends: string;
  };
  timeframe: {
    days: number;
    granularity: 'daily' | 'weekly';
  };
}

export interface GPTResponse {
  trajectories: Array<{
    date: string;
    ctr: number;
    impressions: number;
    engagement: number;
    reach: number;
    confidence: number;
  }>;
  scenarios: Array<{
    type: 'optimistic' | 'realistic' | 'pessimistic';
    probability: number;
    key_factors: string[];
  }>;
  feature_importance: Array<{
    feature: string;
    importance: number;
    category: string;
  }>;
  confidence_score: number;
  reasoning: string;
}

export class OpenAIPredictor {
  private openai: OpenAI;
  private config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    this.config = {
      ...config,
      model: config.model || 'gpt-4o',
      temperature: config.temperature || 0.3,
      maxTokens: config.maxTokens || 4000,
      timeout: config.timeout || 30000
    };

    this.openai = new OpenAI({
      apiKey: this.config.apiKey,
      timeout: this.config.timeout,
      dangerouslyAllowBrowser: this.config.dangerouslyAllowBrowser || false,
    });
  }

  /**
   * Generate performance trajectories using GPT-4o
   */
  async predict(dataset: EnrichedDataset): Promise<PredictionOutput> {
    const startTime = Date.now();

    try {
      // Validate input dataset
      this.validateDataset(dataset);

      // Build context for GPT prompt
      const context = this.buildPromptContext(dataset);

      // Generate the prompt
      const prompt = this.buildPrompt(context);

      // Call OpenAI API
      const gptResponse = await this.callOpenAI(prompt);

      // Parse and validate response
      const parsedResponse = this.parseGPTResponse(gptResponse);

      // Convert to standard prediction output format
      const predictionOutput = this.convertToPredictionOutput(
        parsedResponse, 
        dataset, 
        Date.now() - startTime
      );

      return predictionOutput;

    } catch (error) {
      throw this.handleError(error, dataset);
    }
  }

  /**
   * Validate the input dataset has required fields
   */
  private validateDataset(dataset: EnrichedDataset): void {
    if (!dataset.campaign) {
      throw new SimulationError('Missing campaign data', 'validation_error', 'INVALID_DATASET');
    }

    if (!dataset.historicalPerformance || dataset.historicalPerformance.length === 0) {
      throw new SimulationError('Missing historical performance data', 'insufficient_data', 'INSUFFICIENT_DATA');
    }

    if (!dataset.audienceInsights) {
      throw new SimulationError('Missing audience insights', 'validation_error', 'INVALID_DATASET');
    }
  }

  /**
   * Build context object from enriched dataset
   */
  private buildPromptContext(dataset: EnrichedDataset): GPTPromptContext {
    const campaign = dataset.campaign;
    const historical = dataset.historicalPerformance;
    const audience = dataset.audienceInsights;
    const market = dataset.marketData;

    // Calculate historical averages
    const avgCTR = this.calculateAverage(historical, 'ctr');
    const avgImpressions = this.calculateAverage(historical, 'impressions');
    const avgEngagement = this.calculateAverage(historical, 'engagement');

    // Determine trend direction
    const trendDirection = this.calculateTrendDirection(historical);

    // Calculate campaign duration
    const duration = Math.ceil(
      (campaign.endDate.getTime() - campaign.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      campaign: {
        name: campaign.name,
        budget: campaign.budget,
        duration,
        channels: campaign.channels.map(c => c.type),
        category: campaign.category
      },
      audience: {
        size: audience.totalSize,
        demographics: this.formatDemographics(audience.demographics),
        interests: audience.demographics.interests
      },
      historical: {
        avgCTR,
        avgImpressions,
        avgEngagement,
        trendDirection
      },
      market: {
        competitorActivity: this.summarizeCompetitorActivity(market.competitorActivity),
        seasonalFactors: this.summarizeSeasonalFactors(market.seasonalTrends),
        industryTrends: this.summarizeIndustryTrends(market.industryBenchmarks)
      },
      timeframe: {
        days: duration,
        granularity: 'daily'
      }
    };
  }

  /**
   * Build the GPT-4o prompt for campaign performance prediction
   */
  private buildPrompt(context: GPTPromptContext): string {
    return `You are an expert digital marketing analyst with deep expertise in campaign performance prediction. Analyze the following campaign data and generate probabilistic performance trajectories.

CAMPAIGN DETAILS:
- Name: ${context.campaign.name}
- Budget: $${context.campaign.budget.toLocaleString()}
- Duration: ${context.campaign.duration} days
- Channels: ${context.campaign.channels.join(', ')}
- Category: ${context.campaign.category}

AUDIENCE PROFILE:
- Size: ${context.audience.size.toLocaleString()} people
- Demographics: ${context.audience.demographics}
- Interests: ${context.audience.interests.join(', ')}

HISTORICAL PERFORMANCE:
- Average CTR: ${(context.historical.avgCTR * 100).toFixed(2)}%
- Average Impressions: ${context.historical.avgImpressions.toLocaleString()}/day
- Average Engagement: ${(context.historical.avgEngagement * 100).toFixed(2)}%
- Trend: ${context.historical.trendDirection}

MARKET CONTEXT:
- Competitor Activity: ${context.market.competitorActivity}
- Seasonal Factors: ${context.market.seasonalFactors}
- Industry Trends: ${context.market.industryTrends}

TASK:
Generate a ${context.timeframe.days}-day performance trajectory prediction with the following requirements:

1. DAILY PREDICTIONS: Provide daily forecasts for CTR, impressions, engagement, and reach
2. CONFIDENCE SCORES: Include confidence levels (0-1) for each prediction
3. SCENARIOS: Generate optimistic (75th percentile), realistic (50th percentile), and pessimistic (25th percentile) scenarios
4. FEATURE IMPORTANCE: Rank the importance of different factors affecting performance
5. REASONING: Explain the key assumptions and factors driving your predictions

Consider these factors in your analysis:
- Campaign fatigue effects over time
- Seasonal variations and market timing
- Competitive landscape impact
- Budget pacing and optimization curves
- Audience saturation and expansion opportunities
- Creative performance decay
- Channel-specific performance patterns

RESPONSE FORMAT:
Return your analysis as a JSON object with this exact structure:

{
  "trajectories": [
    {
      "date": "YYYY-MM-DD",
      "ctr": 0.025,
      "impressions": 15000,
      "engagement": 0.045,
      "reach": 12000,
      "confidence": 0.85
    }
  ],
  "scenarios": [
    {
      "type": "optimistic",
      "probability": 0.25,
      "key_factors": ["Strong creative performance", "Favorable market conditions"]
    },
    {
      "type": "realistic", 
      "probability": 0.50,
      "key_factors": ["Expected performance based on historical data"]
    },
    {
      "type": "pessimistic",
      "probability": 0.25,
      "key_factors": ["Increased competition", "Audience fatigue"]
    }
  ],
  "feature_importance": [
    {
      "feature": "Historical CTR",
      "importance": 0.35,
      "category": "campaign"
    },
    {
      "feature": "Seasonal Trends",
      "importance": 0.25,
      "category": "temporal"
    }
  ],
  "confidence_score": 0.78,
  "reasoning": "Detailed explanation of prediction methodology and key assumptions"
}

Generate realistic, data-driven predictions that account for the complexity of digital marketing performance. Ensure all numerical values are reasonable for the given campaign parameters.`;
  }

  /**
   * Call OpenAI API with retry logic and error handling
   */
  private async callOpenAI(prompt: string): Promise<string> {
    const maxRetries = 3;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.openai.chat.completions.create({
          model: this.config.model,
          messages: [
            {
              role: "system",
              content: "You are an expert digital marketing analyst specializing in campaign performance prediction. Always respond with valid JSON."
            },
            {
              role: "user", 
              content: prompt
            }
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          response_format: { type: "json_object" }
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('Empty response from OpenAI');
        }

        return content;

      } catch (error) {
        lastError = error as Error;
        
        // Check if it's a rate limit error
        if (error instanceof Error && error.message.includes('rate_limit')) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Don't retry for other types of errors on the last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    throw lastError!;
  }

  /**
   * Parse and validate GPT response
   */
  private parseGPTResponse(response: string): GPTResponse {
    try {
      const parsed = JSON.parse(response) as GPTResponse;

      // Validate required fields
      if (!parsed.trajectories || !Array.isArray(parsed.trajectories)) {
        throw new Error('Invalid trajectories format');
      }

      if (!parsed.scenarios || !Array.isArray(parsed.scenarios)) {
        throw new Error('Invalid scenarios format');
      }

      if (!parsed.feature_importance || !Array.isArray(parsed.feature_importance)) {
        throw new Error('Invalid feature_importance format');
      }

      if (typeof parsed.confidence_score !== 'number' || 
          parsed.confidence_score < 0 || 
          parsed.confidence_score > 1) {
        throw new Error('Invalid confidence_score');
      }

      // Validate trajectory data
      for (const trajectory of parsed.trajectories) {
        if (!trajectory.date || !trajectory.ctr || !trajectory.impressions || 
            !trajectory.engagement || !trajectory.confidence) {
          throw new Error('Missing required trajectory fields');
        }

        if (trajectory.confidence < 0 || trajectory.confidence > 1) {
          throw new Error('Invalid confidence value in trajectory');
        }
      }

      return parsed;

    } catch (error) {
      throw new SimulationError(
        `Failed to parse GPT response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'api_error',
        'RESPONSE_PARSE_ERROR'
      );
    }
  }

  /**
   * Convert GPT response to standard PredictionOutput format
   */
  private convertToPredictionOutput(
    gptResponse: GPTResponse, 
    dataset: EnrichedDataset,
    processingTime: number
  ): PredictionOutput {
    // Convert trajectories
    const trajectories: TrajectoryPoint[] = gptResponse.trajectories.map(t => ({
      date: new Date(t.date),
      metrics: {
        ctr: t.ctr,
        impressions: t.impressions,
        engagement: t.engagement,
        reach: t.reach || t.impressions * 0.8 // Estimate reach if not provided
      },
      confidence: t.confidence
    }));

    // Generate confidence intervals based on trajectory confidence
    const confidence_intervals: ConfidenceInterval[] = trajectories.map(t => {
      const variance = (1 - t.confidence) * 0.2; // Higher variance for lower confidence
      return {
        lower: Math.max(0, t.confidence - variance),
        upper: Math.min(1, t.confidence + variance),
        confidence_level: 0.95
      };
    });

    // Convert feature importance
    const feature_importance: FeatureImportance[] = gptResponse.feature_importance.map(f => ({
      feature: f.feature,
      importance: f.importance,
      category: f.category as 'campaign' | 'market' | 'temporal' | 'external'
    }));

    // Build model metadata
    const model_metadata: ModelMetadata = {
      model_name: 'openai-gpt4o',
      model_version: this.config.model,
      confidence_score: gptResponse.confidence_score,
      processing_time: processingTime,
      data_quality: dataset.dataQuality,
      feature_count: feature_importance.length,
      prediction_horizon: trajectories.length
    };

    return {
      trajectories,
      confidence_intervals,
      feature_importance,
      model_metadata
    };
  }

  /**
   * Handle and classify errors
   */
  private handleError(error: any, dataset: EnrichedDataset): ModelError {
    if (error instanceof SimulationError) {
      return error as ModelError;
    }

    let errorType: ModelError['type'] = 'validation_error';
    let retryable = false;

    if (error.message?.includes('timeout')) {
      errorType = 'api_timeout';
      retryable = true;
    } else if (error.message?.includes('rate_limit')) {
      errorType = 'rate_limit_exceeded';
      retryable = true;
    } else if (error.message?.includes('model') || error.message?.includes('unavailable')) {
      errorType = 'model_unavailable';
      retryable = true;
    } else if (error.message?.includes('insufficient') || error.message?.includes('missing')) {
      errorType = 'insufficient_data';
      retryable = false;
    }

    const modelError = new Error(error.message || 'Unknown OpenAI error') as ModelError;
    modelError.type = errorType;
    modelError.code = error.code || 'OPENAI_ERROR';
    modelError.retryable = retryable;
    modelError.context = {
      campaignId: dataset.campaign.id,
      dataQuality: dataset.dataQuality.overall,
      model: this.config.model
    };

    return modelError;
  }

  // Helper methods

  private calculateAverage(metrics: PerformanceMetric[], metricType: string): number {
    const relevantMetrics = metrics.filter(m => m.metric === metricType);
    if (relevantMetrics.length === 0) return 0;
    
    const sum = relevantMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / relevantMetrics.length;
  }

  private calculateTrendDirection(metrics: PerformanceMetric[]): 'increasing' | 'decreasing' | 'stable' {
    if (metrics.length < 2) return 'stable';

    const sortedMetrics = metrics.sort((a, b) => a.date.getTime() - b.date.getTime());
    const firstHalf = sortedMetrics.slice(0, Math.floor(sortedMetrics.length / 2));
    const secondHalf = sortedMetrics.slice(Math.floor(sortedMetrics.length / 2));

    const firstAvg = firstHalf.reduce((acc, m) => acc + m.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((acc, m) => acc + m.value, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.05) return 'increasing';
    if (change < -0.05) return 'decreasing';
    return 'stable';
  }

  private formatDemographics(demographics: any): string {
    const { ageRange, gender, locations } = demographics;
    return `${gender}, ages ${ageRange[0]}-${ageRange[1]}, ${locations.slice(0, 3).join(', ')}`;
  }

  private summarizeCompetitorActivity(competitors: any[]): string {
    if (!competitors || competitors.length === 0) {
      return 'Low competitive activity detected';
    }

    const avgActivity = competitors.reduce((acc, c) => acc + (c.value || 0), 0) / competitors.length;
    
    if (avgActivity > 0.7) return 'High competitive activity with multiple active campaigns';
    if (avgActivity > 0.4) return 'Moderate competitive activity in the market';
    return 'Low to moderate competitive activity';
  }

  private summarizeSeasonalFactors(trends: any[]): string {
    if (!trends || trends.length === 0) {
      return 'No significant seasonal patterns detected';
    }

    const avgTrend = trends.reduce((acc, t) => acc + (t.trend || 0), 0) / trends.length;
    
    if (avgTrend > 0.1) return 'Positive seasonal trends expected';
    if (avgTrend < -0.1) return 'Negative seasonal trends expected';
    return 'Neutral seasonal conditions';
  }

  private summarizeIndustryTrends(benchmarks: any[]): string {
    if (!benchmarks || benchmarks.length === 0) {
      return 'Industry benchmarks not available';
    }

    return `Industry performance trending within normal ranges`;
  }
}