"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ZodIssue } from "zod";

export interface ValidationIssue {
  step: number;
  stepName: string;
  field: string;
  message: string;
  severity: "error" | "warning" | "info";
  path: string[];
}

interface ValidationSummaryProps {
  issues: ValidationIssue[];
  onNavigateToStep: (step: number) => void;
  className?: string;
}

export function ValidationSummary({
  issues,
  onNavigateToStep,
  className,
}: ValidationSummaryProps) {
  const errorIssues = issues.filter((issue) => issue.severity === "error");
  const warningIssues = issues.filter((issue) => issue.severity === "warning");
  const infoIssues = issues.filter((issue) => issue.severity === "info");

  const issuesByStep = issues.reduce((acc, issue) => {
    if (!acc[issue.step]) {
      acc[issue.step] = [];
    }
    acc[issue.step].push(issue);
    return acc;
  }, {} as Record<number, ValidationIssue[]>);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error":
        return "border-red-200 bg-red-50";
      case "warning":
        return "border-yellow-200 bg-yellow-50";
      case "info":
        return "border-blue-200 bg-blue-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  if (issues.length === 0) {
    return (
      <Card className={cn("border-green-200 bg-green-50", className)}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">All validation checks passed!</span>
          </div>
          <p className="text-sm text-green-600 mt-1">
            Your campaign is ready to be created.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-red-200 bg-red-50", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-red-800 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Validation Issues ({issues.length})
        </CardTitle>
        <div className="flex items-center gap-4 text-sm">
          {errorIssues.length > 0 && (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" />
              {errorIssues.length} Error{errorIssues.length !== 1 ? "s" : ""}
            </Badge>
          )}
          {warningIssues.length > 0 && (
            <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 border-yellow-200">
              <AlertTriangle className="h-3 w-3" />
              {warningIssues.length} Warning{warningIssues.length !== 1 ? "s" : ""}
            </Badge>
          )}
          {infoIssues.length > 0 && (
            <Badge variant="outline" className="gap-1 bg-blue-100 text-blue-800 border-blue-200">
              <Info className="h-3 w-3" />
              {infoIssues.length} Info
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorIssues.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-700">
              <strong>Critical Issues:</strong> These must be fixed before you can create the campaign.
            </AlertDescription>
          </Alert>
        )}

        {/* Group issues by step */}
        {Object.entries(issuesByStep)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([stepNum, stepIssues]) => {
            const step = parseInt(stepNum);
            const stepName = stepIssues[0]?.stepName || `Step ${step}`;
            const stepErrors = stepIssues.filter((issue) => issue.severity === "error");
            const stepWarnings = stepIssues.filter((issue) => issue.severity === "warning");
            const stepInfos = stepIssues.filter((issue) => issue.severity === "info");

            return (
              <div key={step} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{stepName}</h4>
                    <div className="flex items-center gap-1">
                      {stepErrors.length > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {stepErrors.length}
                        </Badge>
                      )}
                      {stepWarnings.length > 0 && (
                        <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                          {stepWarnings.length}
                        </Badge>
                      )}
                      {stepInfos.length > 0 && (
                        <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
                          {stepInfos.length}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigateToStep(step)}
                    className="text-xs"
                  >
                    Go to Step
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {stepIssues.map((issue, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-3 rounded-lg border",
                        getSeverityColor(issue.severity)
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {getSeverityIcon(issue.severity)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {issue.field}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {issue.path.join(" → ")}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700">{issue.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {step !== Math.max(...Object.keys(issuesByStep).map(Number)) && (
                  <Separator />
                )}
              </div>
            );
          })}

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-gray-600">
            Fix the issues above to proceed with campaign creation.
          </p>
          {errorIssues.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const firstErrorStep = Math.min(
                  ...errorIssues.map((issue) => issue.step)
                );
                onNavigateToStep(firstErrorStep);
              }}
            >
              Fix First Error
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to convert Zod issues to ValidationIssue format
export function convertZodIssuesToValidationIssues(
  zodIssues: ZodIssue[],
  stepMapping: Record<string, { step: number; stepName: string }>
): ValidationIssue[] {
  return zodIssues.map((issue) => {
    const pathString = issue.path.join(".");
    const rootPath = issue.path[0] as string;
    const fieldPath = issue.path.slice(1).join(".");
    
    // Determine step based on root path
    const stepInfo = stepMapping[rootPath] || { step: 1, stepName: "Campaign Basics" };
    
    // Determine severity based on issue type and message
    let severity: "error" | "warning" | "info" = "error";
    if (issue.message.includes("recommended") || issue.message.includes("may be")) {
      severity = "warning";
    }
    if (issue.message.includes("info") || issue.message.includes("note")) {
      severity = "info";
    }

    return {
      step: stepInfo.step,
      stepName: stepInfo.stepName,
      field: fieldPath || rootPath,
      message: issue.message,
      severity,
      path: issue.path.map(String),
    };
  });
}

// Step mapping for converting paths to step information
export const STEP_MAPPING = {
  basics: { step: 1, stepName: "Campaign Basics" },
  audienceChannels: { step: 2, stepName: "Audience & Channels" },
  kpisMetrics: { step: 3, stepName: "KPIs & Metrics" },
  teamAccess: { step: 4, stepName: "Team & Access" },
} as const;