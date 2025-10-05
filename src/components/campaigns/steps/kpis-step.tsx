"use client";

import React, { useState, useEffect } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Plus, Trash2, Target, TrendingUp, BarChart3, Eye, DollarSign, MousePointer, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { 
  type KPIsMetrics,
  validateKPIWeights
} from "@/lib/validations/campaign";

// KPI configuration with display information and realistic targets
const KPI_OPTIONS = [
  {
    type: "reach" as const,
    name: "Reach",
    description: "Total number of unique people who see your content",
    icon: Eye,
    unit: "people",
    category: "awareness",
    suggestedTargets: {
      low: { value: 10000, label: "10K people" },
      medium: { value: 50000, label: "50K people" },
      high: { value: 100000, label: "100K people" },
    },
    budgetMultiplier: 0.1, // $0.10 per person reached
  },
  {
    type: "engagement" as const,
    name: "Engagement",
    description: "Likes, comments, shares, and other interactions",
    icon: TrendingUp,
    unit: "interactions",
    category: "engagement",
    suggestedTargets: {
      low: { value: 1000, label: "1K interactions" },
      medium: { value: 5000, label: "5K interactions" },
      high: { value: 15000, label: "15K interactions" },
    },
    budgetMultiplier: 1.0, // $1.00 per engagement
  },
  {
    type: "conversions" as const,
    name: "Conversions",
    description: "Desired actions taken by users (purchases, sign-ups, etc.)",
    icon: Target,
    unit: "conversions",
    category: "conversion",
    suggestedTargets: {
      low: { value: 100, label: "100 conversions" },
      medium: { value: 500, label: "500 conversions" },
      high: { value: 1000, label: "1K conversions" },
    },
    budgetMultiplier: 50.0, // $50.00 per conversion
  },
  {
    type: "brand_awareness" as const,
    name: "Brand Awareness",
    description: "Increase in brand recognition and recall",
    icon: Zap,
    unit: "% lift",
    category: "awareness",
    suggestedTargets: {
      low: { value: 5, label: "5% lift" },
      medium: { value: 15, label: "15% lift" },
      high: { value: 25, label: "25% lift" },
    },
    budgetMultiplier: 1000.0, // $1000 per % lift
  },
  {
    type: "roi" as const,
    name: "Return on Investment",
    description: "Revenue generated compared to campaign spend",
    icon: DollarSign,
    unit: "% ROI",
    category: "financial",
    suggestedTargets: {
      low: { value: 200, label: "200% ROI" },
      medium: { value: 400, label: "400% ROI" },
      high: { value: 600, label: "600% ROI" },
    },
    budgetMultiplier: 0.01, // Based on budget percentage
  },
  {
    type: "ctr" as const,
    name: "Click-Through Rate",
    description: "Percentage of people who click on your ads",
    icon: MousePointer,
    unit: "% CTR",
    category: "performance",
    suggestedTargets: {
      low: { value: 1, label: "1% CTR" },
      medium: { value: 2.5, label: "2.5% CTR" },
      high: { value: 5, label: "5% CTR" },
    },
    budgetMultiplier: 100.0, // Based on impressions
  },
  {
    type: "cpc" as const,
    name: "Cost Per Click",
    description: "Average cost for each click on your ads",
    icon: BarChart3,
    unit: "$ per click",
    category: "performance",
    suggestedTargets: {
      low: { value: 5, label: "$5 per click" },
      medium: { value: 2, label: "$2 per click" },
      high: { value: 1, label: "$1 per click" },
    },
    budgetMultiplier: 0.02, // Based on budget
  },
  {
    type: "cpm" as const,
    name: "Cost Per Mille",
    description: "Cost per 1,000 impressions",
    icon: BarChart3,
    unit: "$ per 1K impressions",
    category: "performance",
    suggestedTargets: {
      low: { value: 20, label: "$20 CPM" },
      medium: { value: 10, label: "$10 CPM" },
      high: { value: 5, label: "$5 CPM" },
    },
    budgetMultiplier: 0.01, // Based on budget
  },
] as const;

interface KPIsStepProps {
  className?: string;
}

