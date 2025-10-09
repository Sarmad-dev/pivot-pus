/**
 * RecommendationImpactEstimator
 *
 * Provides "what-if" scenario simulation for testing pivot recommendations,
 * impact estimation algorithms, and confidence scoring for recommendation effectiveness.
 */

import {
  PivotRecommendation,
  TrajectoryPoint,
  SimulationContext,
} from "../../../types/simulation";
import { RecommendationContext } from "./PivotRecommendationEngine";

export interface ImpactEstimationOptions {
  simulationDays?: number;
  confidenceLevel?: number;
  includeUncertainty?: boolean;
  marketFactorWeight?: number;
}

export interface ImpactEstimationResult {
  recommendation: PivotRecommendation;
  estimatedImpact: {
    metric: string;
    baselineValue: number;
    projectedValue: number;
    improvement: number;
    confidence: number;
  };
  simulationPreview: TrajectoryPoint[];
  uncertaintyBounds: {
    lower: TrajectoryPoint[];
    upper: TrajectoryPoint[];
  };
  riskFactors: string[];
  implementationComplexity: {
    score: number;
    factors: string[];
    timeline: string;
  };
}

export interface WhatIfScenario {
  scenarioId: string;
  description: string;
  parameters: Record<string, any>;
  projectedOutcome: TrajectoryPoint[];
  confidence: number;
  comparisonToBaseline: {
    improvement: number;
    significance: number;
  };
}

export class RecommendationImpactEstimator {
  private readonly DEFAULT_OPTIONS: Required<ImpactEstimationOptions> = {
    simulationDays: 30,
    confidenceLevel: 0.8,
    includeUncertainty: true,
    marketFactorWeight: 0.3,
  };

  /**
   * Estimate the impact of a specific recommendation
   */
  async estimateRecommendationImpact(
    recommendation: PivotRecommendation,
    context: RecommendationContext,
    options: ImpactEstimationOptions = {}
  ): Promise<ImpactEstimationResult> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      // Generate baseline projection
      const baselineProjection = await this.generateBaselineProjection(
        context.currentTrajectory,
        opts.simulationDays
      );

      // Apply recommendation effects
      const impactedProjection = await this.applyRecommendationEffects(
        baselineProjection,
        recommendation,
        context,
        opts
      );

      // Calculate impact metrics
      const estimatedImpact = this.calculateImpactMetrics(
        baselineProjection,
        impactedProjection,
        recommendation.impact_estimate.metric
      );

      // Generate uncertainty bounds
      const uncertaintyBounds = opts.includeUncertainty
        ? await this.generateUncertaintyBounds(
            impactedProjection,
            recommendation,
            context,
            opts
          )
        : { lower: [], upper: [] };

      // Assess risk factors
      const riskFactors = this.assessImplementationRisks(
        recommendation,
        context
      );

      // Calculate implementation complexity
      const implementationComplexity = this.calculateImplementationComplexity(
        recommendation,
        context
      );

