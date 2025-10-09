"use client";

import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { format } from "date-fns";
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Lightbulb,
  ChevronRight,
  Clock,
  BarChart3,
  Activity
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TrajectoryPoint {
  date: number;
  metrics: Record<string, number>;
  confidence: number;
}

interface Scenario {
  type: string;
  probability: number;
  trajectory: Array<{
    date: number;
    metrics: Record<string, number>;
  }>;
}

interface RiskAlert {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  probability: number;
  description: string;
  timeframe: {
    start: number;
    end: number;
  };
}

interface PivotRecommendation {
  id: string;
  type: string;
  priority: number;
  impact_estimate: {
    metric: string;
    improvement: number;
    confidence: number;
  };
  implementation: {
    description: string;
    steps: string[];
    effort: "low" | "medium" | "high";
    timeline: string;
  };
}

interface SimulationResult {
  _id: string;
  campaignId: string;
  status: "completed" | "processing" | "failed";
  results?: {
    trajectories: TrajectoryPoint[];
    scenarios: Scenario[];
    risks: RiskAlert[];
    recommendations: PivotRecommendation[];
  };
  modelMetadata?: {
    primaryModel: string;
    processingTime: number;
    dataQuality: {
      completeness: number;
      accuracy: number;
      freshness: number;
    };
  };
  createdAt: number;
  completedAt?: number;
}

interface SimulationResultsProps {
  simulation: SimulationResult;
  onRecommendationAction?: (recommendationId: string, action: string) => void;
  onRetrySimulation?: () => void;
}

