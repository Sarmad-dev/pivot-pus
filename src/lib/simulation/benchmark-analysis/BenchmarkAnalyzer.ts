/**
 * BenchmarkAnalyzer - Industry Standard Comparisons
 *
 * Implements industry benchmark data integration and storage, comparison algorithms
 * for campaign performance vs benchmarks, and benchmark deviation analysis.
 */

import {
  BenchmarkData,
  CampaignDataset,
  PerformanceMetric,
  MetricType,
  ChannelType,
  CampaignCategory,
} from "../../../types/simulation";

export interface BenchmarkComparison {
  metric: MetricType;
  campaignValue: number;
  benchmarkValue: number;
  percentile: number;
  deviation: number;
  deviationPercentage: number;
  performance: "above" | "at" | "below";
  significance: "excellent" | "good" | "average" | "poor" | "critical";
}

export interface BenchmarkAnalysis {
  overall: {
    score: number;
    grade: "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F";
    summary: string;
  };
  comparisons: BenchmarkComparison[];
  insights: BenchmarkInsight[];
  recommendations: BenchmarkRecommendation[];
  dataQuality: {
    coverage: number;
    freshness: number;
    reliability: number;
  };
}

export interface BenchmarkInsight {
  type: "strength" | "weakness" | "opportunity" | "threat";
  metric: MetricType;
  description: string;
  impact: "high" | "medium" | "low";
  confidence: number;
}

export interface BenchmarkRecommendation {
  id: string;
  priority: number;
  metric: MetricType;
  currentValue: number;
  targetValue: number;
  improvement: number;
  action: string;
  rationale: string;
  effort: "low" | "medium" | "high";
  timeline: string;
}

export interface IndustryBenchmarkData {
  industry: string;
  category: CampaignCategory;
  channel: ChannelType;
  region: string;
  benchmarks: Record<MetricType, BenchmarkData>;
  sampleSize: number;
  lastUpdated: Date;
}

export class BenchmarkAnalyzer {
  private benchmarkCache: Map<string, IndustryBenchmarkData> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Analyze campaign performance against industry benchmarks
   */
  async analyzeBenchmarks(
    campaignData: CampaignDataset,
    industry: string,
    region: string = "global"
  ): Promise<BenchmarkAnalysis> {
    try {
      // Get relevant benchmarks
      const benchmarks = await this.getBenchmarksForCampaign(
        campaignData.campaign,
        industry,
        region
      );

      // Calculate performance metrics
      const currentMetrics = this.calculateCurrentMetrics(campaignData);

      // Generate comparisons
      const comparisons = this.generateBenchmarkComparisons(
        currentMetrics,
        benchmarks
      );

      // Generate insights
      const insights = this.generateBenchmarkInsights(
        comparisons,
        campaignData
      );

      // Generate recommendations
      const recommendations = this.generateBenchmarkRecommendations(
        comparisons,
        insights
      );

      // Calculate overall score
      const overall = this.calculateOverallScore(comparisons);

      // Assess data quality
      const dataQuality = this.assessDataQuality(benchmarks, currentMetrics);

      return {
        overall,
        comparisons,
        insights,
        recommendations,
        dataQuality,
      };
    } catch (error) {
      throw new Error(
        `Benchmark analysis failed: ${error instanceof Error && error.message}`
      );
    }
  }

  /**
   * Get industry benchmarks for a specific campaign
   */
  private async getBenchmarksForCampaign(
    campaign: any,
    industry: string,
    region: string
  ): Promise<IndustryBenchmarkData[]> {
    const benchmarks: IndustryBenchmarkData[] = [];

    // Get benchmarks for each channel
    for (const channel of campaign.channels) {
      const cacheKey = `${industry}-${campaign.category}-${channel.type}-${region}`;

      let benchmarkData = this.benchmarkCache.get(cacheKey);

      if (!benchmarkData || this.isCacheExpired(benchmarkData.lastUpdated)) {
        benchmarkData = await this.fetchIndustryBenchmarks(
          industry,
          campaign.category,
          channel.type,
          region
        );
        this.benchmarkCache.set(cacheKey, benchmarkData);
      }

      benchmarks.push(benchmarkData);
    }

    return benchmarks;
  }