export function KPIsStep({ className }: KPIsStepProps) {
  const form = useFormContext<{ 
    kpisMetrics: KPIsMetrics;
    basics?: { budget: number };
    audienceChannels?: { audiences: Array<{ estimatedSize?: number }> };
  }>();
  
  const [weightError, setWeightError] = useState<string | null>(null);
  
  // Get campaign context for realistic validation
  const campaignBudget = form.watch("basics")?.budget || 0;
  const audiences = form.watch("audienceChannels")?.audiences || [];
  const totalAudienceSize = audiences.reduce((sum, audience) => sum + (audience.estimatedSize || 0), 0);
  
  // Field arrays for dynamic forms
  const {
    fields: kpiFields,
    append: appendKPI,
    remove: removeKPI,
  } = useFieldArray({
    control: form.control,
    name: "kpisMetrics.primaryKPIs",
  });

  const {
    fields: metricFields,
    append: appendMetric,
    remove: removeMetric,
  } = useFieldArray({
    control: form.control,
    name: "kpisMetrics.customMetrics",
  });

  // Watch for KPI weight changes
  const primaryKPIs = form.watch("kpisMetrics.primaryKPIs") || [];
  
  // Validate KPI weights whenever they change
  useEffect(() => {
    const validation = validateKPIWeights(primaryKPIs);
    setWeightError(validation.isValid ? null : validation.error || null);
  }, [primaryKPIs]);

  // Initialize with default KPI if empty
  useEffect(() => {
    if (kpiFields.length === 0) {
      appendKPI({
        type: "conversions",
        target: 100,
        timeframe: "campaign",
        weight: 40,
      });
    }
  }, [kpiFields.length, appendKPI]);

  // Calculate total weight
  const totalWeight = primaryKPIs.reduce((sum, kpi) => sum + (kpi.weight || 0), 0);
  const remainingWeight = 100 - totalWeight;

  // Add new KPI
  const addKPI = (kpiType: string) => {
    const kpiInfo = KPI_OPTIONS.find(k => k.type === kpiType);
    if (kpiInfo && !primaryKPIs.find(k => k.type === kpiType)) {
      const suggestedTarget = calculateSuggestedTarget(kpiInfo, campaignBudget, totalAudienceSize);
      appendKPI({
        type: kpiType as "reach" | "engagement" | "conversions" | "brand_awareness" | "roi" | "ctr" | "cpc" | "cpm",
        target: suggestedTarget,
        timeframe: "campaign",
        weight: Math.min(remainingWeight, 20), // Default 20% weight
      });
    }
  };

  // Add new custom metric
  const addCustomMetric = () => {
    appendMetric({
      name: "",
      description: "",
      target: 0,
      unit: "",
    });
  };

  // Calculate suggested target based on budget and audience
  const calculateSuggestedTarget = (kpiInfo: typeof KPI_OPTIONS[number], budget: number, audienceSize: number): number => {
    if (budget === 0) return kpiInfo.suggestedTargets.low.value;
    
    const budgetBasedTarget = budget * kpiInfo.budgetMultiplier;
    
    // Adjust based on audience size for reach-based metrics
    if (kpiInfo.type === "reach" && audienceSize > 0) {
      return Math.min(budgetBasedTarget, audienceSize * 0.8); // Max 80% of audience
    }
    
    // For engagement, scale with reach potential
    if (kpiInfo.type === "engagement" && audienceSize > 0) {
      const reachPotential = Math.min(budget * 0.1, audienceSize * 0.8);
      return Math.floor(reachPotential * 0.1); // 10% engagement rate
    }
    
    return Math.floor(budgetBasedTarget);
  };



  return (
    <div className={cn("space-y-6", className)}>
      {/* KPI Weight Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            KPI Weight Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div>
              <p className="text-2xl font-bold text-primary">
                {totalWeight}%
              </p>
              <p className="text-sm text-muted-foreground">Total Weight</p>
            </div>
            <div>
              <p className={cn(
                "text-2xl font-bold",
                remainingWeight < 0 ? "text-red-600" : "text-green-600"
              )}>
                {remainingWeight}%
              </p>
              <p className="text-sm text-muted-foreground">Remaining</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {primaryKPIs.length}
              </p>
              <p className="text-sm text-muted-foreground">Active KPIs</p>
            </div>
          </div>
          
          {weightError && (
            <Alert variant="destructive">
              <AlertDescription>{weightError}</AlertDescription>
            </Alert>
          )}
          
          <div className="text-xs text-muted-foreground mt-2">
            <p>• Total KPI weights should not exceed 100%</p>
            <p>• Higher weights indicate more important metrics</p>
            <p>• Targets are suggested based on your budget and audience size</p>
          </div>
        </CardContent>
      </Card>

      {/* Primary KPIs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Primary KPIs
            </CardTitle>
            <Select onValueChange={addKPI}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Add KPI" />
              </SelectTrigger>
              <SelectContent>
                {KPI_OPTIONS
                  .filter(option => !primaryKPIs.find(k => k.type === option.type))
                  .map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <SelectItem key={option.type} value={option.type}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          <span>{option.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {kpiFields.map((field, index) => (
            <KPIForm
              key={field.id}
              index={index}
              onRemove={() => removeKPI(index)}
              canRemove={kpiFields.length > 1}
              campaignBudget={campaignBudget}
              audienceSize={totalAudienceSize}
            />
          ))}
        </CardContent>
      </Card>

      {/* Custom Metrics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Custom Metrics
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCustomMetric}
              disabled={metricFields.length >= 20}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Metric
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {metricFields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No custom metrics defined</p>
              <p className="text-sm">Add custom metrics to track additional success indicators</p>
            </div>
          ) : (
            metricFields.map((field, index) => (
              <CustomMetricForm
                key={field.id}
                index={index}
                onRemove={() => removeMetric(index)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Tracking Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Tracking Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="kpisMetrics.trackingSettings.enableAnalytics"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div>
                  <FormLabel>Enable Analytics Tracking</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Automatically track campaign performance metrics
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="kpisMetrics.trackingSettings.reportingFrequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reporting Frequency</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || "weekly"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reporting frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="daily">Daily Reports</SelectItem>
                    <SelectItem value="weekly">Weekly Reports</SelectItem>
                    <SelectItem value="monthly">Monthly Reports</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="kpisMetrics.trackingSettings.autoReporting"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div>
                  <FormLabel>Automated Reporting</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Automatically send performance reports to team members
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
// KPI Form Component
interface KPIFormProps {
  index: number;
  onRemove: () => void;
  canRemove: boolean;
  campaignBudget: number;
  audienceSize: number;
}

function KPIForm({ index, onRemove, canRemove, campaignBudget, audienceSize }: KPIFormProps) {
  const form = useFormContext();
  
  const kpiType = form.watch(`kpisMetrics.primaryKPIs.${index}.type`);
  const kpiInfo = KPI_OPTIONS.find(k => k.type === kpiType);
  
  if (!kpiInfo) return null;

  const IconComponent = kpiInfo.icon;
  const suggestions = campaignBudget > 0 ? {
    conservative: Math.floor(calculateSuggestedTarget(kpiInfo, campaignBudget, audienceSize) * 0.7),
    realistic: calculateSuggestedTarget(kpiInfo, campaignBudget, audienceSize),
    ambitious: Math.floor(calculateSuggestedTarget(kpiInfo, campaignBudget, audienceSize) * 1.5),
  } : null;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IconComponent className="h-5 w-5 text-primary" />
            <div>
              <h4 className="font-medium">{kpiInfo.name}</h4>
              <p className="text-sm text-muted-foreground">{kpiInfo.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {kpiInfo.category}
            </Badge>
            {canRemove && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Target Value */}
        <FormField
          control={form.control}
          name={`kpisMetrics.primaryKPIs.${index}.target`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Value</FormLabel>
              <FormControl>
                <div className="flex items-center gap-2">
                  <Input
                    {...field}
                    type="number"
                    min={0}
                    placeholder="Enter target value"
                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                  />
                  <span className="text-sm text-muted-foreground min-w-fit">
                    {kpiInfo.unit}
                  </span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Target Suggestions */}
        {suggestions && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Suggested targets based on your budget:</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => form.setValue(`kpisMetrics.primaryKPIs.${index}.target`, suggestions.conservative)}
                className="text-xs"
              >
                Conservative: {suggestions.conservative.toLocaleString()} {kpiInfo.unit}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => form.setValue(`kpisMetrics.primaryKPIs.${index}.target`, suggestions.realistic)}
                className="text-xs"
              >
                Realistic: {suggestions.realistic.toLocaleString()} {kpiInfo.unit}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => form.setValue(`kpisMetrics.primaryKPIs.${index}.target`, suggestions.ambitious)}
                className="text-xs"
              >
                Ambitious: {suggestions.ambitious.toLocaleString()} {kpiInfo.unit}
              </Button>
            </div>
          </div>
        )}

        {/* Timeframe */}
        <FormField
          control={form.control}
          name={`kpisMetrics.primaryKPIs.${index}.timeframe`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Measurement Timeframe</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="campaign">Campaign Total</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Weight */}
        <FormField
          control={form.control}
          name={`kpisMetrics.primaryKPIs.${index}.weight`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Importance Weight: {field.value || 0}%
              </FormLabel>
              <FormControl>
                <Slider
                  value={[field.value || 0]}
                  onValueChange={(value) => field.onChange(value[0])}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Higher weights indicate more important metrics for campaign success
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}

