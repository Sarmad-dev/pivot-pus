"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, Save, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useCampaignDrafts } from "@/hooks/use-campaign-drafts";
import { useCampaignDraft } from "@/hooks/use-campaign-draft";
import { useCampaignCreation } from "@/hooks/use-campaign-creation";
import { useOrganization } from "@/contexts/organization-context";
import { SaveStatusIndicator } from "./save-status-indicator";
import {
  campaignStep1Schema,
  campaignStep2Schema,
  campaignStep3Schema,
  campaignStep4Schema,
  completeCampaignSchema,
  validateCampaignStep,
  type CampaignBasics,
  type AudienceChannels,
  type KPIsMetrics,
  type TeamAccess,
} from "@/lib/validations/campaign";
import { CampaignBasicsStep } from "./steps/campaign-basics-step";
import { AudienceChannelsStep } from "./steps/audience-channels-step";
import { KPIsStep } from "./steps/kpis-step";
import { TeamAccessStep } from "./steps/team-access-step";
import { CampaignPreview } from "./campaign-preview";
import { toast } from "sonner";

// Auto-save timing configuration
const AUTO_SAVE_CONFIG = {
  INITIAL_DELAY: 30000, // 30 seconds for first save
  SUBSEQUENT_DELAY: 180000, // 3 minutes between subsequent saves
  NOTIFICATION_DURATION: 2000, // 2 seconds for auto-save notifications
} as const;

// Wizard step configuration
const WIZARD_STEPS = [
  {
    id: 1,
    title: "Campaign Basics",
    description: "Set up campaign name, dates, and budget",
    schema: campaignStep1Schema,
  },
  {
    id: 2,
    title: "Audience & Channels",
    description: "Define target audience and marketing channels",
    schema: campaignStep2Schema,
  },
  {
    id: 3,
    title: "KPIs & Metrics",
    description: "Set success metrics and tracking goals",
    schema: campaignStep3Schema,
  },
  {
    id: 4,
    title: "Team & Access",
    description: "Assign team members and set permissions",
    schema: campaignStep4Schema,
  },
  {
    id: 5,
    title: "Preview & Create",
    description: "Review your campaign and create it",
    schema: null, // No schema validation for preview step
  },
] as const;

// Combined form data type
type CampaignFormData = {
  basics?: CampaignBasics;
  audienceChannels?: AudienceChannels;
  kpisMetrics?: KPIsMetrics;
  teamAccess?: TeamAccess;
};

interface CampaignWizardProps {
  mode?: "create" | "import" | "edit";
  draftId?: string;
  initialData?: Partial<CampaignFormData>;
  onComplete?: (campaignId: string) => void;
  onSaveDraft?: (data: CampaignFormData, step: number) => Promise<string>;
  onLoadDraft?: (
    draftId: string
  ) => Promise<{ data: CampaignFormData; step: number }>;
  className?: string;
}

