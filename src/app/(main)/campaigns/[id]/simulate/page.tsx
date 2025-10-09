"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Brain } from "lucide-react";
import Link from "next/link";
import { SimulationRequestForm } from "@/components/simulations/SimulationRequestForm";
import { toast } from "sonner";
import { Id } from "../../../../../../convex/_generated/dataModel";

const CampaignSimulatePage = () => {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as Id<"campaigns">;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch campaign data
  const campaign = useQuery(
    api.campaigns.queries.getCampaignById,
    { campaignId }
  );

  // Fetch external data sources
  const externalDataSources = useQuery(
    api.externalDataSources.listDataSources,
    campaign ? { organizationId: campaign.organizationId } : "skip"
  );

  // Create simulation mutation
  const createSimulation = useMutation(api.simulations.createSimulation);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const simulationId = await createSimulation({
        campaignId,
        config: {
          timeframe: {
            startDate: data.timeframe.startDate.getTime(),
            endDate: data.timeframe.endDate.getTime(),
            granularity: data.timeframe.granularity,
          },
          metrics: data.metrics,
          scenarios: data.scenarios,
          externalDataSources: data.externalDataSources,
        },
      });

      toast.success("Simulation created successfully");
      router.push(`/campaigns/${campaignId}?tab=simulations&simulation=${simulationId}`);
    } catch (error) {
      toast.error("Failed to create simulation");
      console.error("Simulation creation error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!campaign) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading campaign...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Link href={`/campaigns/${campaignId}`}>
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Campaign
                  </Button>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">
                    AI Simulation
                  </h1>
                  <p className="text-muted-foreground">
                    Generate predictive performance trajectories for {campaign.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="h-8 w-8 text-primary" />
              </div>
            </div>

            {/* Campaign Info Card */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Campaign Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Campaign Name</p>
                    <p className="font-medium">{campaign.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Budget</p>
                    <p className="font-medium">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: campaign.currency || "USD",
                      }).format(campaign.budget)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium capitalize">{campaign.status}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Simulation Form */}
            <SimulationRequestForm
              campaigns={[campaign]}
              externalDataSources={externalDataSources || []}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignSimulatePage;