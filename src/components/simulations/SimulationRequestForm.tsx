"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Plus, X } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Validation schema
const simulationRequestSchema = z.object({
  campaignId: z.string().min(1, "Please select a campaign"),
  timeframe: z.object({
    startDate: z.date({
      message: "Start date is required",
    }),
    endDate: z.date({
      message: "End date is required",
    }),
    granularity: z.enum(["daily", "weekly"], {
      message: "Please select granularity",
    }),
  }),
  metrics: z.array(z.object({
    type: z.string(),
    weight: z.number().min(0).max(1),
    benchmarkSource: z.string().optional(),
  })).min(1, "Please select at least one metric"),
  scenarios: z.array(z.string()).min(1, "Please select at least one scenario"),
  externalDataSources: z.array(z.string()),
});

type SimulationRequestFormData = z.infer<typeof simulationRequestSchema>;

interface Campaign {
  _id: string;
  name: string;
  status: string;
  category: string;
  budget: number;
  currency: string;
}

interface ExternalDataSource {
  _id: string;
  source: string;
  status: string;
}

interface SimulationRequestFormProps {
  campaigns: Campaign[];
  externalDataSources: ExternalDataSource[];
  onSubmit: (data: SimulationRequestFormData) => Promise<void>;
  isSubmitting?: boolean;
}

const AVAILABLE_METRICS = [
  { id: "ctr", label: "Click-Through Rate", description: "Percentage of clicks per impression" },
  { id: "impressions", label: "Impressions", description: "Total number of ad views" },
  { id: "engagement", label: "Engagement Rate", description: "User interactions per impression" },
  { id: "reach", label: "Reach", description: "Unique users reached" },
  { id: "conversions", label: "Conversions", description: "Goal completions" },
  { id: "cpc", label: "Cost Per Click", description: "Average cost per click" },
  { id: "cpm", label: "Cost Per Mille", description: "Cost per thousand impressions" },
];

const AVAILABLE_SCENARIOS = [
  { id: "optimistic", label: "Optimistic", description: "Best-case performance scenario (75th percentile)" },
  { id: "realistic", label: "Realistic", description: "Most likely performance scenario (50th percentile)" },
  { id: "pessimistic", label: "Pessimistic", description: "Worst-case performance scenario (25th percentile)" },
];

const BENCHMARK_SOURCES = [
  { id: "industry", label: "Industry Benchmarks" },
  { id: "historical", label: "Historical Performance" },
  { id: "competitor", label: "Competitor Analysis" },
];

