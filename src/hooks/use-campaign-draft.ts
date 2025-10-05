"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import type { CampaignFormData } from "./use-campaign-drafts";

interface UseCampaignDraftOptions {
  draftId?: Id<"campaignDrafts">;
}

/**
 * Hook for loading a specific campaign draft by ID
 * Use this when you need to load a specific draft (e.g., when continuing from a saved draft)
 */
export function useCampaignDraft({ draftId }: UseCampaignDraftOptions) {
  // Query the specific draft, or skip if no draftId provided
  const draft = useQuery(
    api.campaigns.queries.getCampaignDraftById,
    draftId ? { draftId } : "skip"
  );

  // Check if draft is expired
  const isDraftExpired = (expiresAt: number): boolean => {
    return Date.now() > expiresAt;
  };

  // Helper function to convert timestamps back to dates when loading
  const deserializeDraftData = (data: any): CampaignFormData => {
    const deserialized = { ...data };
    
    if (deserialized.basics) {
      deserialized.basics = { ...deserialized.basics };
      
      // Convert timestamps back to dates
      if (deserialized.basics.startDate && typeof deserialized.basics.startDate === 'number') {
        deserialized.basics.startDate = new Date(deserialized.basics.startDate);
      }
      
      if (deserialized.basics.endDate && typeof deserialized.basics.endDate === 'number') {
        deserialized.basics.endDate = new Date(deserialized.basics.endDate);
      }
    }
    
    return deserialized;
  };

  // Transform the draft data for easier consumption
  const draftData = draft ? {
    id: draft._id,
    name: draft.name,
    step: draft.step,
    data: deserializeDraftData(draft.data) as CampaignFormData,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
    expiresAt: draft.expiresAt,
    isExpired: isDraftExpired(draft.expiresAt),
  } : null;

  return {
    draft: draftData,
    isLoading: draft === undefined && draftId !== undefined,
    error: draft === null && draftId !== undefined ? "Draft not found or expired" : null,
  };
}

/**
 * Example usage:
 * 
 * ```tsx
 * function CampaignWizard({ draftId }: { draftId?: string }) {
 *   const { draft, isLoading, error } = useCampaignDraft({ draftId });
 *   
 *   useEffect(() => {
 *     if (draft && !draft.isExpired) {
 *       // Load the draft data into your form
 *       form.reset(draft.data);
 *       setCurrentStep(draft.step);
 *     }
 *   }, [draft]);
 *   
 *   // ... rest of component
 * }
 * ```
 */