  /**
   * Fetch industry benchmarks from data sources
   */
  private async fetchIndustryBenchmarks(
    industry: string,
    category: CampaignCategory,
    channel: ChannelType,
    region: string
  ): Promise<IndustryBenchmarkData> {
    // In a real implementation, this would fetch from external APIs or databases
    // For now, we'll return mock data based on industry standards

    const mockBenchmarks = this.getMockBenchmarks(
      industry,
      category,
      channel,
      region
    );

    return {
      industry,
      category,
      channel,
      region,
      benchmarks: mockBenchmarks,
      sampleSize: 1000, // Mock sample size
      lastUpdated: new Date(),
    };
  }

  /**
   * Generate mock benchmarks based on industry standards
   */
  private getMockBenchmarks(
    industry: string,
    category: CampaignCategory,
    channel: ChannelType,
    region: string
  ): Record<MetricType, BenchmarkData> {
    // Industry-specific benchmark data
    const industryMultipliers: Record<
      string,
      { ctr: number; cpc: number; engagement: number }
    > = {
      technology: { ctr: 1.2, cpc: 0.8, engagement: 1.1 },
      healthcare: { ctr: 0.9, cpc: 1.3, engagement: 0.8 },
      finance: { ctr: 0.8, cpc: 1.5, engagement: 0.7 },
      retail: { ctr: 1.1, cpc: 1.0, engagement: 1.2 },
      education: { ctr: 1.0, cpc: 0.9, engagement: 1.3 },
      default: { ctr: 1.0, cpc: 1.0, engagement: 1.0 },
    };

    // Channel-specific base metrics
    const channelBases: Record<
      string,
      { ctr: number; cpc: number; engagement: number; cpm: number }
    > = {
      facebook: { ctr: 0.9, cpc: 1.72, engagement: 0.27, cpm: 7.19 },
      google: { ctr: 2.0, cpc: 2.32, engagement: 0.15, cpm: 2.8 },
      instagram: { ctr: 0.68, cpc: 3.56, engagement: 1.22, cpm: 7.91 },
      linkedin: { ctr: 0.44, cpc: 5.26, engagement: 0.54, cpm: 6.59 },
      twitter: { ctr: 0.86, cpc: 1.35, engagement: 0.33, cpm: 6.46 },
      default: { ctr: 1.0, cpc: 2.0, engagement: 0.5, cpm: 5.0 },
    };

    const multiplier =
      industryMultipliers[industry] || industryMultipliers["default"];
    const base = channelBases[channel] || channelBases["default"];

    return {
      ctr: {
        industry,
        metric: "ctr",
        percentile25: base.ctr * multiplier.ctr * 0.7,
        percentile50: base.ctr * multiplier.ctr,
        percentile75: base.ctr * multiplier.ctr * 1.4,
        sampleSize: 1000,
        lastUpdated: new Date(),
      },
      cpc: {
        industry,
        metric: "cpc",
        percentile25: base.cpc * multiplier.cpc * 0.8,
        percentile50: base.cpc * multiplier.cpc,
        percentile75: base.cpc * multiplier.cpc * 1.3,
        sampleSize: 1000,
        lastUpdated: new Date(),
      },
      engagement: {
        industry,
        metric: "engagement",
        percentile25: base.engagement * multiplier.engagement * 0.6,
        percentile50: base.engagement * multiplier.engagement,
        percentile75: base.engagement * multiplier.engagement * 1.6,
        sampleSize: 1000,
        lastUpdated: new Date(),
      },
      cpm: {
        industry,
        metric: "cpm",
        percentile25: base.cpm * 0.7,
        percentile50: base.cpm,
        percentile75: base.cpm * 1.4,
        sampleSize: 1000,
        lastUpdated: new Date(),
      },
      impressions: {
        industry,
        metric: "impressions",
        percentile25: 10000,
        percentile50: 50000,
        percentile75: 200000,
        sampleSize: 1000,
        lastUpdated: new Date(),
      },
      reach: {
        industry,
        metric: "reach",
        percentile25: 8000,
        percentile50: 35000,
        percentile75: 150000,
        sampleSize: 1000,
        lastUpdated: new Date(),
      },
      conversions: {
        industry,
        metric: "conversions",
        percentile25: 50,
        percentile50: 200,
        percentile75: 800,
        sampleSize: 1000,
        lastUpdated: new Date(),
      },
    };
  }

