"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Edit,
  Users,
  Target,
  DollarSign,
  Calendar,
  BarChart3,
  Settings,
  Brain,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { CampaignActionsMenu } from "@/components/campaigns/campaign-actions-menu";
import { CampaignOverview } from "@/components/campaigns/campaign-overview";
import { CampaignTeamManagement } from "@/components/campaigns/campaign-team-management";
import { CampaignMetrics } from "@/components/campaigns/campaign-metrics";
import { CampaignSettings } from "@/components/campaigns/campaign-settings";
import { SimulationTrigger } from "@/components/simulations/SimulationTrigger";
import { SimulationHistory } from "@/components/simulations/SimulationHistory";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { CampaignStatus } from "@/types/campaign";
import { Id } from "../../../../../convex/_generated/dataModel";

const CampaignDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as Id<"campaigns">;
  const [activeTab, setActiveTab] = useState("overview");

  // Check for simulation tab in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get("tab");
    if (tab === "simulations") {
      setActiveTab("simulations");
    }
  }, []);

  // Fetch campaign data
  const campaign = useQuery(api.campaigns.queries.getCampaignById, {
    campaignId: campaignId as Id<"campaigns">,
  });

  const campaignPermissions = useQuery(
    api.campaigns.queries.getUserCampaignPermissions,
    campaignId ? { campaignId } : "skip"
  );

  // Mutations
  const updateCampaignStatus = useMutation(
    api.campaigns.mutations.updateCampaignStatus
  );
  const deleteCampaign = useMutation(api.campaigns.mutations.deleteCampaign);

  const handleStatusChange = async (
    campaignId: Id<"campaigns">,
    newStatus: CampaignStatus
  ) => {
    try {
      await updateCampaignStatus({ campaignId, status: newStatus });
      toast.success("Campaign status updated successfully");
    } catch (error) {
      toast.error("Failed to update campaign status");
      console.error("Error updating campaign status:", error);
    }
  };

  const handleDeleteCampaign = async (
    campaignId: Id<"campaigns">,
    campaignName: string
  ) => {
    if (
      !confirm(
        `Are you sure you want to delete "${campaignName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await deleteCampaign({ campaignId });
      toast.success("Campaign deleted successfully");
      router.push("/campaigns");
    } catch (error) {
      toast.error("Failed to delete campaign");
      console.error("Error deleting campaign:", error);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
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
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Link href="/campaigns">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Campaigns
                  </Button>
                </Link>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-foreground">
                      {campaign.name}
                    </h1>
                    <CampaignStatusBadge status={campaign.status} />
                    <Badge variant="outline" className="capitalize">
                      {campaign.category}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {campaign.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SimulationTrigger
                  campaign={campaign}
                  showQuickActions={true}
                />
                {campaignPermissions?.canEdit && (
                  <Link href={`/campaigns/${campaignId}/edit`}>
                    <Button variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Campaign
                    </Button>
                  </Link>
                )}
                <CampaignActionsMenu
                  campaign={campaign}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDeleteCampaign}
                  permissions={campaignPermissions}
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Budget</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(campaign.budget, campaign.currency)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="text-2xl font-bold">
                        {Math.ceil(
                          (campaign.endDate - campaign.startDate) /
                            (1000 * 60 * 60 * 24)
                        )}{" "}
                        days
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Users className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Team Members
                      </p>
                      <p className="text-2xl font-bold">
                        {campaign.teamMembers.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Target className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">KPIs</p>
                      <p className="text-2xl font-bold">
                        {campaign.kpis.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Campaign Details Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger
                  value="overview"
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="simulations"
                  className="flex items-center gap-2"
                >
                  <Brain className="h-4 w-4" />
                  AI Simulations
                </TabsTrigger>
                <TabsTrigger value="team" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team & Access
                </TabsTrigger>
                <TabsTrigger
                  value="metrics"
                  className="flex items-center gap-2"
                >
                  <Target className="h-4 w-4" />
                  Metrics & KPIs
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <CampaignOverview campaign={campaign} />
              </TabsContent>

              <TabsContent value="simulations" className="mt-6">
                <SimulationHistory
                  campaignId={campaign._id}
                  showHeader={true}
                />
              </TabsContent>

              <TabsContent value="team" className="mt-6">
                <CampaignTeamManagement
                  campaign={campaign}
                  permissions={campaignPermissions}
                />
              </TabsContent>

              <TabsContent value="metrics" className="mt-6">
                <CampaignMetrics campaign={campaign} />
              </TabsContent>

              <TabsContent value="settings" className="mt-6">
                <CampaignSettings
                  campaign={campaign}
                  permissions={campaignPermissions}
                />
              </TabsContent>
            </Tabs>

            {/* Campaign Metadata */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Campaign Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Timeline</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Start Date:
                        </span>
                        <span>
                          {new Date(campaign.startDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">End Date:</span>
                        <span>
                          {new Date(campaign.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created:</span>
                        <span>
                          {formatDistanceToNow(new Date(campaign.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Last Updated:
                        </span>
                        <span>
                          {formatDistanceToNow(new Date(campaign.updatedAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Campaign Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Priority:</span>
                        <Badge variant="outline" className="capitalize">
                          {campaign.priority}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Channels:</span>
                        <span>
                          {
                            campaign.channels.filter((c: any) => c.enabled)
                              .length
                          }{" "}
                          active
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Audiences:
                        </span>
                        <span>{campaign.audiences.length} segments</span>
                      </div>
                      {campaign.importSource && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Imported from:
                          </span>
                          <Badge variant="secondary" className="capitalize">
                            {campaign.importSource.platform}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetailPage;
