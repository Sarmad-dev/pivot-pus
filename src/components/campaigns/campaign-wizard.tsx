"use client";

import React, { useState, useCallback, useMemo, memo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, Save, Check, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useCampaignDrafts } from "@/hooks/use-campaign-drafts";
import { useCampaignDraft } from "@/hooks/use-campaign-draft";
import { useCampaignCreation } from "@/hooks/use-campaign-creation";
import { useOrganization } from "@/contexts/organization-context";
import { SaveStatusIndicator } from "./save-status-indicator";
import { ValidationSummary } from "./validation-summary";
import { FormErrorHandler, createFormError, type FormError } from "./form-error-handler";
import { useCampaignValidation } from "@/hooks/use-campaign-validation";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { LoadingOverlay, CampaignWizardSkeleton } from "@/components/ui/loading-states";
import { useKeyboardNavigation, useAnnouncer } from "@/hooks/use-keyboard-navigation";
import { useRenderPerformance } from "@/hooks/use-performance";
import {
  campaignStep1Schema,
  campaignStep2Schema,
  campaignStep3Schema,
  campaignStep4Schema,
  completeCampaignSchema,
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

// Memoized step component to prevent unnecessary re-renders
const MemoizedStepComponent = memo(({ 
  step, 
  currentStep 
}: { 
  step: number; 
  currentStep: number; 
}) => {
  switch (step) {
    case 1:
      return currentStep === 1 ? <CampaignBasicsStep /> : null;
    case 2:
      return currentStep === 2 ? <AudienceChannelsStep /> : null;
    case 3:
      return currentStep === 3 ? <KPIsStep /> : null;
    case 4:
      return currentStep === 4 ? <TeamAccessStep /> : null;
    case 5:
      return currentStep === 5 ? <CampaignPreview /> : null;
    default:
      return null;
  }
});

MemoizedStepComponent.displayName = "MemoizedStepComponent";

// Memoized navigation component
const WizardNavigation = memo(({ 
  currentStep, 
  completedSteps, 
  onStepClick, 
  onNext, 
  onPrevious, 
  isLoading 
}: {
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick: (step: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  isLoading: boolean;
}) => {
  const { handleKeyDown } = useKeyboardNavigation({
    onArrowLeft: currentStep > 1 ? onPrevious : undefined,
    onArrowRight: currentStep < WIZARD_STEPS.length ? onNext : undefined,
    onEnter: currentStep < WIZARD_STEPS.length ? onNext : undefined,
  });

  const handleKeyDownWrapper = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    handleKeyDown(event.nativeEvent);
  }, [handleKeyDown]);

  return (
    <div 
      className="flex items-center justify-between"
      onKeyDown={handleKeyDownWrapper}
      role="navigation"
      aria-label="Wizard steps"
    >
      {WIZARD_STEPS.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center space-y-2">
            <button
              onClick={() => onStepClick(step.id)}
              disabled={isLoading}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                currentStep === step.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : completedSteps.has(step.id)
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-muted-foreground/25 bg-background text-muted-foreground hover:border-muted-foreground/50"
              )}
              aria-current={currentStep === step.id ? "step" : undefined}
              aria-label={`Step ${step.id}: ${step.title}${completedSteps.has(step.id) ? " (completed)" : ""}`}
            >
              {completedSteps.has(step.id) ? (
                <Check className="h-5 w-5" />
              ) : (
                step.id
              )}
            </button>
            <div className="text-center">
              <p className="text-sm font-medium">{step.title}</p>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {step.description}
              </p>
            </div>
          </div>
          {index < WIZARD_STEPS.length - 1 && (
            <Separator
              className={cn(
                "flex-1 mx-4",
                completedSteps.has(step.id) ? "bg-green-500" : "bg-muted"
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
});

WizardNavigation.displayName = "WizardNavigation";

export function CampaignWizard({
  mode = "create",
  draftId,
  initialData,
  onComplete,
  onSaveDraft,
  onLoadDraft,
  className,
}: CampaignWizardProps) {
  // Performance monitoring
  const performanceMetrics = useRenderPerformance("CampaignWizard");
  
  // Accessibility announcements
  const { announce } = useAnnouncer();

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<FormError | null>(null);
  const [showValidationSummary, setShowValidationSummary] = useState(false);

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

  const { watch, getValues, formState } = form;
  
  // Use formState.isDirty and getValues() instead of watch() to prevent infinite loops
  const watchedData = watch();

  // Enhanced validation system
  const validation = useCampaignValidation();

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
      announce("Campaign created successfully", "polite");
      onComplete?.(campaignId);
    },
    onError: (error) => {
      toast.error("Creation failed", {
        description: error,
      });
      announce("Campaign creation failed", "assertive");
    },
  });

  // State for tracking optimized auto-save behavior
  const [hasInitialSave, setHasInitialSave] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number>(0);
  const [lastSavedData, setLastSavedData] = useState<string>("");
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);

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

        // Create a stable string representation by sorting keys and handling dates
        const normalizeData = (obj: any): any => {
          if (obj instanceof Date) {
            return obj.getTime();
          }
          if (Array.isArray(obj)) {
            return obj.map(normalizeData);
          }
          if (obj && typeof obj === 'object') {
            const normalized: any = {};
            Object.keys(obj).sort().forEach(key => {
              normalized[key] = normalizeData(obj[key]);
            });
            return normalized;
          }
          return obj;
        };

        const newDataString = JSON.stringify(normalizeData(newData));
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
  const handleUserInteraction = useCallback(() => {
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
      // Enable auto-save after first user interaction
      setAutoSaveEnabled(true);
    }
  }, [hasUserInteracted]);

  // Create a stable data object for auto-save with proper memoization
  const autoSaveData = useMemo(() => {
    // Only create auto-save data if user has interacted and we have meaningful data
    if (!hasUserInteracted || !autoSaveEnabled) {
      return { data: {}, step: currentStep };
    }

    const currentData = getValues();
    
    // Only include data if it's meaningful to prevent unnecessary saves
    if (!hasMeaningfulData(currentData)) {
      return { data: {}, step: currentStep };
    }

    return {
      data: currentData,
      step: currentStep,
    };
  }, [currentStep, hasUserInteracted, autoSaveEnabled, formState.isDirty, getValues, hasMeaningfulData]);

  // Optimized auto-save functionality with smart timing and loop prevention
  const autoSaveStatus = useAutoSave({
    data: autoSaveData,
    onSave: async ({ data, step }) => {
      // Prevent auto-save on preview step
      if (step === 5) {
        throw new Error("Cannot auto-save on preview step");
      }

      // Check if we have meaningful data to save
      if (!hasMeaningfulData(data)) {
        throw new Error("No meaningful data to save");
      }

      // Check if data has actually changed since last save
      if (!hasDataChanged(data)) {
        throw new Error("No changes detected since last save");
      }

      // Rate limiting: prevent saves too close together
      const now = Date.now();
      const timeSinceLastSave = now - lastSaveTime;
      const minInterval = hasInitialSave ? AUTO_SAVE_CONFIG.SUBSEQUENT_DELAY : AUTO_SAVE_CONFIG.INITIAL_DELAY;
      
      if (timeSinceLastSave < minInterval) {
        throw new Error(`Auto-save rate limited. Please wait ${Math.ceil((minInterval - timeSinceLastSave) / 1000)} seconds.`);
      }

      if (!organizationId || !createAutoSaveHandler) {
        throw new Error("Missing organization or save handler");
      }

      const draftName = data.basics?.name
        ? `${data.basics.name} - Draft`
        : "Campaign Draft";

      const handler = createAutoSaveHandler(step, draftName, undefined);
      const result = await handler({ data, step });

      // Update tracking state
      setLastSaveTime(now);
      setLastSavedData(JSON.stringify(data));
      setHasInitialSave(true);

      return result;
    },
    enabled: autoSaveEnabled && !!organizationId && !!createAutoSaveHandler,
    delay: hasInitialSave ? AUTO_SAVE_CONFIG.SUBSEQUENT_DELAY : AUTO_SAVE_CONFIG.INITIAL_DELAY,
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

  // Enhanced step validation with comprehensive error handling
  const validateCurrentStep = async (): Promise<boolean> => {
    try {
      setFormError(null); // Clear any previous errors
      
      const isValid = await validation.validateStep(currentStep);
      
      if (!isValid) {
        const stepIssues = validation.getStepIssues(currentStep);
        const errorIssues = stepIssues.filter(issue => issue.severity === "error");
        
        if (errorIssues.length > 0) {
          setFormError(createFormError(
            "validation",
            `Step ${currentStep} has ${errorIssues.length} validation error${errorIssues.length !== 1 ? "s" : ""}`,
            {
              details: errorIssues.map(issue => `${issue.field}: ${issue.message}`).join("\n"),
              step: currentStep,
              retryable: false,
            }
          ));
        }
        
        // Show validation summary for better UX
        setShowValidationSummary(true);
      }
      
      return isValid;
    } catch (error) {
      console.error("Step validation error:", error);
      setFormError(createFormError(
        "unknown",
        "An error occurred during validation",
        {
          details: error instanceof Error ? error.message : "Unknown validation error",
          step: currentStep,
          retryable: true,
        }
      ));
      return false;
    }
  };

  // Enhanced navigation handlers with comprehensive validation and accessibility
  const handleNext = useCallback(async () => {
    try {
      setFormError(null);
      
      // Skip validation for preview step (step 5)
      if (currentStep < 5) {
        const isValid = await validateCurrentStep();
        if (!isValid) {
          toast.error("Validation Error", {
            description: "Please fix the validation issues before proceeding.",
          });
          announce("Validation errors found. Please fix them before proceeding.", "assertive");
          return;
        }
      }

      // Mark current step as completed
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setShowValidationSummary(false); // Hide validation summary on successful navigation

      if (currentStep < WIZARD_STEPS.length) {
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        announce(`Moved to step ${nextStep}: ${WIZARD_STEPS[nextStep - 1]?.title}`, "polite");
      }
    } catch (error) {
      console.error("Navigation error:", error);
      const errorMessage = "An error occurred while navigating to the next step";
      setFormError(createFormError(
        "unknown",
        errorMessage,
        {
          details: error instanceof Error ? error.message : "Unknown navigation error",
          step: currentStep,
          retryable: true,
        }
      ));
      announce(errorMessage, "assertive");
    }
  }, [currentStep, validateCurrentStep, announce]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      announce(`Moved to step ${prevStep}: ${WIZARD_STEPS[prevStep - 1]?.title}`, "polite");
    }
  }, [currentStep, announce]);

  const handleStepClick = useCallback((step: number) => {
    try {
      setFormError(null);
      
      // Enhanced step navigation with validation checks
      const canNavigate = validation.canProceedToStep(step) || 
                         completedSteps.has(step) || 
                         step === 1 ||
                         (step === 5 && completedSteps.has(4));
      
      if (canNavigate) {
        setCurrentStep(step);
        setShowValidationSummary(false); // Hide validation summary when navigating
        announce(`Navigated to step ${step}: ${WIZARD_STEPS[step - 1]?.title}`, "polite");
      } else {
        const message = `Please complete the previous steps before accessing Step ${step}.`;
        toast.error("Navigation Restricted", {
          description: message,
        });
        announce(message, "assertive");
      }
    } catch (error) {
      console.error("Step navigation error:", error);
      const errorMessage = "An error occurred while navigating between steps";
      setFormError(createFormError(
        "unknown",
        errorMessage,
        {
          details: error instanceof Error ? error.message : "Unknown navigation error",
          retryable: true,
        }
      ));
      announce(errorMessage, "assertive");
    }
  }, [validation, completedSteps, announce]);

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
      announce("Draft saved successfully", "polite");
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
    announce,
  ]);

  // Enhanced campaign creation with comprehensive error handling and retry mechanism
  const handleComplete = async () => {
    if (!organizationId) {
      setFormError(createFormError(
        "validation",
        "Organization ID is required to create a campaign",
        { retryable: false }
      ));
      return;
    }

    try {
      setIsLoading(true);
      setFormError(null);
      
      const formData = getValues();

      // Comprehensive validation before creation
      const completeValidation = validation.validateComplete();
      if (!completeValidation.isValid) {
        setFormError(createFormError(
          "validation",
          `Campaign has ${completeValidation.issues.length} validation issue${completeValidation.issues.length !== 1 ? "s" : ""}`,
          {
            details: completeValidation.issues.map(issue => `${issue.field}: ${issue.message}`).join("\n"),
            retryable: false,
          }
        ));
        setShowValidationSummary(true);
        return;
      }

      // Final schema validation
      const schemaValidation = completeCampaignSchema.safeParse(formData);
      if (!schemaValidation.success) {
        setFormError(createFormError(
          "validation",
          "Campaign data validation failed",
          {
            details: schemaValidation.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("\n"),
            retryable: false,
          }
        ));
        return;
      }

      // Prepare data for Convex by converting dates to timestamps
      const campaignDataForConvex = {
        ...schemaValidation.data,
        basics: {
          ...schemaValidation.data.basics,
          startDate: schemaValidation.data.basics.startDate.getTime(),
          endDate: schemaValidation.data.basics.endDate.getTime(),
        },
      };

      // Create the campaign using the Convex mutation
      await createCampaign(campaignDataForConvex, organizationId as any);
      
      // Success is handled by the hook's onSuccess callback
    } catch (error) {
      console.error("Campaign creation error:", error);
      
      // Determine error type and create appropriate FormError
      let errorType: FormError["type"] = "unknown";
      let retryable = true;
      
      if (error instanceof Error) {
        if (error.message.includes("network") || error.message.includes("fetch")) {
          errorType = "network";
        } else if (error.message.includes("timeout")) {
          errorType = "timeout";
        } else if (error.message.includes("500") || error.message.includes("server")) {
          errorType = "server";
        } else if (error.message.includes("validation")) {
          errorType = "validation";
          retryable = false;
        }
      }
      
      setFormError(createFormError(
        errorType,
        "Failed to create campaign",
        {
          details: error instanceof Error ? error.message : "Unknown error occurred",
          retryable,
        }
      ));
    } finally {
      setIsLoading(false);
    }
  };

  // Retry handler for form errors
  const handleRetry = useCallback(async () => {
    if (formError?.type === "validation") {
      // For validation errors, just clear the error and show validation summary
      setFormError(null);
      setShowValidationSummary(true);
      return;
    }
    
    // For other errors, retry the last action
    if (currentStep === 5) {
      await handleComplete();
    } else {
      await validateCurrentStep();
    }
  }, [formError, currentStep]);

  // Calculate progress
  const progress = (completedSteps.size / WIZARD_STEPS.length) * 100;

  if (isLoading || isDraftLoading || orgLoading) {
    return <CampaignWizardSkeleton />;
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
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error("CampaignWizard Error:", error, errorInfo);
        announce("An unexpected error occurred in the campaign wizard", "assertive");
      }}
      showDetails={process.env.NODE_ENV === 'development'}
    >
      <LoadingOverlay 
        isLoading={isLoading} 
        message="Processing campaign..."
        className={cn("max-w-4xl mx-auto space-y-6", className)}
      >
        <FormProvider {...form}>
          {/* Skip links for accessibility */}
          <div className="sr-only">
            <a href="#wizard-content" className="focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md">
              Skip to wizard content
            </a>
          </div>

          {/* Header */}
          <header className="space-y-4" role="banner">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold" id="wizard-title">
                  {mode === "create"
                    ? "Create Campaign"
                    : mode === "edit"
                      ? "Edit Campaign"
                      : "Import Campaign"}
                </h1>
                <p className="text-muted-foreground" id="wizard-description">
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
            <div className="space-y-2" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progress)}% complete</span>
              </div>
              <Progress value={progress} className="h-2" aria-label={`Campaign creation progress: ${Math.round(progress)}% complete`} />
            </div>
          </header>

          {/* Form error display */}
          {formError && (
            <FormErrorHandler
              error={formError}
              onRetry={handleRetry}
              onDismiss={() => setFormError(null)}
            />
          )}

          {/* Validation summary */}
          {showValidationSummary && (
            <ValidationSummary
              issues={validation.getStepIssues(currentStep)}
              onNavigateToStep={handleStepClick}
            />
          )}

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
                      announce("Draft saved successfully", "polite");
                    } catch (error) {
                      // Error handling is already done in the auto-save hook
                    }
                  }}
                  disabled={
                    autoSaveStatus.isSaving || currentStep === 5 || !organizationId
                  }
                  aria-label="Save current progress as draft"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {autoSaveStatus.isSaving ? "Saving..." : "Save Draft"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <WizardNavigation
                currentStep={currentStep}
                completedSteps={completedSteps}
                onStepClick={handleStepClick}
                onNext={handleNext}
                onPrevious={handlePrevious}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>

          {/* Main wizard content */}
          <main id="wizard-content" role="main" aria-labelledby="wizard-title" aria-describedby="wizard-description">
            <MemoizedStepComponent step={currentStep} currentStep={currentStep} />
          </main>

          {/* Navigation buttons */}
          <nav className="flex justify-between pt-6" role="navigation" aria-label="Wizard navigation">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1 || isLoading}
              aria-label={`Go to previous step${currentStep > 1 ? `: ${WIZARD_STEPS[currentStep - 2]?.title}` : ""}`}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex gap-2">
              {currentStep < WIZARD_STEPS.length ? (
                <Button 
                  onClick={handleNext} 
                  disabled={isLoading}
                  aria-label={`Go to next step: ${WIZARD_STEPS[currentStep]?.title}`}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleComplete} 
                  disabled={isLoading}
                  aria-label="Create campaign with current settings"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Create Campaign
                    </>
                  )}
                </Button>
              )}
            </div>
          </nav>
        </FormProvider>
      </LoadingOverlay>
    </ErrorBoundary>
  );
}