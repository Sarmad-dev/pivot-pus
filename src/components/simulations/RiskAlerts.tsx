"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Clock,
  X,
  ChevronRight,
  Brain
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface RiskAlert {
  type: 'performance_dip' | 'budget_overrun' | 'audience_fatigue' | 'competitor_threat';
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  impact: number;
  timeframe: {
    start: number;
    end: number;
  };
  description: string;
  recommendations?: string[];
}

interface RiskAlertsProps {
  campaignId: string;
  risks: RiskAlert[];
  onDismissAlert?: (index: number) => void;
  compact?: boolean;
  showActions?: boolean;
}

export function RiskAlerts({ 
  campaignId, 
  risks, 
  onDismissAlert,
  compact = false,
  showActions = true 
}: RiskAlertsProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<number>>(new Set());

  const getRiskIcon = (type: string) => {
    switch (type) {
      case 'performance_dip':
        return <TrendingDown className="h-4 w-4" />;
      case 'budget_overrun':
        return <DollarSign className="h-4 w-4" />;
      case 'audience_fatigue':
        return <Users className="h-4 w-4" />;
      case 'competitor_threat':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      critical: 'destructive',
      high: 'destructive',
      medium: 'default',
      low: 'secondary',
    } as const;

    return (
      <Badge variant={colors[severity as keyof typeof colors] || 'secondary'}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const handleDismiss = (index: number) => {
    setDismissedAlerts(prev => new Set([...prev, index]));
    onDismissAlert?.(index);
  };

  const visibleRisks = risks.filter((_, index) => !dismissedAlerts.has(index));

  if (visibleRisks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-green-600" />
            Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Brain className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-medium text-green-800 mb-1">All Clear!</h3>
            <p className="text-sm text-muted-foreground">
              No significant risks detected in your campaign performance.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {visibleRisks.slice(0, 3).map((risk, index) => (
          <Alert key={index} className={getSeverityColor(risk.severity)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getRiskIcon(risk.type)}
                <div>
                  <div className="font-medium text-sm">{risk.description}</div>
                  <div className="text-xs opacity-75">
                    {Math.round(risk.probability * 100)}% probability • {risk.severity} severity
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getSeverityBadge(risk.severity)}
                {showActions && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDismiss(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </Alert>
        ))}
        
        {visibleRisks.length > 3 && (
          <div className="text-center">
            <Link href={`/campaigns/${campaignId}?tab=simulations`}>
              <Button variant="outline" size="sm">
                View {visibleRisks.length - 3} more alerts
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Risk Alerts ({visibleRisks.length})
          </CardTitle>
          {showActions && (
            <Link href={`/campaigns/${campaignId}?tab=simulations`}>
              <Button variant="outline" size="sm">
                View All Simulations
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {visibleRisks.map((risk, index) => (
            <Alert key={index} className={getSeverityColor(risk.severity)}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getRiskIcon(risk.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{risk.description}</h4>
                      {getSeverityBadge(risk.severity)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-muted-foreground">Probability:</span>
                        <span className="ml-2 font-medium">
                          {Math.round(risk.probability * 100)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Impact:</span>
                        <span className="ml-2 font-medium">
                          {Math.round(risk.impact * 100)}%
                        </span>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground mb-3">
                      <Clock className="h-3 w-3 inline mr-1" />
                      Expected timeframe: {formatDistanceToNow(new Date(risk.timeframe.start))} to {formatDistanceToNow(new Date(risk.timeframe.end))}
                    </div>

                    {risk.recommendations && risk.recommendations.length > 0 && (
                      <div className="mt-3">
                        <h5 className="font-medium text-sm mb-2">Recommended Actions:</h5>
                        <ul className="text-sm space-y-1">
                          {risk.recommendations.slice(0, 2).map((rec, recIndex) => (
                            <li key={recIndex} className="flex items-start gap-2">
                              <ChevronRight className="h-3 w-3 mt-0.5 text-muted-foreground" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                        {risk.recommendations.length > 2 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            +{risk.recommendations.length - 2} more recommendations
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {showActions && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDismiss(index)}
                    className="ml-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Alert>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}