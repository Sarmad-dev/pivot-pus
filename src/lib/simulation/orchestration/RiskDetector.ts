/**
 * RiskDetector
 * 
 * Identifies potential performance issues and generates risk alerts
 * including performance dips, competitor threats, and audience fatigue.
 */

import {
  TrajectoryPoint,
  RiskAlert,
  MarketDataset,
  CompetitorMetric,
  DateRange,
  SimulationContext,
  PerformanceMetric
} from '../../../types/simulation';

export interface RiskDetectionOptions {
  performanceDipThreshold?: number; // Default: 0.2 (20% decline)
  audienceFatigueThreshold?: number; // Default: 0.15 (15% engagement drop)
  competitorThreatThreshold?: number; // Default: 0.3 (30% competitor activity increase)
  lookbackPeriod?: number; // Days to look back for trend analysis
  confidenceThreshold?: number; // Minimum confidence for risk alerts
}

export interface RiskPattern {
  type: string;
  severity: number;
  confidence: number;
  indicators: string[];
  timeframe: DateRange;
}

export interface PerformanceTrend {
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  magnitude: number;
  confidence: number;
  inflectionPoints: Date[];
}

export class RiskDetector {
  private readonly DEFAULT_OPTIONS: Required<RiskDetectionOptions> = {
    performanceDipThreshold: 0.15, // More sensitive - 15% decline
    audienceFatigueThreshold: 0.12, // More sensitive - 12% engagement drop
    competitorThreatThreshold: 0.25, // More sensitive - 25% competitor activity increase
    lookbackPeriod: 14,
    confidenceThreshold: 0.6 // Lower confidence threshold
  };

  /**
   * Main method to detect all types of risks in trajectory
   */
  async detectRisks(
    trajectory: TrajectoryPoint[],
    context: SimulationContext,
    options: RiskDetectionOptions = {}
  ): Promise<RiskAlert[]> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const risks: RiskAlert[] = [];

