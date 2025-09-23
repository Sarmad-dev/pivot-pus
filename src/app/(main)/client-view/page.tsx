"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

const ClientView = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Mock client data
  const clientInfo = {
    name: "TechFlow Solutions",
    accountManager: "Sarah Chen",
    activeCampaigns: 3,
    totalBudget: 150000,
    campaignPeriod: "Q4 2024"
  };

  // Mock performance data
  const performanceData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
    datasets: [
      {
        label: 'Predicted Performance',
        data: [65, 68, 72, 75, 78, 82],
        borderColor: 'hsl(213 93% 68%)',
        backgroundColor: 'hsl(213 93% 68% / 0.1)',
        tension: 0.4
      },
      {
        label: 'Actual Performance',
        data: [62, 70, 69, 77, 81, 85],
        borderColor: 'hsl(142 76% 36%)',
        backgroundColor: 'hsl(142 76% 36% / 0.1)',
        tension: 0.4
      }
    ]
  };

  const channelData = {
    labels: ['Social Media', 'Email', 'Content', 'Paid Ads', 'PR'],
    datasets: [
      {
        label: 'Performance Score',
        data: [85, 78, 92, 73, 88],
        backgroundColor: [
          'hsl(213 93% 68% / 0.8)',
          'hsl(142 76% 36% / 0.8)',
          'hsl(38 92% 50% / 0.8)',
          'hsl(0 84% 60% / 0.8)',
          'hsl(274 83% 59% / 0.8)'
        ],
        borderColor: [
          'hsl(213 93% 68%)',
          'hsl(142 76% 36%)',
          'hsl(38 92% 50%)',
          'hsl(0 84% 60%)',
          'hsl(274 83% 59%)'
        ],
        borderWidth: 2
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'hsl(220 17% 85%)'
        }
      }
    },
    scales: {
      x: {
        ticks: { color: 'hsl(220 9% 59%)' },
        grid: { color: 'hsl(220 13% 35%)' }
      },
      y: {
        ticks: { color: 'hsl(220 9% 59%)' },
        grid: { color: 'hsl(220 13% 35%)' }
      }
    }
  };

  const mockCampaigns = [
    {
      id: 1,
      name: 'Product Launch Campaign',
      status: 'active',
      performance: 87,
      budget: 75000,
      spent: 42000,
      roi: '+24%',
      nextMilestone: 'Mid-campaign review'
    },
    {
      id: 2,
      name: 'Brand Awareness Drive',
      status: 'active',
      performance: 92,
      budget: 50000,
      spent: 28000,
      roi: '+31%',
      nextMilestone: 'Creative refresh'
    },
    {
      id: 3,
      name: 'Holiday Promotion',
      status: 'planning',
      performance: 0,
      budget: 25000,
      spent: 0,
      roi: 'TBD',
      nextMilestone: 'Campaign launch'
    }
  ];

  return (
    <div className="min-h-screen bg-background font-inter">
      {/* Header */}
      <div className="border-b border-border/30 glass-strong">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-glow rounded-xl flex items-center justify-center">
                <span className="text-background font-bold text-lg">T</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{clientInfo.name}</h1>
                <p className="text-muted-foreground">Campaign Performance Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right text-sm">
                <div className="text-muted-foreground">Account Manager</div>
                <div className="text-foreground font-medium">{clientInfo.accountManager}</div>
              </div>
              <Link href="/dashboard">
                <Button variant="outline" className="btn-ghost">
                  🏠 Agency View
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Status Bar */}
          <div className="mb-8 p-4 glass rounded-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div className="flex items-center space-x-8 mb-4 md:mb-0">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{clientInfo.activeCampaigns}</div>
                  <div className="text-sm text-muted-foreground">Active Campaigns</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">${clientInfo.totalBudget.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total Budget</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{clientInfo.campaignPeriod}</div>
                  <div className="text-sm text-muted-foreground">Campaign Period</div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Last updated: {currentTime.toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="glass hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Overall Performance</p>
                    <p className="text-3xl font-bold text-foreground">89%</p>
                  </div>
                  <div className="text-3xl">📈</div>
                </div>
                <div className="mt-2">
                  <Badge variant="secondary" className="bg-success/20 text-success">Above Target</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="glass hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Budget Utilization</p>
                    <p className="text-3xl font-bold text-foreground">47%</p>
                  </div>
                  <div className="text-3xl">💰</div>
                </div>
                <div className="mt-2">
                  <Progress value={47} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Average ROI</p>
                    <p className="text-3xl font-bold text-foreground">+28%</p>
                  </div>
                  <div className="text-3xl">🎯</div>
                </div>
                <div className="mt-2">
                  <Badge variant="secondary" className="bg-success/20 text-success">Excellent</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="glass hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Campaign Health</p>
                    <p className="text-3xl font-bold text-foreground">Green</p>
                  </div>
                  <div className="text-3xl">💚</div>
                </div>
                <div className="mt-2">
                  <Badge variant="secondary" className="bg-success/20 text-success">All systems go</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Performance Trend */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-foreground">Performance Trajectory</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Weekly performance vs predictions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Line data={performanceData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>

            {/* Channel Performance */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-foreground">Channel Performance</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Performance scores by marketing channel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Bar data={channelData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Campaign Details */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-foreground">Campaign Overview</CardTitle>
              <CardDescription className="text-muted-foreground">
                Detailed view of your active and planned campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {mockCampaigns.map((campaign) => (
                  <div key={campaign.id} className="glass-strong p-6 rounded-xl hover-lift">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-xl font-semibold text-foreground">{campaign.name}</h3>
                          <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                            {campaign.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Performance</div>
                            <div className="text-foreground font-medium">
                              {campaign.performance > 0 ? `${campaign.performance}%` : 'Not started'}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Budget</div>
                            <div className="text-foreground font-medium">${campaign.budget.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Spent</div>
                            <div className="text-foreground font-medium">${campaign.spent.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">ROI</div>
                            <div className={`font-medium ${campaign.roi.startsWith('+') ? 'text-success' : 'text-foreground'}`}>
                              {campaign.roi}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 lg:mt-0 lg:ml-6">
                        <div className="text-sm text-muted-foreground mb-2">Next Milestone</div>
                        <div className="text-foreground font-medium">{campaign.nextMilestone}</div>
                        {campaign.status === 'active' && (
                          <div className="mt-2">
                            <Progress 
                              value={(campaign.spent / campaign.budget) * 100} 
                              className="h-2 w-32"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Updates */}
          <div className="mt-8">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-foreground">Recent Updates & Recommendations</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Latest insights and AI-powered recommendations for your campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      type: 'success',
                      title: 'Product Launch Campaign Exceeding Expectations',
                      message: 'Performance is 12% above predicted trajectory. Consider increasing budget allocation.',
                      time: '2 hours ago'
                    },
                    {
                      type: 'info',
                      title: 'Optimal Posting Time Identified',
                      message: 'Social media engagement peaks at 2-4 PM EST. Adjusting schedule accordingly.',
                      time: '4 hours ago'
                    },
                    {
                      type: 'warning',
                      title: 'Competitor Activity Alert',
                      message: 'Similar campaign launched by competitor. Monitoring impact on Brand Awareness Drive.',
                      time: '6 hours ago'
                    }
                  ].map((update, index) => (
                    <div key={index} className="flex items-start space-x-4 p-4 glass-strong rounded-lg">
                      <div className={`w-3 h-3 rounded-full mt-2 ${
                        update.type === 'success' ? 'bg-success' :
                        update.type === 'warning' ? 'bg-warning' : 'bg-primary'
                      }`}></div>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground mb-1">{update.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{update.message}</p>
                        <div className="text-xs text-muted-foreground">{update.time}</div>
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

export default ClientView;