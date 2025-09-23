"use client"
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const CampaignCreation = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    objective: '',
    budget: '',
    duration: '',
    targetAudience: '',
    channels: [] as string[],
    kpis: [] as string[]
  });

  const steps = [
    { id: 1, title: 'Campaign Basics', description: 'Name, description, and objectives' },
    { id: 2, title: 'Audience & Budget', description: 'Target audience and budget allocation' },
    { id: 3, title: 'Channels & KPIs', description: 'Distribution channels and success metrics' },
    { id: 4, title: 'AI Configuration', description: 'Set up AI monitoring and predictions' }
  ];

  const availableChannels = [
    'Social Media', 'Email Marketing', 'Content Marketing', 'Paid Advertising', 
    'Influencer Marketing', 'PR Outreach', 'SEO/SEM', 'Events'
  ];

  const availableKPIs = [
    'Engagement Rate', 'Click-through Rate', 'Conversion Rate', 'Brand Awareness',
    'Lead Generation', 'Sales Revenue', 'Cost per Acquisition', 'Return on Ad Spend'
  ];

  const handleChannelToggle = (channel: string) => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
    }));
  };

  const handleKPIToggle = (kpi: string) => {
    setFormData(prev => ({
      ...prev,
      kpis: prev.kpis.includes(kpi)
        ? prev.kpis.filter(k => k !== kpi)
        : [...prev.kpis, kpi]
    }));
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = () => {
    // Mock campaign creation
    alert('Campaign created successfully! Redirecting to dashboard...');
    window.location.href = '/dashboard';
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
                <Link href="/campaigns/create" className="text-primary font-medium">Campaigns</Link>
                <Link href="/collaboration" className="text-muted-foreground hover:text-primary transition-colors">Collaboration</Link>
                <Link href="/admin" className="text-muted-foreground hover:text-primary transition-colors">Admin</Link>
              </div>
            </div>
            <Link href="/dashboard">
              <Button variant="ghost" className="btn-minimal">← Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Create New Campaign</h1>
            <p className="text-muted-foreground">Set up AI-powered campaign tracking and predictions</p>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Progress Sidebar */}
            <div className="lg:col-span-1">
              <Card className="glass sticky top-6">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">Setup Progress</CardTitle>
                  <Progress value={(currentStep / 4) * 100} className="mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {steps.map((step) => (
                    <div
                      key={step.id}
                      className={`p-3 rounded-lg transition-colors cursor-pointer ${
                        currentStep === step.id
                          ? 'bg-primary/20 border border-primary/50'
                          : currentStep > step.id
                          ? 'bg-success/20 border border-success/50'
                          : 'bg-surface/30 border border-border/30'
                      }`}
                      onClick={() => setCurrentStep(step.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          currentStep === step.id
                            ? 'bg-primary text-primary-foreground'
                            : currentStep > step.id
                            ? 'bg-success text-success-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {currentStep > step.id ? '✓' : step.id}
                        </div>
                        <div className="flex-1">
                          <div className={`font-medium text-sm ${
                            currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {step.title}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {step.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Main Form */}
            <div className="lg:col-span-3">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-foreground">{steps[currentStep - 1].title}</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {steps[currentStep - 1].description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Step 1: Campaign Basics */}
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name" className="text-foreground">Campaign Name</Label>
                        <Input
                          id="name"
                          placeholder="e.g., Q4 Product Launch Campaign"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="bg-surface/50 border-border/50 focus:border-primary"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="description" className="text-foreground">Description</Label>
                        <Textarea
                          id="description"
                          placeholder="Describe your campaign objectives and strategy..."
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          className="bg-surface/50 border-border/50 focus:border-primary min-h-[100px]"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="objective" className="text-foreground">Primary Objective</Label>
                        <Select onValueChange={(value) => setFormData(prev => ({ ...prev, objective: value }))}>
                          <SelectTrigger className="bg-surface/50 border-border/50">
                            <SelectValue placeholder="Select campaign objective" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="brand-awareness">Brand Awareness</SelectItem>
                            <SelectItem value="lead-generation">Lead Generation</SelectItem>
                            <SelectItem value="sales-conversion">Sales Conversion</SelectItem>
                            <SelectItem value="engagement">Engagement</SelectItem>
                            <SelectItem value="retention">Customer Retention</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Audience & Budget */}
                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="audience" className="text-foreground">Target Audience</Label>
                        <Textarea
                          id="audience"
                          placeholder="Describe your target audience demographics, interests, and behaviors..."
                          value={formData.targetAudience}
                          onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
                          className="bg-surface/50 border-border/50 focus:border-primary min-h-[100px]"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="budget" className="text-foreground">Total Budget ($)</Label>
                        <Input
                          id="budget"
                          type="number"
                          placeholder="50000"
                          value={formData.budget}
                          onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                          className="bg-surface/50 border-border/50 focus:border-primary"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="duration" className="text-foreground">Campaign Duration</Label>
                        <Select onValueChange={(value) => setFormData(prev => ({ ...prev, duration: value }))}>
                          <SelectTrigger className="bg-surface/50 border-border/50">
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1-month">1 Month</SelectItem>
                            <SelectItem value="3-months">3 Months</SelectItem>
                            <SelectItem value="6-months">6 Months</SelectItem>
                            <SelectItem value="12-months">12 Months</SelectItem>
                            <SelectItem value="ongoing">Ongoing</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Channels & KPIs */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div>
                        <Label className="text-foreground text-base font-medium">Distribution Channels</Label>
                        <p className="text-sm text-muted-foreground mb-4">Select the channels where your campaign will run</p>
                        <div className="grid grid-cols-2 gap-3">
                          {availableChannels.map((channel) => (
                            <div key={channel} className="flex items-center space-x-2">
                              <Checkbox
                                id={channel}
                                checked={formData.channels.includes(channel)}
                                onCheckedChange={() => handleChannelToggle(channel)}
                              />
                              <Label htmlFor={channel} className="text-sm text-foreground cursor-pointer">
                                {channel}
                              </Label>
                            </div>
                          ))}
                        </div>
                        {formData.channels.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm text-muted-foreground mb-2">Selected channels:</p>
                            <div className="flex flex-wrap gap-2">
                              {formData.channels.map((channel) => (
                                <Badge key={channel} variant="secondary" className="bg-primary/20 text-primary">
                                  {channel}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <Label className="text-foreground text-base font-medium">Key Performance Indicators</Label>
                        <p className="text-sm text-muted-foreground mb-4">Choose the metrics to track and optimize</p>
                        <div className="grid grid-cols-2 gap-3">
                          {availableKPIs.map((kpi) => (
                            <div key={kpi} className="flex items-center space-x-2">
                              <Checkbox
                                id={kpi}
                                checked={formData.kpis.includes(kpi)}
                                onCheckedChange={() => handleKPIToggle(kpi)}
                              />
                              <Label htmlFor={kpi} className="text-sm text-foreground cursor-pointer">
                                {kpi}
                              </Label>
                            </div>
                          ))}
                        </div>
                        {formData.kpis.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm text-muted-foreground mb-2">Selected KPIs:</p>
                            <div className="flex flex-wrap gap-2">
                              {formData.kpis.map((kpi) => (
                                <Badge key={kpi} variant="secondary" className="bg-success/20 text-success">
                                  {kpi}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 4: AI Configuration */}
                  {currentStep === 4 && (
                    <div className="space-y-6">
                      <div className="text-center">
                        <div className="text-6xl mb-4">🤖</div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">AI Configuration</h3>
                        <p className="text-muted-foreground">
                          Your campaign will be monitored by our AI system for real-time insights and predictions.
                        </p>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <Card className="glass-strong">
                          <CardContent className="p-4">
                            <div className="text-center">
                              <div className="text-2xl mb-2">📊</div>
                              <h4 className="font-medium text-foreground">Performance Tracking</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Real-time monitoring of your selected KPIs
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card className="glass-strong">
                          <CardContent className="p-4">
                            <div className="text-center">
                              <div className="text-2xl mb-2">🔮</div>
                              <h4 className="font-medium text-foreground">Predictive Analytics</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                AI-powered performance forecasting
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card className="glass-strong">
                          <CardContent className="p-4">
                            <div className="text-center">
                              <div className="text-2xl mb-2">🎯</div>
                              <h4 className="font-medium text-foreground">Pivot Recommendations</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Smart suggestions for optimization
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card className="glass-strong">
                          <CardContent className="p-4">
                            <div className="text-center">
                              <div className="text-2xl mb-2">🕵️</div>
                              <h4 className="font-medium text-foreground">Competitor Analysis</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Monitor competitive landscape
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <div className="bg-surface/30 p-4 rounded-lg">
                        <h4 className="font-medium text-foreground mb-2">Campaign Summary</h4>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-muted-foreground">Name:</span> <span className="text-foreground">{formData.name || 'Not set'}</span></div>
                          <div><span className="text-muted-foreground">Objective:</span> <span className="text-foreground">{formData.objective || 'Not set'}</span></div>
                          <div><span className="text-muted-foreground">Budget:</span> <span className="text-foreground">${formData.budget || 'Not set'}</span></div>
                          <div><span className="text-muted-foreground">Duration:</span> <span className="text-foreground">{formData.duration || 'Not set'}</span></div>
                          <div><span className="text-muted-foreground">Channels:</span> <span className="text-foreground">{formData.channels.length} selected</span></div>
                          <div><span className="text-muted-foreground">KPIs:</span> <span className="text-foreground">{formData.kpis.length} selected</span></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-6 border-t border-border/30">
                    <Button
                      variant="outline"
                      onClick={prevStep}
                      disabled={currentStep === 1}
                      className="btn-ghost"
                    >
                      Previous
                    </Button>
                    
                    {currentStep < 4 ? (
                      <Button onClick={nextStep} className="btn-hero">
                        Next Step
                      </Button>
                    ) : (
                      <Button onClick={handleSubmit} className="btn-hero">
                        Create Campaign
                      </Button>
                    )}
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

export default CampaignCreation;