      return {
        recommendation,
        estimatedImpact,
        simulationPreview: impactedProjection,
        uncertaintyBounds,
        riskFactors,
        implementationComplexity,
      };
    } catch (error) {
      console.error("Error estimating recommendation impact:", error);
      throw new Error(
        `Failed to estimate impact for recommendation ${recommendation.id}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Run "what-if" scenario simulation for multiple recommendation combinations
   */
  async runWhatIfScenarios(
    recommendations: PivotRecommendation[],
    context: RecommendationContext,
    options: ImpactEstimationOptions = {}
  ): Promise<WhatIfScenario[]> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const scenarios: WhatIfScenario[] = [];

    try {
      // Generate baseline for comparison
      const baseline = await this.generateBaselineProjection(
        context.currentTrajectory,
        opts.simulationDays
      );

      // Single recommendation scenarios
      for (const recommendation of recommendations) {
        const scenario = await this.createSingleRecommendationScenario(
          recommendation,
          context,
          baseline,
          opts
        );
        scenarios.push(scenario);
      }

      // Combination scenarios (top 2-3 recommendations)
      const topRecommendations = recommendations
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 3);

      if (topRecommendations.length >= 2) {
        const combinationScenarios = await this.createCombinationScenarios(
          topRecommendations,
          context,
          baseline,
          opts
        );
        scenarios.push(...combinationScenarios);
      }

      return scenarios;
    } catch (error) {
      console.error("Error running what-if scenarios:", error);
      return [];
    }
  }

  /**
   * Compare multiple recommendations side by side
   */
  async compareRecommendations(
    recommendations: PivotRecommendation[],
    context: RecommendationContext,
    options: ImpactEstimationOptions = {}
  ): Promise<
    Array<{
      recommendation: PivotRecommendation;
      impact: ImpactEstimationResult;
      ranking: number;
      pros: string[];
      cons: string[];
    }>
  > {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const comparisons: Array<any> = [];

    try {
      // Estimate impact for each recommendation
      for (const recommendation of recommendations) {
        const impact = await this.estimateRecommendationImpact(
          recommendation,
          context,
          opts
        );

        const pros = this.identifyRecommendationPros(recommendation, impact);
        const cons = this.identifyRecommendationCons(recommendation, impact);

        comparisons.push({
          recommendation,
          impact,
          ranking: 0, // Will be calculated after all impacts are estimated
          pros,
          cons,
        });
      }

      // Calculate rankings based on multiple factors
      this.calculateComparativeRankings(comparisons);

      return comparisons.sort((a, b) => a.ranking - b.ranking);
    } catch (error) {
      console.error("Error comparing recommendations:", error);
      return [];
    }
  }

  // ============================================================================
  // Baseline and Projection Methods
  // ============================================================================

  private async generateBaselineProjection(
    currentTrajectory: TrajectoryPoint[],
    days: number
  ): Promise<TrajectoryPoint[]> {
    if (currentTrajectory.length === 0) {
      return this.generateDefaultTrajectory(days);
    }

    const projection: TrajectoryPoint[] = [...currentTrajectory];
    const lastPoint = currentTrajectory[currentTrajectory.length - 1];

    // Calculate trends from existing trajectory
    const trends = this.calculateMetricTrends(currentTrajectory);

    // Project forward based on trends
    for (let i = 1; i <= days; i++) {
      const projectedDate = new Date(
        lastPoint.date.getTime() + i * 24 * 60 * 60 * 1000
      );
      const projectedMetrics: Record<string, number> = {};

      Object.entries(lastPoint.metrics).forEach(([metric, value]) => {
        const trend = trends[metric] || { slope: 0, volatility: 0.1 };

        // Apply trend with some noise
        const trendEffect = trend.slope * i;
        const noiseEffect = (Math.random() - 0.5) * trend.volatility * value;

        projectedMetrics[metric] = Math.max(
          0,
          value + trendEffect + noiseEffect
        );
      });

      projection.push({
        date: projectedDate,
        metrics: projectedMetrics,
        confidence: Math.max(0.3, 0.9 - i * 0.02), // Decreasing confidence over time
      });
    }

    return projection;
  }

  private generateDefaultTrajectory(days: number): TrajectoryPoint[] {
    const trajectory: TrajectoryPoint[] = [];
    const startDate = new Date();

    // Default baseline metrics
    const baseMetrics = {
      ctr: 0.02,
      impressions: 10000,
      engagement: 0.05,
      reach: 8000,
      conversions: 50,
      cpc: 1.0,
      cpm: 10.0,
    };

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const metrics: Record<string, number> = {};

      // Add some realistic variation
      Object.entries(baseMetrics).forEach(([metric, baseValue]) => {
        const variation = 1 + (Math.random() - 0.5) * 0.2; // ±10% variation
        metrics[metric] = baseValue * variation;
      });

      trajectory.push({
        date,
        metrics,
        confidence: 0.6, // Lower confidence for default data
      });
    }

    return trajectory;
  }

  // ============================================================================
  // Recommendation Effect Application
  // ============================================================================

  private async applyRecommendationEffects(
    baselineProjection: TrajectoryPoint[],
    recommendation: PivotRecommendation,
    context: RecommendationContext,
    options: Required<ImpactEstimationOptions>
  ): Promise<TrajectoryPoint[]> {
    const impactedProjection = baselineProjection.map((point) => ({
      ...point,
    }));

    // Apply effects based on recommendation type
    switch (recommendation.type) {
      case "budget_reallocation":
        return this.applyBudgetReallocationEffects(
          impactedProjection,
          recommendation,
          context
        );

      case "creative_refresh":
        return this.applyCreativeRefreshEffects(
          impactedProjection,
          recommendation,
          context
        );

      case "audience_expansion":
        return this.applyAudienceExpansionEffects(
          impactedProjection,
          recommendation,
          context
        );

      case "channel_shift":
        return this.applyChannelShiftEffects(
          impactedProjection,
          recommendation,
          context
        );

      case "timing_adjustment":
        return this.applyTimingAdjustmentEffects(
          impactedProjection,
          recommendation,
          context
        );

      default:
        console.warn(`Unknown recommendation type: ${recommendation.type}`);
        return impactedProjection;
    }
  }

  private applyBudgetReallocationEffects(
    projection: TrajectoryPoint[],
    recommendation: PivotRecommendation,
    context: RecommendationContext
  ): TrajectoryPoint[] {
    const improvementFactor = 1 + recommendation.impact_estimate.improvement;
    const rampUpDays = 3; // Effects take time to materialize

    return projection.map((point, index) => {
      // Gradual ramp-up of effects
      const rampUpMultiplier = Math.min(1, index / rampUpDays);
      const effectiveImprovement =
        1 + (improvementFactor - 1) * rampUpMultiplier;

      return {
        ...point,
        metrics: {
          ...point.metrics,
          roi: (point.metrics.roi || 1.0) * effectiveImprovement,
          cpc: (point.metrics.cpc || 1.0) / effectiveImprovement,
          conversions: (point.metrics.conversions || 0) * effectiveImprovement,
        },
      };
    });
  }

  private applyCreativeRefreshEffects(
    projection: TrajectoryPoint[],
    recommendation: PivotRecommendation,
    context: RecommendationContext
  ): TrajectoryPoint[] {
    const improvementFactor = 1 + recommendation.impact_estimate.improvement;
    const implementationDelay = 5; // Creative refresh takes time
    const fatigueRecovery = 7; // Recovery period

    return projection.map((point, index) => {
      if (index < implementationDelay) {
        // No effect during implementation
        return point;
      }

      // Gradual improvement after implementation
      const daysSinceImplementation = index - implementationDelay;
      const recoveryMultiplier = Math.min(
        1,
        daysSinceImplementation / fatigueRecovery
      );
      const effectiveImprovement =
        1 + (improvementFactor - 1) * recoveryMultiplier;

      return {
        ...point,
        metrics: {
          ...point.metrics,
          ctr: (point.metrics.ctr || 0.02) * effectiveImprovement,
          engagement: (point.metrics.engagement || 0.05) * effectiveImprovement,
          impressions:
            (point.metrics.impressions || 10000) *
            Math.sqrt(effectiveImprovement),
        },
      };
    });
  }

  private applyAudienceExpansionEffects(
    projection: TrajectoryPoint[],
    recommendation: PivotRecommendation,
    context: RecommendationContext
  ): TrajectoryPoint[] {
    const improvementFactor = 1 + recommendation.impact_estimate.improvement;
    const testingPeriod = 7; // Testing period before full rollout
    const scalingPeriod = 14; // Time to fully scale

    return projection.map((point, index) => {
      if (index < testingPeriod) {
        // Small increase during testing
        const testingMultiplier = 1.05;
        return {
          ...point,
          metrics: {
            ...point.metrics,
            reach: (point.metrics.reach || 8000) * testingMultiplier,
            impressions:
              (point.metrics.impressions || 10000) * testingMultiplier,
          },
        };
      }

      // Gradual scaling after testing
      const daysSinceScaling = index - testingPeriod;
      const scalingMultiplier = Math.min(1, daysSinceScaling / scalingPeriod);
      const effectiveImprovement =
        1 + (improvementFactor - 1) * scalingMultiplier;

      return {
        ...point,
        metrics: {
          ...point.metrics,
          reach: (point.metrics.reach || 8000) * effectiveImprovement,
          impressions:
            (point.metrics.impressions || 10000) * effectiveImprovement,
          // Slight decrease in efficiency due to broader audience
          ctr: (point.metrics.ctr || 0.02) * (0.95 + 0.05 * scalingMultiplier),
        },
      };
    });
  }

  private applyChannelShiftEffects(
    projection: TrajectoryPoint[],
    recommendation: PivotRecommendation,
    context: RecommendationContext
  ): TrajectoryPoint[] {
    const improvementFactor = 1 + recommendation.impact_estimate.improvement;
    const setupPeriod = 7; // Time to set up new channel
    const learningPeriod = 14; // Time to optimize new channel

    return projection.map((point, index) => {
      if (index < setupPeriod) {
        // Slight decrease during setup (resources diverted)
        return {
          ...point,
          metrics: {
            ...point.metrics,
            impressions: (point.metrics.impressions || 10000) * 0.95,
          },
        };
      }

      // Gradual improvement as new channel is optimized
      const daysSinceSetup = index - setupPeriod;
      const learningMultiplier = Math.min(1, daysSinceSetup / learningPeriod);
      const effectiveImprovement =
        1 + (improvementFactor - 1) * learningMultiplier;

      return {
        ...point,
        metrics: {
          ...point.metrics,
          cpc: (point.metrics.cpc || 1.0) / effectiveImprovement,
          reach: (point.metrics.reach || 8000) * effectiveImprovement,
          impressions:
            (point.metrics.impressions || 10000) * effectiveImprovement,
        },
      };
    });
  }

  private applyTimingAdjustmentEffects(
    projection: TrajectoryPoint[],
    recommendation: PivotRecommendation,
    context: RecommendationContext
  ): TrajectoryPoint[] {
    const improvementFactor = 1 + recommendation.impact_estimate.improvement;
    const implementationDelay = 1; // Quick to implement

    return projection.map((point, index) => {
      if (index < implementationDelay) {
        return point;
      }

      // Immediate improvement after implementation
      return {
        ...point,
        metrics: {
          ...point.metrics,
          impressions: (point.metrics.impressions || 10000) * improvementFactor,
          reach: (point.metrics.reach || 8000) * improvementFactor,
          ctr: (point.metrics.ctr || 0.02) * Math.sqrt(improvementFactor), // Smaller CTR improvement
        },
      };
    });
  }

  // ============================================================================
  // Impact Calculation Methods
  // ============================================================================

  private calculateImpactMetrics(
    baseline: TrajectoryPoint[],
    impacted: TrajectoryPoint[],
    primaryMetric: string
  ): any {
    if (baseline.length === 0 || impacted.length === 0) {
      return {
        metric: primaryMetric,
        baselineValue: 0,
        projectedValue: 0,
        improvement: 0,
        confidence: 0,
      };
    }

    // Calculate average values for the primary metric
    const baselineValues = baseline.map(
      (point) => point.metrics[primaryMetric] || 0
    );
    const impactedValues = impacted.map(
      (point) => point.metrics[primaryMetric] || 0
    );

    const baselineAvg =
      baselineValues.reduce((sum, val) => sum + val, 0) / baselineValues.length;
    const impactedAvg =
      impactedValues.reduce((sum, val) => sum + val, 0) / impactedValues.length;

    const improvement =
      baselineAvg > 0 ? (impactedAvg - baselineAvg) / baselineAvg : 0;

    // Calculate confidence based on consistency of improvement
    const confidence = this.calculateImpactConfidence(
      baselineValues,
      impactedValues
    );

    return {
      metric: primaryMetric,
      baselineValue: baselineAvg,
      projectedValue: impactedAvg,
      improvement,
      confidence,
    };
  }

  private calculateImpactConfidence(
    baseline: number[],
    impacted: number[]
  ): number {
    if (baseline.length !== impacted.length || baseline.length === 0) {
      return 0.5;
    }

    // Calculate how consistently the impacted values are better than baseline
    let improvementCount = 0;
    for (let i = 0; i < baseline.length; i++) {
      if (impacted[i] > baseline[i]) {
        improvementCount++;
      }
    }

    const consistencyRatio = improvementCount / baseline.length;

    // Base confidence from consistency, adjusted for sample size
    let confidence = consistencyRatio * 0.8;

    // Adjust for sample size (more data points = higher confidence)
    const sampleSizeBonus = Math.min(0.2, baseline.length / 100);
    confidence += sampleSizeBonus;

    return Math.min(0.95, Math.max(0.3, confidence));
  }

  // ============================================================================
  // Uncertainty and Risk Assessment
  // ============================================================================

  private async generateUncertaintyBounds(
    projection: TrajectoryPoint[],
    recommendation: PivotRecommendation,
    context: RecommendationContext,
    options: Required<ImpactEstimationOptions>
  ): Promise<{ lower: TrajectoryPoint[]; upper: TrajectoryPoint[] }> {
    const uncertaintyFactor = this.calculateUncertaintyFactor(
      recommendation,
      context
    );

    const lowerBound = projection.map((point) => ({
      ...point,
      metrics: Object.fromEntries(
        Object.entries(point.metrics).map(([metric, value]) => [
          metric,
          value * (1 - uncertaintyFactor),
        ])
      ),
    }));

    const upperBound = projection.map((point) => ({
      ...point,
      metrics: Object.fromEntries(
        Object.entries(point.metrics).map(([metric, value]) => [
          metric,
          value * (1 + uncertaintyFactor),
        ])
      ),
    }));

    return { lower: lowerBound, upper: upperBound };
  }

  private calculateUncertaintyFactor(
    recommendation: PivotRecommendation,
    context: RecommendationContext
  ): number {
    let baseFactor = 0.2; // 20% base uncertainty

    // Adjust based on recommendation type
    const typeUncertainty: Record<string, number> = {
      budget_reallocation: 0.15, // Lower uncertainty
      creative_refresh: 0.25, // Higher uncertainty
      audience_expansion: 0.3, // Highest uncertainty
      channel_shift: 0.35, // Very high uncertainty
      timing_adjustment: 0.1, // Lowest uncertainty
    };

    baseFactor = typeUncertainty[recommendation.type] || baseFactor;

    // Adjust based on confidence
    const confidenceAdjustment =
      (1 - recommendation.impact_estimate.confidence) * 0.2;
    baseFactor += confidenceAdjustment;

    // Adjust based on data quality
    const dataQuality =
      context.simulationContext?.dataset?.dataQuality?.overall || 0.7;
    const dataQualityAdjustment = (1 - dataQuality) * 0.15;
    baseFactor += dataQualityAdjustment;

    return Math.min(0.5, baseFactor); // Cap at 50% uncertainty
  }

  private assessImplementationRisks(
    recommendation: PivotRecommendation,
    context: RecommendationContext
  ): string[] {
    const risks: string[] = [];

    // Common risks based on recommendation type
    switch (recommendation.type) {
      case "budget_reallocation":
        risks.push("Temporary performance dip during transition");
        if (recommendation.impact_estimate.improvement > 0.3) {
          risks.push("Overly optimistic projections");
        }
        break;

      case "creative_refresh":
        risks.push("New creatives may not resonate with audience");
        risks.push("Development and approval time delays");
        if (context.campaignData.creativeAssets.length < 3) {
          risks.push("Limited creative testing capacity");
        }
        break;

      case "audience_expansion":
        risks.push("New audiences may have different behavior patterns");
        risks.push("Increased competition in expanded segments");
        if (recommendation.impact_estimate.improvement > 0.2) {
          risks.push("Audience expansion may dilute performance");
        }
        break;

      case "channel_shift":
        risks.push("Learning curve on new platform");
        risks.push("Different audience behavior on new channel");
        risks.push("Platform-specific optimization requirements");
        break;

      case "timing_adjustment":
        risks.push("Seasonal factors may override timing benefits");
        if (context.currentTrajectory.length < 7) {
          risks.push("Insufficient data to validate timing patterns");
        }
        break;
    }

    // Add effort-based risks
    if (recommendation.implementation.effort === "high") {
      risks.push("High implementation complexity");
      risks.push("Resource allocation challenges");
    }

    return risks;
  }

  private calculateImplementationComplexity(
    recommendation: PivotRecommendation,
    context: RecommendationContext
  ): any {
    let complexityScore = 0;
    const factors: string[] = [];

    // Base complexity by type
    const typeComplexity: Record<string, number> = {
      budget_reallocation: 2,
      creative_refresh: 6,
      audience_expansion: 5,
      channel_shift: 8,
      timing_adjustment: 1,
    };

    complexityScore = typeComplexity[recommendation.type] || 5;

    // Adjust based on implementation steps
    const stepCount = recommendation.implementation.steps.length;
    if (stepCount > 5) {
      complexityScore += 2;
      factors.push("Multiple implementation steps");
    }

    // Adjust based on effort level
    const effortMultiplier = {
      low: 1,
      medium: 1.5,
      high: 2,
    };
    complexityScore *= effortMultiplier[recommendation.implementation.effort];
    factors.push(`${recommendation.implementation.effort} effort level`);

    // Adjust based on expected impact (higher impact = more complex to achieve)
    if (recommendation.impact_estimate.improvement > 0.25) {
      complexityScore += 1;
      factors.push("High expected impact");
    }

    // Determine timeline category
    let timeline = recommendation.implementation.timeline;
    if (complexityScore > 7) {
      timeline = "7-14 days";
    } else if (complexityScore > 4) {
      timeline = "3-7 days";
    } else {
      timeline = "1-3 days";
    }

    return {
      score: Math.min(10, complexityScore),
      factors,
      timeline,
    };
  }

  // ============================================================================
  // What-If Scenario Methods
  // ============================================================================

  private async createSingleRecommendationScenario(
    recommendation: PivotRecommendation,
    context: RecommendationContext,
    baseline: TrajectoryPoint[],
    options: Required<ImpactEstimationOptions>
  ): Promise<WhatIfScenario> {
    const projectedOutcome = await this.applyRecommendationEffects(
      baseline,
      recommendation,
      context,
      options
    );

    const comparison = this.compareToBaseline(baseline, projectedOutcome);

    return {
      scenarioId: `single_${recommendation.id}`,
      description: `Implementing ${recommendation.type}: ${recommendation.implementation.description}`,
      parameters: {
        recommendationType: recommendation.type,
        expectedImprovement: recommendation.impact_estimate.improvement,
        implementationEffort: recommendation.implementation.effort,
      },
      projectedOutcome,
      confidence: recommendation.impact_estimate.confidence,
      comparisonToBaseline: comparison,
    };
  }

  private async createCombinationScenarios(
    recommendations: PivotRecommendation[],
    context: RecommendationContext,
    baseline: TrajectoryPoint[],
    options: Required<ImpactEstimationOptions>
  ): Promise<WhatIfScenario[]> {
    const scenarios: WhatIfScenario[] = [];

    // Create pairwise combinations
    for (let i = 0; i < recommendations.length - 1; i++) {
      for (let j = i + 1; j < recommendations.length; j++) {
        const combo = [recommendations[i], recommendations[j]];

        // Check if combination is feasible
        if (this.isCombinationFeasible(combo)) {
          const scenario = await this.createCombinationScenario(
            combo,
            context,
            baseline,
            options
          );
          scenarios.push(scenario);
        }
      }
    }

    return scenarios;
  }

  private async createCombinationScenario(
    recommendations: PivotRecommendation[],
    context: RecommendationContext,
    baseline: TrajectoryPoint[],
    options: Required<ImpactEstimationOptions>
  ): Promise<WhatIfScenario> {
    let projectedOutcome = [...baseline];

    // Apply effects sequentially (order matters)
    for (const recommendation of recommendations) {
      projectedOutcome = await this.applyRecommendationEffects(
        projectedOutcome,
        recommendation,
        context,
        options
      );
    }

    // Account for interaction effects (combinations may be less effective)
    const interactionFactor = this.calculateInteractionFactor(recommendations);
    projectedOutcome = this.applyInteractionEffects(
      projectedOutcome,
      interactionFactor
    );

    const comparison = this.compareToBaseline(baseline, projectedOutcome);

    // Combined confidence is lower than individual confidences
    const combinedConfidence = recommendations.reduce(
      (acc, rec) => acc * rec.impact_estimate.confidence,
      1
    );

    return {
      scenarioId: `combo_${recommendations.map((r) => r.id).join("_")}`,
      description: `Combining: ${recommendations.map((r) => r.type).join(" + ")}`,
      parameters: {
        recommendationTypes: recommendations.map((r) => r.type),
        combinedImprovement: recommendations.reduce(
          (sum, r) => sum + r.impact_estimate.improvement,
          0
        ),
        interactionFactor,
      },
      projectedOutcome,
      confidence: combinedConfidence,
      comparisonToBaseline: comparison,
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private calculateMetricTrends(
    trajectory: TrajectoryPoint[]
  ): Record<string, any> {
    const trends: Record<string, any> = {};

    if (trajectory.length < 2) return trends;

    // Get all unique metrics
    const metrics = new Set<string>();
    trajectory.forEach((point) => {
      Object.keys(point.metrics).forEach((metric) => metrics.add(metric));
    });

    // Calculate trend for each metric
    metrics.forEach((metric) => {
      const values = trajectory.map((point) => point.metrics[metric] || 0);
      const trend = this.calculateLinearTrend(values);

      trends[metric] = {
        slope: trend.slope,
        volatility: trend.volatility,
      };
    });

    return trends;
  }

  private calculateLinearTrend(values: number[]): {
    slope: number;
    volatility: number;
  } {
    if (values.length < 2) {
      return { slope: 0, volatility: 0.1 };
    }

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const denominator = n * sumXX - sumX * sumX;
    const slope =
      denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;

    // Calculate volatility as standard deviation of residuals
    const mean = sumY / n;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const volatility = Math.sqrt(variance) / mean || 0.1;

    return { slope, volatility: Math.max(0.05, Math.min(0.5, volatility)) };
  }

  private compareToBaseline(
    baseline: TrajectoryPoint[],
    projected: TrajectoryPoint[]
  ): any {
    if (baseline.length === 0 || projected.length === 0) {
      return { improvement: 0, significance: 0 };
    }

    // Calculate overall improvement across all metrics
    const baselineTotal = this.calculateTotalValue(baseline);
    const projectedTotal = this.calculateTotalValue(projected);

    const improvement =
      baselineTotal > 0 ? (projectedTotal - baselineTotal) / baselineTotal : 0;

    // Calculate significance based on consistency of improvement
    const significance = this.calculateSignificance(baseline, projected);

    return { improvement, significance };
  }

  private calculateTotalValue(trajectory: TrajectoryPoint[]): number {
    return trajectory.reduce((total, point) => {
      const pointValue = Object.values(point.metrics).reduce(
        (sum, val) => sum + val,
        0
      );
      return total + pointValue;
    }, 0);
  }

  private calculateSignificance(
    baseline: TrajectoryPoint[],
    projected: TrajectoryPoint[]
  ): number {
    // Simple significance calculation based on consistent improvement
    let improvementCount = 0;
    const minLength = Math.min(baseline.length, projected.length);

    for (let i = 0; i < minLength; i++) {
      const baseValue = this.calculateTotalValue([baseline[i]]);
      const projValue = this.calculateTotalValue([projected[i]]);

      if (projValue > baseValue) {
        improvementCount++;
      }
    }

    return minLength > 0 ? improvementCount / minLength : 0;
  }

  private isCombinationFeasible(
    recommendations: PivotRecommendation[]
  ): boolean {
    // Check for conflicting recommendation types
    const types = recommendations.map((r) => r.type);

    // Budget reallocation conflicts with channel shift
    if (
      types.includes("budget_reallocation") &&
      types.includes("channel_shift")
    ) {
      return false;
    }

    // Multiple creative refreshes don't make sense
    const creativeRefreshCount = types.filter(
      (t) => t === "creative_refresh"
    ).length;
    if (creativeRefreshCount > 1) {
      return false;
    }

    return true;
  }

  private calculateInteractionFactor(
    recommendations: PivotRecommendation[]
  ): number {
    // Combinations are typically less effective than the sum of parts
    let factor = 0.85; // 15% reduction for interaction effects

    // Adjust based on recommendation types
    const types = recommendations.map((r) => r.type);

    // Some combinations work better together
    if (
      types.includes("creative_refresh") &&
      types.includes("audience_expansion")
    ) {
      factor = 0.95; // Better synergy
    }

    if (
      types.includes("budget_reallocation") &&
      types.includes("timing_adjustment")
    ) {
      factor = 0.9; // Good synergy
    }

    return factor;
  }

  private applyInteractionEffects(
    trajectory: TrajectoryPoint[],
    interactionFactor: number
  ): TrajectoryPoint[] {
    return trajectory.map((point) => ({
      ...point,
      metrics: Object.fromEntries(
        Object.entries(point.metrics).map(([metric, value]) => [
          metric,
          value * interactionFactor,
        ])
      ),
    }));
  }

  private identifyRecommendationPros(
    recommendation: PivotRecommendation,
    impact: ImpactEstimationResult
  ): string[] {
    const pros: string[] = [];

    // Impact-based pros
    if (impact.estimatedImpact.improvement > 0.2) {
      pros.push("High expected improvement");
    }

    if (impact.estimatedImpact.confidence > 0.8) {
      pros.push("High confidence in results");
    }

    // Implementation-based pros
    if (recommendation.implementation.effort === "low") {
      pros.push("Easy to implement");
    }

    if (impact.implementationComplexity.score < 4) {
      pros.push("Low complexity");
    }

    // Type-specific pros
    switch (recommendation.type) {
      case "budget_reallocation":
        pros.push("Quick results", "No additional resources needed");
        break;
      case "timing_adjustment":
        pros.push("Immediate implementation", "No additional costs");
        break;
      case "creative_refresh":
        pros.push("Addresses audience fatigue", "Long-term benefits");
        break;
    }

    return pros;
  }

  private identifyRecommendationCons(
    recommendation: PivotRecommendation,
    impact: ImpactEstimationResult
  ): string[] {
    const cons: string[] = [];

    // Impact-based cons
    if (impact.estimatedImpact.confidence < 0.6) {
      cons.push("Low confidence in results");
    }

    if (impact.riskFactors.length > 2) {
      cons.push("Multiple risk factors");
    }

    // Implementation-based cons
    if (recommendation.implementation.effort === "high") {
      cons.push("High implementation effort");
    }

    if (impact.implementationComplexity.score > 7) {
      cons.push("High complexity");
    }

    // Add specific risk factors as cons
    cons.push(...impact.riskFactors.slice(0, 2)); // Limit to top 2 risks

    return cons;
  }

  private calculateComparativeRankings(comparisons: Array<any>): void {
    // Multi-factor ranking: impact, confidence, complexity, risk
    comparisons.forEach((comparison, index) => {
      let score = 0;

      // Impact score (40% weight)
      score += comparison.impact.estimatedImpact.improvement * 40;

      // Confidence score (30% weight)
      score += comparison.impact.estimatedImpact.confidence * 30;

      // Complexity penalty (20% weight)
      score -= (comparison.impact.implementationComplexity.score / 10) * 20;

      // Risk penalty (10% weight)
      score -= (comparison.impact.riskFactors.length / 5) * 10;

      comparison.rankingScore = score;
    });

    // Sort by score and assign rankings
    comparisons.sort((a, b) => b.rankingScore - a.rankingScore);
    comparisons.forEach((comparison, index) => {
      comparison.ranking = index + 1;
    });
  }
}
