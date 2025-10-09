/**
 * PivotRecommendationEngine
 *
 * Generates actionable pivot recommendations based on simulation results,
 * risk alerts, and campaign performance data. Provides budget reallocation,
 * creative optimization, audience expansion, and channel shift suggestions.
 */

import {
  PivotRecommendation,
  RiskAlert,
  TrajectoryPoint,
  CampaignDataset,
  SimulationContext,
  RecommendationType,
  ChannelConfig,
  AudienceConfig,
  BudgetData,
} from "../../../types/simulation";

export interface RecommendationOptions {
  maxRecommendations?: number;
  minImpactThreshold?: number; // Minimum expected improvement percentage
  minConfidenceThreshold?: number; // Minimum confidence for recommendations
  prioritizeHighImpact?: boolean;
  includeSimulationPreviews?: boolean;
}

export interface RecommendationContext {
  currentTrajectory: TrajectoryPoint[];
  risks: RiskAlert[];
  campaignData: CampaignDataset;
  simulationContext: SimulationContext;
}

export interface BudgetReallocationAnalysis {
  underperformingChannels: string[];
  overperformingChannels: string[];
  suggestedReallocations: Array<{
    from: string;
    to: string;
    amount: number;
    expectedImprovement: number;
  }>;
}

export interface CreativeOptimizationAnalysis {
  fatigueIndicators: string[];
  performingCreatives: string[];
  underperformingCreatives: string[];
  suggestedRefreshes: Array<{
    creativeId: string;
    reason: string;
    suggestedChanges: string[];
  }>;
}

export interface AudienceExpansionAnalysis {
  saturatedSegments: string[];
  expansionOpportunities: Array<{
    segment: string;
    estimatedSize: number;
    similarity: number;
    expectedPerformance: number;
  }>;
}

export class PivotRecommendationEngine {
  private readonly DEFAULT_OPTIONS: Required<RecommendationOptions> = {
    maxRecommendations: 5,
    minImpactThreshold: 0.05, // 5% minimum improvement
    minConfidenceThreshold: 0.6,
    prioritizeHighImpact: true,
    includeSimulationPreviews: false, // Disabled by default for performance
  };

  /**
   * Main method to generate all types of pivot recommendations
   */
  async generateRecommendations(
    context: RecommendationContext,
    options: RecommendationOptions = {}
  ): Promise<PivotRecommendation[]> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const recommendations: PivotRecommendation[] = [];

