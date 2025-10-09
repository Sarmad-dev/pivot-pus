"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Lightbulb, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Palette, 
  Clock,
  ChevronRight,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface PivotRecommendation {
  id: string;
  type: 'budget_reallocation' | 'creative_refresh' | 'audience_expansion' | 'channel_shift' | 'timing_adjustment';
  priority: number;
  impact_estimate: {
    metric: string;
    improvement: number;
    confidence: number;
  };
  implementation: {
    description: string;
    steps: string[];
    effort: 'low' | 'medium' | 'high';
    timeline: string;
  };
  simulation_preview?: Array<{
    date: number;
    metrics: Record<string, number>;
  }>;
}

interface PivotRecommendationsProps {
  campaignId: string;
  recommendations: PivotRecommendation[];
  onImplement?: (recommendationId: string) => void;
  onPreview?: (recommendationId: string) => void;
  compact?: boolean;
}

export function PivotRecommendations({ 
  campaignId, 
  recommendations, 
  onImplement,
  onPreview,
  compact = false 
}: PivotRecommendationsProps) {
  const [implementedRecs, setImplementedRecs] = useState<Set<string>>(new Set());

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'budget_reallocation':
        return <DollarSign className="h-4 w-4" />;
      case 'creative_refresh':
        return <Palette className="h-4 w-4" />;
      case 'audience_expansion':
        return <Users className="h-4 w-4" />;
      case 'channel_shift':
        return <TrendingUp className="h-4 w-4" />;
      case 'timing_adjustment':
        return <Clock className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'bg-red-100 text-red-800';
    if (priority >= 6) return 'bg-orange-100 text-orange-800';
    if (priority >= 4) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getEffortBadge = (effort: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800',
    };
    
    return (
      <Badge className={colors[effort as keyof typeof colors]}>
        {effort} effort
      </Badge>
    );
  };

  const handleImplement = async (recommendationId: string) => {
    try {
      setImplementedRecs(prev => new Set([...prev, recommendationId]));
      onImplement?.(recommendationId);
      toast.success("Recommendation marked for implementation");
    } catch (error) {
      toast.error("Failed to implement recommendation");
      setImplementedRecs(prev => {
        const newSet = new Set(prev);
        newSet.delete(recommendationId);
        return newSet;
      });
    }
  };

  const handlePreview = (recommendationId: string) => {
    onPreview?.(recommendationId);
    toast.info("Loading simulation preview...");
  };

  const sortedRecommendations = [...recommendations].sort((a, b) => b.priority - a.priority);

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Optimization Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-medium text-blue-800 mb-1">Campaign Optimized</h3>
            <p className="text-sm text-muted-foreground">
              Your campaign is performing well. No immediate optimizations needed.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="space-y-3">
        {sortedRecommendations.slice(0, 3).map((rec) => (
          <Card key={rec.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${getPriorityColor(rec.priority)}`}>
                  {getRecommendationIcon(rec.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{rec.implementation.description}</h4>
                    {getEffortBadge(rec.implementation.effort)}
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Expected {rec.impact_estimate.improvement > 0 ? 'improvement' : 'change'}: 
                    <span className="font-medium ml-1">
                      {Math.abs(rec.impact_estimate.improvement * 100).toFixed(1)}% in {rec.impact_estimate.metric}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={rec.impact_estimate.confidence * 100} className="flex-1 h-1" />
                    <span className="text-xs text-muted-foreground">
                      {Math.round(rec.impact_estimate.confidence * 100)}% confidence
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2">
                {implementedRecs.has(rec.id) ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleImplement(rec.id)}
                  >
                    Apply
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
        
        {sortedRecommendations.length > 3 && (
          <div className="text-center">
            <Button variant="outline" size="sm">
              View {sortedRecommendations.length - 3} more recommendations
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          AI Optimization Recommendations ({recommendations.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {sortedRecommendations.map((rec) => (
            <div key={rec.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${getPriorityColor(rec.priority)}`}>
                    {getRecommendationIcon(rec.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{rec.implementation.description}</h4>
                      <Badge variant="outline">Priority {rec.priority}/10</Badge>
                      {getEffortBadge(rec.implementation.effort)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Timeline: {rec.implementation.timeline}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {implementedRecs.has(rec.id) ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Applied</span>
                    </div>
                  ) : (
                    <>
                      {rec.simulation_preview && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePreview(rec.id)}
                        >
                          Preview Impact
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleImplement(rec.id)}
                      >
                        Implement
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Impact Estimate */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Expected Impact</span>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-600">
                      {rec.impact_estimate.improvement > 0 ? '+' : ''}
                      {(rec.impact_estimate.improvement * 100).toFixed(1)}%
                    </span>
                    <span className="text-sm text-muted-foreground">
                      in {rec.impact_estimate.metric}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={rec.impact_estimate.confidence * 100} className="flex-1" />
                  <span className="text-sm text-muted-foreground">
                    {Math.round(rec.impact_estimate.confidence * 100)}% confidence
                  </span>
                </div>
              </div>

              {/* Implementation Steps */}
              <div>
                <h5 className="font-medium text-sm mb-2">Implementation Steps:</h5>
                <ol className="text-sm space-y-1">
                  {rec.implementation.steps.map((step, stepIndex) => (
                    <li key={stepIndex} className="flex items-start gap-2">
                      <span className="text-muted-foreground">{stepIndex + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Warning for high-effort recommendations */}
              {rec.implementation.effort === 'high' && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-medium text-yellow-800">High Effort Required:</span>
                    <span className="text-yellow-700 ml-1">
                      This recommendation may require significant resources or time to implement.
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}