  /**
   * Calculate current campaign metrics
   */
  private calculateCurrentMetrics(
    campaignData: CampaignDataset
  ): Record<MetricType, number> {
    const metrics: Record<MetricType, number> = {
      ctr: 0,
      cpc: 0,
      cpm: 0,
      engagement: 0,
      impressions: 0,
      reach: 0,
      conversions: 0,
    };

    if (campaignData.historicalPerformance.length === 0) {
      return metrics;
    }

    // Calculate averages from historical performance
    const metricSums: Record<string, number> = {};
    const metricCounts: Record<string, number> = {};

    campaignData.historicalPerformance.forEach((perf) => {
      if (!metricSums[perf.metric]) {
        metricSums[perf.metric] = 0;
        metricCounts[perf.metric] = 0;
      }
      metricSums[perf.metric] += perf.value;
      metricCounts[perf.metric]++;
    });

    // Calculate averages
    Object.keys(metricSums).forEach((metric) => {
      if (metric in metrics) {
        metrics[metric as MetricType] =
          metricSums[metric] / metricCounts[metric];
      }
    });

    return metrics;
  }

  /**
   * Generate benchmark comparisons
   */
  private generateBenchmarkComparisons(
    currentMetrics: Record<MetricType, number>,
    benchmarks: IndustryBenchmarkData[]
  ): BenchmarkComparison[] {
    const comparisons: BenchmarkComparison[] = [];

    // Aggregate benchmarks across channels
    const aggregatedBenchmarks = this.aggregateBenchmarks(benchmarks);

    Object.entries(currentMetrics).forEach(([metric, value]) => {
      const metricType = metric as MetricType;
      const benchmark = aggregatedBenchmarks[metricType];

      if (benchmark && value > 0) {
        const comparison = this.createBenchmarkComparison(
          metricType,
          value,
          benchmark
        );
        comparisons.push(comparison);
      }
    });

    return comparisons;
  }

  /**
   * Aggregate benchmarks across multiple channels
   */
  private aggregateBenchmarks(
    benchmarks: IndustryBenchmarkData[]
  ): Record<MetricType, BenchmarkData> {
    const aggregated: Record<MetricType, BenchmarkData> = {} as any;
    const metricTypes: MetricType[] = [
      "ctr",
      "cpc",
      "cpm",
      "engagement",
      "impressions",
      "reach",
      "conversions",
    ];

    metricTypes.forEach((metric) => {
      const relevantBenchmarks = benchmarks
        .map((b) => b.benchmarks[metric])
        .filter((b) => b);

      if (relevantBenchmarks.length > 0) {
        // Weight by sample size
        const totalSampleSize = relevantBenchmarks.reduce(
          (sum, b) => sum + b.sampleSize,
          0
        );

        aggregated[metric] = {
          industry: relevantBenchmarks[0].industry,
          metric,
          percentile25: relevantBenchmarks.reduce(
            (sum, b) => sum + (b.percentile25 * b.sampleSize) / totalSampleSize,
            0
          ),
          percentile50: relevantBenchmarks.reduce(
            (sum, b) => sum + (b.percentile50 * b.sampleSize) / totalSampleSize,
            0
          ),
          percentile75: relevantBenchmarks.reduce(
            (sum, b) => sum + (b.percentile75 * b.sampleSize) / totalSampleSize,
            0
          ),
          sampleSize: totalSampleSize,
          lastUpdated: new Date(),
        };
      }
    });

    return aggregated;
  }

