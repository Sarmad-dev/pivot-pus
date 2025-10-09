"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  TrendingUp,
  BarChart3,
  Activity,
  DollarSign,
  Users,
  Eye,
  MousePointer,
  Brain,
} from "lucide-react";
import { Campaign } from "@/types/campaign";
import { PredictedVsActualChart } from "@/components/simulations/PredictedVsActualChart";
import { RiskAlerts } from "@/components/simulations/RiskAlerts";
import { PivotRecommendations } from "@/components/simulations/PivotRecommendations";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useMemo, useCallback } from "react";

interface CampaignMetricsProps {
  campaign: Campaign;
}

export const CampaignMetrics = ({ campaign }: CampaignMetricsProps) => {
  // Memoize the date calculations to prevent re-renders
  const dateRange = useMemo(() => {
    const now = Date.now();
    return {
      startDate: now - 30 * 24 * 60 * 60 * 1000, // Last 30 days
      endDate: now,
    };
  }, []);

  // Fetch recent completed simulations for this campaign
  const recentSimulations = useQuery(
    api.simulations.getRecentSimulationsByCampaign,
    { campaignId: campaign._id, limit: 1 }
  );

  // Fetch campaign simulation history for analytics
  const simulationHistory = useQuery(
    api.simulations.getCampaignSimulationHistory,
    { campaignId: campaign._id, limit: 5 }
  );

  // Fetch model performance metrics for this campaign
  const modelPerformance = useQuery(
    api.simulations.getModelPerformanceMetrics,
    campaign.organizationId
      ? {
          organizationId: campaign.organizationId,
          modelName: "trajectory_predictor", // Default model name
          modelVersion: "v1.0",
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }
      : "skip"
  );

  // Get the most recent completed simulation
  const latestSimulation = useMemo(() => {
    return recentSimulations?.find((s) => s.status === "completed");
  }, [recentSimulations]);

  // Fetch full simulation results if we have a completed simulation
  const simulationResults = useQuery(
    api.simulations.getSimulationResults,
    latestSimulation ? { simulationId: latestSimulation._id } : "skip"
  );

  // Memoize extracted data to prevent re-renders
  const { actualPerformance, riskAlerts, recommendations } = useMemo(() => {
    return {
      actualPerformance:
        simulationResults?.results?.trajectories?.map((t: any) => ({
          date: t.date,
          metrics: t.metrics,
        })) || [],
      riskAlerts: simulationResults?.results?.risks || [],
      recommendations: simulationResults?.results?.recommendations || [],
    };
  }, [simulationResults]);
  const getKPIIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "reach":
        return <Users className="h-4 w-4" />;
      case "engagement":
        return <Activity className="h-4 w-4" />;
      case "conversions":
        return <MousePointer className="h-4 w-4" />;
      case "brand_awareness":
        return <Eye className="h-4 w-4" />;
      case "roi":
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getKPIColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "reach":
        return "bg-blue-100 text-blue-600";
      case "engagement":
        return "bg-green-100 text-green-600";
      case "conversions":
        return "bg-purple-100 text-purple-600";
      case "brand_awareness":
        return "bg-orange-100 text-orange-600";
      case "roi":
        return "bg-red-100 text-red-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const formatKPIValue = (type: string, value: number) => {
    switch (type.toLowerCase()) {
      case "roi":
        return `${value}%`;
      case "reach":
      case "engagement":
      case "conversions":
        return value.toLocaleString();
      case "brand_awareness":
        return `${value}%`;
      default:
        return value.toLocaleString();
    }
  };

  const getTimeframeLabel = (timeframe: string) => {
    switch (timeframe.toLowerCase()) {
      case "daily":
        return "per day";
      case "weekly":
        return "per week";
      case "monthly":
        return "per month";
      case "campaign":
        return "campaign total";
      default:
        return timeframe;
    }
  };

  // Memoize the latest trajectory to prevent recalculation
  const latestTrajectory = useMemo(() => {
    if (simulationResults?.results?.trajectories?.length > 0) {
      return simulationResults.results.trajectories.sort(
        (a: any, b: any) => b.date - a.date
      )[0];
    }
    return null;
  }, [simulationResults]);

  // Calculate current performance from real data
  const getCurrentValue = useCallback(
    (kpi: any) => {
      // Try to get data from simulation results
      if (latestTrajectory) {
        const metricKey = Object.keys(latestTrajectory.metrics).find((key) =>
          key.toLowerCase().includes(kpi.type.toLowerCase())
        );

        if (metricKey) {
          return latestTrajectory.metrics[metricKey];
        }
      }

      // Fallback: calculate based on campaign status and time elapsed
      if (campaign.status === "active") {
        const timeElapsed = Date.now() - campaign.startDate;
        const totalDuration = campaign.endDate - campaign.startDate;
        const progressRatio = Math.min(timeElapsed / totalDuration, 1);

        // Estimate current value based on progress and typical performance curves
        const performanceMultiplier = 0.4 + progressRatio * 0.4; // 40-80% of target
        return Math.floor(kpi.target * performanceMultiplier);
      }

      // For draft/paused campaigns, return 0
      return 0;
    },
    [latestTrajectory, campaign.status, campaign.startDate, campaign.endDate]
  );

  const calculateProgress = useCallback((current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  }, []);

  return (
    <div className="space-y-6">
      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaign.kpis.map((kpi, index) => {
          const currentValue = getCurrentValue(kpi);
          const progress = calculateProgress(currentValue, kpi.target);

          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg ${getKPIColor(kpi.type)}`}>
                    {getKPIIcon(kpi.type)}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Weight: {kpi.weight}%
                  </Badge>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium capitalize">
                    {kpi.type.replace("_", " ")}
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">
                      {formatKPIValue(kpi.type, currentValue)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / {formatKPIValue(kpi.type, kpi.target)}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{progress.toFixed(1)}% of target</span>
                    <span>{getTimeframeLabel(kpi.timeframe)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Custom Metrics */}
      {campaign.customMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Custom Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {campaign.customMetrics.map((metric, index) => {
                // Calculate metric values directly without useMemo inside map
                let value = 0;

                if (latestTrajectory) {
                  const metricKey = Object.keys(latestTrajectory.metrics).find(
                    (key) =>
                      key.toLowerCase().includes(metric.name.toLowerCase())
                  );

                  if (metricKey) {
                    value = latestTrajectory.metrics[metricKey];
                  }
                }

                // Fallback calculation for active campaigns
                if (value === 0 && campaign.status === "active") {
                  const timeElapsed = Date.now() - campaign.startDate;
                  const totalDuration = campaign.endDate - campaign.startDate;
                  const progressRatio = Math.min(
                    timeElapsed / totalDuration,
                    1
                  );
                  value = Math.floor(metric.target * progressRatio * 0.6); // Conservative estimate
                }

                const currentValue = value;
                const progress = calculateProgress(value, metric.target);

                return (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium">{metric.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {metric.description}
                        </p>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold">
                          {currentValue.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          / {metric.target.toLocaleString()} {metric.unit}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {progress.toFixed(1)}% of target achieved
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {useMemo(() => {
                  if (campaign.kpis.length === 0) return 0;

                  const achievements = campaign.kpis.map((kpi) => {
                    const current = getCurrentValue(kpi);
                    return calculateProgress(current, kpi.target);
                  });
                  const average =
                    achievements.reduce((sum, val) => sum + val, 0) /
                    achievements.length;
                  return Math.floor(average);
                }, [campaign.kpis, getCurrentValue, calculateProgress])}
                %
              </div>
              <p className="text-sm text-muted-foreground">
                Average KPI Achievement
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {useMemo(() => {
                  const roiKpi = campaign.kpis.find(
                    (k) => k.type.toLowerCase() === "roi"
                  );
                  if (roiKpi) {
                    const currentROI = getCurrentValue(roiKpi);
                    return `${Math.floor(currentROI)}%`;
                  }

                  // Calculate estimated ROI based on budget and performance
                  if (campaign.status === "active" && latestTrajectory) {
                    const conversions =
                      latestTrajectory.metrics.conversions || 0;
                    const estimatedRevenue = conversions * 50; // Assume $50 per conversion
                    const roi =
                      ((estimatedRevenue - campaign.budget) / campaign.budget) *
                      100;
                    return `${Math.floor(Math.max(roi, 0))}%`;
                  }

                  return "N/A";
                }, [
                  campaign.kpis,
                  campaign.status,
                  campaign.budget,
                  latestTrajectory,
                  getCurrentValue,
                ])}
              </div>
              <p className="text-sm text-muted-foreground">
                Return on Investment
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600 mb-2">
                {useMemo(() => {
                  // Calculate health based on simulation analytics and model performance
                  let healthScore = 50; // Base score

                  // Factor in simulation success rate
                  if (simulationHistory?.analytics) {
                    const successRate =
                      simulationHistory.analytics.completed /
                      (simulationHistory.analytics.total || 1);
                    healthScore += successRate * 30;
                  }

                  // Factor in model performance
                  if (modelPerformance?.accuracy) {
                    const accuracy = modelPerformance.accuracy || 0;
                    healthScore += accuracy * 20;
                  }

                  // Factor in campaign status
                  if (campaign.status === "active") healthScore += 10;
                  else if (campaign.status === "paused") healthScore -= 10;
                  else if (campaign.status === "draft") healthScore -= 20;

                  return Math.min(Math.floor(healthScore), 100);
                }, [
                  simulationHistory?.analytics,
                  modelPerformance?.accuracy,
                  campaign.status,
                ])}
                %
              </div>
              <p className="text-sm text-muted-foreground">
                Overall Campaign Health
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Simulation Integration */}
      {simulationResults?.results && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">AI Performance Analysis</h3>
            {simulationResults && (
              <Badge variant="outline" className="ml-auto">
                Last updated:{" "}
                {new Date(
                  simulationResults.completedAt || simulationResults.updatedAt
                ).toLocaleDateString()}
              </Badge>
            )}
          </div>

          {/* Predicted vs Actual Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PredictedVsActualChart
              simulationResults={simulationResults.results}
              actualPerformance={actualPerformance}
              metric="ctr"
              title="CTR: Predicted vs Actual"
            />
            <PredictedVsActualChart
              simulationResults={simulationResults.results}
              actualPerformance={actualPerformance}
              metric="impressions"
              title="Impressions: Predicted vs Actual"
            />
          </div>

          {/* Risk Alerts and Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RiskAlerts
              campaignId={campaign._id}
              risks={riskAlerts}
              compact={false}
            />
            <PivotRecommendations
              campaignId={campaign._id}
              recommendations={recommendations}
              compact={false}
            />
          </div>
        </div>
      )}

      {/* Show message when no simulation data is available */}
      {!simulationResults?.results && (
        <Card>
          <CardContent className="p-6 text-center">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No AI Analysis Available
            </h3>
            <p className="text-muted-foreground mb-4">
              Run a simulation to get AI-powered performance predictions and
              recommendations.
            </p>
            {simulationHistory?.analytics &&
              simulationHistory.analytics.total > 0 && (
                <div className="text-sm text-muted-foreground">
                  <p>
                    Previous simulations: {simulationHistory.analytics.total}
                  </p>
                  <p>Completed: {simulationHistory.analytics.completed}</p>
                  {simulationHistory.analytics.lastSimulation && (
                    <p>
                      Last run:{" "}
                      {new Date(
                        simulationHistory.analytics.lastSimulation
                      ).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
          </CardContent>
        </Card>
      )}

      {/* KPI Definitions */}
      <Card>
        <CardHeader>
          <CardTitle>KPI Definitions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium">Standard KPIs</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 mt-0.5 text-blue-600" />
                  <div>
                    <span className="font-medium">Reach:</span>
                    <span className="text-muted-foreground ml-1">
                      Total number of unique people who saw your content
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Activity className="h-4 w-4 mt-0.5 text-green-600" />
                  <div>
                    <span className="font-medium">Engagement:</span>
                    <span className="text-muted-foreground ml-1">
                      Likes, comments, shares, and other interactions
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MousePointer className="h-4 w-4 mt-0.5 text-purple-600" />
                  <div>
                    <span className="font-medium">Conversions:</span>
                    <span className="text-muted-foreground ml-1">
                      Desired actions taken by users (purchases, sign-ups, etc.)
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">Business KPIs</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Eye className="h-4 w-4 mt-0.5 text-orange-600" />
                  <div>
                    <span className="font-medium">Brand Awareness:</span>
                    <span className="text-muted-foreground ml-1">
                      Percentage increase in brand recognition and recall
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <DollarSign className="h-4 w-4 mt-0.5 text-red-600" />
                  <div>
                    <span className="font-medium">ROI:</span>
                    <span className="text-muted-foreground ml-1">
                      Return on investment as a percentage of campaign spend
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