// Custom Metric Form Component
interface CustomMetricFormProps {
  index: number;
  onRemove: () => void;
}

function CustomMetricForm({ index, onRemove }: CustomMetricFormProps) {
  const form = useFormContext();

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Custom Metric #{index + 1}</h4>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metric Name */}
        <FormField
          control={form.control}
          name={`kpisMetrics.customMetrics.${index}.name`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Metric Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g., Email Open Rate, Social Mentions"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name={`kpisMetrics.customMetrics.${index}.description`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Describe what this metric measures and why it's important"
                  rows={2}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Target and Unit */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name={`kpisMetrics.customMetrics.${index}.target`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Value</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={0}
                    placeholder="Target value"
                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`kpisMetrics.customMetrics.${index}.unit`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., %, clicks, mentions"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function (moved outside component to avoid re-creation)
function calculateSuggestedTarget(kpiInfo: typeof KPI_OPTIONS[number], budget: number, audienceSize: number): number {
  if (budget === 0) return kpiInfo.suggestedTargets.low.value;
  
  const budgetBasedTarget = budget * kpiInfo.budgetMultiplier;
  
  // Adjust based on audience size for reach-based metrics
  if (kpiInfo.type === "reach" && audienceSize > 0) {
    return Math.min(budgetBasedTarget, audienceSize * 0.8); // Max 80% of audience
  }
  
  // For engagement, scale with reach potential
  if (kpiInfo.type === "engagement" && audienceSize > 0) {
    const reachPotential = Math.min(budget * 0.1, audienceSize * 0.8);
    return Math.floor(reachPotential * 0.1); // 10% engagement rate
  }
  
  return Math.floor(budgetBasedTarget);
}