  /**
   * Create a benchmark comparison for a specific metric
   */
  private createBenchmarkComparison(
    metric: MetricType,
    campaignValue: number,
    benchmark: BenchmarkData
  ): BenchmarkComparison {
    const benchmarkValue = benchmark.percentile50;
    const deviation = campaignValue - benchmarkValue;
    const deviationPercentage = (deviation / benchmarkValue) * 100;

    // Determine percentile
    let percentile: number;
    if (campaignValue <= benchmark.percentile25) {
      percentile = 25 * (campaignValue / benchmark.percentile25);
    } else if (campaignValue <= benchmark.percentile50) {
      percentile =
        25 +
        25 *
          ((campaignValue - benchmark.percentile25) /
            (benchmark.percentile50 - benchmark.percentile25));
    } else if (campaignValue <= benchmark.percentile75) {
      percentile =
        50 +
        25 *
          ((campaignValue - benchmark.percentile50) /
            (benchmark.percentile75 - benchmark.percentile50));
    } else {
      percentile =
        75 +
        25 *
          Math.min(
            1,
            (campaignValue - benchmark.percentile75) /
              (benchmark.percentile75 * 0.5)
          );
    }

    // Determine performance level
    let performance: "above" | "at" | "below";
    if (Math.abs(deviationPercentage) < 5) {
      performance = "at";
    } else if (deviationPercentage > 0) {
      performance = "above";
    } else {
      performance = "below";
    }

    // Determine significance
    let significance: "excellent" | "good" | "average" | "poor" | "critical";
    if (percentile >= 90) {
      significance = "excellent";
    } else if (percentile >= 75) {
      significance = "good";
    } else if (percentile >= 50) {
      significance = "average";
    } else if (percentile >= 25) {
      significance = "poor";
    } else {
      significance = "critical";
    }

    return {
      metric,
      campaignValue,
      benchmarkValue,
      percentile: Math.round(percentile),
      deviation,
      deviationPercentage: Math.round(deviationPercentage * 100) / 100,
      performance,
      significance,
    };
  }

  /**
   * Generate insights from benchmark comparisons
   */
  private generateBenchmarkInsights(
    comparisons: BenchmarkComparison[],
    campaignData: CampaignDataset
  ): BenchmarkInsight[] {
    const insights: BenchmarkInsight[] = [];

    comparisons.forEach((comparison) => {
      const insight = this.generateInsightForComparison(
        comparison,
        campaignData
      );
      if (insight) {
        insights.push(insight);
      }
    });

    // Add overall insights
    const overallInsights = this.generateOverallInsights(comparisons);
    insights.push(...overallInsights);

    return insights.sort((a, b) => {
      const impactWeight = { high: 3, medium: 2, low: 1 };
      return impactWeight[b.impact] - impactWeight[a.impact];
    });
  }

  /**
   * Generate insight for a specific comparison
   */
  private generateInsightForComparison(
    comparison: BenchmarkComparison,
    campaignData: CampaignDataset
  ): BenchmarkInsight | null {
    const { metric, significance, deviationPercentage, percentile } =
      comparison;

    if (significance === "excellent") {
      return {
        type: "strength",
        metric,
        description: `Your ${metric.toUpperCase()} performance is excellent, ranking in the ${percentile}th percentile (${Math.abs(deviationPercentage)}% above industry average).`,
        impact: "high",
        confidence: 0.9,
      };
    }

    if (significance === "critical" || significance === "poor") {
      return {
        type: "weakness",
        metric,
        description: `Your ${metric.toUpperCase()} performance is ${significance}, ranking in the ${percentile}th percentile (${Math.abs(deviationPercentage)}% below industry average).`,
        impact: significance === "critical" ? "high" : "medium",
        confidence: 0.85,
      };
    }

    if (significance === "good" && deviationPercentage > 10) {
      return {
        type: "opportunity",
        metric,
        description: `Your ${metric.toUpperCase()} performance is good but has potential for further optimization to reach excellent levels.`,
        impact: "medium",
        confidence: 0.7,
      };
    }

    return null;
  }