    try {
      // Generate budget reallocation recommendations
      const budgetRecs = await this.generateBudgetRecommendations(
        context,
        opts
      );
      recommendations.push(...budgetRecs);

      // Generate creative optimization recommendations
      const creativeRecs = await this.generateCreativeRecommendations(
        context,
        opts
      );
      recommendations.push(...creativeRecs);

      // Generate audience expansion recommendations
      const audienceRecs = await this.generateAudienceRecommendations(
        context,
        opts
      );
      recommendations.push(...audienceRecs);

      // Generate channel shift recommendations
      const channelRecs = await this.generateChannelRecommendations(
        context,
        opts
      );
      recommendations.push(...channelRecs);

      // Generate timing adjustment recommendations
      const timingRecs = await this.generateTimingRecommendations(
        context,
        opts
      );
      recommendations.push(...timingRecs);

      // Filter and rank recommendations
      const filteredRecs = this.filterRecommendations(recommendations, opts);
      return this.rankRecommendations(filteredRecs, opts);
    } catch (error) {
      console.error("Error generating pivot recommendations:", error);
      return [];
    }
  }

  /**
   * Generate budget reallocation recommendations
   */
  private async generateBudgetRecommendations(
    context: RecommendationContext,
    options: Required<RecommendationOptions>
  ): Promise<PivotRecommendation[]> {
    const recommendations: PivotRecommendation[] = [];

    // Analyze budget performance across channels
    const budgetAnalysis = this.analyzeBudgetPerformance(context);

    for (const reallocation of budgetAnalysis.suggestedReallocations) {
      if (reallocation.expectedImprovement >= options.minImpactThreshold) {
        const recommendation: PivotRecommendation = {
          id: `budget_${reallocation.from}_to_${reallocation.to}`,
          type: "budget_reallocation",
          priority: this.calculatePriority(
            reallocation.expectedImprovement,
            "budget_reallocation"
          ),
          impact_estimate: {
            metric: "roi",
            improvement: reallocation.expectedImprovement,
            confidence: this.calculateBudgetReallocationConfidence(
              reallocation,
              context
            ),
          },
          implementation: {
            description: `Reallocate $${reallocation.amount.toFixed(2)} from ${reallocation.from} to ${reallocation.to}`,
            steps: [
              `Reduce ${reallocation.from} budget by $${reallocation.amount.toFixed(2)}`,
              `Increase ${reallocation.to} budget by $${reallocation.amount.toFixed(2)}`,
              "Monitor performance for 3-5 days",
              "Adjust further based on results",
            ],
            effort: this.calculateImplementationEffort("budget_reallocation"),
            timeline: "1-2 days",
          },
        };

        // Add simulation preview if requested
        if (options.includeSimulationPreviews) {
          recommendation.simulation_preview =
            await this.generateBudgetReallocationPreview(reallocation, context);
        }

        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  /**
   * Generate creative optimization recommendations
   */
  private async generateCreativeRecommendations(
    context: RecommendationContext,
    options: Required<RecommendationOptions>
  ): Promise<PivotRecommendation[]> {
    const recommendations: PivotRecommendation[] = [];

    // Analyze creative performance and fatigue
    const creativeAnalysis = this.analyzeCreativePerformance(context);

    // Check for audience fatigue risks
    const fatigueRisks = context.risks.filter(
      (risk) => risk.type === "audience_fatigue"
    );

    if (
      fatigueRisks.length > 0 ||
      creativeAnalysis.fatigueIndicators.length > 0
    ) {
      const expectedImprovement = this.estimateCreativeRefreshImpact(
        creativeAnalysis,
        context
      );

      if (expectedImprovement >= options.minImpactThreshold) {
        const recommendation: PivotRecommendation = {
          id: "creative_refresh_fatigue",
          type: "creative_refresh",
          priority: this.calculatePriority(
            expectedImprovement,
            "creative_refresh"
          ),
          impact_estimate: {
            metric: "engagement",
            improvement: expectedImprovement,
            confidence: this.calculateCreativeRefreshConfidence(
              creativeAnalysis,
              context
            ),
          },
          implementation: {
            description: "Refresh creative assets to combat audience fatigue",
            steps: [
              "Identify underperforming creative assets",
              "Develop new creative variations",
              "A/B test new creatives against current ones",
              "Gradually replace underperforming assets",
              "Monitor engagement recovery",
            ],
            effort: "medium",
            timeline: "5-7 days",
          },
        };

        if (options.includeSimulationPreviews) {
          recommendation.simulation_preview =
            await this.generateCreativeRefreshPreview(
              creativeAnalysis,
              context
            );
        }

        recommendations.push(recommendation);
      }
    }

    // Generate specific creative optimization recommendations
    for (const refresh of creativeAnalysis.suggestedRefreshes) {
      const expectedImprovement = this.estimateSpecificCreativeImpact(
        refresh,
        context
      );

      if (expectedImprovement >= options.minImpactThreshold) {
        const recommendation: PivotRecommendation = {
          id: `creative_optimize_${refresh.creativeId}`,
          type: "creative_refresh",
          priority: this.calculatePriority(
            expectedImprovement,
            "creative_refresh"
          ),
          impact_estimate: {
            metric: "ctr",
            improvement: expectedImprovement,
            confidence: 0.7,
          },
          implementation: {
            description: `Optimize creative ${refresh.creativeId}: ${refresh.reason}`,
            steps: refresh.suggestedChanges.concat([
              "Test optimized version",
              "Monitor performance metrics",
              "Scale if successful",
            ]),
            effort: "low",
            timeline: "2-3 days",
          },
        };

        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  /**
   * Generate audience expansion recommendations
   */
  private async generateAudienceRecommendations(
    context: RecommendationContext,
    options: Required<RecommendationOptions>
  ): Promise<PivotRecommendation[]> {
    const recommendations: PivotRecommendation[] = [];

    // Analyze audience performance and saturation
    const audienceAnalysis = this.analyzeAudiencePerformance(context);

    for (const opportunity of audienceAnalysis.expansionOpportunities) {
      if (opportunity.expectedPerformance >= options.minImpactThreshold) {
        const recommendation: PivotRecommendation = {
          id: `audience_expand_${opportunity.segment}`,
          type: "audience_expansion",
          priority: this.calculatePriority(
            opportunity.expectedPerformance,
            "audience_expansion"
          ),
          impact_estimate: {
            metric: "reach",
            improvement: opportunity.expectedPerformance,
            confidence: this.calculateAudienceExpansionConfidence(
              opportunity,
              context
            ),
          },
          implementation: {
            description: `Expand to ${opportunity.segment} audience segment`,
            steps: [
              `Create lookalike audience based on ${opportunity.segment}`,
              "Start with small test budget (10-15% of total)",
              "Monitor performance vs existing segments",
              "Scale budget if performance meets targets",
              "Optimize targeting based on initial results",
            ],
            effort: "medium",
            timeline: "3-5 days",
          },
        };

        if (options.includeSimulationPreviews) {
          recommendation.simulation_preview =
            await this.generateAudienceExpansionPreview(opportunity, context);
        }

        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  /**
   * Generate channel shift recommendations
   */
  private async generateChannelRecommendations(
    context: RecommendationContext,
    options: Required<RecommendationOptions>
  ): Promise<PivotRecommendation[]> {
    const recommendations: PivotRecommendation[] = [];

    // Analyze channel performance
    const channelAnalysis = this.analyzeChannelPerformance(context);

    // Look for underperforming channels and alternative opportunities
    const underperformingChannels = channelAnalysis.underperformingChannels;
    const alternativeChannels = this.identifyAlternativeChannels(context);

    for (const altChannel of alternativeChannels) {
      const expectedImprovement = this.estimateChannelShiftImpact(
        altChannel,
        context
      );

      if (expectedImprovement >= options.minImpactThreshold) {
        const recommendation: PivotRecommendation = {
          id: `channel_shift_${altChannel.channel}`,
          type: "channel_shift",
          priority: this.calculatePriority(
            expectedImprovement,
            "channel_shift"
          ),
          impact_estimate: {
            metric: "cpc",
            improvement: expectedImprovement,
            confidence: this.calculateChannelShiftConfidence(
              altChannel,
              context
            ),
          },
          implementation: {
            description: `Shift budget to ${altChannel.channel} channel`,
            steps: [
              `Set up campaign on ${altChannel.channel}`,
              "Allocate 20% of budget for testing",
              "Run parallel campaigns for comparison",
              "Monitor cost efficiency and performance",
              "Gradually shift more budget if successful",
            ],
            effort: "high",
            timeline: "7-10 days",
          },
        };

        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  /**
   * Generate timing adjustment recommendations
   */
  private async generateTimingRecommendations(
    context: RecommendationContext,
    options: Required<RecommendationOptions>
  ): Promise<PivotRecommendation[]> {
    const recommendations: PivotRecommendation[] = [];

    // Analyze timing patterns and seasonal factors
    const timingAnalysis = this.analyzeTimingPatterns(context);

    if (timingAnalysis.suboptimalTiming) {
      const expectedImprovement = this.estimateTimingAdjustmentImpact(
        timingAnalysis,
        context
      );

      if (expectedImprovement >= options.minImpactThreshold) {
        const recommendation: PivotRecommendation = {
          id: "timing_adjustment",
          type: "timing_adjustment",
          priority: this.calculatePriority(
            expectedImprovement,
            "timing_adjustment"
          ),
          impact_estimate: {
            metric: "impressions",
            improvement: expectedImprovement,
            confidence: timingAnalysis.confidence,
          },
          implementation: {
            description: timingAnalysis.recommendation,
            steps: [
              "Analyze current scheduling patterns",
              "Identify optimal time windows",
              "Adjust ad scheduling settings",
              "Monitor performance changes",
              "Fine-tune based on results",
            ],
            effort: "low",
            timeline: "1-2 days",
          },
        };

        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  // ============================================================================
  // Analysis Methods
  // ============================================================================

  private analyzeBudgetPerformance(
    context: RecommendationContext
  ): BudgetReallocationAnalysis {
    const { campaignData, currentTrajectory } = context;
    const channels = campaignData.campaign.channels;

    // Calculate performance metrics per channel
    const channelPerformance = this.calculateChannelPerformance(
      channels,
      currentTrajectory
    );

    // Identify underperforming and overperforming channels
    const avgPerformance =
      Object.values(channelPerformance).reduce(
        (sum, perf) => sum + perf.roi,
        0
      ) / Object.keys(channelPerformance).length;

    const underperformingChannels = Object.entries(channelPerformance)
      .filter(([_, perf]) => perf.roi < avgPerformance * 0.8) // 20% below average
      .map(([channel, _]) => channel);

    const overperformingChannels = Object.entries(channelPerformance)
      .filter(([_, perf]) => perf.roi > avgPerformance * 1.2) // 20% above average
      .map(([channel, _]) => channel);

    // Generate reallocation suggestions
    const suggestedReallocations = this.generateBudgetReallocations(
      underperformingChannels,
      overperformingChannels,
      channelPerformance,
      campaignData.budgetAllocation
    );

    return {
      underperformingChannels,
      overperformingChannels,
      suggestedReallocations,
    };
  }

  private analyzeCreativePerformance(
    context: RecommendationContext
  ): CreativeOptimizationAnalysis {
    const { campaignData, currentTrajectory } = context;
    const creatives = campaignData.creativeAssets;

    // Analyze creative performance trends
    const creativePerformance = this.calculateCreativePerformance(
      creatives,
      currentTrajectory
    );

    // Identify fatigue indicators
    const fatigueIndicators = this.identifyFatigueIndicators(currentTrajectory);

    // Categorize creatives by performance
    const avgCTR =
      creativePerformance.reduce((sum, perf) => sum + (perf.ctr || 0), 0) /
      creativePerformance.length;

    const performingCreatives = creativePerformance
      .filter((perf) => (perf.ctr || 0) > avgCTR * 1.1)
      .map((perf) => perf.id);

    const underperformingCreatives = creativePerformance
      .filter((perf) => (perf.ctr || 0) < avgCTR * 0.9)
      .map((perf) => perf.id);

    // Generate refresh suggestions
    const suggestedRefreshes = underperformingCreatives.map((creativeId) => {
      const creative = creatives.find((c) => c.id === creativeId);
      return {
        creativeId,
        reason: this.identifyCreativeIssues(creative, creativePerformance),
        suggestedChanges: this.generateCreativeImprovements(creative),
      };
    });

    return {
      fatigueIndicators,
      performingCreatives,
      underperformingCreatives,
      suggestedRefreshes,
    };
  }

  private analyzeAudiencePerformance(
    context: RecommendationContext
  ): AudienceExpansionAnalysis {
    const { campaignData, currentTrajectory } = context;
    const audiences = campaignData.campaign.audiences;

    // Identify saturated segments (declining performance)
    const saturatedSegments = this.identifySaturatedAudiences(
      audiences,
      currentTrajectory
    );

    // Find expansion opportunities
    const expansionOpportunities = this.identifyExpansionOpportunities(
      audiences,
      campaignData.audienceInsights,
      currentTrajectory
    );

    return {
      saturatedSegments,
      expansionOpportunities,
    };
  }

  private analyzeChannelPerformance(context: RecommendationContext): any {
    const { campaignData, currentTrajectory } = context;
    const channels = campaignData.campaign.channels;

    // Calculate performance metrics per channel
    const channelPerformance = this.calculateChannelPerformance(
      channels,
      currentTrajectory
    );

    // Identify underperforming channels
    const avgCPC =
      Object.values(channelPerformance).reduce(
        (sum: number, perf: any) => sum + perf.cpc,
        0
      ) / Object.keys(channelPerformance).length;

    const underperformingChannels = Object.entries(channelPerformance)
      .filter(([_, perf]: [string, any]) => perf.cpc > avgCPC * 1.3) // 30% above average CPC
      .map(([channel, _]) => channel);

    return {
      underperformingChannels,
      channelPerformance,
    };
  }

  private analyzeTimingPatterns(context: RecommendationContext): any {
    const { currentTrajectory, campaignData } = context;

    // Analyze performance by time periods
    const timePatterns = this.extractTimePatterns(currentTrajectory);
    const optimalTimes = this.identifyOptimalTimes(timePatterns);

    // Check if current scheduling is suboptimal
    const currentScheduling = this.getCurrentScheduling(campaignData);
    const suboptimalTiming = this.isSchedulingSuboptimal(
      currentScheduling,
      optimalTimes
    );

    return {
      suboptimalTiming,
      optimalTimes,
      recommendation: suboptimalTiming
        ? `Adjust scheduling to focus on ${optimalTimes.join(", ")} for better performance`
        : "Current timing appears optimal",
      confidence: 0.75,
    };
  }

  // ============================================================================
  // Calculation Methods
  // ============================================================================

  private calculateChannelPerformance(
    channels: ChannelConfig[],
    trajectory: TrajectoryPoint[]
  ): Record<string, any> {
    const performance: Record<string, any> = {};

    channels.forEach((channel) => {
      // Simulate channel-specific metrics from trajectory
      const channelMetrics = this.extractChannelMetrics(
        channel.type,
        trajectory
      );

      performance[channel.type] = {
        roi: channelMetrics.roi || 1.0,
        cpc: channelMetrics.cpc || 1.0,
        ctr: channelMetrics.ctr || 0.02,
        conversions: channelMetrics.conversions || 0,
      };
    });

    return performance;
  }

  private calculateCreativePerformance(
    creatives: any[],
    trajectory: TrajectoryPoint[]
  ): any[] {
    return creatives.map((creative) => {
      // Extract performance metrics for this creative
      const performance = creative.performance || {};

      return {
        id: creative.id,
        ctr: performance.ctr || 0.02,
        engagement: performance.engagement || 0.05,
        sentiment: performance.sentiment || 0.5,
      };
    });
  }

  private generateBudgetReallocations(
    underperforming: string[],
    overperforming: string[],
    performance: Record<string, any>,
    budget: BudgetData
  ): Array<any> {
    const reallocations: Array<any> = [];

    // For each underperforming channel, suggest moving budget to overperforming ones
    underperforming.forEach((underChannel) => {
      const currentBudget = budget.allocated[underChannel] || 0;
      const reallocationAmount = Math.min(currentBudget * 0.3, 1000); // Max 30% or $1000

      overperforming.forEach((overChannel) => {
        if (reallocationAmount > 0) {
          const fromROI = performance[underChannel]?.roi || 1.0;
          const toROI = performance[overChannel]?.roi || 1.0;
          const expectedImprovement = (toROI - fromROI) / fromROI;

          if (expectedImprovement > 0.05) {
            // At least 5% improvement
            reallocations.push({
              from: underChannel,
              to: overChannel,
              amount: reallocationAmount,
              expectedImprovement,
            });
          }
        }
      });
    });

    return reallocations.slice(0, 3); // Limit to top 3 suggestions
  }

  private identifyFatigueIndicators(trajectory: TrajectoryPoint[]): string[] {
    const indicators: string[] = [];

    if (trajectory.length < 3) return indicators;

    // Check for declining engagement
    const engagementTrend = this.calculateMetricTrend(trajectory, "engagement");
    if (
      engagementTrend.direction === "decreasing" &&
      engagementTrend.magnitude > 0.1
    ) {
      indicators.push("declining_engagement");
    }

    // Check for declining CTR
    const ctrTrend = this.calculateMetricTrend(trajectory, "ctr");
    if (ctrTrend.direction === "decreasing" && ctrTrend.magnitude > 0.1) {
      indicators.push("declining_ctr");
    }

    // Check for increasing frequency without proportional reach increase
    const impressionsTrend = this.calculateMetricTrend(
      trajectory,
      "impressions"
    );
    const reachTrend = this.calculateMetricTrend(trajectory, "reach");

    if (
      impressionsTrend.direction === "increasing" &&
      reachTrend.direction !== "increasing"
    ) {
      indicators.push("frequency_without_reach");
    }

    return indicators;
  }

  private identifySaturatedAudiences(
    audiences: AudienceConfig[],
    trajectory: TrajectoryPoint[]
  ): string[] {
    const saturated: string[] = [];

    // Simple heuristic: if reach is not growing but impressions are, audience may be saturated
    const reachTrend = this.calculateMetricTrend(trajectory, "reach");
    const impressionsTrend = this.calculateMetricTrend(
      trajectory,
      "impressions"
    );

    if (
      reachTrend.direction !== "increasing" &&
      impressionsTrend.direction === "increasing"
    ) {
      // Assume all current audiences are potentially saturated
      saturated.push(...audiences.map((a) => a.name));
    }

    return saturated;
  }

  private identifyExpansionOpportunities(
    currentAudiences: AudienceConfig[],
    audienceInsights: any,
    trajectory: TrajectoryPoint[]
  ): Array<any> {
    const opportunities: Array<any> = [];

    // Generate lookalike opportunities based on current high-performing segments
    const performingAudiences = currentAudiences.filter((audience) => {
      // Simple heuristic: assume audiences with larger estimated sizes are performing better
      return (audience.estimatedSize || 0) > 10000;
    });

    performingAudiences.forEach((audience) => {
      // Generate expansion opportunities
      const expansions = this.generateLookalikeOpportunities(
        audience,
        audienceInsights
      );
      opportunities.push(...expansions);
    });

    // Add demographic expansion opportunities
    const demoExpansions = this.generateDemographicExpansions(
      currentAudiences,
      audienceInsights
    );
    opportunities.push(...demoExpansions);

    return opportunities.slice(0, 3); // Limit to top 3 opportunities
  }

  private identifyAlternativeChannels(
    context: RecommendationContext
  ): Array<any> {
    const currentChannels = context.campaignData.campaign.channels.map(
      (c) => c.type
    );
    const allChannels = [
      "facebook",
      "google",
      "twitter",
      "linkedin",
      "instagram",
      "tiktok",
    ];

    const alternatives = allChannels
      .filter((channel) => !currentChannels.includes(channel))
      .map((channel) => ({
        channel,
        estimatedCPC: this.estimateChannelCPC(channel, context),
        estimatedReach: this.estimateChannelReach(channel, context),
        suitability: this.calculateChannelSuitability(channel, context),
      }))
      .filter((alt) => alt.suitability > 0.6)
      .sort((a, b) => b.suitability - a.suitability);

    return alternatives.slice(0, 2); // Top 2 alternatives
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private calculateMetricTrend(
    trajectory: TrajectoryPoint[],
    metric: string
  ): any {
    const values = trajectory.map((point) => point.metrics[metric] || 0);

    if (values.length < 2) {
      return { direction: "stable", magnitude: 0 };
    }

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg =
      firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const change = firstAvg > 0 ? (secondAvg - firstAvg) / firstAvg : 0;

    return {
      direction:
        change > 0.05 ? "increasing" : change < -0.05 ? "decreasing" : "stable",
      magnitude: Math.abs(change),
    };
  }

  private extractChannelMetrics(
    channelType: string,
    trajectory: TrajectoryPoint[]
  ): any {
    // Simulate channel-specific performance based on trajectory
    const avgMetrics = this.calculateAverageMetrics(trajectory);

    // Apply channel-specific multipliers (simplified)
    const channelMultipliers: Record<string, any> = {
      facebook: { roi: 1.1, cpc: 0.9, ctr: 1.2 },
      google: { roi: 1.3, cpc: 1.1, ctr: 0.9 },
      twitter: { roi: 0.8, cpc: 0.7, ctr: 1.1 },
      linkedin: { roi: 1.2, cpc: 1.4, ctr: 0.8 },
      instagram: { roi: 1.0, cpc: 0.8, ctr: 1.3 },
    };

    const multiplier = channelMultipliers[channelType] || {
      roi: 1.0,
      cpc: 1.0,
      ctr: 1.0,
    };

    return {
      roi: avgMetrics.roi * multiplier.roi,
      cpc: avgMetrics.cpc * multiplier.cpc,
      ctr: avgMetrics.ctr * multiplier.ctr,
      conversions: avgMetrics.conversions || 0,
    };
  }

  private calculateAverageMetrics(trajectory: TrajectoryPoint[]): any {
    if (trajectory.length === 0) {
      return { roi: 1.0, cpc: 1.0, ctr: 0.02, conversions: 0 };
    }

    const totals = trajectory.reduce(
      (acc, point) => {
        Object.entries(point.metrics).forEach(([metric, value]) => {
          acc[metric] = (acc[metric] || 0) + value;
        });
        return acc;
      },
      {} as Record<string, number>
    );

    const averages: Record<string, number> = {};
    Object.entries(totals).forEach(([metric, total]) => {
      averages[metric] = total / trajectory.length;
    });

    return {
      roi: averages.roi || 1.0,
      cpc: averages.cpc || 1.0,
      ctr: averages.ctr || 0.02,
      conversions: averages.conversions || 0,
    };
  }

  private identifyCreativeIssues(creative: any, performance: any[]): string {
    if (!creative) return "Creative not found";

    const creativePerf = performance.find((p) => p.id === creative.id);
    if (!creativePerf) return "Performance data unavailable";

    if (creativePerf.ctr < 0.01) return "Low click-through rate";
    if (creativePerf.engagement < 0.02) return "Low engagement rate";
    if (creativePerf.sentiment < 0.3) return "Negative sentiment";

    return "General underperformance";
  }

  private generateCreativeImprovements(creative: any): string[] {
    if (!creative) return ["Review creative asset"];

    const improvements: string[] = [];

    switch (creative.type) {
      case "image":
        improvements.push(
          "Test different visual styles",
          "Update color scheme",
          "Try different compositions"
        );
        break;
      case "video":
        improvements.push(
          "Shorten video length",
          "Add captions",
          "Test different thumbnails"
        );
        break;
      case "text":
        improvements.push(
          "Revise headline",
          "Update call-to-action",
          "Test different messaging angles"
        );
        break;
      default:
        improvements.push("Refresh creative content", "Test new variations");
    }

    return improvements;
  }

  private generateLookalikeOpportunities(
    audience: AudienceConfig,
    insights: any
  ): Array<any> {
    const opportunities: Array<any> = [];

    // Generate age-based expansions
    const currentAgeRange = audience.demographics.ageRange;
    if (currentAgeRange[0] > 18) {
      opportunities.push({
        segment: `${audience.name}_younger`,
        estimatedSize: (audience.estimatedSize || 10000) * 0.8,
        similarity: 0.85,
        expectedPerformance: 0.12,
      });
    }

    if (currentAgeRange[1] < 65) {
      opportunities.push({
        segment: `${audience.name}_older`,
        estimatedSize: (audience.estimatedSize || 10000) * 0.6,
        similarity: 0.8,
        expectedPerformance: 0.1,
      });
    }

    return opportunities;
  }

  private generateDemographicExpansions(
    audiences: AudienceConfig[],
    insights: any
  ): Array<any> {
    const expansions: Array<any> = [];

    // Generate gender-based expansions
    const currentGenders = new Set(audiences.map((a) => a.demographics.gender));

    if (!currentGenders.has("all")) {
      expansions.push({
        segment: "all_genders",
        estimatedSize: 50000,
        similarity: 0.75,
        expectedPerformance: 0.08,
      });
    }

    // Generate location-based expansions
    const currentLocations = new Set(
      audiences.flatMap((a) => a.demographics.location)
    );

    if (currentLocations.size < 5) {
      expansions.push({
        segment: "expanded_locations",
        estimatedSize: 30000,
        similarity: 0.7,
        expectedPerformance: 0.09,
      });
    }

    return expansions;
  }

  private extractTimePatterns(trajectory: TrajectoryPoint[]): any {
    // Simplified time pattern analysis
    const hourlyPerformance: Record<number, number> = {};

    trajectory.forEach((point) => {
      const hour = point.date.getHours();
      const performance = Object.values(point.metrics).reduce(
        (sum, val) => sum + val,
        0
      );
      hourlyPerformance[hour] = (hourlyPerformance[hour] || 0) + performance;
    });

    return hourlyPerformance;
  }

  private identifyOptimalTimes(patterns: Record<number, number>): string[] {
    const sortedHours = Object.entries(patterns)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour, _]) => {
        const h = parseInt(hour);
        return h < 12 ? `${h}AM` : h === 12 ? "12PM" : `${h - 12}PM`;
      });

    return sortedHours;
  }

  private getCurrentScheduling(campaignData: CampaignDataset): any {
    // Simplified - assume current scheduling from campaign data
    return {
      hours: [9, 12, 15, 18], // 9AM, 12PM, 3PM, 6PM
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    };
  }

  private isSchedulingSuboptimal(current: any, optimal: string[]): boolean {
    // Simple check - if optimal times don't overlap with current, it's suboptimal
    const currentHours = current.hours.map((h: number) =>
      h < 12 ? `${h}AM` : h === 12 ? "12PM" : `${h - 12}PM`
    );

    const overlap = optimal.filter((time) => currentHours.includes(time));
    return overlap.length < 2; // Less than 2 overlapping optimal times
  }

  private estimateChannelCPC(
    channel: string,
    context: RecommendationContext
  ): number {
    // Simplified CPC estimation based on channel type
    const baseCPC = 1.0;
    const channelMultipliers: Record<string, number> = {
      facebook: 0.8,
      google: 1.2,
      twitter: 0.6,
      linkedin: 1.8,
      instagram: 0.9,
      tiktok: 0.7,
    };

    return baseCPC * (channelMultipliers[channel] || 1.0);
  }

  private estimateChannelReach(
    channel: string,
    context: RecommendationContext
  ): number {
    // Simplified reach estimation
    const baseReach = 10000;
    const channelMultipliers: Record<string, number> = {
      facebook: 1.5,
      google: 1.2,
      twitter: 0.8,
      linkedin: 0.6,
      instagram: 1.3,
      tiktok: 1.1,
    };

    return baseReach * (channelMultipliers[channel] || 1.0);
  }

  private calculateChannelSuitability(
    channel: string,
    context: RecommendationContext
  ): number {
    // Simplified suitability calculation based on campaign category
    const category = context.campaignData.campaign.category;

    const suitabilityMatrix: Record<string, Record<string, number>> = {
      pr: {
        twitter: 0.9,
        linkedin: 0.8,
        facebook: 0.7,
        instagram: 0.6,
      },
      content: {
        instagram: 0.9,
        tiktok: 0.8,
        facebook: 0.7,
        twitter: 0.6,
      },
      social: {
        facebook: 0.9,
        instagram: 0.8,
        twitter: 0.7,
        tiktok: 0.6,
      },
    };

    return suitabilityMatrix[category]?.[channel] || 0.5;
  }

  // ============================================================================
  // Impact Estimation Methods
  // ============================================================================

  private estimateCreativeRefreshImpact(
    analysis: CreativeOptimizationAnalysis,
    context: RecommendationContext
  ): number {
    // Base improvement from creative refresh
    let baseImprovement = 0.15; // 15% base improvement

    // Adjust based on fatigue indicators
    const fatigueMultiplier = analysis.fatigueIndicators.length * 0.05; // 5% per indicator
    baseImprovement += fatigueMultiplier;

    // Adjust based on underperforming creative ratio
    const underperformingRatio =
      analysis.underperformingCreatives.length /
      (analysis.underperformingCreatives.length +
        analysis.performingCreatives.length);
    baseImprovement += underperformingRatio * 0.1; // Up to 10% more if many underperforming

    return Math.min(0.4, baseImprovement); // Cap at 40% improvement
  }

  private estimateSpecificCreativeImpact(
    refresh: any,
    context: RecommendationContext
  ): number {
    // Estimate impact based on the specific issue identified
    const impactMap: Record<string, number> = {
      "Low click-through rate": 0.2,
      "Low engagement rate": 0.15,
      "Negative sentiment": 0.25,
      "General underperformance": 0.1,
    };

    return impactMap[refresh.reason] || 0.1;
  }

  private estimateChannelShiftImpact(
    altChannel: any,
    context: RecommendationContext
  ): number {
    // Estimate improvement based on CPC difference and suitability
    const currentAvgCPC = this.calculateAverageMetrics(
      context.currentTrajectory
    ).cpc;
    const cpcImprovement = Math.max(
      0,
      (currentAvgCPC - altChannel.estimatedCPC) / currentAvgCPC
    );

    // Combine CPC improvement with suitability score
    const totalImprovement =
      cpcImprovement * 0.7 + altChannel.suitability * 0.3;

    return Math.min(0.3, totalImprovement); // Cap at 30% improvement
  }

  private estimateTimingAdjustmentImpact(
    analysis: any,
    context: RecommendationContext
  ): number {
    // Timing adjustments typically provide modest improvements
    return analysis.suboptimalTiming ? 0.08 : 0; // 8% improvement if timing is suboptimal
  }

  // ============================================================================
  // Confidence Calculation Methods
  // ============================================================================

  private calculateBudgetReallocationConfidence(
    reallocation: any,
    context: RecommendationContext
  ): number {
    // Base confidence from historical performance data
    let confidence = 0.7;

    // Increase confidence if we have more trajectory data
    if (context.currentTrajectory.length > 14) {
      confidence += 0.1;
    }

    // Increase confidence if the performance difference is significant
    if (reallocation.expectedImprovement > 0.2) {
      confidence += 0.1;
    }

    return Math.min(0.95, confidence);
  }

  private calculateCreativeRefreshConfidence(
    analysis: CreativeOptimizationAnalysis,
    context: RecommendationContext
  ): number {
    // Base confidence
    let confidence = 0.65;

    // Increase confidence based on number of fatigue indicators
    confidence += analysis.fatigueIndicators.length * 0.05;

    // Increase confidence if we have performance data for creatives
    const creativesWithPerformanceData =
      analysis.performingCreatives.length +
      analysis.underperformingCreatives.length;
    if (creativesWithPerformanceData > 3) {
      confidence += 0.1;
    }

    return Math.min(0.9, confidence);
  }

  private calculateAudienceExpansionConfidence(
    opportunity: any,
    context: RecommendationContext
  ): number {
    // Base confidence from similarity score
    let confidence = opportunity.similarity * 0.8;

    // Increase confidence if estimated size is reasonable
    if (
      opportunity.estimatedSize > 5000 &&
      opportunity.estimatedSize < 100000
    ) {
      confidence += 0.1;
    }

    return Math.min(0.85, confidence);
  }

  private calculateChannelShiftConfidence(
    altChannel: any,
    context: RecommendationContext
  ): number {
    // Base confidence from suitability score
    let confidence = altChannel.suitability * 0.7;

    // Increase confidence if the channel is well-established
    const establishedChannels = ["facebook", "google", "instagram"];
    if (establishedChannels.includes(altChannel.channel)) {
      confidence += 0.1;
    }

    return Math.min(0.8, confidence);
  }

  // ============================================================================
  // Priority and Effort Calculation Methods
  // ============================================================================

  private calculatePriority(
    expectedImprovement: number,
    type: RecommendationType
  ): number {
    // Base priority from expected improvement
    let priority = expectedImprovement * 100;

    // Adjust based on recommendation type
    const typeMultipliers: Record<RecommendationType, number> = {
      budget_reallocation: 1.2, // High priority - quick wins
      creative_refresh: 1.0, // Medium priority
      audience_expansion: 0.9, // Medium-low priority - more risk
      channel_shift: 0.8, // Lower priority - high effort
      timing_adjustment: 1.1, // High priority - easy to implement
    };

    priority *= typeMultipliers[type];

    return Math.round(Math.min(100, priority));
  }

  private calculateImplementationEffort(
    type: RecommendationType
  ): "low" | "medium" | "high" {
    const effortMap: Record<RecommendationType, "low" | "medium" | "high"> = {
      budget_reallocation: "low",
      creative_refresh: "medium",
      audience_expansion: "medium",
      channel_shift: "high",
      timing_adjustment: "low",
    };

    return effortMap[type];
  }

  // ============================================================================
  // Filtering and Ranking Methods
  // ============================================================================

  private filterRecommendations(
    recommendations: PivotRecommendation[],
    options: Required<RecommendationOptions>
  ): PivotRecommendation[] {
    return recommendations.filter(
      (rec) =>
        rec.impact_estimate.improvement >= options.minImpactThreshold &&
        rec.impact_estimate.confidence >= options.minConfidenceThreshold
    );
  }

  private rankRecommendations(
    recommendations: PivotRecommendation[],
    options: Required<RecommendationOptions>
  ): PivotRecommendation[] {
    const ranked = recommendations.sort((a, b) => {
      if (options.prioritizeHighImpact) {
        // Sort by impact first, then by priority
        const impactDiff =
          b.impact_estimate.improvement - a.impact_estimate.improvement;
        if (Math.abs(impactDiff) > 0.02) return impactDiff;
        return b.priority - a.priority;
      } else {
        // Sort by priority first, then by impact
        const priorityDiff = b.priority - a.priority;
        if (priorityDiff !== 0) return priorityDiff;
        return b.impact_estimate.improvement - a.impact_estimate.improvement;
      }
    });

    return ranked.slice(0, options.maxRecommendations);
  }

  // ============================================================================
  // Simulation Preview Methods (Placeholder implementations)
  // ============================================================================

  private async generateBudgetReallocationPreview(
    reallocation: any,
    context: RecommendationContext
  ): Promise<TrajectoryPoint[]> {
    // Simplified preview generation
    const baseTrajectory = context.currentTrajectory;
    const improvementFactor = 1 + reallocation.expectedImprovement;

    return baseTrajectory.map((point) => ({
      ...point,
      metrics: {
        ...point.metrics,
        roi: (point.metrics.roi || 1.0) * improvementFactor,
        cpc: (point.metrics.cpc || 1.0) / improvementFactor,
      },
    }));
  }

  private async generateCreativeRefreshPreview(
    analysis: CreativeOptimizationAnalysis,
    context: RecommendationContext
  ): Promise<TrajectoryPoint[]> {
    // Simplified preview generation
    const baseTrajectory = context.currentTrajectory;
    const improvementFactor = 1.15; // 15% improvement

    return baseTrajectory.map((point) => ({
      ...point,
      metrics: {
        ...point.metrics,
        ctr: (point.metrics.ctr || 0.02) * improvementFactor,
        engagement: (point.metrics.engagement || 0.05) * improvementFactor,
      },
    }));
  }

  private async generateAudienceExpansionPreview(
    opportunity: any,
    context: RecommendationContext
  ): Promise<TrajectoryPoint[]> {
    // Simplified preview generation
    const baseTrajectory = context.currentTrajectory;
    const reachMultiplier = 1 + opportunity.expectedPerformance * 0.5;

    return baseTrajectory.map((point) => ({
      ...point,
      metrics: {
        ...point.metrics,
        reach: (point.metrics.reach || 10000) * reachMultiplier,
        impressions: (point.metrics.impressions || 15000) * reachMultiplier,
      },
    }));
  }
}