export function SimulationRequestForm({
  campaigns,
  externalDataSources,
  onSubmit,
  isSubmitting = false,
}: SimulationRequestFormProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [metricWeights, setMetricWeights] = useState<Record<string, number>>({});

  const form = useForm<SimulationRequestFormData>({
    resolver: zodResolver(simulationRequestSchema),
    defaultValues: {
      campaignId: "",
      timeframe: {
        granularity: "daily",
      },
      metrics: [],
      scenarios: ["realistic"],
      externalDataSources: [],
    },
  });

  // Update metrics array when selections change
  useEffect(() => {
    const metricsArray = selectedMetrics.map(metricType => ({
      type: metricType,
      weight: metricWeights[metricType] || 1 / selectedMetrics.length,
      benchmarkSource: "industry",
    }));
    form.setValue("metrics", metricsArray);
  }, [selectedMetrics, metricWeights, form]);

  const handleMetricToggle = (metricId: string) => {
    setSelectedMetrics(prev => {
      const newMetrics = prev.includes(metricId)
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId];
      
      // Redistribute weights evenly
      const evenWeight = 1 / newMetrics.length;
      const newWeights = { ...metricWeights };
      newMetrics.forEach(id => {
        if (!newWeights[id]) {
          newWeights[id] = evenWeight;
        }
      });
      
      // Remove weights for unselected metrics
      Object.keys(newWeights).forEach(id => {
        if (!newMetrics.includes(id)) {
          delete newWeights[id];
        }
      });
      
      setMetricWeights(newWeights);
      return newMetrics;
    });
  };

  const handleWeightChange = (metricId: string, weight: number) => {
    setMetricWeights(prev => ({
      ...prev,
      [metricId]: weight,
    }));
  };

  const normalizeWeights = () => {
    const totalWeight = Object.values(metricWeights).reduce((sum, weight) => sum + weight, 0);
    if (totalWeight > 0) {
      const normalizedWeights = { ...metricWeights };
      Object.keys(normalizedWeights).forEach(key => {
        normalizedWeights[key] = normalizedWeights[key] / totalWeight;
      });
      setMetricWeights(normalizedWeights);
    }
  };

  const handleSubmit = async (data: SimulationRequestFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error("Failed to submit simulation request:", error);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Create AI Simulation</CardTitle>
        <CardDescription>
          Generate predictive performance trajectories for your campaign using AI models
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Campaign Selection */}
            <FormField
              control={form.control}
              name="campaignId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a campaign to simulate" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign._id} value={campaign._id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{campaign.name}</span>
                            <div className="flex items-center gap-2 ml-2">
                              <Badge variant="outline" className="text-xs">
                                {campaign.category}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {campaign.status}
                              </Badge>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the campaign you want to generate performance predictions for
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Timeframe Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Simulation Timeframe</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="timeframe.startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timeframe.endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < form.getValues("timeframe.startDate") ||
                              date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timeframe.granularity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Granularity</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select granularity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How frequently to generate predictions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Metrics Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Metrics to Simulate</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {AVAILABLE_METRICS.map((metric) => (
                  <div key={metric.id} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={metric.id}
                        checked={selectedMetrics.includes(metric.id)}
                        onCheckedChange={() => handleMetricToggle(metric.id)}
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={metric.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {metric.label}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {metric.description}
                        </p>
                      </div>
                    </div>
                    {selectedMetrics.includes(metric.id) && (
                      <div className="ml-6 space-y-2">
                        <div className="flex items-center space-x-2">
                          <label className="text-xs text-muted-foreground">Weight:</label>
                          <Input
                            type="number"
                            min="0"
                            max="1"
                            step="0.1"
                            value={metricWeights[metric.id] || 0}
                            onChange={(e) => handleWeightChange(metric.id, parseFloat(e.target.value) || 0)}
                            onBlur={normalizeWeights}
                            className="w-20 h-6 text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {selectedMetrics.length === 0 && (
                <p className="text-sm text-destructive">Please select at least one metric</p>
              )}
            </div>

            <Separator />

            {/* Scenario Selection */}
            <FormField
              control={form.control}
              name="scenarios"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Scenarios to Generate</FormLabel>
                    <FormDescription>
                      Select which performance scenarios you want to simulate
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {AVAILABLE_SCENARIOS.map((scenario) => (
                      <FormField
                        key={scenario.id}
                        control={form.control}
                        name="scenarios"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={scenario.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(scenario.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, scenario.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== scenario.id
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="font-medium">
                                  {scenario.label}
                                </FormLabel>
                                <FormDescription className="text-xs">
                                  {scenario.description}
                                </FormDescription>
                              </div>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* External Data Sources */}
            <FormField
              control={form.control}
              name="externalDataSources"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">External Data Sources</FormLabel>
                    <FormDescription>
                      Include external market data to enhance prediction accuracy
                    </FormDescription>
                  </div>
                  {externalDataSources.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {externalDataSources.map((source) => (
                        <FormField
                          key={source._id}
                          control={form.control}
                          name="externalDataSources"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={source._id}
                                className="flex flex-row items-center justify-between rounded-lg border p-4"
                              >
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base capitalize">
                                    {source.source.replace('_', ' ')}
                                  </FormLabel>
                                  <FormDescription>
                                    Status: {source.status}
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(source._id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, source._id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== source._id
                                            )
                                          );
                                    }}
                                    disabled={source.status !== "active"}
                                  />
                                </FormControl>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <p>No external data sources configured</p>
                      <p className="text-sm">Configure data sources in settings to enhance predictions</p>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={isSubmitting}
              >
                Reset
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating Simulation..." : "Create Simulation"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}