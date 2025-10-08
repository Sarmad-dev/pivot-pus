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
  MousePointer
} from "lucide-react";
import { Campaign } from "@/types/campaign";

interface CampaignMetricsProps {
  campaign: Campaign;
}

export const CampaignMetrics = ({ campaign }: CampaignMetricsProps) => {
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

  // Mock current performance data - in real implementation, this would come from analytics
  const getMockCurrentValue = (kpi: any) => {
    // Generate mock values for demonstration
    const baseValue = kpi.target * (0.3 + Math.random() * 0.7);
    return Math.floor(baseValue);
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  return (
    <div className="space-y-6">
      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaign.kpis.map((kpi, index) => {
          const currentValue = getMockCurrentValue(kpi);
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
                    {kpi.type.replace('_', ' ')}
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
                const currentValue = Math.floor(metric.target * (0.2 + Math.random() * 0.6));
                const progress = calculateProgress(currentValue, metric.target);
                
                return (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium">{metric.name}</h4>
                        <p className="text-sm text-muted-foreground">{metric.description}</p>
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
                {campaign.kpis.length > 0 ? Math.floor(Math.random() * 30 + 60) : 0}%
              </div>
              <p className="text-sm text-muted-foreground">Average KPI Achievement</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {campaign.kpis.filter(k => k.type === 'roi').length > 0 ? 
                  `${Math.floor(Math.random() * 50 + 150)}%` : 'N/A'}
              </div>
              <p className="text-sm text-muted-foreground">Return on Investment</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600 mb-2">
                {Math.floor(Math.random() * 20 + 75)}%
              </div>
              <p className="text-sm text-muted-foreground">Overall Campaign Health</p>
            </div>
          </div>
        </CardContent>
      </Card>

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