    try {
      // Detect performance dips
      const performanceRisks = await this.detectPerformanceDips(trajectory, context, opts);
      risks.push(...performanceRisks);

      // Detect audience fatigue
      const fatigueRisks = await this.detectAudienceFatigue(trajectory, context, opts);
      risks.push(...fatigueRisks);

      // Detect competitor threats
      const competitorRisks = await this.detectCompetitorThreats(
        trajectory,
        context.dataset.marketData,
        opts
      );
      risks.push(...competitorRisks);

      // Detect budget overrun risks
      const budgetRisks = await this.detectBudgetOverruns(trajectory, context, opts);
      risks.push(...budgetRisks);

      // Filter by confidence threshold and prioritize
      const filteredRisks = risks.filter(risk => risk.confidence >= opts.confidenceThreshold);
      return this.prioritizeRisks(filteredRisks);

    } catch (error) {
      console.error('Error in risk detection:', error);
      return [];
    }
  }

  /**
   * Detect performance dips in trajectory
   */
  private async detectPerformanceDips(
    trajectory: TrajectoryPoint[],
    context: SimulationContext,
    options: Required<RiskDetectionOptions>
  ): Promise<RiskAlert[]> {
    const risks: RiskAlert[] = [];
    const trends = this.analyzePerformanceTrends(trajectory);

    for (const trend of trends) {
      if (trend.direction === 'decreasing') {
        // Calculate percentage decline from trajectory data
        const values = trajectory.map(point => point.metrics[trend.metric] || 0);
        const startValue = values[0] || 0;
        const endValue = values[values.length - 1] || 0;
        const percentageDecline = startValue > 0 ? (startValue - endValue) / startValue : 0;
        
        if (percentageDecline >= options.performanceDipThreshold) {
          const severity = this.calculateSeverity(percentageDecline, options.performanceDipThreshold);
          const timeframe = this.identifyRiskTimeframe(trajectory, trend.inflectionPoints);
          
          const risk: RiskAlert = {
            type: 'performance_dip',
            severity,
            probability: Math.max(0.5, trend.confidence), // Ensure minimum probability
            impact: this.calculateImpact(percentageDecline, trend.metric),
            timeframe,
            description: this.generatePerformanceDipDescription({ ...trend, magnitude: percentageDecline }),
            recommendations: this.generatePerformanceDipRecommendations(trend, context),
            confidence: Math.max(0.6, trend.confidence) // Ensure minimum confidence
          };

          risks.push(risk);
        }
      }
    }

    return risks;
  }

  /**
   * Detect audience fatigue patterns
   */
  private async detectAudienceFatigue(
    trajectory: TrajectoryPoint[],
    context: SimulationContext,
    options: Required<RiskDetectionOptions>
  ): Promise<RiskAlert[]> {
    const risks: RiskAlert[] = [];
    
    // Analyze engagement patterns over time
    const engagementTrend = this.analyzeEngagementFatigue(trajectory);
    
    if (engagementTrend.direction === 'decreasing') {
      // Calculate actual engagement decline
      const engagementValues = this.extractEngagementValues(trajectory);
      if (engagementValues.length > 0) {
        const startEngagement = engagementValues[0];
        const endEngagement = engagementValues[engagementValues.length - 1];
        const engagementDecline = startEngagement > 0 ? (startEngagement - endEngagement) / startEngagement : 0;
        
        if (engagementDecline >= options.audienceFatigueThreshold) {
          const severity = this.calculateSeverity(engagementDecline, options.audienceFatigueThreshold);
          const timeframe = this.identifyFatigueTimeframe(trajectory, engagementTrend);
          
          const risk: RiskAlert = {
            type: 'audience_fatigue',
            severity,
            probability: Math.max(0.5, engagementTrend.confidence),
            impact: this.calculateFatigueImpact(engagementDecline),
            timeframe,
            description: this.generateFatigueDescription({ ...engagementTrend, magnitude: engagementDecline }),
            recommendations: this.generateFatigueRecommendations(context),
            confidence: Math.max(0.6, engagementTrend.confidence)
          };

          risks.push(risk);
        }
      }
    }

    return risks;
  }

  /**
   * Detect competitor threats from market data
   */
  private async detectCompetitorThreats(
    trajectory: TrajectoryPoint[],
    marketData: MarketDataset,
    options: Required<RiskDetectionOptions>
  ): Promise<RiskAlert[]> {
    const risks: RiskAlert[] = [];
    
    if (!marketData.competitorActivity || marketData.competitorActivity.length === 0) {
      return risks;
    }

    // Analyze competitor activity patterns
    const competitorThreats = this.analyzeCompetitorActivity(marketData.competitorActivity);
    
    for (const threat of competitorThreats) {
      if (threat.severity >= options.competitorThreatThreshold) {
        const timeframe = this.identifyCompetitorThreatTimeframe(threat);
        
        const risk: RiskAlert = {
          type: 'competitor_threat',
          severity: this.calculateSeverity(threat.severity, options.competitorThreatThreshold),
          probability: threat.confidence,
          impact: this.calculateCompetitorImpact(threat.severity),
          timeframe,
          description: this.generateCompetitorThreatDescription(threat),
          recommendations: this.generateCompetitorThreatRecommendations(threat),
          confidence: threat.confidence
        };

        risks.push(risk);
      }
    }

    return risks;
  }

  /**
   * Detect budget overrun risks
   */
  private async detectBudgetOverruns(
    trajectory: TrajectoryPoint[],
    context: SimulationContext,
    options: Required<RiskDetectionOptions>
  ): Promise<RiskAlert[]> {
    const risks: RiskAlert[] = [];
    
    // Analyze spend trajectory vs budget
    const budgetRisk = this.analyzeBudgetRisk(trajectory, context);
    
    if (budgetRisk.overrunProbability > 0.1) { // 10% chance of overrun (more sensitive)
      const timeframe = this.identifyBudgetRiskTimeframe(trajectory, budgetRisk);
      
      const risk: RiskAlert = {
        type: 'budget_overrun',
        severity: this.calculateSeverity(budgetRisk.overrunProbability, 0.3),
        probability: budgetRisk.overrunProbability,
        impact: budgetRisk.projectedOverrun,
        timeframe,
        description: this.generateBudgetOverrunDescription(budgetRisk),
        recommendations: this.generateBudgetOverrunRecommendations(budgetRisk),
        confidence: budgetRisk.confidence
      };

      risks.push(risk);
    }

    return risks;
  }

  // ============================================================================
  // Analysis Methods
  // ============================================================================

  private analyzePerformanceTrends(trajectory: TrajectoryPoint[]): PerformanceTrend[] {
    const trends: PerformanceTrend[] = [];
    
    if (trajectory.length < 3) return trends;

    // Get all unique metrics
    const metrics = new Set<string>();
    trajectory.forEach(point => {
      Object.keys(point.metrics).forEach(metric => metrics.add(metric));
    });

    // Analyze trend for each metric
    metrics.forEach(metric => {
      const values = trajectory.map(point => point.metrics[metric] || 0);
      const trend = this.calculateTrend(values);
      const inflectionPoints = this.findInflectionPoints(trajectory, metric);
      
      trends.push({
        metric,
        direction: trend.direction,
        magnitude: Math.abs(trend.slope),
        confidence: trend.confidence,
        inflectionPoints
      });
    });

    return trends;
  }

  private analyzeEngagementFatigue(trajectory: TrajectoryPoint[]): PerformanceTrend {
    // Focus on engagement-related metrics
    const engagementMetrics = ['engagement', 'ctr'];
    const engagementValues: number[] = [];

    trajectory.forEach(point => {
      let avgEngagement = 0;
      let metricCount = 0;
      
      engagementMetrics.forEach(metric => {
        if (point.metrics[metric] !== undefined) {
          avgEngagement += point.metrics[metric];
          metricCount++;
        }
      });
      
      if (metricCount > 0) {
        engagementValues.push(avgEngagement / metricCount);
      }
    });

    const trend = this.calculateTrend(engagementValues);
    
    return {
      metric: 'engagement_composite',
      direction: trend.direction,
      magnitude: Math.abs(trend.slope),
      confidence: trend.confidence,
      inflectionPoints: []
    };
  }

  private analyzeCompetitorActivity(competitorActivity: CompetitorMetric[]): RiskPattern[] {
    const threats: RiskPattern[] = [];
    
    // Group by competitor
    const competitorGroups = this.groupCompetitorsByName(competitorActivity);
    
    Object.entries(competitorGroups).forEach(([competitor, metrics]) => {
      const activityTrend = this.calculateCompetitorActivityTrend(metrics);
      
      if (activityTrend.increasing && activityTrend.magnitude > 0.2) {
        threats.push({
          type: 'competitor_activity_increase',
          severity: activityTrend.magnitude,
          confidence: activityTrend.confidence,
          indicators: [`${competitor}_activity_spike`, 'market_share_threat'],
          timeframe: {
            start: new Date(Math.min(...metrics.map(m => m.date.getTime()))),
            end: new Date(Math.max(...metrics.map(m => m.date.getTime())))
          }
        });
      }
    });

    return threats;
  }

  private analyzeBudgetRisk(trajectory: TrajectoryPoint[], context: SimulationContext): any {
    const totalBudget = context.dataset.budgetAllocation.total;
    const currentSpend = Object.values(context.dataset.budgetAllocation.spent)
      .reduce((sum, spent) => sum + spent, 0);
    
    if (totalBudget === 0) {
      return { overrunProbability: 0, projectedOverrun: 0, confidence: 0 };
    }
    
    const spendRate = currentSpend / totalBudget;
    const campaignDuration = Math.ceil(
      (context.request.timeframe.endDate.getTime() - context.request.timeframe.startDate.getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    
    // Assume we're partway through the campaign
    const timeElapsed = trajectory.length;
    const timeRemaining = Math.max(1, campaignDuration - timeElapsed);
    const dailySpendRate = currentSpend / Math.max(1, timeElapsed);
    const projectedTotalSpend = currentSpend + (dailySpendRate * timeRemaining);
    
    const overrunAmount = Math.max(0, projectedTotalSpend - totalBudget);
    const overrunProbability = overrunAmount > 0 ? Math.min(0.9, overrunAmount / totalBudget) : 0;
    
    return {
      overrunProbability,
      projectedOverrun: overrunAmount,
      confidence: spendRate > 0.5 ? 0.8 : 0.6 // Higher confidence if significant spend
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private calculateTrend(values: number[]): {
    direction: 'increasing' | 'decreasing' | 'stable';
    slope: number;
    confidence: number;
  } {
    if (values.length < 2) {
      return { direction: 'stable', slope: 0, confidence: 0 };
    }

    // Simple linear regression
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const denominator = n * sumXX - sumX * sumX;
    if (denominator === 0) {
      return { direction: 'stable', slope: 0, confidence: 0 };
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const confidence = Math.min(0.95, Math.abs(slope) * n / 2); // More sensitive confidence

    let direction: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(slope) < 0.001) { // More sensitive threshold
      direction = 'stable';
    } else if (slope > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }

    return { direction, slope, confidence };
  }

  private findInflectionPoints(trajectory: TrajectoryPoint[], metric: string): Date[] {
    const inflectionPoints: Date[] = [];
    const values = trajectory.map(point => point.metrics[metric] || 0);
    
    for (let i = 1; i < values.length - 1; i++) {
      const prev = values[i - 1];
      const curr = values[i];
      const next = values[i + 1];
      
      // Check for local maxima or minima
      if ((curr > prev && curr > next) || (curr < prev && curr < next)) {
        inflectionPoints.push(trajectory[i].date);
      }
    }
    
    return inflectionPoints;
  }

  private calculateSeverity(magnitude: number, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = magnitude / threshold;
    
    if (ratio >= 3) return 'critical';
    if (ratio >= 2) return 'high';
    if (ratio >= 1.5) return 'medium';
    return 'low';
  }

  private calculateImpact(magnitude: number, metric: string): number {
    // Impact scoring based on metric type and magnitude
    const baseImpact = magnitude * 100; // Convert to percentage
    
    // Weight by metric importance
    const metricWeights: Record<string, number> = {
      'ctr': 1.2,
      'engagement': 1.1,
      'conversions': 1.5,
      'impressions': 0.8,
      'reach': 0.9
    };
    
    const weight = metricWeights[metric] || 1.0;
    return Math.min(100, baseImpact * weight);
  }

  private calculateFatigueImpact(magnitude: number): number {
    // Audience fatigue has compounding effects
    return Math.min(100, magnitude * 150);
  }

  private calculateCompetitorImpact(severity: number): number {
    // Competitor threats can have significant market share impact
    return Math.min(100, severity * 120);
  }

  private groupCompetitorsByName(metrics: CompetitorMetric[]): Record<string, CompetitorMetric[]> {
    return metrics.reduce((groups, metric) => {
      if (!groups[metric.competitor]) {
        groups[metric.competitor] = [];
      }
      groups[metric.competitor].push(metric);
      return groups;
    }, {} as Record<string, CompetitorMetric[]>);
  }

  private calculateCompetitorActivityTrend(metrics: CompetitorMetric[]): any {
    const values = metrics.map(m => m.value);
    const trend = this.calculateTrend(values);
    
    return {
      increasing: trend.direction === 'increasing',
      magnitude: Math.abs(trend.slope),
      confidence: trend.confidence
    };
  }

  private identifyRiskTimeframe(trajectory: TrajectoryPoint[], inflectionPoints: Date[]): DateRange {
    if (inflectionPoints.length === 0) {
      return {
        start: trajectory[0].date,
        end: trajectory[trajectory.length - 1].date
      };
    }
    
    return {
      start: inflectionPoints[0],
      end: inflectionPoints[inflectionPoints.length - 1]
    };
  }

  private identifyFatigueTimeframe(trajectory: TrajectoryPoint[], trend: PerformanceTrend): DateRange {
    // Fatigue typically occurs in the latter part of campaigns
    const midPoint = Math.floor(trajectory.length / 2);
    
    return {
      start: trajectory[midPoint].date,
      end: trajectory[trajectory.length - 1].date
    };
  }

  private identifyCompetitorThreatTimeframe(threat: RiskPattern): DateRange {
    return threat.timeframe;
  }

  private identifyBudgetRiskTimeframe(trajectory: TrajectoryPoint[], budgetRisk: any): DateRange {
    if (trajectory.length === 0) {
      // Fallback to a default timeframe if no trajectory data
      const now = new Date();
      return {
        start: now,
        end: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      };
    }
    
    // Budget risks typically manifest in the latter part of campaigns
    const riskStartIndex = Math.floor(trajectory.length * 0.7);
    
    return {
      start: trajectory[riskStartIndex].date,
      end: trajectory[trajectory.length - 1].date
    };
  }

  private prioritizeRisks(risks: RiskAlert[]): RiskAlert[] {
    return risks.sort((a, b) => {
      // Sort by severity first, then by impact, then by probability
      const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      
      if (severityDiff !== 0) return severityDiff;
      if (b.impact !== a.impact) return b.impact - a.impact;
      return b.probability - a.probability;
    });
  }

  // ============================================================================
  // Description and Recommendation Generators
  // ============================================================================

  private generatePerformanceDipDescription(trend: PerformanceTrend): string {
    return `Predicted ${Math.round(trend.magnitude * 100)}% decline in ${trend.metric} performance. ` +
           `Trend analysis shows ${trend.direction} pattern with ${Math.round(trend.confidence * 100)}% confidence.`;
  }

  private generatePerformanceDipRecommendations(trend: PerformanceTrend, context: SimulationContext): string[] {
    const recommendations = [
      'Review and refresh creative assets',
      'Analyze audience targeting parameters',
      'Consider budget reallocation to better-performing segments'
    ];

    if (trend.metric === 'ctr') {
      recommendations.push('A/B test new ad copy and visuals');
    }
    
    if (trend.metric === 'engagement') {
      recommendations.push('Experiment with different content formats');
    }

    return recommendations;
  }

  private generateFatigueDescription(trend: PerformanceTrend): string {
    return `Audience fatigue detected with ${Math.round(trend.magnitude * 100)}% decline in engagement metrics. ` +
           `Pattern suggests diminishing returns from current creative approach.`;
  }

  private generateFatigueRecommendations(context: SimulationContext): string[] {
    return [
      'Introduce new creative variations',
      'Expand to fresh audience segments',
      'Implement frequency capping',
      'Consider campaign pause and relaunch strategy'
    ];
  }

  private generateCompetitorThreatDescription(threat: RiskPattern): string {
    return `Increased competitor activity detected with ${Math.round(threat.severity * 100)}% activity spike. ` +
           `Market competition may impact campaign performance.`;
  }

  private generateCompetitorThreatRecommendations(threat: RiskPattern): string[] {
    return [
      'Monitor competitor campaigns and adjust strategy',
      'Increase bid competitiveness in key segments',
      'Differentiate creative messaging',
      'Consider alternative channels or timing'
    ];
  }

  private generateBudgetOverrunDescription(budgetRisk: any): string {
    return `Budget overrun risk detected with ${Math.round(budgetRisk.overrunProbability * 100)}% probability. ` +
           `Projected overspend of $${Math.round(budgetRisk.projectedOverrun)}.`;
  }

  private generateBudgetOverrunRecommendations(budgetRisk: any): string[] {
    return [
      'Implement stricter budget controls',
      'Reallocate spend from underperforming segments',
      'Adjust bid strategies to control costs',
      'Consider campaign duration adjustment'
    ];
  }

  private extractEngagementValues(trajectory: TrajectoryPoint[]): number[] {
    const engagementMetrics = ['engagement', 'ctr'];
    const values: number[] = [];

    trajectory.forEach(point => {
      let avgEngagement = 0;
      let metricCount = 0;
      
      engagementMetrics.forEach(metric => {
        if (point.metrics[metric] !== undefined) {
          avgEngagement += point.metrics[metric];
          metricCount++;
        }
      });
      
      if (metricCount > 0) {
        values.push(avgEngagement / metricCount);
      }
    });

    return values;
  }
}