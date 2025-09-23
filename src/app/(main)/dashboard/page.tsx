"use client"
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Mock data for charts
  const performanceData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Predicted Performance",
        data: [65, 68, 72, 75, 78, 82, 85],
        borderColor: "hsl(213 93% 68%)",
        backgroundColor: "hsl(213 93% 68% / 0.1)",
        tension: 0.4,
      },
      {
        label: "Actual Performance",
        data: [62, 70, 69, 77, 75, 84, 88],
        borderColor: "hsl(142 76% 36%)",
        backgroundColor: "hsl(142 76% 36% / 0.1)",
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "hsl(220 17% 85%)",
        },
      },
      title: {
        display: true,
        text: "Campaign Performance Trajectory",
        color: "hsl(220 17% 85%)",
      },
    },
    scales: {
      x: {
        ticks: { color: "hsl(220 9% 59%)" },
        grid: { color: "hsl(220 13% 35%)" },
      },
      y: {
        ticks: { color: "hsl(220 9% 59%)" },
        grid: { color: "hsl(220 13% 35%)" },
      },
    },
  };

  const mockCampaigns = [
    {
      id: 1,
      name: "Q4 Product Launch",
      status: "active",
      performance: 87,
      trend: "up",
    },
    {
      id: 2,
      name: "Holiday Campaign",
      status: "optimizing",
      performance: 74,
      trend: "down",
    },
    {
      id: 3,
      name: "Brand Awareness",
      status: "active",
      performance: 92,
      trend: "up",
    },
    {
      id: 4,
      name: "Lead Generation",
      status: "paused",
      performance: 65,
      trend: "neutral",
    },
  ];

  const mockInsights = [
    {
      type: "warning",
      message: "Holiday Campaign showing 15% decline - consider pivot",
      time: "2 hours ago",
    },
    {
      type: "success",
      message: "Q4 Launch exceeded prediction by 12%",
      time: "4 hours ago",
    },
    {
      type: "info",
      message: "Competitor launched similar campaign - monitoring impact",
      time: "6 hours ago",
    },
  ];

  return (
    <div className="min-h-screen bg-background font-inter">
      {/* Navigation */}
      <nav className="border-b border-border/30 glass-strong">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center">
                  <span className="text-background font-bold text-sm">P</span>
                </div>
                <span className="text-xl font-bold text-gradient">
                  PivotPulse
                </span>
              </Link>
              <div className="hidden md:flex space-x-6">
                <Link href="/dashboard" className="text-primary font-medium">
                  Dashboard
                </Link>
                <Link
                  href="/campaigns/create"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Campaigns
                </Link>
                <Link
                  href="/collaboration"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Collaboration
                </Link>
                <Link
                  href="/admin-panel"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Admin
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/notifications">
                <Button
                  variant="ghost"
                  size="sm"
                  className="btn-minimal relative"
                >
                  🔔
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-warning rounded-full text-xs"></span>
                </Button>
              </Link>
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="btn-minimal">
                  👤 Profile
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Campaign Intelligence Dashboard
            </h1>
            <p className="text-muted-foreground">
              Real-time insights and AI-powered predictions for your campaigns
            </p>
            <div className="text-sm text-muted-foreground mt-2">
              Last updated: {currentTime.toLocaleTimeString()}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="glass hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Active Campaigns
                    </p>
                    <p className="text-3xl font-bold text-foreground">12</p>
                  </div>
                  <div className="text-3xl">🚀</div>
                </div>
                <div className="mt-2">
                  <Badge
                    variant="secondary"
                    className="bg-success/20 text-success"
                  >
                    +2 this week
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="glass hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Avg Performance
                    </p>
                    <p className="text-3xl font-bold text-foreground">84%</p>
                  </div>
                  <div className="text-3xl">📈</div>
                </div>
                <div className="mt-2">
                  <Badge
                    variant="secondary"
                    className="bg-success/20 text-success"
                  >
                    +5% vs predicted
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="glass hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Pivot Opportunities
                    </p>
                    <p className="text-3xl font-bold text-foreground">3</p>
                  </div>
                  <div className="text-3xl">🎯</div>
                </div>
                <div className="mt-2">
                  <Badge
                    variant="secondary"
                    className="bg-warning/20 text-warning"
                  >
                    Action needed
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="glass hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Client Satisfaction
                    </p>
                    <p className="text-3xl font-bold text-foreground">96%</p>
                  </div>
                  <div className="text-3xl">⭐</div>
                </div>
                <div className="mt-2">
                  <Badge
                    variant="secondary"
                    className="bg-success/20 text-success"
                  >
                    Excellent
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Chart */}
            <div className="lg:col-span-2">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-foreground">
                    Performance Trajectory
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    AI predictions vs actual performance over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <Line data={performanceData} options={chartOptions} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Insights Sidebar */}
            <div className="space-y-6">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center">
                    🤖 AI Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mockInsights.map((insight, index) => (
                    <div key={index} className="p-3 glass-strong rounded-lg">
                      <div className="flex items-start space-x-2">
                        <div
                          className={`w-2 h-2 rounded-full mt-2 ${
                            insight.type === "warning"
                              ? "bg-warning"
                              : insight.type === "success"
                              ? "bg-success"
                              : "bg-primary"
                          }`}
                        ></div>
                        <div className="flex-1">
                          <p className="text-sm text-foreground">
                            {insight.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {insight.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-foreground">
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/campaigns/create">
                    <Button className="w-full btn-hero">+ New Campaign</Button>
                  </Link>
                  <Link href="/collaboration">
                    <Button variant="outline" className="w-full btn-ghost">
                      Collaborate
                    </Button>
                  </Link>
                  <Link href="/client-view">
                    <Button variant="outline" className="w-full btn-ghost">
                      Client View
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Campaigns List */}
          <div className="mt-8">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-foreground">
                  Active Campaigns
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Overview of your current campaign performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockCampaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="flex items-center justify-between p-4 glass-strong rounded-lg hover-lift"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-surface rounded-lg flex items-center justify-center text-2xl">
                          📊
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {campaign.name}
                          </h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge
                              variant={
                                campaign.status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {campaign.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Performance: {campaign.performance}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div
                          className={`text-2xl ${
                            campaign.trend === "up"
                              ? "📈"
                              : campaign.trend === "down"
                              ? "📉"
                              : "➡️"
                          }`}
                        ></div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="btn-minimal"
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
