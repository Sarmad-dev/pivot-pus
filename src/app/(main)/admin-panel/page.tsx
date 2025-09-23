"use client"
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const AdminPanel = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mock data
  const mockUsers = [
    {
      id: 1,
      name: 'Sarah Chen',
      email: 'sarah@creativepulse.com',
      role: 'Agency Owner',
      status: 'active',
      lastLogin: '2 hours ago',
      campaigns: 12,
      plan: 'Pro'
    },
    {
      id: 2,
      name: 'Marcus Rodriguez',
      email: 'marcus@brandflow.com',
      role: 'Campaign Manager',
      status: 'active',
      lastLogin: '1 day ago',
      campaigns: 8,
      plan: 'Basic'
    },
    {
      id: 3,
      name: 'Emma Thompson',
      email: 'emma@digitaldynamics.com',
      role: 'Client',
      status: 'inactive',
      lastLogin: '1 week ago',
      campaigns: 3,
      plan: 'Basic'
    },
    {
      id: 4,
      name: 'David Kim',
      email: 'david@techflow.com',
      role: 'Editor',
      status: 'active',
      lastLogin: '3 hours ago',
      campaigns: 15,
      plan: 'Enterprise'
    }
  ];

  const mockAnalytics = {
    totalUsers: 247,
    activeUsers: 189,
    totalCampaigns: 1834,
    totalRevenue: 89420,
    growthRate: 23.5
  };

  const mockPlans = [
    {
      name: 'Basic',
      price: 99,
      users: 142,
      revenue: 14058,
      features: ['5 Campaigns', 'Basic Analytics', 'Email Support']
    },
    {
      name: 'Pro',
      price: 299,
      users: 78,
      revenue: 23322,
      features: ['Unlimited Campaigns', 'Advanced Analytics', 'Priority Support', 'API Access']
    },
    {
      name: 'Enterprise',
      price: 599,
      users: 27,
      revenue: 16173,
      features: ['Everything in Pro', 'Custom Integrations', 'Dedicated Manager', 'SLA']
    }
  ];

  const filteredUsers = mockUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                <Link href="/collaboration" className="text-muted-foreground hover:text-primary transition-colors">Collaboration</Link>
                <Link href="/admin" className="text-primary font-medium">Admin</Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-warning/20 text-warning">
                👑 Admin Panel
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
            <h1 className="text-3xl font-bold text-foreground mb-2">Admin Panel</h1>
            <p className="text-muted-foreground">Manage users, subscriptions, and platform analytics</p>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="glass hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-3xl font-bold text-foreground">{mockAnalytics.totalUsers}</p>
                  </div>
                  <div className="text-3xl">👥</div>
                </div>
                <div className="mt-2">
                  <Badge variant="secondary" className="bg-success/20 text-success">+12% this month</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="glass hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Users</p>
                    <p className="text-3xl font-bold text-foreground">{mockAnalytics.activeUsers}</p>
                  </div>
                  <div className="text-3xl">🟢</div>
                </div>
                <div className="mt-2">
                  <Progress value={(mockAnalytics.activeUsers / mockAnalytics.totalUsers) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Campaigns</p>
                    <p className="text-3xl font-bold text-foreground">{mockAnalytics.totalCampaigns.toLocaleString()}</p>
                  </div>
                  <div className="text-3xl">🚀</div>
                </div>
                <div className="mt-2">
                  <Badge variant="secondary" className="bg-primary/20 text-primary">Active platform</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="glass hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                    <p className="text-3xl font-bold text-foreground">${mockAnalytics.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="text-3xl">💰</div>
                </div>
                <div className="mt-2">
                  <Badge variant="secondary" className="bg-success/20 text-success">+{mockAnalytics.growthRate}% growth</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="users" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              <Card className="glass">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-foreground">User Management</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Manage user accounts, roles, and permissions
                      </CardDescription>
                    </div>
                    <Button className="btn-hero">
                      + Add User
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4 mb-6">
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-sm bg-surface/50 border-border/50 focus:border-primary"
                    />
                    <Select>
                      <SelectTrigger className="w-40 bg-surface/50 border-border/50">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="agency-owner">Agency Owner</SelectItem>
                        <SelectItem value="campaign-manager">Campaign Manager</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select>
                      <SelectTrigger className="w-40 bg-surface/50 border-border/50">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="border border-border/30 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-surface/30">
                          <TableHead className="text-foreground">User</TableHead>
                          <TableHead className="text-foreground">Role</TableHead>
                          <TableHead className="text-foreground">Status</TableHead>
                          <TableHead className="text-foreground">Plan</TableHead>
                          <TableHead className="text-foreground">Campaigns</TableHead>
                          <TableHead className="text-foreground">Last Login</TableHead>
                          <TableHead className="text-foreground">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id} className="border-border/30">
                            <TableCell>
                              <div>
                                <div className="font-medium text-foreground">{user.name}</div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="border-border/50">
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                                {user.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                user.plan === 'Enterprise' ? 'border-primary/50 text-primary' :
                                user.plan === 'Pro' ? 'border-success/50 text-success' :
                                'border-border/50'
                              }>
                                {user.plan}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-foreground">{user.campaigns}</TableCell>
                            <TableCell className="text-muted-foreground">{user.lastLogin}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button variant="ghost" size="sm" className="btn-minimal">
                                  Edit
                                </Button>
                                <Button variant="ghost" size="sm" className="btn-minimal text-destructive">
                                  Suspend
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Subscriptions Tab */}
            <TabsContent value="subscriptions" className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                {mockPlans.map((plan, index) => (
                  <Card key={index} className="glass hover-lift">
                    <CardHeader>
                      <CardTitle className="text-foreground">{plan.name} Plan</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        ${plan.price}/month per user
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Active Users</div>
                          <div className="text-2xl font-bold text-foreground">{plan.users}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Monthly Revenue</div>
                          <div className="text-2xl font-bold text-foreground">${plan.revenue.toLocaleString()}</div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-muted-foreground mb-2">Features</div>
                        <div className="space-y-1">
                          {plan.features.map((feature, idx) => (
                            <div key={idx} className="text-xs text-foreground flex items-center">
                              <span className="w-1 h-1 bg-primary rounded-full mr-2"></span>
                              {feature}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <Button variant="outline" className="w-full btn-ghost">
                        Manage Plan
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-foreground">User Growth</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Monthly user acquisition trends
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      📈 Chart placeholder - User growth over time
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-foreground">Revenue Analytics</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Revenue breakdown by subscription plan
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      💰 Chart placeholder - Revenue by plan
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-foreground">Campaign Activity</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Platform usage and campaign creation trends
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      🚀 Chart placeholder - Campaign activity
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-foreground">Feature Usage</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Most used features and tools
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      📊 Chart placeholder - Feature usage stats
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-foreground">Platform Settings</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Configure global platform settings and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="maintenance" className="text-foreground">Maintenance Mode</Label>
                          <p className="text-sm text-muted-foreground">Enable to prevent new user signups</p>
                        </div>
                        <Switch id="maintenance" />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="notifications" className="text-foreground">System Notifications</Label>
                          <p className="text-sm text-muted-foreground">Send platform updates to users</p>
                        </div>
                        <Switch id="notifications" defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="analytics" className="text-foreground">Usage Analytics</Label>
                          <p className="text-sm text-muted-foreground">Collect anonymized usage data</p>
                        </div>
                        <Switch id="analytics" defaultChecked />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="auto-backup" className="text-foreground">Auto Backup</Label>
                          <p className="text-sm text-muted-foreground">Automatic daily backups</p>
                        </div>
                        <Switch id="auto-backup" defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="api-access" className="text-foreground">API Access</Label>
                          <p className="text-sm text-muted-foreground">Allow third-party integrations</p>
                        </div>
                        <Switch id="api-access" defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="beta-features" className="text-foreground">Beta Features</Label>
                          <p className="text-sm text-muted-foreground">Enable experimental features</p>
                        </div>
                        <Switch id="beta-features" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-border/30">
                    <div className="flex space-x-4">
                      <Button className="btn-hero">Save Settings</Button>
                      <Button variant="outline" className="btn-ghost">Reset to Defaults</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;