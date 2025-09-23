"use client"

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const Profile = () => {
  const [profile, setProfile] = useState({
    name: 'Sarah Chen',
    email: 'sarah@creativepulse.com',
    company: 'CreativePulse Agency',
    role: 'Agency Director',
    phone: '+1 (555) 123-4567',
    timezone: 'America/New_York',
    bio: 'Digital marketing strategist with 8+ years of experience in campaign management and data-driven insights.',
    avatar: 'SC'
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    weeklyReports: true,
    marketingEmails: false,
    aiInsights: true,
    performanceAlerts: true
  });

  const handleProfileUpdate = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handlePreferenceToggle = (preference: string) => {
    setPreferences(prev => ({ ...prev, [preference]: !prev[preference as keyof typeof prev] }));
  };

  const mockActivityLog = [
    { action: 'Created Q4 Campaign', timestamp: '2 hours ago', type: 'campaign' },
    { action: 'Updated team permissions', timestamp: '1 day ago', type: 'admin' },
    { action: 'Generated performance report', timestamp: '2 days ago', type: 'report' },
    { action: 'Collaborated on Brand Awareness campaign', timestamp: '3 days ago', type: 'collaboration' },
    { action: 'Updated profile settings', timestamp: '1 week ago', type: 'profile' }
  ];

  const mockUsageStats = {
    campaignsCreated: 47,
    reportsGenerated: 128,
    collaborationSessions: 89,
    aiInsightsUsed: 234
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
                <Link href="/collaboration" className="text-muted-foreground hover:text-primary transition-colors">Collaboration</Link>
                <Link href="/admin-panel" className="text-muted-foreground hover:text-primary transition-colors">Admin</Link>
              </div>
            </div>
            <Link href="/dashboard">
              <Button variant="ghost" className="btn-minimal">← Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-6">
              <Avatar className="w-20 h-20">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {profile.avatar}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold text-foreground">{profile.name}</h1>
                <p className="text-muted-foreground">{profile.role} at {profile.company}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <Badge variant="secondary" className="bg-success/20 text-success">Pro Plan</Badge>
                  <Badge variant="outline" className="border-primary/50 text-primary">Account Owner</Badge>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <Card className="glass">
                    <CardHeader>
                      <CardTitle className="text-foreground">Personal Information</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Update your personal details and contact information
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-foreground">Full Name</Label>
                          <Input
                            id="name"
                            value={profile.name}
                            onChange={(e) => handleProfileUpdate('name', e.target.value)}
                            className="bg-surface/50 border-border/50 focus:border-primary"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-foreground">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            value={profile.email}
                            onChange={(e) => handleProfileUpdate('email', e.target.value)}
                            className="bg-surface/50 border-border/50 focus:border-primary"
                          />
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="company" className="text-foreground">Company</Label>
                          <Input
                            id="company"
                            value={profile.company}
                            onChange={(e) => handleProfileUpdate('company', e.target.value)}
                            className="bg-surface/50 border-border/50 focus:border-primary"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="role" className="text-foreground">Role</Label>
                          <Input
                            id="role"
                            value={profile.role}
                            onChange={(e) => handleProfileUpdate('role', e.target.value)}
                            className="bg-surface/50 border-border/50 focus:border-primary"
                          />
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone" className="text-foreground">Phone Number</Label>
                          <Input
                            id="phone"
                            value={profile.phone}
                            onChange={(e) => handleProfileUpdate('phone', e.target.value)}
                            className="bg-surface/50 border-border/50 focus:border-primary"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="timezone" className="text-foreground">Timezone</Label>
                          <Select value={profile.timezone} onValueChange={(value) => handleProfileUpdate('timezone', value)}>
                            <SelectTrigger className="bg-surface/50 border-border/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="America/New_York">Eastern Time (EST)</SelectItem>
                              <SelectItem value="America/Chicago">Central Time (CST)</SelectItem>
                              <SelectItem value="America/Denver">Mountain Time (MST)</SelectItem>
                              <SelectItem value="America/Los_Angeles">Pacific Time (PST)</SelectItem>
                              <SelectItem value="Europe/London">London (GMT)</SelectItem>
                              <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="bio" className="text-foreground">Bio</Label>
                        <Textarea
                          id="bio"
                          placeholder="Tell us about yourself..."
                          value={profile.bio}
                          onChange={(e) => handleProfileUpdate('bio', e.target.value)}
                          className="bg-surface/50 border-border/50 focus:border-primary min-h-[100px]"
                        />
                      </div>
                      
                      <div className="flex space-x-4">
                        <Button className="btn-hero">Save Changes</Button>
                        <Button variant="outline" className="btn-ghost">Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="glass">
                    <CardHeader>
                      <CardTitle className="text-foreground">Usage Statistics</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Your platform activity overview
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground">{mockUsageStats.campaignsCreated}</div>
                          <div className="text-sm text-muted-foreground">Campaigns Created</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground">{mockUsageStats.reportsGenerated}</div>
                          <div className="text-sm text-muted-foreground">Reports Generated</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground">{mockUsageStats.collaborationSessions}</div>
                          <div className="text-sm text-muted-foreground">Collaboration Sessions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground">{mockUsageStats.aiInsightsUsed}</div>
                          <div className="text-sm text-muted-foreground">AI Insights Used</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="glass">
                    <CardHeader>
                      <CardTitle className="text-foreground">Account Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Plan</span>
                        <Badge variant="secondary" className="bg-success/20 text-success">Pro</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <Badge variant="secondary" className="bg-success/20 text-success">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Next Billing</span>
                        <span className="text-sm text-foreground">Dec 15, 2024</span>
                      </div>
                      <Separator />
                      <Link href="/pricing">
                        <Button variant="outline" className="w-full btn-ghost text-sm">
                          Manage Subscription
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="space-y-6">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-foreground">Notification Preferences</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Control how and when you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="email-notifications" className="text-foreground">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive campaign updates and alerts via email</p>
                      </div>
                      <Switch
                        id="email-notifications"
                        checked={preferences.emailNotifications}
                        onCheckedChange={() => handlePreferenceToggle('emailNotifications')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="push-notifications" className="text-foreground">Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">Real-time browser notifications for urgent alerts</p>
                      </div>
                      <Switch
                        id="push-notifications"
                        checked={preferences.pushNotifications}
                        onCheckedChange={() => handlePreferenceToggle('pushNotifications')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="weekly-reports" className="text-foreground">Weekly Reports</Label>
                        <p className="text-sm text-muted-foreground">Automated weekly performance summaries</p>
                      </div>
                      <Switch
                        id="weekly-reports"
                        checked={preferences.weeklyReports}
                        onCheckedChange={() => handlePreferenceToggle('weeklyReports')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="ai-insights" className="text-foreground">AI Insights</Label>
                        <p className="text-sm text-muted-foreground">Proactive AI recommendations and insights</p>
                      </div>
                      <Switch
                        id="ai-insights"
                        checked={preferences.aiInsights}
                        onCheckedChange={() => handlePreferenceToggle('aiInsights')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="performance-alerts" className="text-foreground">Performance Alerts</Label>
                        <p className="text-sm text-muted-foreground">Notifications for significant performance changes</p>
                      </div>
                      <Switch
                        id="performance-alerts"
                        checked={preferences.performanceAlerts}
                        onCheckedChange={() => handlePreferenceToggle('performanceAlerts')}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex space-x-4">
                    <Button className="btn-hero">Save Preferences</Button>
                    <Button variant="outline" className="btn-ghost">Reset to Defaults</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-foreground">Password & Authentication</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Manage your login credentials and security settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password" className="text-foreground">Current Password</Label>
                      <Input
                        id="current-password"
                        type="password"
                        placeholder="••••••••"
                        className="bg-surface/50 border-border/50 focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password" className="text-foreground">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="••••••••"
                        className="bg-surface/50 border-border/50 focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-foreground">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="••••••••"
                        className="bg-surface/50 border-border/50 focus:border-primary"
                      />
                    </div>
                    <Button className="w-full btn-hero">Update Password</Button>
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-foreground">Two-Factor Authentication</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Add an extra layer of security to your account
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 glass-strong rounded-lg">
                      <div>
                        <div className="font-medium text-foreground">Authenticator App</div>
                        <div className="text-sm text-muted-foreground">Use an authenticator app for 2FA</div>
                      </div>
                      <Badge variant="secondary" className="bg-muted/20 text-muted-foreground">Not enabled</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 glass-strong rounded-lg">
                      <div>
                        <div className="font-medium text-foreground">SMS Authentication</div>
                        <div className="text-sm text-muted-foreground">Receive codes via text message</div>
                      </div>
                      <Badge variant="secondary" className="bg-muted/20 text-muted-foreground">Not enabled</Badge>
                    </div>
                    
                    <Button variant="outline" className="w-full btn-ghost">
                      Set Up 2FA
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-6">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-foreground">Recent Activity</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Your recent actions and platform interactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockActivityLog.map((activity, index) => (
                      <div key={index} className="flex items-center space-x-4 p-4 glass-strong rounded-lg">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ${
                          activity.type === 'campaign' ? 'bg-primary/20 text-primary' :
                          activity.type === 'admin' ? 'bg-warning/20 text-warning' :
                          activity.type === 'report' ? 'bg-success/20 text-success' :
                          activity.type === 'collaboration' ? 'bg-accent/20 text-accent' :
                          'bg-surface text-foreground'
                        }`}>
                          {activity.type === 'campaign' ? '🚀' :
                           activity.type === 'admin' ? '⚙️' :
                           activity.type === 'report' ? '📊' :
                           activity.type === 'collaboration' ? '👥' : '👤'}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{activity.action}</div>
                          <div className="text-sm text-muted-foreground">{activity.timestamp}</div>
                        </div>
                        <Badge variant="outline" className="border-border/50 text-xs">
                          {activity.type}
                        </Badge>
                      </div>
                    ))}
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

export default Profile;