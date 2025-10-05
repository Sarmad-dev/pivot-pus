"use client";

import { useCallback, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
// import { toast } from "sonner"; // Removed unused import

export interface CampaignFormData {
  basics?: Record<string, unknown>;
  audienceChannels?: Record<string, unknown>;
  kpisMetrics?: Record<string, unknown>;
  teamAccess?: Record<string, unknown>;
}

export interface DraftMetadata {
  id: Id<"campaignDrafts">;
  name: string;
  step: number;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  completionPercentage: number;
}

interface UseCampaignDraftsOptions {
  organizationId?: Id<"organizations">;
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

export function useCampaignDrafts({
  organizationId,
  onError,
  onSuccess,
}: UseCampaignDraftsOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);

  // Check if a step is complete based on required fields
  const isStepComplete = useCallback(
    (step: string, data: Record<string, unknown>): boolean => {
      if (!data) return false;

      switch (step) {
        case "basics":
          return !!(
            data.name &&
            data.description &&
            data.startDate &&
            data.endDate &&
            data.budget
          );

        case "audienceChannels":
          return !!(
            Array.isArray(data.audiences) &&
            data.audiences.length > 0 &&
            Array.isArray(data.channels) &&
            data.channels.length > 0
          );

        case "kpisMetrics":
          return !!(
            Array.isArray(data.primaryKPIs) && data.primaryKPIs.length > 0
          );

        case "teamAccess":
          return !!(
            Array.isArray(data.teamMembers) && data.teamMembers.length > 0
          );

        default:
          return false;
      }
    },
    []
  );

  // Convex mutations and queries
  // Note: These will work once Convex is properly set up and running
  const saveDraftMutation = useMutation(
    api.campaigns.mutations.saveCampaignDraft
  );
  const deleteDraftMutation = useMutation(
    api.campaigns.mutations.deleteCampaignDraft
  );
  const cleanupExpiredDraftsMutation = useMutation(
    api.campaigns.cleanup.manualCleanupExpiredDrafts
  );
  // We'll remove this static query since it needs dynamic parameters
  const getUserDraftsQuery = useQuery(
    api.campaigns.queries.getCampaignDraftsByUser,
    organizationId ? { organizationId } : {}
  );

  // Calculate completion percentage based on form data
  const calculateCompletionPercentage = useCallback(
    (data: CampaignFormData): number => {
      let completedSteps = 0;
      const totalSteps = 4;

      // Check each step for completion
      if (data.basics && isStepComplete("basics", data.basics)) {
        completedSteps++;
      }
      if (
        data.audienceChannels &&
        isStepComplete("audienceChannels", data.audienceChannels)
      ) {
        completedSteps++;
      }
      if (data.kpisMetrics && isStepComplete("kpisMetrics", data.kpisMetrics)) {
        completedSteps++;
      }
      if (data.teamAccess && isStepComplete("teamAccess", data.teamAccess)) {
        completedSteps++;
      }

      return Math.round((completedSteps / totalSteps) * 100);
    },
    [isStepComplete]
  );

  // This function was moved above to fix dependency order

  // Save or update a draft
  // Helper function to convert dates to timestamps for storage
  const serializeDraftData = (data: CampaignFormData) => {
    const serialized = { ...data };
    
    if (serialized.basics) {
      serialized.basics = { ...serialized.basics };
      
      // Convert dates to timestamps
      if (serialized.basics.startDate) {
        serialized.basics.startDate = serialized.basics.startDate instanceof Date 
          ? serialized.basics.startDate.getTime()
          : typeof serialized.basics.startDate === 'string'
            ? new Date(serialized.basics.startDate).getTime()
            : serialized.basics.startDate;
      }
      
      if (serialized.basics.endDate) {
        serialized.basics.endDate = serialized.basics.endDate instanceof Date 
          ? serialized.basics.endDate.getTime()
          : typeof serialized.basics.endDate === 'string'
            ? new Date(serialized.basics.endDate).getTime()
            : serialized.basics.endDate;
      }
    }
    
    return serialized;
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

  const saveDraft = useCallback(
    async (
      data: CampaignFormData,
      step: number,
      name?: string,
      draftId?: Id<"campaignDrafts">
    ): Promise<Id<"campaignDrafts">> => {
      if (!organizationId) {
        throw new Error("Organization ID is required to save drafts");
      }

      try {
        setIsLoading(true);

        // Generate draft name if not provided
        const draftName =
          name || `Campaign Draft - ${new Date().toLocaleDateString()}`;

        // Serialize the data to convert dates to timestamps
        const serializedData = serializeDraftData(data);

        const result = await saveDraftMutation({
          name: draftName,
          data: serializedData,
          step,
          organizationId,
          draftId,
        });

        onSuccess?.("Draft saved successfully");
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to save draft";
        onError?.(errorMessage);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [organizationId, saveDraftMutation, onError, onSuccess]
  );

  // Load a specific draft
  // Note: This function is a placeholder. In a real implementation, you would:
  // 1. Create a separate hook that takes draftId as a parameter
  // 2. Use that hook in the component that needs to load a specific draft
  // 3. Or use Convex's client.query() method directly
  const loadDraft = useCallback(
    async (
      draftId: Id<"campaignDrafts">
    ): Promise<{ data: CampaignFormData; step: number } | null> => {
      try {
        setIsLoading(true);

        // This is a placeholder implementation
        // In practice, you'd use a separate query hook or client.query()
        console.log("Loading draft with ID:", draftId);
        
        // Return null for now - this needs to be implemented with proper Convex integration
        return null;

      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to load draft";
        onError?.(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [onError]
  );

  // Delete a draft
  const deleteDraft = useCallback(
    async (draftId: Id<"campaignDrafts">): Promise<void> => {
      try {
        setIsLoading(true);
        await deleteDraftMutation({ draftId });
        onSuccess?.("Draft deleted successfully");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to delete draft";
        onError?.(errorMessage);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [deleteDraftMutation, onError, onSuccess]
  );

  // Clean up expired drafts
  const cleanupExpiredDrafts = useCallback(
    async (): Promise<void> => {
      try {
        setIsLoading(true);
        const result = await cleanupExpiredDraftsMutation({});
        onSuccess?.(`Cleaned up ${result.deletedCount} expired drafts`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to cleanup expired drafts";
        onError?.(errorMessage);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [cleanupExpiredDraftsMutation, onError, onSuccess]
  );

  // Get all user drafts with metadata
  const getUserDrafts = useCallback((): DraftMetadata[] => {
    if (!getUserDraftsQuery) return [];

    return getUserDraftsQuery.map((draft: any) => ({
      id: draft._id,
      name: draft.name,
      step: draft.step,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      expiresAt: draft.expiresAt,
      completionPercentage: calculateCompletionPercentage(draft.data),
    }));
  }, [getUserDraftsQuery, calculateCompletionPercentage]);

  // Check if a draft is expired
  const isDraftExpired = useCallback((expiresAt: number): boolean => {
    return Date.now() > expiresAt;
  }, []);

  // Get time until draft expires
  const getTimeUntilExpiry = useCallback((expiresAt: number): string => {
    const now = Date.now();
    const timeLeft = expiresAt - now;

    if (timeLeft <= 0) return "Expired";

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""} left`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""} left`;
    } else {
      return "Less than 1 hour left";
    }
  }, []);

  // Auto-save wrapper for use with useAutoSave hook
  const createAutoSaveHandler = useCallback(
    (
      currentStep: number,
      draftName?: string,
      currentDraftId?: Id<"campaignDrafts">
    ) => {
      return async (formData: {
        data: CampaignFormData;
        step: number;
      }): Promise<string> => {
        const result = await saveDraft(
          formData.data,
          currentStep,
          draftName,
          currentDraftId
        );
        return result;
      };
    },
    [saveDraft]
  );

  return {
    // State
    isLoading,
    drafts: getUserDrafts(),

    // Actions
    saveDraft,
    loadDraft,
    deleteDraft,
    cleanupExpiredDrafts,
    createAutoSaveHandler,

    // Utilities
    calculateCompletionPercentage,
    isDraftExpired,
    getTimeUntilExpiry,
    isStepComplete,
  };
}
