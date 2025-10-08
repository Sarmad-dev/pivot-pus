"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface FormError {
  type: "validation" | "network" | "server" | "timeout" | "unknown";
  message: string;
  details?: string;
  code?: string;
  timestamp: Date;
  retryable: boolean;
  field?: string;
  step?: number;
}

interface FormErrorHandlerProps {
  error: FormError | null;
  onRetry?: () => Promise<void>;
  onDismiss?: () => void;
  className?: string;
}

export function FormErrorHandler({
  error,
  onRetry,
  onDismiss,
  className,
}: FormErrorHandlerProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [showRetryDialog, setShowRetryDialog] = useState(false);

  const handleRetry = useCallback(async () => {
    if (!onRetry || !error?.retryable) return;

    try {
      setIsRetrying(true);
      setRetryCount(prev => prev + 1);
      await onRetry();
      setShowRetryDialog(false);
    } catch (retryError) {
      console.error("Retry failed:", retryError);
      toast.error("Retry failed", {
        description: "The retry attempt was unsuccessful. Please try again.",
      });
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, error?.retryable]);

  const copyErrorDetails = useCallback(() => {
    if (!error) return;

    const errorInfo = {
      type: error.type,
      message: error.message,
      details: error.details,
      code: error.code,
      timestamp: error.timestamp.toISOString(),
      field: error.field,
      step: error.step,
    };

    navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2));
    toast.success("Error details copied to clipboard");
  }, [error]);

  const getErrorIcon = (type: string) => {
    switch (type) {
      case "validation":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "network":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "server":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "timeout":
        return <Clock className="h-5 w-5 text-orange-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getErrorColor = (type: string) => {
    switch (type) {
      case "validation":
        return "border-yellow-200 bg-yellow-50";
      case "network":
        return "border-red-200 bg-red-50";
      case "server":
        return "border-red-200 bg-red-50";
      case "timeout":
        return "border-orange-200 bg-orange-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  const getErrorTitle = (type: string) => {
    switch (type) {
      case "validation":
        return "Validation Error";
      case "network":
        return "Network Error";
      case "server":
        return "Server Error";
      case "timeout":
        return "Request Timeout";
      default:
        return "Error";
    }
  };

  const getRetryDelay = (retryCount: number) => {
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    return Math.min(Math.pow(2, retryCount) * 1000, 30000);
  };

  const getSuggestion = (type: string) => {
    switch (type) {
      case "validation":
        return "Please check your input and fix any validation errors before proceeding.";
      case "network":
        return "Please check your internet connection and try again.";
      case "server":
        return "There seems to be an issue with our servers. Please try again in a few moments.";
      case "timeout":
        return "The request took too long to complete. Please try again.";
      default:
        return "An unexpected error occurred. Please try again or contact support if the issue persists.";
    }
  };

  if (!error) return null;

  return (
    <>
      <Card className={cn(getErrorColor(error.type), className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getErrorIcon(error.type)}
              <span>{getErrorTitle(error.type)}</span>
              <Badge variant="outline" className="text-xs">
                {error.type.toUpperCase()}
              </Badge>
            </div>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-0 bg-transparent p-0">
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">{error.message}</p>
                <p className="text-sm text-muted-foreground">
                  {getSuggestion(error.type)}
                </p>
                {error.field && error.step && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Field:</strong> {error.field} (Step {error.step})
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>

          {/* Error details */}
          {(error.details || error.code) && (
            <Collapsible open={showDetails} onOpenChange={setShowDetails}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="p-0 h-auto">
                  <span className="text-sm">
                    {showDetails ? "Hide" : "Show"} Details
                  </span>
                  {showDetails ? (
                    <ChevronUp className="h-4 w-4 ml-1" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-1" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2">
                {error.details && (
                  <div className="bg-muted/50 p-3 rounded-md">
                    <p className="text-sm font-medium mb-1">Details:</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {error.details}
                    </p>
                  </div>
                )}
                {error.code && (
                  <div className="bg-muted/50 p-3 rounded-md">
                    <p className="text-sm font-medium mb-1">Error Code:</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {error.code}
                    </p>
                  </div>
                )}
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-sm font-medium mb-1">Timestamp:</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {error.timestamp.toLocaleString()}
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              {error.retryable && onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRetryDialog(true)}
                  disabled={isRetrying}
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry {retryCount > 0 && `(${retryCount})`}
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={copyErrorDetails}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Details
              </Button>
            </div>
            
            {error.type === "server" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open("/support", "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            )}
          </div>

          {retryCount > 0 && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertTriangle className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-blue-700">
                <strong>Retry Attempt {retryCount}:</strong> 
                {retryCount >= 3 
                  ? " Multiple retry attempts have been made. Consider refreshing the page or contacting support."
                  : ` Next retry will wait ${getRetryDelay(retryCount) / 1000} seconds.`
                }
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Retry confirmation dialog */}
      <AlertDialog open={showRetryDialog} onOpenChange={setShowRetryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retry Operation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to retry this operation? 
              {retryCount > 0 && (
                <span className="block mt-2 text-sm">
                  This will be retry attempt #{retryCount + 1}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRetry} disabled={isRetrying}>
              {isRetrying ? "Retrying..." : "Retry"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Helper function to create FormError objects
export function createFormError(
  type: FormError["type"],
  message: string,
  options: Partial<Omit<FormError, "type" | "message" | "timestamp">> = {}
): FormError {
  return {
    type,
    message,
    timestamp: new Date(),
    retryable: type !== "validation", // Validation errors are not retryable
    ...options,
  };
}

// Helper function to determine if an error is retryable
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Network errors are usually retryable
    if (error.name === "NetworkError" || error.message.includes("fetch")) {
      return true;
    }
    
    // Timeout errors are retryable
    if (error.name === "TimeoutError" || error.message.includes("timeout")) {
      return true;
    }
    
    // Server errors (5xx) are retryable
    if (error.message.includes("500") || error.message.includes("502") || 
        error.message.includes("503") || error.message.includes("504")) {
      return true;
    }
  }
  
  return false;
}

// Helper function to extract error details from various error types
export function extractErrorDetails(error: unknown): {
  message: string;
  details?: string;
  code?: string;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      details: error.stack,
      code: error.name,
    };
  }
  
  if (typeof error === "string") {
    return { message: error };
  }
  
  if (typeof error === "object" && error !== null) {
    const errorObj = error as any;
    return {
      message: errorObj.message || "Unknown error",
      details: errorObj.details || JSON.stringify(error),
      code: errorObj.code || errorObj.status?.toString(),
    };
  }
  
  return { message: "An unknown error occurred" };
}