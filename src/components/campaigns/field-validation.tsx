"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
// Simple debounce implementation to avoid lodash dependency
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export interface FieldValidationRule {
  name: string;
  validate: (
    value: any,
    formData: any
  ) => Promise<ValidationResult> | ValidationResult;
  severity: "error" | "warning" | "info";
  debounceMs?: number;
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  suggestion?: string;
}

interface FieldValidationProps {
  fieldName: string;
  rules?: FieldValidationRule[];
  showValidationState?: boolean;
  showInlineMessages?: boolean;
  className?: string;
  children: React.ReactNode;
}

interface ValidationState {
  isValidating: boolean;
  results: Record<
    string,
    ValidationResult & { severity: "error" | "warning" | "info" }
  >;
}

export function FieldValidation({
  fieldName,
  rules = [],
  showValidationState = true,
  showInlineMessages = true,
  className,
  children,
}: FieldValidationProps) {
  const { watch, getValues, formState } = useFormContext();
  const [validationState, setValidationState] = useState<ValidationState>({
    isValidating: false,
    results: {},
  });

  const fieldValue = watch(fieldName);
  const fieldError =
    formState.errors[fieldName as keyof typeof formState.errors];
  const fieldErrorMessage =
    fieldError && typeof fieldError === "object" && "message" in fieldError
      ? (fieldError as any).message
      : typeof fieldError === "string"
        ? fieldError
        : undefined;

  // Debounced validation function
  const debouncedValidate = useCallback(
    debounce(async (value: any, formData: any) => {
      if (rules.length === 0) return;

      setValidationState((prev) => ({ ...prev, isValidating: true }));

      const results: ValidationState["results"] = {};

      for (const rule of rules) {
        try {
          const result = await Promise.resolve(rule.validate(value, formData));
          results[rule.name] = {
            ...result,
            severity: rule.severity,
          };
        } catch (error) {
          results[rule.name] = {
            isValid: false,
            message: "Validation error occurred",
            severity: "error",
          };
        }
      }

      setValidationState({
        isValidating: false,
        results,
      });
    }, 300),
    [rules]
  );

  // Trigger validation when field value changes
  useEffect(() => {
    const formData = getValues();
    debouncedValidate(fieldValue, formData);
  }, [fieldValue, debouncedValidate, getValues]);

  // Get overall validation status
  const getValidationStatus = () => {
    if (validationState.isValidating) return "validating";
    if (fieldError) return "error";

    const results = Object.values(validationState.results);
    const hasErrors = results.some((r) => !r.isValid && r.severity === "error");
    const hasWarnings = results.some(
      (r) => !r.isValid && r.severity === "warning"
    );

    if (hasErrors) return "error";
    if (hasWarnings) return "warning";
    if (results.length > 0 && results.every((r) => r.isValid)) return "success";

    return "neutral";
  };

  const getValidationIcon = (status: string) => {
    switch (status) {
      case "validating":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getValidationMessages = () => {
    const messages: Array<{
      message: string;
      severity: "error" | "warning" | "info";
    }> = [];

    // Add form error if present
    if (fieldErrorMessage) {
      messages.push({
        message: fieldErrorMessage,
        severity: "error",
      });
    }

    // Add validation rule results
    Object.values(validationState.results).forEach((result) => {
      if (!result.isValid && result.message) {
        messages.push({
          message: result.message,
          severity: result.severity,
        });
      }
    });

    return messages;
  };

  const validationStatus = getValidationStatus();
  const validationMessages = getValidationMessages();

  return (
    <TooltipProvider>
      <div className={cn("relative", className)}>
        {/* Render children with validation styling */}
        <div className="relative">
          {children}

          {/* Validation indicator */}
          {showValidationState && validationStatus !== "neutral" && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center">
                    {getValidationIcon(validationStatus)}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <div className="space-y-1">
                    {validationMessages.map((msg, index) => (
                      <div key={index} className="text-sm">
                        <Badge
                          variant={
                            msg.severity === "error"
                              ? "destructive"
                              : "secondary"
                          }
                          className="mr-2"
                        >
                          {msg.severity}
                        </Badge>
                        {msg.message}
                      </div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Inline validation messages */}
        {showInlineMessages && validationMessages.length > 0 && (
          <div className="mt-2 space-y-1">
            {validationMessages.map((msg, index) => (
              <Alert
                key={index}
                className={cn(
                  "py-2 px-3",
                  msg.severity === "error" && "border-red-300 bg-red-100",
                  msg.severity === "warning" &&
                    "border-yellow-300 bg-yellow-100",
                  msg.severity === "info" && "border-blue-300 bg-blue-100"
                )}
              >
                <div className="flex items-start gap-2">
                  {msg.severity === "error" && (
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  )}
                  {msg.severity === "warning" && (
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  )}
                  {msg.severity === "info" && (
                    <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  )}
                  <AlertDescription className="text-sm text-gray-800">
                    {msg.message}
                  </AlertDescription>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {/* Validation suggestions */}
        {validationState.results &&
          Object.values(validationState.results).some((r) => r.suggestion) && (
            <div className="mt-2">
              <Alert className="border-blue-300 bg-blue-100">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-800">
                  <strong className="text-blue-900">Suggestions:</strong>
                  <ul className="mt-1 space-y-1">
                    {Object.values(validationState.results)
                      .filter((r) => r.suggestion)
                      .map((result, index) => (
                        <li key={index} className="text-xs text-blue-700">
                          • {result.suggestion}
                        </li>
                      ))}
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}
      </div>
    </TooltipProvider>
  );
}

// Pre-built validation rules
export const commonValidationRules = {
  required: (fieldName: string): FieldValidationRule => ({
    name: "required",
    severity: "error",
    validate: (value) => ({
      isValid: value !== undefined && value !== null && value !== "",
      message: `${fieldName} is required`,
    }),
  }),

  minLength: (min: number, fieldName: string): FieldValidationRule => ({
    name: "minLength",
    severity: "error",
    validate: (value) => ({
      isValid: !value || value.length >= min,
      message: `${fieldName} must be at least ${min} characters`,
      suggestion: `Current length: ${value?.length || 0}/${min}`,
    }),
  }),

  maxLength: (max: number, fieldName: string): FieldValidationRule => ({
    name: "maxLength",
    severity: "error",
    validate: (value) => ({
      isValid: !value || value.length <= max,
      message: `${fieldName} must be no more than ${max} characters`,
      suggestion: `Current length: ${value?.length || 0}/${max}`,
    }),
  }),

  email: (): FieldValidationRule => ({
    name: "email",
    severity: "error",
    validate: (value) => {
      if (!value) return { isValid: true };
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return {
        isValid: emailRegex.test(value),
        message: "Please enter a valid email address",
      };
    },
  }),

  url: (): FieldValidationRule => ({
    name: "url",
    severity: "error",
    validate: (value) => {
      if (!value) return { isValid: true };
      try {
        new URL(value);
        return { isValid: true };
      } catch {
        return {
          isValid: false,
          message: "Please enter a valid URL",
          suggestion: "URL should start with http:// or https://",
        };
      }
    },
  }),

  positiveNumber: (fieldName: string): FieldValidationRule => ({
    name: "positiveNumber",
    severity: "error",
    validate: (value) => ({
      isValid: !value || (typeof value === "number" && value > 0),
      message: `${fieldName} must be a positive number`,
    }),
  }),

  dateRange: (
    startFieldName: string,
    endFieldName: string
  ): FieldValidationRule => ({
    name: "dateRange",
    severity: "error",
    validate: (value, formData) => {
      const startDate = formData[startFieldName];
      const endDate = formData[endFieldName];

      if (!startDate || !endDate) return { isValid: true };

      return {
        isValid: new Date(endDate) > new Date(startDate),
        message: "End date must be after start date",
      };
    },
  }),

  budgetAllocation: (): FieldValidationRule => ({
    name: "budgetAllocation",
    severity: "warning",
    validate: (value, formData) => {
      const totalBudget = formData.basics?.budget;
      if (!totalBudget || !value) return { isValid: true };

      const allocated = Object.values(value as Record<string, number>).reduce(
        (sum, amount) => sum + (amount || 0),
        0
      );

      const tolerance = 0.01;
      const isValid = Math.abs(allocated - totalBudget) <= tolerance;

      return {
        isValid,
        message: isValid
          ? undefined
          : `Budget allocation (${allocated}) should equal total budget (${totalBudget})`,
        suggestion: `Allocated: ${allocated} / Total: ${totalBudget}`,
      };
    },
  }),
};
