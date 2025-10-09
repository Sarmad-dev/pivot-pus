"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Play, 
  Pause,
  RotateCcw,
  Calendar,
  User,
  Activity,
  Timer
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface SimulationStatusProps {
  simulationId: Id<"simulations">;
  onRetry?: () => void;
  onCancel?: () => void;
  showDetails?: boolean;
  compact?: boolean;
}

interface QueueMetadata {
  priority: number;
  estimatedDuration: number;
  subscriptionTier: string;
  queuedAt: number;
  startedAt?: number;
  retryCount: number;
  retryAt?: number;
  error?: string;
  failedAt?: number;
}

interface SimulationData {
  _id: Id<"simulations">;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  queueMetadata?: QueueMetadata;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  campaignId: Id<"campaigns">;
  createdBy: Id<"users">;
  config: {
    timeframe: {
      startDate: number;
      endDate: number;
      granularity: "daily" | "weekly";
    };
    metrics: Array<{
      type: string;
      weight: number;
    }>;
    scenarios: string[];
  };
}

const STATUS_CONFIG = {
  queued: {
    icon: Clock,
    label: "Queued",
    description: "Waiting to be processed",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-200",
  },
  processing: {
    icon: Loader2,
    label: "Processing",
    description: "AI models are generating predictions",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    borderColor: "border-orange-200",
  },
  completed: {
    icon: CheckCircle,
    label: "Completed",
    description: "Simulation finished successfully",
    color: "text-green-600",
    bgColor: "bg-green-100",
    borderColor: "border-green-200",
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    description: "Simulation encountered an error",
    color: "text-red-600",
    bgColor: "bg-red-100",
    borderColor: "border-red-200",
  },
  cancelled: {
    icon: AlertCircle,
    label: "Cancelled",
    description: "Simulation was cancelled by user",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    borderColor: "border-gray-200",
  },
};

