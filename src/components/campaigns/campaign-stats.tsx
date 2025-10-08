"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  DollarSign, 
  Target, 
  Users, 
  TrendingUp,
  Activity,
  Pause,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CampaignStats as CampaignStatsType } from "@/types/campaign";

interface CampaignStatsProps {
  stats: CampaignStatsType;
  className?: string;
}

export const CampaignStats = ({ stats, className }: CampaignStatsProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const statCards = [
    {
      title: "Total Campaigns",
      value: stats.total,
      icon: BarChart3,
      color: "bg-blue-100 text-blue-600",
      description: "All campaigns",
    },
    {
      title: "Active Campaigns",
      value: stats.active,
      icon: Activity,
      color: "bg-green-100 text-green-600",
      description: "Currently running",
    },
    {
      title: "Total Budget",
      value: formatCurrency(stats.totalBudget),
      icon: DollarSign,
      color: "bg-purple-100 text-purple-600",
      description: "Across all campaigns",
    },
    {
      title: "Average Budget",
      value: formatCurrency(stats.averageBudget),
      icon: TrendingUp,
      color: "bg-orange-100 text-orange-600",
      description: "Per campaign",
    },
  ];

  const statusBreakdown = [
    {
      label: "Draft",
      count: stats.draft,
      color: "bg-gray-100 text-gray-600",
      icon: Target,
    },
    {
      label: "Active",
      count: stats.active,
      color: "bg-green-100 text-green-600",
      icon: Activity,
    },
    {
      label: "Paused",
      count: stats.paused,
      color: "bg-yellow-100 text-yellow-600",
      icon: Pause,
    },
    {
      label: "Completed",
      count: stats.completed,
      color: "bg-blue-100 text-blue-600",
      icon: CheckCircle,
    },
  ];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Campaign Status Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statusBreakdown.map((status, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
                <div className={cn("p-2 rounded-lg", status.color)}>
                  <status.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{status.label}</p>
                  <p className="text-2xl font-bold">{status.count}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Progress Bar */}
          {stats.total > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>Campaign Distribution</span>
                <span>{stats.total} total</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="h-full flex">
                  {stats.draft > 0 && (
                    <div 
                      className="bg-gray-400 h-full"
                      style={{ width: `${(stats.draft / stats.total) * 100}%` }}
                    />
                  )}
                  {stats.active > 0 && (
                    <div 
                      className="bg-green-500 h-full"
                      style={{ width: `${(stats.active / stats.total) * 100}%` }}
                    />
                  )}
                  {stats.paused > 0 && (
                    <div 
                      className="bg-yellow-500 h-full"
                      style={{ width: `${(stats.paused / stats.total) * 100}%` }}
                    />
                  )}
                  {stats.completed > 0 && (
                    <div 
                      className="bg-blue-500 h-full"
                      style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                    />
                  )}
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Draft ({Math.round((stats.draft / stats.total) * 100)}%)</span>
                <span>Active ({Math.round((stats.active / stats.total) * 100)}%)</span>
                <span>Paused ({Math.round((stats.paused / stats.total) * 100)}%)</span>
                <span>Completed ({Math.round((stats.completed / stats.total) * 100)}%)</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};