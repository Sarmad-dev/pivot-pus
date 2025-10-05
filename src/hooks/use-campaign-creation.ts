"use client";

import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface CampaignCreationOptions {
  onSuccess?: (campaignId: Id<"campaigns">) => void;
  onError?: (error: string) => void;
}

export function useCampaignCreation(options: CampaignCreationOptions = {}) {
  const createCampaignMutation = useMutation(api.campaigns.mutations.createCampaignFromWizard);

  const createCampaign = async (
    campaignData: any,
    organizationId: Id<"organizations">
  ): Promise<Id<"campaigns">> => {
    try {
      const campaignId = await createCampaignMutation({
        campaignData,
        organizationId,
      });

      options.onSuccess?.(campaignId);
      return campaignId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create campaign";
      options.onError?.(errorMessage);
      throw error;
    }
  };

  return {
    createCampaign,
  };
}