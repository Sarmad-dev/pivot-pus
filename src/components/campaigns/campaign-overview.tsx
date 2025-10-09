"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  DollarSign, 
  Target, 
  Users, 
  Globe,
  TrendingUp,
  BarChart3,
  Brain
} from "lucide-react";
import { formatDistanceToNow, differenceInDays, isAfter, isBefore } from "date-fns";
import { Campaign } from "@/types/campaign";
import { SimulationTrigger } from "@/components/simulations/SimulationTrigger";
import { SimulationHistory } from "@/components/simulations/SimulationHistory";
import { RiskAlerts } from "@/components/simulations/RiskAlerts";

interface CampaignOverviewProps {
  campaign: Campaign;
}

export const CampaignOverview = ({ campaign }: CampaignOverviewProps) => {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  const calculateProgress = () => {
    const now = new Date();
    const start = new Date(campaign.startDate);
    const end = new Date(campaign.endDate);
    
    if (isBefore(now, start)) return 0;
    if (isAfter(now, end)) return 100;
    
    const totalDays = differenceInDays(end, start);
    const elapsedDays = differenceInDays(now, start);
    
    return Math.round((elapsedDays / totalDays) * 100);
  };

  const progress = calculateProgress();
  const totalDays = differenceInDays(new Date(campaign.endDate), new Date(campaign.startDate));
  const enabledChannels = campaign.channels.filter(c => c.enabled);
  const totalAudienceSize = campaign.audiences.reduce((sum, audience) => 
    sum + (audience.estimatedSize || 0), 0
  );

  return (
    <div className="space-y-6">
      {/* Campaign Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Campaign Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Start Date</p>
                <p className="font-medium">{new Date(campaign.startDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">End Date</p>
                <p className="font-medium">{new Date(campaign.endDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Duration</p>
                <p className="font-medium">{totalDays} days</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Budget Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {formatCurrency(campaign.budget, campaign.currency)}
                </span>
                <Badge variant="outline" className="capitalize">
                  {campaign.priority} Priority
                </Badge>
              </div>
              
              {enabledChannels.length > 0 && (
                <div className="space-y-3">
                  <Separator />
                  <h4 className="font-medium text-sm">Channel Distribution</h4>
                  {enabledChannels.map((channel, index) => {
                    const allocation = campaign.budgetAllocation.channels[channel.type] || 0;
                    const percentage = campaign.budget > 0 ? (allocation / campaign.budget) * 100 : 0;
                    
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize">{channel.type}</span>
                          <span className="font-medium">
                            {formatCurrency(allocation, campaign.currency)} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-1" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Audience Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Target Audience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {campaign.audiences.length}
                </span>
                <span className="text-sm text-muted-foreground">Segments</span>
              </div>
              
              {totalAudienceSize > 0 && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Total reach: {totalAudienceSize.toLocaleString()} people
                  </span>
                </div>
              )}

              {campaign.audiences.length > 0 && (
                <div className="space-y-3">
                  <Separator />
                  <h4 className="font-medium text-sm">Audience Segments</h4>
                  {campaign.audiences.slice(0, 3).map((audience, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span>{audience.name}</span>
                      {audience.estimatedSize && (
                        <span className="text-muted-foreground">
                          {audience.estimatedSize.toLocaleString()}
                        </span>
                      )}
                    </div>
                  ))}
                  {campaign.audiences.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{campaign.audiences.length - 3} more segments
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KPIs Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Key Performance Indicators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {campaign.kpis.length + campaign.customMetrics.length}
                </span>
                <span className="text-sm text-muted-foreground">Total KPIs</span>
              </div>

              {campaign.kpis.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Primary KPIs</h4>
                  {campaign.kpis.map((kpi, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{kpi.type.replace('_', ' ')}</span>
                      <div className="text-right">
                        <div className="font-medium">{kpi.target.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {kpi.timeframe}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {campaign.customMetrics.length > 0 && (
                <div className="space-y-3">
                  <Separator />
                  <h4 className="font-medium text-sm">Custom Metrics</h4>
                  {campaign.customMetrics.map((metric, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span>{metric.name}</span>
                      <div className="text-right">
                        <div className="font-medium">
                          {metric.target.toLocaleString()} {metric.unit}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Channels Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Marketing Channels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{enabledChannels.length}</span>
                <span className="text-sm text-muted-foreground">Active Channels</span>
              </div>

              {campaign.channels.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Channel Status</h4>
                  {campaign.channels.map((channel, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          channel.enabled ? 'bg-green-500' : 'bg-gray-300'
                        }`} />
                        <span className="capitalize">{channel.type}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrency(channel.budget, campaign.currency)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {channel.enabled ? 'Active' : 'Disabled'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Simulation Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Simulation Quick Access */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Performance Simulation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate predictive performance trajectories using AI models to optimize your campaign strategy.
              </p>
              <SimulationTrigger 
                campaign={campaign} 
                variant="card"
              />
            </div>
          </CardContent>
        </Card>

        {/* Recent Simulations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Simulations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SimulationHistory 
              campaignId={campaign._id}
              limit={3}
              showHeader={false}
              compact={true}
            />
          </CardContent>
        </Card>
      </div>

      {/* Risk Alerts Section */}
      <div className="mt-6">
        <RiskAlerts
          campaignId={campaign._id}
          risks={[
            {
              type: 'performance_dip' as const,
              severity: 'medium' as const,
              probability: 0.65,
              impact: 0.15,
              timeframe: {
                start: Date.now() + 2 * 24 * 60 * 60 * 1000,
                end: Date.now() + 7 * 24 * 60 * 60 * 1000,
              },
              description: 'Potential CTR decline detected in upcoming week',
              recommendations: [
                'Consider refreshing creative assets',
                'Test new audience segments',
                'Adjust bidding strategy'
              ]
            }
          ]}
          compact={true}
        />
      </div>
    </div>
  );
};