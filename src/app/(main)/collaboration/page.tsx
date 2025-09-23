"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const Collaboration = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      user: 'Sarah Chen',
      avatar: 'SC',
      message: 'The Q4 campaign performance is looking great! Should we increase the social media budget?',
      time: '10:30 AM',
      type: 'message'
    },
    {
      id: 2,
      user: 'Marcus Rodriguez',
      avatar: 'MR',
      message: 'Agreed! I\'ve highlighted the areas for potential budget reallocation in the chart.',
      time: '10:32 AM',
      type: 'annotation'
    },
    {
      id: 3,
      user: 'Emma Thompson',
      avatar: 'ET',
      message: 'AI is suggesting a 15% increase in paid ads based on current performance trends.',
      time: '10:35 AM',
      type: 'ai-insight'
    }
  ]);

  const [collaborators] = useState([
    { name: 'Sarah Chen', role: 'Campaign Manager', status: 'online', avatar: 'SC' },
    { name: 'Marcus Rodriguez', role: 'Data Analyst', status: 'online', avatar: 'MR' },
    { name: 'Emma Thompson', role: 'Creative Director', status: 'away', avatar: 'ET' },
    { name: 'David Kim', role: 'Client Liaison', status: 'offline', avatar: 'DK' }
  ]);

  // Mock chart data
  const collaborationData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Current'],
    datasets: [
      {
        label: 'Performance Score',
        data: [65, 72, 78, 85, 89],
        borderColor: 'hsl(213 93% 68%)',
        backgroundColor: 'hsl(213 93% 68% / 0.1)',
        tension: 0.4,
        pointBackgroundColor: 'hsl(213 93% 68%)',
        pointBorderColor: 'hsl(213 93% 68%)',
        pointRadius: 6
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
      },
      title: {
        display: true,
        text: 'Campaign Performance - Live Collaboration View',
        color: 'hsl(220 17% 85%)'
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
    },
    interaction: {
      intersect: false,
      mode: 'index' as const
    }
  };

  const sendMessage = () => {
    if (message.trim()) {
      const newMessage = {
        id: messages.length + 1,
        user: 'You',
        avatar: 'YU',
        message: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'message' as const
      };
      setMessages([...messages, newMessage]);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

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
                <span className="text-xl font-bold text-gradient">PivotPulse</span>
              </Link>
              <div className="hidden md:flex space-x-6">
                <Link href="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">Dashboard</Link>
                <Link href="/campaigns/create" className="text-muted-foreground hover:text-primary transition-colors">Campaigns</Link>
                <Link href="/collaboration" className="text-primary font-medium">Collaboration</Link>
                <Link href="/admin" className="text-muted-foreground hover:text-primary transition-colors">Admin</Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-success/20 text-success">
                🟢 3 Active Collaborators
              </Badge>
              <Link href="/dashboard">
                <Button variant="ghost" className="btn-minimal">← Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Real-time Collaboration</h1>
            <p className="text-muted-foreground">Collaborate on campaign analysis with your team in real-time</p>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Collaborators Sidebar */}
            <div className="lg:col-span-1">
              <Card className="glass sticky top-6">
                <CardHeader>
                  <CardTitle className="text-foreground">Team Members</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Currently viewing Q4 Campaign Analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {collaborators.map((collaborator, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {collaborator.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${
                          collaborator.status === 'online' ? 'bg-success' :
                          collaborator.status === 'away' ? 'bg-warning' : 'bg-muted'
                        }`}></div>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">{collaborator.name}</div>
                        <div className="text-xs text-muted-foreground">{collaborator.role}</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Live Cursor Indicators */}
              <Card className="glass mt-6">
                <CardHeader>
                  <CardTitle className="text-sm text-foreground">Live Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center space-x-2 text-xs">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <span className="text-muted-foreground">Sarah is viewing chart data</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                    <span className="text-muted-foreground">Marcus is analyzing trends</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Collaboration Area */}
            <div className="lg:col-span-3 space-y-8">
              {/* Interactive Chart */}
              <Card className="glass">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-foreground">Campaign Performance Analysis</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Interactive chart with team annotations and live cursors
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-primary/20 text-primary">
                        🔄 Live Sync
                      </Badge>
                      <Button variant="outline" size="sm" className="btn-minimal">
                        💾 Save View
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <div className="h-80">
                      <Line data={collaborationData} options={chartOptions} />
                    </div>
                    
                    {/* Annotation Overlays */}
                    <div className="absolute top-4 right-4 space-y-2">
                      <div className="bg-warning/20 border border-warning/50 rounded-lg p-2 text-xs">
                        <div className="font-medium text-warning">Marcus:</div>
                        <div className="text-foreground">Budget reallocation opportunity</div>
                      </div>
                      <div className="bg-success/20 border border-success/50 rounded-lg p-2 text-xs">
                        <div className="font-medium text-success">AI Insight:</div>
                        <div className="text-foreground">Performance trending upward</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Collaboration Chat */}
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="glass md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-foreground">Team Discussion</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Real-time chat with context-aware AI insights
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 h-64 overflow-y-auto mb-4">
                      {messages.map((msg) => (
                        <div key={msg.id} className={`flex items-start space-x-3 ${
                          msg.type === 'ai-insight' ? 'bg-primary/10 p-3 rounded-lg' : ''
                        }`}>
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className={`text-xs ${
                              msg.type === 'ai-insight' ? 'bg-primary text-primary-foreground' : 'bg-surface text-foreground'
                            }`}>
                              {msg.type === 'ai-insight' ? '🤖' : msg.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-sm font-medium text-foreground">
                                {msg.type === 'ai-insight' ? 'AI Assistant' : msg.user}
                              </span>
                              <span className="text-xs text-muted-foreground">{msg.time}</span>
                              {msg.type === 'annotation' && (
                                <Badge variant="secondary" className="text-xs">📍 Chart Annotation</Badge>
                              )}
                              {msg.type === 'ai-insight' && (
                                <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">🤖 AI Insight</Badge>
                              )}
                            </div>
                            <p className="text-sm text-foreground">{msg.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <Separator className="mb-4" />
                    
                    {/* Message Input */}
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Type your message or question..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1 bg-surface/50 border-border/50 focus:border-primary"
                      />
                      <Button onClick={sendMessage} className="btn-hero px-4">
                        Send
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions & AI Suggestions */}
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-foreground">AI Suggestions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="bg-primary/10 p-3 rounded-lg">
                        <div className="text-sm font-medium text-primary mb-1">💡 Optimization Opportunity</div>
                        <div className="text-xs text-foreground">Consider increasing social media budget by 15%</div>
                        <Button size="sm" variant="outline" className="mt-2 text-xs btn-minimal">
                          Apply Suggestion
                        </Button>
                      </div>
                      
                      <div className="bg-warning/10 p-3 rounded-lg">
                        <div className="text-sm font-medium text-warning mb-1">⚠️ Performance Alert</div>
                        <div className="text-xs text-foreground">Email campaign CTR below threshold</div>
                        <Button size="sm" variant="outline" className="mt-2 text-xs btn-minimal">
                          Investigate
                        </Button>
                      </div>
                      
                      <div className="bg-success/10 p-3 rounded-lg">
                        <div className="text-sm font-medium text-success mb-1">🎯 Success Pattern</div>
                        <div className="text-xs text-foreground">Content marketing showing 20% uplift</div>
                        <Button size="sm" variant="outline" className="mt-2 text-xs btn-minimal">
                          Scale Strategy
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Collaboration Tools */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-foreground">Collaboration Tools</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Enhanced features for team coordination
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <Button variant="outline" className="btn-ghost h-20 flex-col space-y-2">
                      <div className="text-2xl">📝</div>
                      <div className="text-sm">Shared Notes</div>
                    </Button>
                    <Button variant="outline" className="btn-ghost h-20 flex-col space-y-2">
                      <div className="text-2xl">🎯</div>
                      <div className="text-sm">Set Milestones</div>
                    </Button>
                    <Button variant="outline" className="btn-ghost h-20 flex-col space-y-2">
                      <div className="text-2xl">📊</div>
                      <div className="text-sm">Export Analysis</div>
                    </Button>
                    <Button variant="outline" className="btn-ghost h-20 flex-col space-y-2">
                      <div className="text-2xl">🔔</div>
                      <div className="text-sm">Set Alerts</div>
                    </Button>
                    <Button variant="outline" className="btn-ghost h-20 flex-col space-y-2">
                      <div className="text-2xl">💬</div>
                      <div className="text-sm">Video Call</div>
                    </Button>
                    <Button variant="outline" className="btn-ghost h-20 flex-col space-y-2">
                      <div className="text-2xl">📅</div>
                      <div className="text-sm">Schedule Review</div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Collaboration;