const SEVERITY_COLORS = {
  low: "bg-blue-100 text-blue-800 border-blue-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200", 
  high: "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};

const EFFORT_COLORS = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

const METRIC_LABELS = {
  ctr: "Click-Through Rate (%)",
  impressions: "Impressions",
  engagement: "Engagement Rate (%)",
  reach: "Reach",
  conversions: "Conversions",
  cpc: "Cost Per Click ($)",
  cpm: "Cost Per Mille ($)",
};

export function SimulationResults({ 
  simulation, 
  onRecommendationAction,
  onRetrySimulation 
}: SimulationResultsProps) {
  const { results, modelMetadata } = simulation;

  // Generate chart data for trajectories
  const chartData = useMemo(() => {
    if (!results?.trajectories.length) return null;

    const dates = results.trajectories.map(point => 
      format(new Date(point.date), "MMM dd")
    );

    const metrics = Object.keys(results.trajectories[0].metrics);
    const datasets = [];

    // Main trajectory for each metric
    metrics.forEach((metric, index) => {
      const colors = [
        'rgb(59, 130, 246)', // blue
        'rgb(16, 185, 129)', // green  
        'rgb(245, 158, 11)', // yellow
        'rgb(239, 68, 68)',  // red
        'rgb(139, 92, 246)', // purple
        'rgb(236, 72, 153)', // pink
        'rgb(14, 165, 233)',  // sky
      ];
      
      datasets.push({
        label: METRIC_LABELS[metric as keyof typeof METRIC_LABELS] || metric,
        data: results.trajectories.map(point => point.metrics[metric]),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '20',
        fill: false,
        tension: 0.4,
      });
    });

    // Add confidence intervals if available
    if (results.trajectories[0].confidence !== undefined) {
      const confidenceData = results.trajectories.map(point => ({
        x: format(new Date(point.date), "MMM dd"),
        y: point.confidence * 100,
      }));

      datasets.push({
        label: "Confidence Level (%)",
        data: confidenceData.map(d => d.y),
        borderColor: 'rgb(156, 163, 175)',
        backgroundColor: 'rgb(156, 163, 175, 0.1)',
        borderDash: [5, 5],
        fill: false,
        yAxisID: 'confidence',
      });
    }

    return {
      labels: dates,
      datasets,
    };
  }, [results?.trajectories]);

  // Generate scenario comparison data
  const scenarioChartData = useMemo(() => {
    if (!results?.scenarios.length) return null;

    const firstScenario = results.scenarios[0];
    const dates = firstScenario.trajectory.map(point => 
      format(new Date(point.date), "MMM dd")
    );

    const metric = Object.keys(firstScenario.trajectory[0].metrics)[0];
    
    const datasets = results.scenarios.map((scenario, index) => {
      const colors = {
        optimistic: 'rgb(16, 185, 129)', // green
        realistic: 'rgb(59, 130, 246)',  // blue
        pessimistic: 'rgb(239, 68, 68)', // red
      };

      return {
        label: `${scenario.type.charAt(0).toUpperCase() + scenario.type.slice(1)} (${(scenario.probability * 100).toFixed(0)}%)`,
        data: scenario.trajectory.map(point => point.metrics[metric]),
        borderColor: colors[scenario.type as keyof typeof colors] || 'rgb(156, 163, 175)',
        backgroundColor: (colors[scenario.type as keyof typeof colors] || 'rgb(156, 163, 175)') + '20',
        fill: false,
        tension: 0.4,
      };
    });

    return {
      labels: dates,
      datasets,
    };
  }, [results?.scenarios]);

  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              if (context.dataset.label?.includes('%')) {
                label += context.parsed.y.toFixed(2) + '%';
              } else if (context.dataset.label?.includes('$')) {
                label += '$' + context.parsed.y.toFixed(2);
              } else {
                label += context.parsed.y.toLocaleString();
              }
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Value'
        }
      },
      confidence: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Confidence (%)'
        },
        min: 0,
        max: 100,
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  if (simulation.status === "failed") {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Simulation Failed
          </CardTitle>
          <CardDescription>
            The simulation could not be completed due to an error.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              Please try running the simulation again or contact support if the issue persists.
            </p>
            {onRetrySimulation && (
              <Button onClick={onRetrySimulation}>
                Retry Simulation
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!results) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>No Results Available</CardTitle>
          <CardDescription>
            Simulation results are not yet available.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header with metadata */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Simulation Results
              </CardTitle>
              <CardDescription>
                AI-generated performance predictions and insights
              </CardDescription>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              {modelMetadata?.primaryModel || "AI Model"}
            </Badge>
          </div>
        </CardHeader>
        {modelMetadata && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {(modelMetadata.processingTime / 1000).toFixed(1)}s
                </div>
                <div className="text-sm text-muted-foreground">Processing Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {(modelMetadata.dataQuality.completeness * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">Data Completeness</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {(modelMetadata.dataQuality.accuracy * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">Model Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {(modelMetadata.dataQuality.freshness * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">Data Freshness</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Main content tabs */}
      <Tabs defaultValue="trajectories" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trajectories">Trajectories</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="risks">Risk Alerts</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Trajectory Visualization */}
        <TabsContent value="trajectories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trajectories</CardTitle>
              <CardDescription>
                Predicted performance metrics over time with confidence intervals
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartData && (
                <div className="h-96">
                  <Line data={chartData} options={chartOptions} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scenario Comparison */}
        <TabsContent value="scenarios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scenario Comparison</CardTitle>
              <CardDescription>
                Compare optimistic, realistic, and pessimistic performance scenarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scenarioChartData && (
                <div className="h-96 mb-6">
                  <Line data={scenarioChartData} options={chartOptions} />
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {results.scenarios.map((scenario) => (
                  <Card key={scenario.type} className="border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg capitalize flex items-center justify-between">
                        {scenario.type}
                        <Badge variant="outline">
                          {(scenario.probability * 100).toFixed(0)}%
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(scenario.trajectory[scenario.trajectory.length - 1].metrics).map(([metric, value]) => (
                          <div key={metric} className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              {METRIC_LABELS[metric as keyof typeof METRIC_LABELS] || metric}
                            </span>
                            <span className="font-medium">
                              {typeof value === 'number' ? value.toLocaleString() : value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Alerts */}
        <TabsContent value="risks" className="space-y-4">
          {results.risks.length > 0 ? (
            <div className="space-y-4">
              {results.risks.map((risk, index) => (
                <Alert key={index} className={cn("border-l-4", {
                  "border-l-blue-500": risk.severity === "low",
                  "border-l-yellow-500": risk.severity === "medium",
                  "border-l-orange-500": risk.severity === "high",
                  "border-l-red-500": risk.severity === "critical",
                })}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="flex items-center justify-between">
                    <span className="capitalize">{risk.type.replace('_', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <Badge className={SEVERITY_COLORS[risk.severity]}>
                        {risk.severity}
                      </Badge>
                      <Badge variant="outline">
                        {(risk.probability * 100).toFixed(0)}% probability
                      </Badge>
                    </div>
                  </AlertTitle>
                  <AlertDescription className="mt-2">
                    <p>{risk.description}</p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Risk period: {format(new Date(risk.timeframe.start), "MMM dd")} - {format(new Date(risk.timeframe.end), "MMM dd")}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Target className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-medium text-green-700 mb-2">No Risks Detected</h3>
                <p className="text-muted-foreground">
                  The simulation shows a low risk profile for your campaign performance.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Pivot Recommendations */}
        <TabsContent value="recommendations" className="space-y-4">
          {results.recommendations.length > 0 ? (
            <div className="space-y-4">
              {results.recommendations
                .sort((a, b) => b.priority - a.priority)
                .map((recommendation) => (
                  <Card key={recommendation.id} className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg capitalize flex items-center gap-2">
                            <Lightbulb className="h-5 w-5 text-yellow-500" />
                            {recommendation.type.replace('_', ' ')}
                          </CardTitle>
                          <CardDescription>
                            {recommendation.implementation.description}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={EFFORT_COLORS[recommendation.implementation.effort]}>
                            {recommendation.implementation.effort} effort
                          </Badge>
                          <Badge variant="outline">
                            Priority: {recommendation.priority}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Impact Estimate */}
                        <div className="bg-muted/50 rounded-lg p-4">
                          <h4 className="font-medium mb-2">Expected Impact</h4>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              {METRIC_LABELS[recommendation.impact_estimate.metric as keyof typeof METRIC_LABELS] || recommendation.impact_estimate.metric}
                            </span>
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-green-500" />
                              <span className="font-medium text-green-600">
                                +{(recommendation.impact_estimate.improvement * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Confidence</span>
                              <span>{(recommendation.impact_estimate.confidence * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={recommendation.impact_estimate.confidence * 100} className="h-2" />
                          </div>
                        </div>

                        {/* Implementation Steps */}
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Implementation ({recommendation.implementation.timeline})
                          </h4>
                          <ol className="space-y-2">
                            {recommendation.implementation.steps.map((step, stepIndex) => (
                              <li key={stepIndex} className="flex items-start gap-2 text-sm">
                                <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">
                                  {stepIndex + 1}
                                </span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* Action Buttons */}
                        {onRecommendationAction && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              onClick={() => onRecommendationAction(recommendation.id, "implement")}
                            >
                              Implement
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onRecommendationAction(recommendation.id, "simulate")}
                            >
                              Simulate Impact
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onRecommendationAction(recommendation.id, "dismiss")}
                            >
                              Dismiss
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Recommendations</h3>
                <p className="text-muted-foreground">
                  Your campaign appears to be well-optimized. No specific improvements were identified.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}