export function CampaignWizard({
  mode = "create",
  draftId,
  initialData,
  onComplete,
  onSaveDraft,
  onLoadDraft,
  className,
}: CampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Get organization context
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const organizationId = currentOrganization?._id;

  // Form setup with default values
  const form = useForm<CampaignFormData>({
    defaultValues: {
      basics: {
        name: "",
        description: "",
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        budget: 0,
        currency: "USD",
        category: "mixed",
        priority: "medium",
        ...initialData?.basics,
      },
      audienceChannels: {
        audiences: [],
        channels: [],
        budgetAllocation: {},
        ...initialData?.audienceChannels,
      },
      kpisMetrics: {
        primaryKPIs: [],
        customMetrics: [],
        trackingSettings: {
          enableAnalytics: true,
          reportingFrequency: "weekly",
          autoReporting: false,
        },
        ...initialData?.kpisMetrics,
      },
      teamAccess: {
        teamMembers: [],
        clients: [],
        permissions: {
          allowClientEdit: false,
          requireApproval: false,
        },
        ...initialData?.teamAccess,
      },
    },
    mode: "onChange",
  });

  const { watch, getValues } = form;
  const watchedData = watch();

  // Draft management hooks (must be declared before useAutoSave)
  const { createAutoSaveHandler } = useCampaignDrafts({
    organizationId: organizationId as any, // Use organizationId from props
    onError: (error) => toast.error("Draft Error", { description: error }),
    onSuccess: (message) => toast.success(message),
  });

  // Load specific draft if draftId is provided
  const { draft: loadedDraft, isLoading: isDraftLoading } = useCampaignDraft({
    draftId: draftId as any, // Convert string to Id type if needed
  });

  // Campaign creation hook
  const { createCampaign } = useCampaignCreation({
    onSuccess: (campaignId) => {
      toast.success("Campaign created", {
        description: "Your campaign has been created successfully!",
      });
      onComplete?.(campaignId);
    },
    onError: (error) => {
      toast.error("Creation failed", {
        description: error,
      });
    },
  });

  // State for tracking optimized auto-save behavior
  const [hasInitialSave, setHasInitialSave] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number>(0);
  const [lastSavedData, setLastSavedData] = useState<string>("");
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Helper function to check if data has meaningfully changed
  const hasMeaningfulData = useCallback((data: any) => {
    try {
      if (!data || typeof data !== "object") {
        return false;
      }

      return (
        (data.basics?.name &&
          typeof data.basics.name === "string" &&
          data.basics.name.trim().length > 0) ||
        (Array.isArray(data.audienceChannels?.audiences) &&
          data.audienceChannels.audiences.length > 0) ||
        (Array.isArray(data.kpisMetrics?.primaryKPIs) &&
          data.kpisMetrics.primaryKPIs.length > 0) ||
        (Array.isArray(data.teamAccess?.teamMembers) &&
          data.teamAccess.teamMembers.length > 0)
      );
    } catch (error) {
      console.warn("Error checking meaningful data:", error);
      return false;
    }
  }, []);

  // Helper function to check if data has significantly changed
  const hasDataChanged = useCallback(
    (newData: any) => {
      try {
        if (!newData) {
          return false;
        }

        const newDataString = JSON.stringify(newData);
        const hasChanged = newDataString !== lastSavedData;
        return hasChanged;
      } catch (error) {
        console.warn("Error checking data changes:", error);
        // If we can't serialize the data, assume it has changed to be safe
        return true;
      }
    },
    [lastSavedData]
  );

  // Helper function to merge draft data with default values
  const mergeWithDefaults = useCallback((draftData: any): CampaignFormData => {
    return {
      basics: {
        name: "",
        description: "",
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        budget: 0,
        currency: "USD",
        category: "mixed",
        priority: "medium",
        ...draftData.basics,
      },
      audienceChannels: {
        audiences: [],
        channels: [],
        budgetAllocation: {},
        ...draftData.audienceChannels,
      },
      kpisMetrics: {
        primaryKPIs: [],
        customMetrics: [],
        trackingSettings: {
          enableAnalytics: true,
          reportingFrequency: "weekly",
          autoReporting: false,
        },
        ...draftData.kpisMetrics,
      },
      teamAccess: {
        teamMembers: [],
        clients: [],
        permissions: {
          allowClientEdit: false,
          requireApproval: false,
        },
        ...draftData.teamAccess,
      },
    };
  }, []);

  // Track user interaction to prevent auto-save on initial page load
  // Since auto-save is disabled, we don't need to track this aggressively
  const handleUserInteraction = useCallback(() => {
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
    }
  }, [hasUserInteracted]);

  // Create a stable data object for auto-save (since auto-save is disabled, this won't be used)
  const autoSaveData = useMemo(
    () => ({
      data: {}, // Empty object since auto-save is disabled
      step: currentStep,
    }),
    [currentStep]
  );

  // Optimized auto-save functionality with smart timing
  const autoSaveStatus = useAutoSave({
    data: autoSaveData,
    onSave: async ({ data, step }) => {
      // Auto-save is temporarily disabled to prevent infinite loops
      throw new Error("Auto-save temporarily disabled");
    },
    enabled: false, // Temporarily disable auto-save to fix infinite loop
    delay: AUTO_SAVE_CONFIG.INITIAL_DELAY, // Use configured delay
    onError: (error) => {
      // Only show error toast for meaningful errors (not empty data or rate limiting)
      if (
        !error.includes("No meaningful data") &&
        !error.includes("Cannot auto-save on preview step") &&
        !error.includes("Auto-save rate limited") &&
        !error.includes("No changes detected")
      ) {
        toast.error("Auto-save failed", {
          description: error,
        });
      }
    },
    onSuccess: (draftId) => {
      // Show feedback based on save type
      if (draftId) {
        if (!hasInitialSave) {
          console.log("Initial draft saved successfully", draftId);
          toast.success("Draft saved", {
            description:
              "Your progress is now being auto-saved. Changes will be saved every 3 minutes.",
          });
        } else {
          console.log("Draft auto-saved successfully", draftId);
          // Show subtle indicator for subsequent saves
          toast.success("Progress saved", {
            description: "Your changes have been automatically saved.",
            duration: AUTO_SAVE_CONFIG.NOTIFICATION_DURATION,
          });
        }
      }
    },
  });

  // Load draft data on mount
  useEffect(() => {
    if (loadedDraft && !loadedDraft.isExpired) {
      try {
        const mergedData = mergeWithDefaults(loadedDraft.data);
        form.reset(mergedData);
        setCurrentStep(loadedDraft.step);

        // Mark completed steps based on loaded data
        const completed = new Set<number>();
        if (loadedDraft.data.basics) completed.add(1);
        if (loadedDraft.data.audienceChannels) completed.add(2);
        if (loadedDraft.data.kpisMetrics) completed.add(3);
        if (loadedDraft.data.teamAccess) completed.add(4);
        setCompletedSteps(completed);

        toast.success("Draft loaded", {
          description: "Your saved progress has been restored.",
        });

        // Mark as user interacted since we loaded a draft
        setHasUserInteracted(true);
      } catch {
        toast.error("Error loading draft", {
          description: "Failed to load saved progress. Starting fresh.",
        });
      }
    }
  }, [form]);

  // Legacy draft loading (kept for backward compatibility)
  useEffect(() => {
    const loadDraftData = async () => {
      if (draftId && onLoadDraft && !loadedDraft) {
        try {
          setIsLoading(true);
          const { data, step } = await onLoadDraft(draftId);
          const mergedData = mergeWithDefaults(data);
          form.reset(mergedData);
          setCurrentStep(step);

          // Mark completed steps based on loaded data
          const completed = new Set<number>();
          if (data.basics) completed.add(1);
          if (data.audienceChannels) completed.add(2);
          if (data.kpisMetrics) completed.add(3);
          if (data.teamAccess) completed.add(4);
          setCompletedSteps(completed);

          toast.success("Draft loaded", {
            description: "Your saved progress has been restored.",
          });

          // Mark as user interacted since we loaded a draft
          setHasUserInteracted(true);
        } catch {
          toast.error("Error loading draft", {
            description: "Failed to load saved progress. Starting fresh.",
          });
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadDraftData();
  }, [draftId, onLoadDraft, form, loadedDraft]);

  // Validate current step
  const validateCurrentStep = async (): Promise<boolean> => {
    const stepData = getCurrentStepData();
    if (!stepData) return false;

    const validation = validateCampaignStep(currentStep, stepData);

    if (!validation.success) {
      // Set form errors
      validation.error.issues.forEach((issue) => {
        const fieldPath = issue.path.join(".");
        form.setError(fieldPath as keyof CampaignFormData, {
          type: "manual",
          message: issue.message,
        });
      });
      return false;
    }

    return true;
  };

  // Get current step data
  const getCurrentStepData = () => {
    const data = getValues();
    switch (currentStep) {
      case 1:
        return data.basics;
      case 2:
        return data.audienceChannels;
      case 3:
        return data.kpisMetrics;
      case 4:
        return data.teamAccess;
      default:
        return null;
    }
  };

  // Navigation handlers
  const handleNext = async () => {
    // Skip validation for preview step (step 5)
    if (currentStep < 5) {
      const isValid = await validateCurrentStep();
      if (!isValid) {
        toast.error("Validation Error", {
          description: "Please fix the errors before proceeding.",
        });
        return;
      }
    }

    // Mark current step as completed
    setCompletedSteps((prev) => new Set([...prev, currentStep]));

    if (currentStep < WIZARD_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (step: number) => {
    // Allow navigation to any step that's completed or the next step
    // Also allow navigation to preview step (5) if all previous steps are completed
    if (
      completedSteps.has(step) ||
      step === Math.min(...Array.from(completedSteps)) + 1 ||
      step === 1 ||
      (step === 5 && completedSteps.has(4))
    ) {
      setCurrentStep(step);
    }
  };

  // Manual save function
  const handleManualSave = useCallback(async () => {
    if (!organizationId || !createAutoSaveHandler) {
      toast.error("Save failed", {
        description: "Unable to save - missing organization or save handler.",
      });
      return;
    }

    try {
      const currentData = getValues();

      // Check if we have meaningful data to save
      if (!hasMeaningfulData(currentData)) {
        toast.error("Nothing to save", {
          description: "Please enter some campaign information before saving.",
        });
        return;
      }

      const draftName = currentData.basics?.name
        ? `${currentData.basics.name} - Draft`
        : "Campaign Draft";

      const handler = createAutoSaveHandler(
        currentStep,
        draftName,
        undefined // No existing draft ID for manual saves
      );

      await handler({ data: currentData, step: currentStep });

      toast.success("Draft saved", {
        description: "Your progress has been saved successfully.",
      });
    } catch (error) {
      toast.error("Save failed", {
        description:
          error instanceof Error ? error.message : "Failed to save draft.",
      });
    }
  }, [
    organizationId,
    createAutoSaveHandler,
    getValues,
    hasMeaningfulData,
    currentStep,
  ]);

  // Complete campaign creation
  const handleComplete = async () => {
    if (!organizationId) {
      toast.error("Error", {
        description: "Organization ID is required to create a campaign.",
      });
      return;
    }

    try {
      setIsLoading(true);
      const formData = getValues();

      // Validate complete campaign data
      const validation = completeCampaignSchema.safeParse(formData);
      if (!validation.success) {
        toast.error("Validation Error", {
          description:
            "Please fix all validation issues before creating the campaign.",
        });
        return;
      }

      // Prepare data for Convex by converting dates to timestamps
      const campaignDataForConvex = {
        ...validation.data,
        basics: {
          ...validation.data.basics,
          startDate: validation.data.basics.startDate.getTime(),
          endDate: validation.data.basics.endDate.getTime(),
        },
      };

      // Create the campaign using the Convex mutation
      await createCampaign(campaignDataForConvex, organizationId as any);
    } catch (error) {
      // Error handling is done in the hook
      console.error("Campaign creation error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate progress
  const progress = (completedSteps.size / WIZARD_STEPS.length) * 100;

  if (isLoading || isDraftLoading || orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading campaign wizard...</p>
        </div>
      </div>
    );
  }

  // Show error if no organization is available
  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-yellow-500" />
          <p className="text-muted-foreground">No organization selected.</p>
          <p className="text-sm text-muted-foreground">Please select an organization to create a campaign.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("max-w-4xl mx-auto space-y-6", className)}>
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {mode === "create"
                ? "Create Campaign"
                : mode === "edit"
                  ? "Edit Campaign"
                  : "Import Campaign"}
            </h1>
            <p className="text-muted-foreground">
              {WIZARD_STEPS[currentStep - 1]?.description}
            </p>
          </div>

          {/* Save status */}
          <SaveStatusIndicator
            autoSaveStatus={autoSaveStatus}
            onManualSave={handleManualSave}
            onClearError={autoSaveStatus.clearError}
            showSaveCount={true}
          />
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Step navigation */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Steps</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await autoSaveStatus.save();
                  toast.success("Draft saved", {
                    description: "Your progress has been saved successfully.",
                  });
                } catch (error) {
                  // Error handling is already done in the auto-save hook
                }
              }}
              disabled={
                autoSaveStatus.isSaving || currentStep === 5 || !organizationId
              }
            >
              <Save className="h-4 w-4 mr-2" />
              {autoSaveStatus.isSaving ? "Saving..." : "Save Draft"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {WIZARD_STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center space-y-2">
                  <button
                    onClick={() => handleStepClick(step.id)}
                    disabled={
                      !completedSteps.has(step.id) &&
                      step.id !== currentStep &&
                      step.id !== 1
                    }
                    className={cn(
                      "w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-colors",
                      {
                        "bg-primary text-primary-foreground border-primary":
                          step.id === currentStep,
                        "bg-green-500 text-white border-green-500":
                          completedSteps.has(step.id),
                        "border-muted-foreground text-muted-foreground":
                          step.id !== currentStep &&
                          !completedSteps.has(step.id),
                        "hover:border-primary hover:text-primary cursor-pointer":
                          completedSteps.has(step.id) ||
                          step.id === currentStep ||
                          step.id === 1,
                        "cursor-not-allowed opacity-50":
                          !completedSteps.has(step.id) &&
                          step.id !== currentStep &&
                          step.id !== 1,
                      }
                    )}
                  >
                    {completedSteps.has(step.id) ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      step.id
                    )}
                  </button>
                  <div className="text-center">
                    <p className="text-sm font-medium">{step.title}</p>
                    <Badge
                      variant={
                        step.id === currentStep
                          ? "default"
                          : completedSteps.has(step.id)
                            ? "secondary"
                            : "outline"
                      }
                      className="text-xs"
                    >
                      Step {step.id}
                    </Badge>
                  </div>
                </div>

                {index < WIZARD_STEPS.length - 1 && (
                  <Separator
                    orientation="horizontal"
                    className={cn(
                      "flex-1 mx-4",
                      completedSteps.has(step.id) ? "bg-green-500" : "bg-muted"
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step content */}
      <FormProvider {...form}>
        {currentStep === 5 ? (
          // Preview step uses its own layout
          <CampaignPreview
            data={watchedData}
            onEdit={(step) => setCurrentStep(step)}
            onBack={() => setCurrentStep(4)}
            onCreate={handleComplete}
            isCreating={isLoading}
          />
        ) : (
          // Regular wizard steps use card layout
          <Card>
            <CardHeader>
              <CardTitle>{WIZARD_STEPS[currentStep - 1]?.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentStep === 1 && <CampaignBasicsStep />}
              {currentStep === 2 && <AudienceChannelsStep />}
              {currentStep === 3 && <KPIsStep />}
              {currentStep === 4 && <TeamAccessStep />}
            </CardContent>
          </Card>
        )}
      </FormProvider>

      {/* Navigation buttons - only show for non-preview steps */}
      {currentStep !== 5 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            {currentStep === 4 ? (
              <Button
                onClick={handleNext}
                disabled={isLoading}
                className="min-w-[120px]"
              >
                Preview Campaign
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={isLoading}
                className="min-w-[120px]"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
