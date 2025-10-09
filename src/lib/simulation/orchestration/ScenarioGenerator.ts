/**
 * ScenarioGenerator
 * 
 * Generates multiple trajectory scenarios (optimistic, realistic, pessimistic)
 * with probability calculations and market factor adjustments.
 */

import {
  TrajectoryPoint,
  ScenarioConfig,
  ScenarioResult,
  ScenarioAdjustment,
  MarketDataset,
  DateRange,
  SimulationContext
} from '../../../types/simulation';

export interface ScenarioGenerationOptions {
  includeMarketFactors?: boolean;
  includeSeasonality?: boolean;
  includeCompetition?: boolean;
  confidenceLevel?: number;
}

export interface ScenarioFactors {
  marketVolatility: number;
  competitorActivity: number;
  seasonalTrends: number;
  creativeFatigue: number;
  budgetConstraints: number;
}

export class ScenarioGenerator {
  private readonly PERCENTILE_MAPPINGS = {
    optimistic: 75,
    realistic: 50,
    pessimistic: 25,
    custom: 50 // Default, can be overridden
  };

  private readonly SCENARIO_PROBABILITIES = {
    optimistic: 0.25,
    realistic: 0.50,
    pessimistic: 0.25,
    custom: 0.33 // Default for custom scenarios
  };

  /**
   * Generate multiple trajectory scenarios based on base predictions
   */
  async generateScenarios(
    baseTrajectory: TrajectoryPoint[],
    scenarioConfigs: ScenarioConfig[],
    context: SimulationContext,
    options: ScenarioGenerationOptions = {}
  ): Promise<ScenarioResult[]> {
    const scenarios: ScenarioResult[] = [];

    for (const config of scenarioConfigs) {
      try {
        const scenario = await this.generateSingleScenario(
          baseTrajectory,
          config,
          context,
          options
        );
        scenarios.push(scenario);
      } catch (error) {
        console.error(`Failed to generate scenario ${config.type}:`, error);
        // Continue with other scenarios even if one fails
      }
    }

    // Normalize probabilities to sum to 1.0
    this.normalizeProbabilities(scenarios);

    return scenarios;
  }

  /**
   * Generate a single scenario with adjustments
   */
  private async generateSingleScenario(
    baseTrajectory: TrajectoryPoint[],
    config: ScenarioConfig,
    context: SimulationContext,
    options: ScenarioGenerationOptions
  ): Promise<ScenarioResult> {
    // Step 1: Apply percentile adjustments
    let adjustedTrajectory = this.applyPercentileAdjustment(
      baseTrajectory,
      config.percentile || this.PERCENTILE_MAPPINGS[config.type]
    );

    // Step 2: Apply scenario-specific adjustments
    if (config.adjustments && config.adjustments.length > 0) {
      adjustedTrajectory = await this.applyScenarioAdjustments(
        adjustedTrajectory,
        config.adjustments,
        context
      );
    }

    // Step 3: Apply market factors if enabled
    if (options.includeMarketFactors) {
      adjustedTrajectory = await this.applyMarketFactors(
        adjustedTrajectory,
        context.dataset.marketData,
        config.type
      );
    }

    // Step 4: Calculate scenario probability
    const probability = this.calculateScenarioProbability(
      config,
      baseTrajectory,
      adjustedTrajectory,
      context
    );

    // Step 5: Identify key factors influencing this scenario
    const keyFactors = this.identifyKeyFactors(
      config,
      adjustedTrajectory,
      context
    );

    // Step 6: Calculate confidence score
    const confidence = this.calculateScenarioConfidence(
      config,
      context,
      options
    );

    return {
      type: config.type,
      probability,
      trajectory: adjustedTrajectory,
      key_factors: keyFactors,
      confidence
    };
  }

  /**
   * Apply percentile-based adjustments to trajectory
   */
  private applyPercentileAdjustment(
    trajectory: TrajectoryPoint[],
    percentile: number
  ): TrajectoryPoint[] {
    const adjustmentFactor = this.percentileToAdjustmentFactor(percentile);

    return trajectory.map(point => ({
      ...point,
      metrics: Object.entries(point.metrics).reduce((adjusted, [metric, value]) => {
        // Apply different adjustment strategies based on metric type
        const adjustedValue = this.adjustMetricByPercentile(
          metric,
          value,
          adjustmentFactor
        );
        
        adjusted[metric] = Math.max(0, adjustedValue); // Ensure non-negative values
        return adjusted;
      }, {} as Record<string, number>),
      confidence: point.confidence * (0.8 + (percentile / 100) * 0.4) // Adjust confidence based on percentile
    }));
  }

  /**
   * Apply scenario-specific adjustments
   */
  private async applyScenarioAdjustments(
    trajectory: TrajectoryPoint[],
    adjustments: ScenarioAdjustment[],
    context: SimulationContext
  ): Promise<TrajectoryPoint[]> {
    let adjustedTrajectory = [...trajectory];

    for (const adjustment of adjustments) {
      adjustedTrajectory = this.applyAdjustment(
        adjustedTrajectory,
        adjustment,
        context
      );
    }

    return adjustedTrajectory;
  }