  /**
   * Generate overall insights across all metrics
   */
  private generateOverallInsights(
    comparisons: BenchmarkComparison[]
  ): BenchmarkInsight[] {
    const insights: BenchmarkInsight[] = [];

    const excellentMetrics = comparisons.filter(
      (c) => c.significance === "excellent"
    );
    const criticalMetrics = comparisons.filter(
      (c) => c.significance === "critical"
    );
    const avgPercentile =
      comparisons.reduce((sum, c) => sum + c.percentile, 0) /
      comparisons.length;

    if (excellentMetrics.length >= 2) {
      insights.push({
        type: "strength",
        metric: "ctr", // Representative metric
        description: `Strong overall performance with ${excellentMetrics.length} metrics performing excellently above industry standards.`,
        impact: "high",
        confidence: 0.9,
      });
    }

    if (criticalMetrics.length >= 2) {
      insights.push({
        type: "threat",
        metric: "ctr", // Representative metric
        description: `Multiple critical performance areas identified. Immediate optimization required for ${criticalMetrics.map((c) => c.metric).join(", ")}.`,
        impact: "high",
        confidence: 0.95,
      });
    }

    if (avgPercentile < 40) {
      insights.push({
        type: "opportunity",
        metric: "ctr", // Representative metric
        description: `Overall performance below industry average. Significant opportunity for improvement across multiple metrics.`,
        impact: "high",
        confidence: 0.8,
      });
    }

    return insights;
  }

