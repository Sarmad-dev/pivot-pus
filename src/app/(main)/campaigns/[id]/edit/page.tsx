"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CampaignWizard } from "@/components/campaigns/campaign-wizard";
import { toast } from "sonner";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { api } from "../../../../../../convex/_generated/api";

const CampaignEditPage = () => {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as Id<"campaigns">;

  // Fetch campaign data
  const campaign = useQuery(
    api.campaigns.queries.getCampaignById,
    campaignId ? { campaignId } : "skip"
  );

  const campaignPermissions = useQuery(
    api.campaigns.queries.getUserCampaignPermissions,
    campaignId ? { campaignId } : "skip"
  );

  // Check permissions
  useEffect(() => {
    if (campaignPermissions && !campaignPermissions.canEdit) {
      toast.error("You don't have permission to edit this campaign");
      router.push(`/campaigns/${campaignId}`);
    }
  }, [campaignPermissions, campaignId, router]);

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

  if (campaignPermissions && !campaignPermissions.canEdit) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            You don't have permission to edit this campaign.
          </p>
          <Link href={`/campaigns/${campaignId}`}>
            <Button>Back to Campaign</Button>
          </Link>
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
            <div className="flex items-center gap-4 mb-8">
              <Link href={`/campaigns/${campaignId}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Campaign
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Edit Campaign: {campaign.name}
                </h1>
                <p className="text-muted-foreground">
                  Update campaign settings and configuration
                </p>
              </div>
            </div>

            {/* Campaign Wizard in Edit Mode */}
            <CampaignWizard
              mode="edit"
              initialData={{
                basics: {
                  name: campaign.name,
                  description: campaign.description,
                  startDate: new Date(campaign.startDate),
                  endDate: new Date(campaign.endDate),
                  budget: campaign.budget,
                  currency: campaign.currency as any, // Type assertion for currency
                  category: campaign.category,
                  priority: campaign.priority,
                },
                audienceChannels: {
                  audiences: campaign.audiences.map((audience) => ({
                    ...audience,
                    demographics: {
                      ...audience.demographics,
                      ageRange:
                        audience.demographics.ageRange.length >= 2
                          ? ([
                              audience.demographics.ageRange[0],
                              audience.demographics.ageRange[1],
                            ] as [number, number])
                          : ([18, 65] as [number, number]), // Default age range
                      gender: audience.demographics.gender as any, // Type assertion for gender
                    },
                  })),
                  channels: campaign.channels.map((channel) => ({
                    ...channel,
                    type: channel.type as any, // Type assertion for channel type
                  })),
                  budgetAllocation: campaign.budgetAllocation.channels,
                },
                kpisMetrics: {
                  primaryKPIs: campaign.kpis.map((kpi) => ({
                    ...kpi,
                    type: kpi.type as any, // Type assertion for KPI type
                    timeframe: kpi.timeframe as any, // Type assertion for timeframe
                  })),
                  customMetrics: campaign.customMetrics,
                },
                teamAccess: {
                  teamMembers: campaign.teamMembers.map((member) => ({
                    userId: member.userId.toString(),
                    role: member.role,
                    notifications: member.notifications ?? true,
                    assignedAt: member.assignedAt,
                  })),
                  clients: campaign.clients.map((client) => ({
                    userId: client.userId.toString(),
                    assignedAt: client.assignedAt,
                  })),
                },
              }}
              onComplete={(updatedCampaignId) => {
                toast.success("Campaign updated successfully!");
                router.push(`/campaigns/${updatedCampaignId}`);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignEditPage;
