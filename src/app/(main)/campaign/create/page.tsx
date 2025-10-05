"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { DraftManager } from "@/components/campaigns/draft-manager";
import { DraftExpirationAlert } from "@/components/campaigns/draft-expiration-alert";
import { CampaignWizard } from "@/components/campaigns/campaign-wizard";
import { CampaignImport } from "@/components/campaigns/import";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrganization } from "@/contexts/organization-context";
import { toast } from "sonner";

const CampaignCreation = () => {
  const searchParams = useSearchParams();
  const { currentOrganization, isLoading } = useOrganization();
  const [activeTab, setActiveTab] = useState("wizard");
  const [selectedDraftId, setSelectedDraftId] = useState<string | undefined>();

  // Check for URL params (draftId or OAuth callback)
  useEffect(() => {
    const draftId = searchParams.get("draftId");
    const platform = searchParams.get("platform");
    const code = searchParams.get("code");
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    console.log("[CampaignCreation] URL params detected:", {
      draftId,
      platform,
      hasCode: !!code,
      connected,
      error,
    });

    // If OAuth callback parameters are present, switch to import tab
    if (platform && (code || connected || error)) {
      console.log("[CampaignCreation] OAuth callback detected, switching to import tab");
      setActiveTab("import");
      
      // Show success message if platform was connected
      if (connected === "true") {
        toast.success("Platform connected successfully!", {
          description: `${platform.charAt(0).toUpperCase() + platform.slice(1)} account has been connected.`,
        });
      }
    } else if (draftId) {
      setSelectedDraftId(draftId);
      setActiveTab("wizard");
    }
  }, [searchParams]);

  // Show loading state while organization is loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error if no organization is selected
  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">
            No Organization Selected
          </h2>
          <p className="text-muted-foreground mb-4">
            Please select an organization to create campaigns.
          </p>
          <Button onClick={() => window.location.reload()}>Refresh Page</Button>
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
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Create New Campaign
              </h1>
              <p className="text-muted-foreground">
                Set up AI-powered campaign tracking and predictions
              </p>
            </div>

            {/* Draft expiration alerts */}
            <DraftExpirationAlert
              organizationId={currentOrganization._id}
              onSelectDraft={(draftId) => {
                setSelectedDraftId(draftId as string);
                setActiveTab("wizard");
              }}
              className="mb-6"
            />

            {/* Tabs for different creation modes */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="mb-8"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="wizard">Campaign Wizard</TabsTrigger>
                <TabsTrigger value="import">Import Campaign</TabsTrigger>
                <TabsTrigger value="drafts">Continue from Draft</TabsTrigger>
              </TabsList>

              <TabsContent value="wizard" className="mt-6">
                <CampaignWizard
                  mode="create"
                  draftId={selectedDraftId}
                  onComplete={(campaignId) => {
                    alert(`Campaign created successfully! ID: ${campaignId}`);
                    window.location.href = "/dashboard";
                  }}
                />
              </TabsContent>

              <TabsContent value="import" className="mt-6">
                <CampaignImport
                  organizationId={currentOrganization._id}
                  onComplete={(campaignIds) => {
                    toast.success(
                      `Successfully imported ${campaignIds.length} campaign${campaignIds.length !== 1 ? "s" : ""}!`
                    );
                    window.location.href = "/dashboard";
                  }}
                  onCancel={() => setActiveTab("wizard")}
                />
              </TabsContent>

              <TabsContent value="drafts" className="mt-6">
                <div className="grid lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2">
                    <DraftManager
                      organizationId={currentOrganization._id}
                      onSelectDraft={(draftId) => {
                        setSelectedDraftId(draftId as string);
                        setActiveTab("wizard");
                      }}
                      onCreateNew={() => {
                        setSelectedDraftId(undefined);
                        setActiveTab("wizard");
                      }}
                      maxDrafts={10}
                      showAdminControls={true} // Enable admin controls for cleanup
                    />
                  </div>
                  <div className="lg:col-span-1">
                    <Card className="glass">
                      <CardHeader>
                        <CardTitle className="text-foreground">
                          Draft Tips
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-sm text-muted-foreground">
                          <p className="mb-2">
                            💡 <strong>Auto-save:</strong> Your progress is
                            automatically saved every 30 seconds
                          </p>
                          <p className="mb-2">
                            ⏰ <strong>Expiration:</strong> Drafts expire after
                            30 days of inactivity
                          </p>
                          <p className="mb-2">
                            🔄 <strong>Continue:</strong> Click on any draft to
                            continue where you left off
                          </p>
                          <p>
                            🗑️ <strong>Cleanup:</strong> Delete old drafts to
                            keep your workspace organized
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignCreation;
