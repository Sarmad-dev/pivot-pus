"use client";

import React, { useState } from "react";
import {
  SimulationRequestForm,
  SimulationResults,
  SimulationStatus,
} from "./index";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock data for demonstration
const mockCampaigns = [
  {
    _id: "campaign1" as any,
    name: "Summer Product Launch",
    status: "active",
    category: "pr",
    budget: 50000,
    currency: "USD",
  },
  {
    _id: "campaign2" as any,
    name: "Brand Awareness Q4",
    status: "draft",
    category: "social",
    budget: 25000,
    currency: "USD",
  },
];

const mockExternalDataSources = [
  {
    _id: "source1" as any,
    source: "semrush",
    status: "active",
  },
  {
    _id: "source2" as any,
    source: "google_trends",
    status: "active",
  },
];

const mockSimulationResult = {
  _id: "sim123" as any,
  campaignId: "campaign1" as any,
  status: "completed" as const,
  results: {
    trajectories: [
      {
        date: Date.now(),
        metrics: { ctr: 2.5, impressions: 10000, engagement: 3.2 },
        confidence: 0.85,
      },
      {
        date: Date.now() + 86400000,
        metrics: { ctr: 2.8, impressions: 12000, engagement: 3.5 },
        confidence: 0.82,
      },
      {
        date: Date.now() + 172800000,
        metrics: { ctr: 3.1, impressions: 15000, engagement: 3.8 },
        confidence: 0.79,
      },
    ],
    scenarios: [
      {
        type: "optimistic",
        probability: 0.25,
        trajectory: [
          { date: Date.now(), metrics: { ctr: 3.5, impressions: 15000 } },
          {
            date: Date.now() + 86400000,
            metrics: { ctr: 3.8, impressions: 18000 },
          },
        ],
      },
      {
        type: "realistic",
        probability: 0.5,
        trajectory: [
          { date: Date.now(), metrics: { ctr: 2.5, impressions: 10000 } },
          {
            date: Date.now() + 86400000,
            metrics: { ctr: 2.8, impressions: 12000 },
          },
        ],
      },
      {
        type: "pessimistic",
        probability: 0.25,
        trajectory: [
          { date: Date.now(), metrics: { ctr: 1.8, impressions: 8000 } },
          {
            date: Date.now() + 86400000,
            metrics: { ctr: 2.0, impressions: 9000 },
          },
        ],
      },
    ],
    risks: [
      {
        type: "audience_fatigue",
        severity: "medium" as const,
        probability: 0.3,
        description:
          "Engagement may decline after day 14 due to audience fatigue",
        timeframe: {
          start: Date.now() + 1209600000, // 14 days
          end: Date.now() + 2592000000, // 30 days
        },
      },
    ],
    recommendations: [
      {
        id: "rec1",
        type: "creative_refresh",
        priority: 8,
        impact_estimate: {
          metric: "engagement",
          improvement: 0.15,
          confidence: 0.75,
        },
        implementation: {
          description: "Refresh creative assets to combat audience fatigue",
          steps: [
            "Analyze current creative performance",
            "Develop 3 new creative variants",
            "A/B test new creatives against current ones",
            "Roll out best performing creative",
          ],
          effort: "medium" as const,
          timeline: "1-2 weeks",
        },
      },
    ],
  },
  modelMetadata: {
    primaryModel: "GPT-4o + Prophet",
    processingTime: 45000,
    dataQuality: {
      completeness: 0.92,
      accuracy: 0.88,
      freshness: 0.95,
    },
  },
  createdAt: Date.now() - 3600000, // 1 hour ago
  completedAt: Date.now() - 3000000, // 50 minutes ago
};

export function SimulationDemo() {
  const [activeTab, setActiveTab] = useState("form");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSimulationSubmit = async (data: any) => {
    setIsSubmitting(true);
    console.log("Simulation request:", data);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setIsSubmitting(false);
    setActiveTab("status");
  };

  const handleRecommendationAction = (
    recommendationId: string,
    action: string
  ) => {
    console.log(`Action ${action} for recommendation ${recommendationId}`);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">AI Simulation Components Demo</h1>
        <p className="text-muted-foreground">
          Interactive demonstration of the AI trajectory simulation UI
          components
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="form">Request Form</TabsTrigger>
          <TabsTrigger value="status">Status Tracking</TabsTrigger>
          <TabsTrigger value="results">Results Display</TabsTrigger>
        </TabsList>

        <TabsContent value="form" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Simulation Request Form</CardTitle>
              <CardDescription>
                Create a new AI simulation for campaign performance prediction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SimulationRequestForm
                campaigns={mockCampaigns}
                externalDataSources={mockExternalDataSources}
                onSubmit={handleSimulationSubmit}
                isSubmitting={isSubmitting}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Simulation Status Tracking</CardTitle>
              <CardDescription>
                Real-time status updates and progress tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Compact Status View</h3>
                <SimulationStatus
                  simulationId={"sim123" as any}
                  compact={true}
                  onRetry={() => console.log("Retry simulation")}
                  onCancel={() => console.log("Cancel simulation")}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Detailed Status View</h3>
                <SimulationStatus
                  simulationId={"sim123" as any}
                  showDetails={true}
                  onRetry={() => console.log("Retry simulation")}
                  onCancel={() => console.log("Cancel simulation")}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Simulation Results</CardTitle>
              <CardDescription>
                Comprehensive visualization of AI predictions and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SimulationResults
                simulation={mockSimulationResult}
                onRecommendationAction={handleRecommendationAction}
                onRetrySimulation={() => console.log("Retry simulation")}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