  /**
   * Apply market factors to trajectory
   */
  private async applyMarketFactors(
    trajectory: TrajectoryPoint[],
    marketData: MarketDataset,
    scenarioType: string
  ): Promise<TrajectoryPoint[]> {
    const factors = this.calculateScenarioFactors(marketData, scenarioType);

    return trajectory.map((point, index) => {
      const timeBasedFactor = this.calculateTimeBasedFactor(index, trajectory.length);
      
      return {
        ...point,
        metrics: Object.entries(point.metrics).reduce((adjusted, [metric, value]) => {
          let adjustedValue = value;

          // Apply market volatility
          adjustedValue *= (1 + factors.marketVolatility * timeBasedFactor);

          // Apply competitor activity impact
          adjustedValue *= (1 - factors.competitorActivity * 0.1);

          // Apply seasonal trends
          adjustedValue *= (1 + factors.seasonalTrends * Math.sin(index * Math.PI / 30));

          // Apply creative fatigue (increases over time)
          adjustedValue *= (1 - factors.creativeFatigue * (index / trajectory.length));

          adjusted[metric] = Math.max(0, adjustedValue);
          return adjusted;
        }, {} as Record<string, number>)
      };
    });
  }

  /**
   * Calculate scenario-specific factors from market data
   */
  private calculateScenarioFactors(
    marketData: MarketDataset,
    scenarioType: string
  ): ScenarioFactors {
    const baseVolatility = marketData.marketVolatility.overall;
    const competitorCount = marketData.competitorActivity.length;
    const trendStrength = this.calculateTrendStrength(marketData.seasonalTrends);

    // Adjust factors based on scenario type
    const multiplier = scenarioType === 'optimistic' ? 0.5 : 
                     scenarioType === 'pessimistic' ? 1.5 : 1.0;

    return {
      marketVolatility: baseVolatility * multiplier,
      competitorActivity: Math.min(competitorCount / 10, 1.0) * multiplier,
      seasonalTrends: trendStrength,
      creativeFatigue: 0.1 * multiplier,
      budgetConstraints: 0.05 * multiplier
    };
  }

  /**
   * Apply a single adjustment to trajectory
   */
  private applyAdjustment(
    trajectory: TrajectoryPoint[],
    adjustment: ScenarioAdjustment,
    context: SimulationContext
  ): TrajectoryPoint[] {
    const timeframe = adjustment.timeframe || {
      start: trajectory[0].date,
      end: trajectory[trajectory.length - 1].date
    };

    return trajectory.map(point => {
      // Check if point is within adjustment timeframe
      if (point.date >= timeframe.start && point.date <= timeframe.end) {
        return {
          ...point,
          metrics: Object.entries(point.metrics).reduce((adjusted, [metric, value]) => {
            adjusted[metric] = this.applyFactorAdjustment(
              value,
              adjustment.factor,
              adjustment.multiplier
            );
            return adjusted;
          }, {} as Record<string, number>)
        };
      }
      return point;
    });
  }

  /**
   * Apply factor-specific adjustments
   */
  private applyFactorAdjustment(
    value: number,
    factor: ScenarioAdjustment['factor'],
    multiplier: number
  ): number {
    switch (factor) {
      case 'budget':
        // Budget changes affect reach and impressions more than engagement
        return value * multiplier;
      
      case 'competition':
        // Competition affects CTR and conversion rates more
        return value * (1 - (1 - multiplier) * 0.8);
      
      case 'seasonality':
        // Seasonal effects vary by metric type
        return value * multiplier;
      
      case 'creative_fatigue':
        // Creative fatigue primarily affects engagement and CTR
        return value * (1 - (1 - multiplier) * 0.6);
      
      default:
        return value * multiplier;
    }
  }

  /**
   * Calculate probability for a scenario
   */
  private calculateScenarioProbability(
    config: ScenarioConfig,
    baseTrajectory: TrajectoryPoint[],
    adjustedTrajectory: TrajectoryPoint[],
    context: SimulationContext
  ): number {
    // Start with base probability
    let probability = this.SCENARIO_PROBABILITIES[config.type] || 0.33;

    // Adjust based on data quality - more aggressive adjustment
    const dataQuality = context.dataset.dataQuality.overall;
    probability *= (0.2 + dataQuality * 0.8); // Scale from 0.2 to 1.0

    // Adjust based on historical performance similarity
    const historicalSimilarity = this.calculateHistoricalSimilarity(
      adjustedTrajectory,
      context
    );
    probability *= (0.5 + historicalSimilarity * 0.5);

    // Adjust based on market conditions
    const marketStability = 1 - context.dataset.marketData.marketVolatility.overall;
    probability *= (0.7 + marketStability * 0.3);

    // Ensure probability is within valid range
    return Math.max(0.01, Math.min(0.99, probability));
  }

