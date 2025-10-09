/**
 * CompetitorAnalyzer - Market Positioning Insights
 *
 * Implements competitor performance tracking and analysis, market share estimation,
 * competitive positioning, and competitor activity impact assessment.
 */

import {
  CompetitorMetric,
  CampaignDataset,
  MarketDataset,
  SEMrushCompetitorData,
  SocialMediaMetrics,
  MetricType,
  ChannelType,
  DateRange,
} from "../../../types/simulation";

export interface CompetitorProfile {
  id: string;
  name: string;
  domain: string;
  industry: string;
  marketShare: number;
  estimatedBudget: number;
  channels: ChannelType[];
  strengths: string[];
  weaknesses: string[];
  lastUpdated: Date;
}

export interface CompetitivePositioning {
  rank: number;
  totalCompetitors: number;
  marketShare: number;
  competitiveAdvantages: CompetitiveAdvantage[];
  threats: CompetitiveThreat[];
  opportunities: CompetitiveOpportunity[];
  positioningScore: number;
  positioningGrade: "Leader" | "Challenger" | "Follower" | "Niche";
}

export interface CompetitiveAdvantage {
  type: "cost" | "quality" | "reach" | "engagement" | "innovation" | "brand";
  metric: MetricType;
  advantage: number; // Percentage advantage over competitors
  confidence: number;
  description: string;
}

export interface CompetitiveThreat {
  competitor: string;
  type:
    | "budget_increase"
    | "new_campaign"
    | "audience_overlap"
    | "creative_similarity"
    | "channel_expansion";
  severity: "low" | "medium" | "high" | "critical";
  probability: number;
  impact: number;
  timeframe: DateRange;
  description: string;
  mitigation: string[];
}

export interface CompetitiveOpportunity {
  type:
    | "market_gap"
    | "competitor_weakness"
    | "channel_opportunity"
    | "audience_expansion"
    | "timing_advantage";
  description: string;
  potential: number; // Estimated impact score
  effort: "low" | "medium" | "high";
  timeline: string;
  requirements: string[];
}

export interface MarketShareAnalysis {
  currentShare: number;
  projectedShare: number;
  shareChange: number;
  shareRank: number;
  topCompetitors: Array<{
    name: string;
    share: number;
    trend: "growing" | "stable" | "declining";
  }>;
  marketConcentration: number; // HHI index
  competitiveIntensity: "low" | "medium" | "high" | "extreme";
}

export interface CompetitorActivityImpact {
  competitor: string;
  activity: string;
  impactOnMetrics: Record<MetricType, number>;
  timeframe: DateRange;
  confidence: number;
  description: string;
}

export interface CompetitiveAnalysis {
  positioning: CompetitivePositioning;
  marketShare: MarketShareAnalysis;
  competitorProfiles: CompetitorProfile[];
  activityImpacts: CompetitorActivityImpact[];
  recommendations: CompetitiveRecommendation[];
  dataQuality: {
    coverage: number;
    accuracy: number;
    timeliness: number;
  };
}

export interface CompetitiveRecommendation {
  id: string;
  type: "defensive" | "offensive" | "positioning" | "differentiation";
  priority: number;
  title: string;
  description: string;
  expectedImpact: number;
  effort: "low" | "medium" | "high";
  timeline: string;
  metrics: MetricType[];
  actions: string[];
}

export class CompetitorAnalyzer {
  private competitorCache: Map<string, CompetitorProfile> = new Map();
  private readonly CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

  /**
   * Analyze competitive landscape and positioning
   */
  async analyzeCompetitors(
    campaignData: CampaignDataset,
    marketData: MarketDataset,
    industry: string,
    region: string = "global"
  ): Promise<CompetitiveAnalysis> {
    try {
      // Get competitor profiles
      const competitorProfiles = await this.getCompetitorProfiles(
        campaignData,
        marketData,
        industry,
        region
      );

      // Analyze competitive positioning
      const positioning = this.analyzeCompetitivePositioning(
        campaignData,
        competitorProfiles,
        marketData
      );

      // Analyze market share
      const marketShare = this.analyzeMarketShare(
        campaignData,
        competitorProfiles,
        marketData
      );

      // Analyze competitor activity impacts
      const activityImpacts = this.analyzeCompetitorActivityImpacts(
        campaignData,
        marketData
      );

      // Generate competitive recommendations
      const recommendations = this.generateCompetitiveRecommendations(
        positioning,
        marketShare,
        activityImpacts
      );

      // Assess data quality
      const dataQuality = this.assessCompetitiveDataQuality(
        competitorProfiles,
        marketData
      );

      return {
        positioning,
        marketShare,
        competitorProfiles,
        activityImpacts,
        recommendations,
        dataQuality,
      };
    } catch (error) {
      throw new Error(
        `Competitive analysis failed: ${error instanceof Error && error.message}`
      );
    }
  }