export function SimulationStatus({ 
  simulationId, 
  onRetry, 
  onCancel,
  showDetails = true,
  compact = false 
}: SimulationStatusProps) {
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  // Subscribe to simulation updates
  const simulation = useQuery(api.simulations.getSimulation, { simulationId }) as SimulationData | null;

  // Calculate progress and time estimates
  useEffect(() => {
    if (!simulation) return;

    const now = Date.now();
    
    if (simulation.status === "processing" && simulation.queueMetadata?.startedAt) {
      const elapsed = now - simulation.queueMetadata.startedAt;
      const estimated = simulation.queueMetadata.estimatedDuration;
      
      if (estimated > 0) {
        const progressPercent = Math.min((elapsed / estimated) * 100, 95); // Cap at 95% until complete
        setProgress(progressPercent);
        
        const remaining = Math.max(estimated - elapsed, 0);
        setEstimatedTimeRemaining(remaining);
      }
    } else if (simulation.status === "queued") {
      setProgress(0);
      setEstimatedTimeRemaining(simulation.queueMetadata?.estimatedDuration || null);
    } else if (simulation.status === "completed") {
      setProgress(100);
      setEstimatedTimeRemaining(0);
    } else {
      setProgress(0);
      setEstimatedTimeRemaining(null);
    }
  }, [simulation]);

  // Update progress periodically for processing simulations
  useEffect(() => {
    if (simulation?.status !== "processing") return;

    const interval = setInterval(() => {
      if (simulation.queueMetadata?.startedAt) {
        const elapsed = Date.now() - simulation.queueMetadata.startedAt;
        const estimated = simulation.queueMetadata.estimatedDuration;
        
        if (estimated > 0) {
          const progressPercent = Math.min((elapsed / estimated) * 100, 95);
          setProgress(progressPercent);
          
          const remaining = Math.max(estimated - elapsed, 0);
          setEstimatedTimeRemaining(remaining);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [simulation]);

  if (!simulation) {
    return (
      <Card className={cn("w-full", compact && "p-4")}>
        <CardContent className={cn("flex items-center justify-center py-6", compact && "py-4")}>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading simulation status...</span>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = STATUS_CONFIG[simulation.status];
  const StatusIcon = statusConfig.icon;

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-lg border",
        statusConfig.bgColor,
        statusConfig.borderColor
      )}>
        <StatusIcon 
          className={cn(
            "h-5 w-5",
            statusConfig.color,
            simulation.status === "processing" && "animate-spin"
          )} 
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("font-medium", statusConfig.color)}>
              {statusConfig.label}
            </span>
            {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
              <Badge variant="outline" className="text-xs">
                ~{Math.ceil(estimatedTimeRemaining / 1000 / 60)}m remaining
              </Badge>
            )}
          </div>
          {simulation.status === "processing" && (
            <Progress value={progress} className="h-1 mt-1" />
          )}
        </div>
        {(simulation.status === "failed" || simulation.status === "cancelled") && onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-full",
              statusConfig.bgColor
            )}>
              <StatusIcon 
                className={cn(
                  "h-5 w-5",
                  statusConfig.color,
                  simulation.status === "processing" && "animate-spin"
                )} 
              />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {statusConfig.label}
                <Badge variant="outline" className="text-xs">
                  ID: {simulation._id.slice(-8)}
                </Badge>
              </CardTitle>
              <CardDescription>
                {statusConfig.description}
              </CardDescription>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {simulation.status === "processing" && onCancel && (
              <Button size="sm" variant="outline" onClick={onCancel}>
                <Pause className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
            {(simulation.status === "failed" || simulation.status === "cancelled") && onRetry && (
              <Button size="sm" onClick={onRetry}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar for Processing */}
        {simulation.status === "processing" && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Timer className="h-4 w-4" />
                <span>
                  Estimated time remaining: {Math.ceil(estimatedTimeRemaining / 1000 / 60)} minutes
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error Information */}
        {simulation.status === "failed" && simulation.queueMetadata?.error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Details</AlertTitle>
            <AlertDescription className="mt-2">
              {simulation.queueMetadata.error}
              {simulation.queueMetadata.retryCount > 0 && (
                <div className="mt-2 text-sm">
                  Retry attempts: {simulation.queueMetadata.retryCount}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {showDetails && (
          <>
            <Separator />
            
            {/* Simulation Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Created</div>
                    <div className="text-muted-foreground">
                      {format(new Date(simulation.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                    </div>
                  </div>
                </div>
                
                {simulation.completedAt && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="font-medium">Completed</div>
                      <div className="text-muted-foreground">
                        {format(new Date(simulation.completedAt), "MMM dd, yyyy 'at' HH:mm")}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Timeframe</div>
                    <div className="text-muted-foreground">
                      {format(new Date(simulation.config.timeframe.startDate), "MMM dd")} - {format(new Date(simulation.config.timeframe.endDate), "MMM dd")}
                      <span className="ml-2 text-xs">({simulation.config.timeframe.granularity})</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Metrics</div>
                    <div className="text-muted-foreground">
                      {simulation.config.metrics.length} selected
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Queue Information */}
            {simulation.queueMetadata && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Queue Information</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Priority</div>
                      <div className="font-medium">{simulation.queueMetadata.priority}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Subscription</div>
                      <div className="font-medium capitalize">{simulation.queueMetadata.subscriptionTier}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Queued</div>
                      <div className="font-medium">
                        {formatDistanceToNow(new Date(simulation.queueMetadata.queuedAt), { addSuffix: true })}
                      </div>
                    </div>
                    {simulation.queueMetadata.startedAt && (
                      <div>
                        <div className="text-muted-foreground">Started</div>
                        <div className="font-medium">
                          {formatDistanceToNow(new Date(simulation.queueMetadata.startedAt), { addSuffix: true })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Scenarios and Metrics */}
            <Separator />
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-sm mb-2">Scenarios</h4>
                <div className="flex flex-wrap gap-1">
                  {simulation.config.scenarios.map((scenario) => (
                    <Badge key={scenario} variant="secondary" className="text-xs capitalize">
                      {scenario}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-sm mb-2">Metrics</h4>
                <div className="flex flex-wrap gap-1">
                  {simulation.config.metrics.map((metric, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {metric.type} ({(metric.weight * 100).toFixed(0)}%)
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}