  /**
   * Identify key factors influencing the scenario
   */
  private identifyKeyFactors(
    config: ScenarioConfig,
    trajectory: TrajectoryPoint[],
    context: SimulationContext
  ): string[] {
    const factors: string[] = [];

    // Add scenario-specific factors
    switch (config.type) {
      case 'optimistic':
        factors.push('favorable_market_conditions', 'strong_creative_performance');
        break;
      case 'pessimistic':
        factors.push('increased_competition', 'market_volatility');
        break;
      case 'realistic':
        factors.push('current_market_trends', 'historical_performance');
        break;
    }

    // Add factors based on adjustments
    if (config.adjustments) {
      config.adjustments.forEach(adj => {
        factors.push(`${adj.factor}_adjustment`);
      });
    }

    // Add market-based factors
    const marketData = context.dataset.marketData;
    if (marketData.marketVolatility.overall > 0.3) {
      factors.push('high_market_volatility');
    }
    if (marketData.competitorActivity.length > 5) {
      factors.push('competitive_market');
    }

    // Add seasonal factors
    const seasonalStrength = this.calculateTrendStrength(marketData.seasonalTrends);
    if (seasonalStrength > 0.2) {
      factors.push('seasonal_trends');
    }

    return factors;
  }

  /**
   * Calculate confidence score for scenario
   */
  private calculateScenarioConfidence(
    config: ScenarioConfig,
    context: SimulationContext,
    options: ScenarioGenerationOptions
  ): number {
    let confidence = 0.8; // Base confidence

    // Adjust based on data quality - more aggressive adjustment
    const dataQuality = context.dataset.dataQuality.overall;
    confidence *= (0.3 + dataQuality * 0.7); // Scale from 0.3 to 1.0 based on quality

    // Adjust based on historical data availability
    const historicalDataPoints = context.dataset.historicalPerformance.length;
    const historicalFactor = Math.min(historicalDataPoints / 30, 1.0); // 30 days ideal
    confidence *= (0.6 + historicalFactor * 0.4);

    // Adjust based on external data availability
    const externalDataSources = context.request.externalDataSources.length;
    const externalFactor = Math.min(externalDataSources / 3, 1.0); // 3 sources ideal
    confidence *= (0.8 + externalFactor * 0.2);

    // Realistic scenarios typically have higher confidence
    if (config.type === 'realistic') {
      confidence *= 1.1;
    } else if (config.type === 'custom') {
      confidence *= 0.9; // Custom scenarios have slightly lower confidence
    }

    return Math.max(0.1, Math.min(0.99, confidence));
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private percentileToAdjustmentFactor(percentile: number): number {
    // Convert percentile (0-100) to adjustment factor
    // 50th percentile = 1.0 (no adjustment)
    // 75th percentile = 1.3 (30% increase)
    // 25th percentile = 0.7 (30% decrease)
    return 0.4 + (percentile / 100) * 1.2;
  }

  private adjustMetricByPercentile(
    metric: string,
    value: number,
    adjustmentFactor: number
  ): number {
    // Different metrics respond differently to percentile adjustments
    switch (metric) {
      case 'ctr':
      case 'engagement':
        // Performance metrics are more sensitive to adjustments
        return value * Math.pow(adjustmentFactor, 1.2);
      
      case 'impressions':
      case 'reach':
        // Volume metrics are less sensitive
        return value * Math.pow(adjustmentFactor, 0.8);
      
      case 'cpc':
      case 'cpm':
        // Cost metrics have inverse relationship
        return value / Math.pow(adjustmentFactor, 0.6);
      
      default:
        return value * adjustmentFactor;
    }
  }

  private calculateTimeBasedFactor(index: number, totalPoints: number): number {
    // Create a factor that varies over time (0.5 to 1.5)
    return 0.5 + Math.sin((index / totalPoints) * Math.PI);
  }

  private calculateTrendStrength(trends: any[]): number {
    if (!trends || trends.length === 0) return 0;
    
    // Calculate average trend strength
    const avgTrend = trends.reduce((sum, trend) => sum + Math.abs(trend.trend || 0), 0) / trends.length;
    return Math.min(avgTrend / 100, 1.0); // Normalize to 0-1
  }

  private calculateHistoricalSimilarity(
    trajectory: TrajectoryPoint[],
    context: SimulationContext
  ): number {
    // Placeholder implementation - would compare with historical patterns
    const historicalData = context.dataset.historicalPerformance;
    if (!historicalData || historicalData.length === 0) return 0.5;

    // Simple similarity calculation based on trend direction
    // In a real implementation, this would use more sophisticated pattern matching
    return 0.7; // Placeholder value
  }

  private normalizeProbabilities(scenarios: ScenarioResult[]): void {
    const totalProbability = scenarios.reduce((sum, scenario) => sum + scenario.probability, 0);
    
    if (totalProbability > 0 && totalProbability !== 1.0) {
      scenarios.forEach(scenario => {
        scenario.probability = scenario.probability / totalProbability;
      });
    }
  }
}