  /**
   * Get competitor profiles from various data sources
   */
  private async getCompetitorProfiles(
    campaignData: CampaignDataset,
    marketData: MarketDataset,
    industry: string,
    region: string
  ): Promise<CompetitorProfile[]> {
    const profiles: CompetitorProfile[] = [];

    // Extract competitors from market data
    const competitorNames = new Set<string>();
    marketData.competitorActivity.forEach((activity) => {
      competitorNames.add(activity.competitor);
    });

    // Get detailed profiles for each competitor
    for (const competitorName of competitorNames) {
      const cacheKey = `${competitorName}-${industry}-${region}`;
      let profile = this.competitorCache.get(cacheKey);

      if (!profile || this.isCacheExpired(profile.lastUpdated)) {
        profile = await this.fetchCompetitorProfile(
          competitorName,
          industry,
          region,
          marketData
        );
        this.competitorCache.set(cacheKey, profile);
      }

      profiles.push(profile);
    }

    return profiles.sort((a, b) => b.marketShare - a.marketShare);
  }

  /**
   * Fetch detailed competitor profile
   */
  private async fetchCompetitorProfile(
    competitorName: string,
    industry: string,
    region: string,
    marketData: MarketDataset
  ): Promise<CompetitorProfile> {
    // In a real implementation, this would integrate with SEMrush, SimilarWeb, etc.
    // For now, we'll create profiles based on available market data

    const competitorMetrics = marketData.competitorActivity.filter(
      (activity) => activity.competitor === competitorName
    );

    // Estimate market share based on activity metrics
    const totalActivity = marketData.competitorActivity.reduce(
      (sum, activity) => sum + activity.value,
      0
    );
    const competitorActivity = competitorMetrics.reduce(
      (sum, activity) => sum + activity.value,
      0
    );
    const marketShare =
      totalActivity > 0 ? (competitorActivity / totalActivity) * 100 : 0;

    // Estimate budget based on market share and industry averages
    const industryBudgetMultipliers: Record<string, number> = {
      technology: 500000,
      healthcare: 300000,
      finance: 800000,
      retail: 400000,
      education: 200000,
    };
    const baseBudget = industryBudgetMultipliers[industry] || 350000;
    const estimatedBudget = baseBudget * (marketShare / 10); // Scale by market share

    // Determine channels based on metrics
    const channels: ChannelType[] = [];
    const channelMetrics = competitorMetrics.filter((m) =>
      ["facebook", "google", "instagram", "linkedin", "twitter"].includes(
        m.source
      )
    );
    channelMetrics.forEach((metric) => {
      if (metric.value > 0) {
        channels.push(metric.source as ChannelType);
      }
    });

    // Analyze strengths and weaknesses
    const { strengths, weaknesses } = this.analyzeCompetitorStrengthsWeaknesses(
      competitorMetrics,
      marketShare
    );

    return {
      id: `competitor-${competitorName.toLowerCase().replace(/\s+/g, "-")}`,
      name: competitorName,
      domain: `${competitorName.toLowerCase().replace(/\s+/g, "")}.com`, // Mock domain
      industry,
      marketShare,
      estimatedBudget,
      channels,
      strengths,
      weaknesses,
      lastUpdated: new Date(),
    };
  }

  /**
   * Analyze competitor strengths and weaknesses
   */
  private analyzeCompetitorStrengthsWeaknesses(
    metrics: CompetitorMetric[],
    marketShare: number
  ): { strengths: string[]; weaknesses: string[] } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // Analyze based on market share
    if (marketShare > 20) {
      strengths.push("Strong market presence");
      strengths.push("High brand recognition");
    } else if (marketShare < 5) {
      weaknesses.push("Limited market presence");
      weaknesses.push("Low brand awareness");
    }

