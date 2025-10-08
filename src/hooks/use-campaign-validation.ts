"use client";

import { useCallback, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { ZodError } from "zod";
import {
  completeCampaignSchema,
  validateCampaignStep,
  validateBudgetAllocation,
  validateKPIWeights,
  validateCampaignDuration,
  type CampaignBasics,
  type AudienceChannels,
  type KPIsMetrics,
  type TeamAccess,
} from "@/lib/validations/campaign";
import {
  type ValidationIssue,
  convertZodIssuesToValidationIssues,
  STEP_MAPPING,
} from "@/components/campaigns/validation-summary";

// Combined form data type
type CampaignFormData = {
  basics?: CampaignBasics;
  audienceChannels?: AudienceChannels;
  kpisMetrics?: KPIsMetrics;
  teamAccess?: TeamAccess;
};

interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  stepValidation: Record<number, { isValid: boolean; issues: ValidationIssue[] }>;
  canProceedToStep: (step: number) => boolean;
  getStepIssues: (step: number) => ValidationIssue[];
  validateStep: (step: number) => Promise<boolean>;
  validateComplete: () => { isValid: boolean; issues: ValidationIssue[] };
}

export function useCampaignValidation(): ValidationResult {
  const formContext = useFormContext<CampaignFormData>();
  const { getValues, setError, clearErrors } = formContext || {};

  // Real-time validation of current form data
  const validateFormData = useCallback((data: CampaignFormData): ValidationIssue[] => {
    if (!formContext) return [];
    const issues: ValidationIssue[] = [];

    // Validate individual steps
    if (data.basics) {
      try {
        validateCampaignStep(1, data.basics);
      } catch (error) {
        if (error instanceof ZodError) {
          const stepIssues = convertZodIssuesToValidationIssues(
            error.issues,
            STEP_MAPPING
          );
          issues.push(...stepIssues);
        }
      }
    }

    if (data.audienceChannels) {
      try {
        validateCampaignStep(2, data.audienceChannels);
      } catch (error) {
        if (error instanceof ZodError) {
          const stepIssues = convertZodIssuesToValidationIssues(
            error.issues,
            STEP_MAPPING
          );
          issues.push(...stepIssues);
        }
      }

      // Additional budget allocation validation
      if (data.basics?.budget && data.audienceChannels.budgetAllocation) {
        const budgetValidation = validateBudgetAllocation(
          data.basics.budget,
          data.audienceChannels.budgetAllocation
        );
        if (!budgetValidation.isValid) {
          issues.push({
            step: 2,
            stepName: "Audience & Channels",
            field: "budgetAllocation",
            message: budgetValidation.error || "Budget allocation error",
            severity: "error",
            path: ["audienceChannels", "budgetAllocation"],
          });
        }
      }
    }

    if (data.kpisMetrics) {
      try {
        validateCampaignStep(3, data.kpisMetrics);
      } catch (error) {
        if (error instanceof ZodError) {
          const stepIssues = convertZodIssuesToValidationIssues(
            error.issues,
            STEP_MAPPING
          );
          issues.push(...stepIssues);
        }
      }

      // Additional KPI weights validation
      if (data.kpisMetrics.primaryKPIs) {
        const kpiValidation = validateKPIWeights(data.kpisMetrics.primaryKPIs);
        if (!kpiValidation.isValid) {
          issues.push({
            step: 3,
            stepName: "KPIs & Metrics",
            field: "primaryKPIs",
            message: kpiValidation.error || "KPI weights error",
            severity: "warning", // KPI weights over 100% is a warning, not an error
            path: ["kpisMetrics", "primaryKPIs"],
          });
        }
      }
    }

    if (data.teamAccess) {
      try {
        validateCampaignStep(4, data.teamAccess);
      } catch (error) {
        if (error instanceof ZodError) {
          const stepIssues = convertZodIssuesToValidationIssues(
            error.issues,
            STEP_MAPPING
          );
          issues.push(...stepIssues);
        }
      }
    }

    // Cross-step validation
    if (data.basics?.startDate && data.basics?.endDate) {
      const durationValidation = validateCampaignDuration(
        data.basics.startDate,
        data.basics.endDate
      );
      if (!durationValidation.isValid) {
        issues.push({
          step: 1,
          stepName: "Campaign Basics",
          field: "endDate",
          message: durationValidation.error || "Campaign duration error",
          severity: "error",
          path: ["basics", "endDate"],
        });
      }
    }

    return issues;
  }, [formContext]);

  // Get current form data and validate
  const currentData = getValues?.() || {};
  const allIssues = useMemo(() => validateFormData(currentData), [validateFormData, currentData]);

  // Group issues by step
  const stepValidation = useMemo(() => {
    const result: Record<number, { isValid: boolean; issues: ValidationIssue[] }> = {};
    
    for (let step = 1; step <= 4; step++) {
      const stepIssues = allIssues.filter((issue: ValidationIssue) => issue.step === step);
      const errorIssues = stepIssues.filter((issue: ValidationIssue) => issue.severity === "error");
      result[step] = {
        isValid: errorIssues.length === 0,
        issues: stepIssues,
      };
    }
    
    return result;
  }, [allIssues]);

  // Check if we can proceed to a specific step
  const canProceedToStep = useCallback((targetStep: number): boolean => {
    if (!formContext) return true;
    
    // Can always go to step 1
    if (targetStep === 1) return true;
    
    // Can proceed to step N if all previous steps are valid
    for (let step = 1; step < targetStep; step++) {
      if (!stepValidation[step]?.isValid) {
        return false;
      }
    }
    
    return true;
  }, [stepValidation, formContext]);

  // Get issues for a specific step
  const getStepIssues = useCallback((step: number): ValidationIssue[] => {
    if (!formContext) return [];
    return stepValidation[step]?.issues || [];
  }, [stepValidation, formContext]);

  // Validate a specific step and set form errors
  const validateStep = useCallback(async (step: number): Promise<boolean> => {
    if (!formContext || !getValues || !setError || !clearErrors) return true;
    
    const data = getValues();
    let stepData: any;
    
    switch (step) {
      case 1:
        stepData = data.basics;
        break;
      case 2:
        stepData = data.audienceChannels;
        break;
      case 3:
        stepData = data.kpisMetrics;
        break;
      case 4:
        stepData = data.teamAccess;
        break;
      default:
        return false;
    }

    if (!stepData) return false;

    try {
      // Clear existing errors for this step
      const stepPaths = Object.keys(STEP_MAPPING);
      const currentStepPath = stepPaths[step - 1];
      if (currentStepPath) {
        clearErrors(currentStepPath as any);
      }

      // Validate the step
      const validation = validateCampaignStep(step, stepData);
      
      if (!validation.success) {
        // Set form errors
        validation.error.issues.forEach((issue) => {
          const fieldPath = [currentStepPath, ...issue.path].join(".");
          setError(fieldPath as any, {
            type: "manual",
            message: issue.message,
          });
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Step ${step} validation error:`, error);
      return false;
    }
  }, [getValues, setError, clearErrors, formContext]);

  // Validate complete campaign
  const validateComplete = useCallback((): { isValid: boolean; issues: ValidationIssue[] } => {
    if (!formContext || !getValues) {
      return { isValid: true, issues: [] };
    }
    
    const data = getValues();
    
    try {
      const validation = completeCampaignSchema.safeParse(data);
      
      if (!validation.success) {
        const issues = convertZodIssuesToValidationIssues(
          validation.error.issues,
          STEP_MAPPING
        );
        return { isValid: false, issues };
      }
      
      return { isValid: true, issues: [] };
    } catch (error) {
      console.error("Complete validation error:", error);
      return { 
        isValid: false, 
        issues: [{
          step: 1,
          stepName: "Campaign Basics",
          field: "general",
          message: "Validation error occurred",
          severity: "error",
          path: ["general"],
        }]
      };
    }
  }, [getValues, formContext]);

  // Overall validation status
  const errorIssues = allIssues.filter((issue: ValidationIssue) => issue.severity === "error");
  const isValid = errorIssues.length === 0;

  // Return appropriate result based on form context availability
  if (!formContext) {
    return {
      isValid: true,
      issues: [],
      stepValidation: {},
      canProceedToStep: () => true,
      getStepIssues: () => [],
      validateStep: async () => true,
      validateComplete: () => ({ isValid: true, issues: [] }),
    };
  }

  return {
    isValid,
    issues: allIssues,
    stepValidation,
    canProceedToStep,
    getStepIssues,
    validateStep,
    validateComplete,
  };
}

// Helper hook for step-specific validation
export function useStepValidation(step: number) {
  const validation = useCampaignValidation();
  
  return {
    isValid: validation.stepValidation[step]?.isValid ?? false,
    issues: validation.getStepIssues(step),
    validate: () => validation.validateStep(step),
    canProceed: validation.canProceedToStep(step + 1),
  };
}