  /**
   * Generate benchmark-based recommendations
   */
  private generateBenchmarkRecommendations(
    comparisons: BenchmarkComparison[],
    insights: BenchmarkInsight[]
  ): BenchmarkRecommendation[] {
    const recommendations: BenchmarkRecommendation[] = [];

    // Generate recommendations for poor performing metrics
    comparisons
      .filter((c) => c.significance === "critical" || c.significance === "poor")
      .forEach((comparison, index) => {
        const recommendation = this.createRecommendationForComparison(
          comparison,
          index
        );
        recommendations.push(recommendation);
      });

    // Generate recommendations for optimization opportunities
    comparisons
      .filter((c) => c.significance === "good" && c.deviationPercentage < 20)
      .forEach((comparison, index) => {
        const recommendation = this.createOptimizationRecommendation(
          comparison,
          index + 100
        );
        recommendations.push(recommendation);
      });

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Create recommendation for underperforming metric
   */
  private createRecommendationForComparison(
    comparison: BenchmarkComparison,
    index: number
  ): BenchmarkRecommendation {
    const { metric, campaignValue, benchmarkValue, deviationPercentage } =
      comparison;
    const targetValue = benchmarkValue * 1.1; // Target 10% above benchmark
    const improvement = ((targetValue - campaignValue) / campaignValue) * 100;

    const actions = {
      ctr: "Optimize ad creative, improve targeting precision, and test different call-to-action phrases",
      cpc: "Refine audience targeting, improve quality score, and optimize bidding strategy",
      cpm: "Improve audience relevance, optimize creative performance, and adjust bidding approach",
      engagement:
        "Create more compelling content, improve posting timing, and enhance community interaction",
      impressions:
        "Increase budget allocation, expand targeting, and improve ad relevance scores",
      reach:
        "Broaden audience targeting, increase frequency caps, and optimize campaign scheduling",
      conversions:
        "Optimize landing pages, improve conversion funnel, and enhance call-to-action effectiveness",
    };

    return {
      id: `benchmark-rec-${index}`,
      priority: comparison.significance === "critical" ? 90 : 70,
      metric,
      currentValue: campaignValue,
      targetValue,
      improvement: Math.round(improvement),
      action:
        actions[metric] ||
        "Optimize campaign performance through targeted improvements",
      rationale: `Current ${metric} is ${Math.abs(deviationPercentage)}% below industry benchmark. Reaching benchmark levels could significantly improve campaign ROI.`,
      effort: Math.abs(deviationPercentage) > 50 ? "high" : "medium",
      timeline: Math.abs(deviationPercentage) > 50 ? "4-6 weeks" : "2-3 weeks",
    };
  }

  /**
   * Create optimization recommendation for good performing metric
   */
  private createOptimizationRecommendation(
    comparison: BenchmarkComparison,
    index: number
  ): BenchmarkRecommendation {
    const { metric, campaignValue, benchmarkValue } = comparison;
    const targetValue = benchmarkValue * 1.25; // Target 25% above benchmark
    const improvement = ((targetValue - campaignValue) / campaignValue) * 100;

    return {
      id: `benchmark-opt-${index}`,
      priority: 50,
      metric,
      currentValue: campaignValue,
      targetValue,
      improvement: Math.round(improvement),
      action: `Fine-tune ${metric} optimization to reach excellent performance levels`,
      rationale: `Good performance with opportunity to reach top-tier industry levels through incremental improvements.`,
      effort: "low",
      timeline: "1-2 weeks",
    };
  }

  /**
   * Calculate overall benchmark score
   */
  private calculateOverallScore(comparisons: BenchmarkComparison[]): {
    score: number;
    grade: "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F";
    summary: string;
  } {
    if (comparisons.length === 0) {
      return {
        score: 0,
        grade: "F",
        summary: "Insufficient data for benchmark analysis",
      };
    }

    // Calculate weighted score based on percentiles
    const totalScore = comparisons.reduce((sum, c) => sum + c.percentile, 0);
    const avgScore = totalScore / comparisons.length;

    // Determine grade
    let grade: "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F";
    if (avgScore >= 95) grade = "A+";
    else if (avgScore >= 90) grade = "A";
    else if (avgScore >= 85) grade = "B+";
    else if (avgScore >= 80) grade = "B";
    else if (avgScore >= 75) grade = "C+";
    else if (avgScore >= 70) grade = "C";
    else if (avgScore >= 60) grade = "D";
    else grade = "F";

    // Generate summary
    const excellentCount = comparisons.filter(
      (c) => c.significance === "excellent"
    ).length;
    const criticalCount = comparisons.filter(
      (c) => c.significance === "critical"
    ).length;

    let summary: string;
    if (excellentCount >= comparisons.length * 0.7) {
      summary = `Excellent performance across most metrics, significantly outperforming industry standards.`;
    } else if (criticalCount >= comparisons.length * 0.5) {
      summary = `Multiple areas require immediate attention to meet industry standards.`;
    } else if (avgScore >= 75) {
      summary = `Good overall performance with opportunities for optimization.`;
    } else {
      summary = `Performance below industry average across multiple metrics.`;
    }

    return {
      score: Math.round(avgScore),
      grade,
      summary,
    };
  }

  /**
   * Assess data quality for benchmark analysis
   */
  private assessDataQuality(
    benchmarks: IndustryBenchmarkData[],
    currentMetrics: Record<MetricType, number>
  ): { coverage: number; freshness: number; reliability: number } {
    // Coverage: percentage of metrics with both campaign data and benchmarks
    const totalMetrics = Object.keys(currentMetrics).length;
    const coveredMetrics = Object.entries(currentMetrics).filter(
      ([metric, value]) =>
        value > 0 && benchmarks.some((b) => b.benchmarks[metric as MetricType])
    ).length;
    const coverage = coveredMetrics / totalMetrics;

    // Freshness: based on benchmark data age
    const avgAge =
      benchmarks.reduce((sum, b) => {
        const age = Date.now() - b.lastUpdated.getTime();
        return sum + age;
      }, 0) / benchmarks.length;
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    const freshness = Math.max(0, 1 - avgAge / maxAge);

    // Reliability: based on sample sizes
    const avgSampleSize =
      benchmarks.reduce((sum, b) => sum + b.sampleSize, 0) / benchmarks.length;
    const minReliableSampleSize = 100;
    const reliability = Math.min(1, avgSampleSize / minReliableSampleSize);

    return {
      coverage: Math.round(coverage * 100) / 100,
      freshness: Math.round(freshness * 100) / 100,
      reliability: Math.round(reliability * 100) / 100,
    };
  }

  /**
   * Check if cache is expired
   */
  private isCacheExpired(lastUpdated: Date): boolean {
    return Date.now() - lastUpdated.getTime() > this.CACHE_TTL;
  }

  /**
   * Clear expired cache entries
   */
  public clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, data] of this.benchmarkCache.entries()) {
      if (now - data.lastUpdated.getTime() > this.CACHE_TTL) {
        this.benchmarkCache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.benchmarkCache.size,
      hitRate: 0.85, // Mock hit rate - would be calculated in real implementation
    };
  }
}