    // Analyze based on channel diversity
    const uniqueChannels = new Set(metrics.map((m) => m.source)).size;
    if (uniqueChannels >= 4) {
      strengths.push("Multi-channel presence");
    } else if (uniqueChannels <= 2) {
      weaknesses.push("Limited channel diversity");
    }

    // Analyze based on activity consistency
    const recentMetrics = metrics.filter(
      (m) => Date.now() - m.date.getTime() < 30 * 24 * 60 * 60 * 1000 // Last 30 days
    );
    if (recentMetrics.length >= metrics.length * 0.7) {
      strengths.push("Consistent campaign activity");
    } else {
      weaknesses.push("Inconsistent campaign activity");
    }

    // Add default insights if none found
    if (strengths.length === 0) {
      strengths.push("Established market player");
    }
    if (weaknesses.length === 0) {
      weaknesses.push("Potential optimization opportunities");
    }

    return { strengths, weaknesses };
  }

  /**
   * Analyze competitive positioning
   */
  private analyzeCompetitivePositioning(
    campaignData: CampaignDataset,
    competitors: CompetitorProfile[],
    marketData: MarketDataset
  ): CompetitivePositioning {
    // Calculate current campaign's market share
    const totalMarketShare = competitors.reduce(
      (sum, c) => sum + c.marketShare,
      0
    );
    const remainingShare = Math.max(0, 100 - totalMarketShare);
    const campaignMarketShare = Math.min(remainingShare, 5); // Assume 5% or remaining

    // Determine rank
    const allShares = [
      ...competitors.map((c) => c.marketShare),
      campaignMarketShare,
    ];
    allShares.sort((a, b) => b - a);
    const rank = allShares.indexOf(campaignMarketShare) + 1;

    // Identify competitive advantages
    const advantages = this.identifyCompetitiveAdvantages(
      campaignData,
      competitors,
      marketData
    );

    // Identify threats
    const threats = this.identifyCompetitiveThreats(
      campaignData,
      competitors,
      marketData
    );

    // Identify opportunities
    const opportunities = this.identifyCompetitiveOpportunities(
      campaignData,
      competitors,
      marketData
    );

    // Calculate positioning score
    const positioningScore = this.calculatePositioningScore(
      rank,
      competitors.length + 1,
      campaignMarketShare,
      advantages,
      threats
    );

    // Determine positioning grade
    let positioningGrade: "Leader" | "Challenger" | "Follower" | "Niche";
    if (rank === 1 && campaignMarketShare > 25) {
      positioningGrade = "Leader";
    } else if (rank <= 3 && campaignMarketShare > 10) {
      positioningGrade = "Challenger";
    } else if (campaignMarketShare > 5) {
      positioningGrade = "Follower";
    } else {
      positioningGrade = "Niche";
    }

    return {
      rank,
      totalCompetitors: competitors.length + 1,
      marketShare: campaignMarketShare,
      competitiveAdvantages: advantages,
      threats,
      opportunities,
      positioningScore,
      positioningGrade,
    };
  }

  /**
   * Identify competitive advantages
   */
  private identifyCompetitiveAdvantages(
    campaignData: CampaignDataset,
    competitors: CompetitorProfile[],
    marketData: MarketDataset
  ): CompetitiveAdvantage[] {
    const advantages: CompetitiveAdvantage[] = [];

    // Calculate campaign metrics
    const campaignMetrics = this.calculateCampaignMetrics(campaignData);

    // Compare with competitor averages
    const competitorAverages = this.calculateCompetitorAverages(
      competitors,
      marketData
    );

    Object.entries(campaignMetrics).forEach(([metric, value]) => {
      const metricType = metric as MetricType;
      const competitorAvg = competitorAverages[metricType];

      if (competitorAvg && value > competitorAvg * 1.1) {
        // 10% advantage threshold
        const advantage = ((value - competitorAvg) / competitorAvg) * 100;

        advantages.push({
          type: this.getAdvantageType(metricType),
          metric: metricType,
          advantage: Math.round(advantage),
          confidence: 0.8,
          description: `${advantage.toFixed(1)}% better ${metricType} performance than competitor average`,
        });
      }
    });

    return advantages.sort((a, b) => b.advantage - a.advantage);
  }

  /**
   * Get advantage type based on metric
   */
  private getAdvantageType(
    metric: MetricType
  ): "cost" | "quality" | "reach" | "engagement" | "innovation" | "brand" {
    const typeMap: Record<
      MetricType,
      "cost" | "quality" | "reach" | "engagement" | "innovation" | "brand"
    > = {
      cpc: "cost",
      cpm: "cost",
      ctr: "quality",
      engagement: "engagement",
      impressions: "reach",
      reach: "reach",
      conversions: "quality",
    };
    return typeMap[metric] || "quality";
  }

  /**
   * Identify competitive threats
   */
  private identifyCompetitiveThreats(
    campaignData: CampaignDataset,
    competitors: CompetitorProfile[],
    marketData: MarketDataset
  ): CompetitiveThreat[] {
    const threats: CompetitiveThreat[] = [];

    competitors.forEach((competitor) => {
      // Budget increase threat
      if (
        competitor.estimatedBudget >
        campaignData.budgetAllocation.total * 2
      ) {
        threats.push({
          competitor: competitor.name,
          type: "budget_increase",
          severity: "high",
          probability: 0.7,
          impact: 0.8,
          timeframe: {
            start: new Date(),
            end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
          },
          description: `${competitor.name} has significantly higher budget allocation, potentially limiting your reach and increasing costs`,
          mitigation: [
            "Focus on high-performing audience segments",
            "Optimize creative performance to improve quality scores",
            "Consider alternative channels with less competition",
          ],
        });
      }

      // Channel overlap threat
      const channelOverlap = campaignData.campaign.channels.filter((c) =>
        competitor.channels.includes(c.type as ChannelType)
      );
      if (channelOverlap.length >= 2) {
        threats.push({
          competitor: competitor.name,
          type: "audience_overlap",
          severity: "medium",
          probability: 0.8,
          impact: 0.6,
          timeframe: {
            start: new Date(),
            end: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
          },
          description: `Significant channel overlap with ${competitor.name} may increase competition for audience attention`,
          mitigation: [
            "Differentiate creative messaging",
            "Target complementary audience segments",
            "Optimize bidding strategies",
          ],
        });
      }
    });

    return threats.sort(
      (a, b) => b.probability * b.impact - a.probability * a.impact
    );
  }

  /**
   * Identify competitive opportunities
   */
  private identifyCompetitiveOpportunities(
    campaignData: CampaignDataset,
    competitors: CompetitorProfile[],
    marketData: MarketDataset
  ): CompetitiveOpportunity[] {
    const opportunities: CompetitiveOpportunity[] = [];

    // Find channels not used by top competitors
    const topCompetitors = competitors.slice(0, 3);
    const competitorChannels = new Set(
      topCompetitors.flatMap((c) => c.channels)
    );
    const campaignChannels = new Set(
      campaignData.campaign.channels.map((c) => c.type as ChannelType)
    );

    const availableChannels: ChannelType[] = [
      "facebook",
      "google",
      "instagram",
      "linkedin",
      "twitter",
    ];
    const underutilizedChannels = availableChannels.filter(
      (channel) =>
        !competitorChannels.has(channel) && !campaignChannels.has(channel)
    );

    underutilizedChannels.forEach((channel) => {
      opportunities.push({
        type: "channel_opportunity",
        description: `${channel} appears underutilized by competitors, presenting expansion opportunity`,
        potential: 75,
        effort: "medium",
        timeline: "4-6 weeks",
        requirements: [
          `Set up ${channel} advertising account`,
          "Develop channel-specific creative assets",
          "Allocate budget for testing",
        ],
      });
    });

    // Find competitor weaknesses to exploit
    competitors.forEach((competitor) => {
      competitor.weaknesses.forEach((weakness) => {
        if (weakness.includes("channel diversity")) {
          opportunities.push({
            type: "competitor_weakness",
            description: `${competitor.name} has limited channel presence - opportunity to capture their audience across multiple channels`,
            potential: 60,
            effort: "low",
            timeline: "2-3 weeks",
            requirements: [
              "Expand to channels where competitor is absent",
              "Target similar audience segments",
            ],
          });
        }
      });
    });

    return opportunities.sort((a, b) => b.potential - a.potential);
  }

  /**
   * Analyze market share distribution
   */
  private analyzeMarketShare(
    campaignData: CampaignDataset,
    competitors: CompetitorProfile[],
    marketData: MarketDataset
  ): MarketShareAnalysis {
    const totalMarketShare = competitors.reduce(
      (sum, c) => sum + c.marketShare,
      0
    );
    const currentShare = Math.max(0, Math.min(100 - totalMarketShare, 5)); // Assume 5% or remaining

    // Project future share based on budget and performance
    const budgetShare =
      campaignData.budgetAllocation.total /
      (competitors.reduce((sum, c) => sum + c.estimatedBudget, 0) +
        campaignData.budgetAllocation.total);
    const projectedShare = Math.min(
      currentShare * 1.2,
      budgetShare * 100 * 1.5
    );

    const shareChange = projectedShare - currentShare;

    // Rank by market share
    const allShares = [
      ...competitors.map((c) => ({ name: c.name, share: c.marketShare })),
      { name: "Your Campaign", share: currentShare },
    ];
    allShares.sort((a, b) => b.share - a.share);
    const shareRank =
      allShares.findIndex((s) => s.name === "Your Campaign") + 1;

    // Top competitors with trends
    const topCompetitors = competitors.slice(0, 5).map((c) => ({
      name: c.name,
      share: c.marketShare,
      trend: this.estimateShareTrend(c, marketData) as
        | "growing"
        | "stable"
        | "declining",
    }));

    // Calculate market concentration (HHI)
    const marketConcentration = allShares.reduce(
      (sum, s) => sum + Math.pow(s.share, 2),
      0
    );

    // Determine competitive intensity
    let competitiveIntensity: "low" | "medium" | "high" | "extreme";
    if (marketConcentration > 2500) {
      competitiveIntensity = "low";
    } else if (marketConcentration > 1500) {
      competitiveIntensity = "medium";
    } else if (marketConcentration > 1000) {
      competitiveIntensity = "high";
    } else {
      competitiveIntensity = "extreme";
    }

    return {
      currentShare,
      projectedShare,
      shareChange,
      shareRank,
      topCompetitors,
      marketConcentration,
      competitiveIntensity,
    };
  }

  /**
   * Estimate competitor share trend
   */
  private estimateShareTrend(
    competitor: CompetitorProfile,
    marketData: MarketDataset
  ): "growing" | "stable" | "declining" {
    const recentActivity = marketData.competitorActivity.filter(
      (activity) =>
        activity.competitor === competitor.name &&
        Date.now() - activity.date.getTime() < 30 * 24 * 60 * 60 * 1000
    );

    const olderActivity = marketData.competitorActivity.filter(
      (activity) =>
        activity.competitor === competitor.name &&
        Date.now() - activity.date.getTime() >= 30 * 24 * 60 * 60 * 1000 &&
        Date.now() - activity.date.getTime() < 60 * 24 * 60 * 60 * 1000
    );

    if (recentActivity.length === 0 && olderActivity.length === 0) {
      return "stable";
    }

    const recentAvg =
      recentActivity.reduce((sum, a) => sum + a.value, 0) /
      Math.max(1, recentActivity.length);
    const olderAvg =
      olderActivity.reduce((sum, a) => sum + a.value, 0) /
      Math.max(1, olderActivity.length);

    if (recentAvg > olderAvg * 1.1) {
      return "growing";
    } else if (recentAvg < olderAvg * 0.9) {
      return "declining";
    } else {
      return "stable";
    }
  }

  /**
   * Analyze competitor activity impacts
   */
  private analyzeCompetitorActivityImpacts(
    campaignData: CampaignDataset,
    marketData: MarketDataset
  ): CompetitorActivityImpact[] {
    const impacts: CompetitorActivityImpact[] = [];

    // Group activities by competitor
    const competitorActivities = new Map<string, CompetitorMetric[]>();
    marketData.competitorActivity.forEach((activity) => {
      if (!competitorActivities.has(activity.competitor)) {
        competitorActivities.set(activity.competitor, []);
      }
      competitorActivities.get(activity.competitor)!.push(activity);
    });

    // Analyze impact for each competitor
    competitorActivities.forEach((activities, competitor) => {
      const impact = this.calculateActivityImpact(activities, campaignData);
      if (impact) {
        impacts.push({
          competitor,
          activity: this.summarizeActivity(activities),
          impactOnMetrics: impact.metrics,
          timeframe: impact.timeframe,
          confidence: impact.confidence,
          description: impact.description,
        });
      }
    });

    return impacts.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate activity impact on campaign metrics
   */
  private calculateActivityImpact(
    activities: CompetitorMetric[],
    campaignData: CampaignDataset
  ): {
    metrics: Record<MetricType, number>;
    timeframe: DateRange;
    confidence: number;
    description: string;
  } | null {
    if (activities.length === 0) return null;

    const totalActivity = activities.reduce((sum, a) => sum + a.value, 0);
    if (totalActivity === 0) return null;

    // Estimate impact based on activity intensity
    const impactMultiplier = Math.min(totalActivity / 1000, 0.3); // Cap at 30% impact

    const metrics: Record<MetricType, number> = {
      ctr: -impactMultiplier * 0.1, // Negative impact on CTR
      cpc: impactMultiplier * 0.15, // Positive impact on CPC (increased costs)
      cpm: impactMultiplier * 0.12, // Positive impact on CPM
      engagement: -impactMultiplier * 0.08, // Negative impact on engagement
      impressions: -impactMultiplier * 0.2, // Negative impact on impressions
      reach: -impactMultiplier * 0.18, // Negative impact on reach
      conversions: -impactMultiplier * 0.12, // Negative impact on conversions
    };

    const startDate = new Date(
      Math.min(...activities.map((a) => a.date.getTime()))
    );
    const endDate = new Date(
      Math.max(...activities.map((a) => a.date.getTime()))
    );

    return {
      metrics,
      timeframe: { start: startDate, end: endDate },
      confidence: Math.min(0.9, activities.length / 10), // Higher confidence with more data points
      description: `Increased competitive activity may impact campaign performance by ${(impactMultiplier * 100).toFixed(1)}%`,
    };
  }

  /**
   * Summarize competitor activity
   */
  private summarizeActivity(activities: CompetitorMetric[]): string {
    const channels = new Set(activities.map((a) => a.source));
    const avgValue =
      activities.reduce((sum, a) => sum + a.value, 0) / activities.length;

    return `${activities.length} activities across ${channels.size} channels (avg intensity: ${avgValue.toFixed(1)})`;
  }

  /**
   * Generate competitive recommendations
   */
  private generateCompetitiveRecommendations(
    positioning: CompetitivePositioning,
    marketShare: MarketShareAnalysis,
    activityImpacts: CompetitorActivityImpact[]
  ): CompetitiveRecommendation[] {
    const recommendations: CompetitiveRecommendation[] = [];

    // Defensive recommendations based on threats
    positioning.threats.forEach((threat, index) => {
      if (threat.severity === "high" || threat.severity === "critical") {
        recommendations.push({
          id: `defensive-${index}`,
          type: "defensive",
          priority: threat.severity === "critical" ? 90 : 75,
          title: `Defend Against ${threat.competitor}`,
          description: threat.description,
          expectedImpact: threat.impact * 100,
          effort: "medium",
          timeline: "2-4 weeks",
          metrics: ["ctr", "cpc", "reach"],
          actions: threat.mitigation,
        });
      }
    });

    // Offensive recommendations based on opportunities
    positioning.opportunities.forEach((opportunity, index) => {
      if (opportunity.potential > 60) {
        recommendations.push({
          id: `offensive-${index}`,
          type: "offensive",
          priority: opportunity.potential,
          title: `Exploit ${opportunity.type.replace("_", " ")} Opportunity`,
          description: opportunity.description,
          expectedImpact: opportunity.potential,
          effort: opportunity.effort,
          timeline: opportunity.timeline,
          metrics: ["reach", "impressions", "conversions"],
          actions: opportunity.requirements,
        });
      }
    });

    // Positioning recommendations
    if (
      positioning.positioningGrade === "Follower" ||
      positioning.positioningGrade === "Niche"
    ) {
      recommendations.push({
        id: "positioning-improvement",
        type: "positioning",
        priority: 80,
        title: "Improve Market Position",
        description: `Current ${positioning.positioningGrade} position presents opportunity for advancement`,
        expectedImpact: 70,
        effort: "high",
        timeline: "8-12 weeks",
        metrics: ["reach", "engagement", "conversions"],
        actions: [
          "Increase budget allocation to high-performing channels",
          "Expand audience targeting",
          "Improve creative differentiation",
          "Focus on competitor weaknesses",
        ],
      });
    }

    // Market share recommendations
    if (marketShare.shareChange < 0) {
      recommendations.push({
        id: "market-share-defense",
        type: "defensive",
        priority: 85,
        title: "Defend Market Share",
        description: "Projected market share decline requires immediate action",
        expectedImpact: Math.abs(marketShare.shareChange) * 100,
        effort: "high",
        timeline: "4-6 weeks",
        metrics: ["impressions", "reach", "conversions"],
        actions: [
          "Increase competitive bidding",
          "Expand to underutilized channels",
          "Improve audience targeting precision",
          "Enhance creative performance",
        ],
      });
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Calculate campaign metrics for comparison
   */
  private calculateCampaignMetrics(
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

    Object.keys(metricSums).forEach((metric) => {
      if (metric in metrics) {
        metrics[metric as MetricType] =
          metricSums[metric] / metricCounts[metric];
      }
    });

    return metrics;
  }

  /**
   * Calculate competitor averages
   */
  private calculateCompetitorAverages(
    competitors: CompetitorProfile[],
    marketData: MarketDataset
  ): Record<MetricType, number> {
    const averages: Record<MetricType, number> = {
      ctr: 0,
      cpc: 0,
      cpm: 0,
      engagement: 0,
      impressions: 0,
      reach: 0,
      conversions: 0,
    };

    // Mock competitor averages based on market data
    // In a real implementation, this would aggregate actual competitor metrics
    const totalActivity = marketData.competitorActivity.reduce(
      (sum, a) => sum + a.value,
      0
    );
    const avgActivity =
      totalActivity / Math.max(1, marketData.competitorActivity.length);

    // Scale averages based on market activity
    const scaleFactor = Math.min(avgActivity / 100, 2);

    averages.ctr = 1.2 * scaleFactor;
    averages.cpc = 2.5 * scaleFactor;
    averages.cpm = 8.0 * scaleFactor;
    averages.engagement = 0.8 * scaleFactor;
    averages.impressions = 50000 * scaleFactor;
    averages.reach = 35000 * scaleFactor;
    averages.conversions = 300 * scaleFactor;

    return averages;
  }

  /**
   * Calculate positioning score
   */
  private calculatePositioningScore(
    rank: number,
    totalCompetitors: number,
    marketShare: number,
    advantages: CompetitiveAdvantage[],
    threats: CompetitiveThreat[]
  ): number {
    // Base score from rank (higher rank = lower score)
    const rankScore = ((totalCompetitors - rank) / totalCompetitors) * 40;

    // Market share score
    const shareScore = Math.min(marketShare * 2, 30);

    // Advantages score
    const advantageScore = Math.min(advantages.length * 5, 20);

    // Threat penalty
    const threatPenalty =
      threats.filter((t) => t.severity === "high" || t.severity === "critical")
        .length * 5;

    return Math.max(
      0,
      Math.min(100, rankScore + shareScore + advantageScore - threatPenalty)
    );
  }

  /**
   * Assess competitive data quality
   */
  private assessCompetitiveDataQuality(
    competitors: CompetitorProfile[],
    marketData: MarketDataset
  ): { coverage: number; accuracy: number; timeliness: number } {
    // Coverage: percentage of competitors with complete profiles
    const completeProfiles = competitors.filter(
      (c) =>
        c.channels.length > 0 && c.strengths.length > 0 && c.estimatedBudget > 0
    ).length;
    const coverage =
      competitors.length > 0 ? completeProfiles / competitors.length : 0;

    // Accuracy: based on data source reliability (mock)
    const accuracy = 0.75; // Mock accuracy score

    // Timeliness: based on data freshness
    const avgAge =
      marketData.competitorActivity.reduce((sum, activity) => {
        return sum + (Date.now() - activity.date.getTime());
      }, 0) / Math.max(1, marketData.competitorActivity.length);
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    const timeliness = Math.max(0, 1 - avgAge / maxAge);

    return {
      coverage: Math.round(coverage * 100) / 100,
      accuracy: Math.round(accuracy * 100) / 100,
      timeliness: Math.round(timeliness * 100) / 100,
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
    for (const [key, profile] of this.competitorCache.entries()) {
      if (now - profile.lastUpdated.getTime() > this.CACHE_TTL) {
        this.competitorCache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.competitorCache.size,
      hitRate: 0.78, // Mock hit rate
    };
  }
}
