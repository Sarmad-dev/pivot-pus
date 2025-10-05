"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { useCampaignDrafts } from "@/hooks/use-campaign-drafts";
// DraftMetadata type is used in the interface but not imported directly
import { Id } from "../../../convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileText,
  Trash2,
  Clock,
  AlertTriangle,
  Play,
  Calendar,
  BarChart3,
  RefreshCw,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

interface DraftManagerProps {
  organizationId?: Id<"organizations">;
  onSelectDraft?: (draftId: Id<"campaignDrafts">) => void;
  onCreateNew?: () => void;
  className?: string;
  maxDrafts?: number;
  showAdminControls?: boolean; // For showing cleanup and management options
}

export function DraftManager({
  organizationId,
  onSelectDraft,
  onCreateNew,
  className,
  maxDrafts = 10,
  showAdminControls = false,
}: DraftManagerProps) {
  const [deletingDraftId, setDeletingDraftId] = useState<Id<"campaignDrafts"> | null>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const {
    drafts,
    isLoading,
    deleteDraft,
    isDraftExpired,
    getTimeUntilExpiry,
    cleanupExpiredDrafts,
  } = useCampaignDrafts({
    organizationId,
    onError: (error) => toast.error("Draft Error", { description: error }),
    onSuccess: (message) => toast.success(message),
  });

  const handleDeleteDraft = async (draftId: Id<"campaignDrafts">) => {
    try {
      setDeletingDraftId(draftId);
      await deleteDraft(draftId);
    } catch {
      // Error is handled by the hook
    } finally {
      setDeletingDraftId(null);
    }
  };

  const handleCleanupExpired = async () => {
    try {
      setIsCleaningUp(true);
      await cleanupExpiredDrafts();
      toast.success("Expired drafts cleaned up successfully");
    } catch (error) {
      toast.error("Failed to cleanup expired drafts", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStepName = (step: number): string => {
    switch (step) {
      case 1: return "Campaign Basics";
      case 2: return "Audience & Channels";
      case 3: return "KPIs & Metrics";
      case 4: return "Team & Access";
      default: return `Step ${step}`;
    }
  };

  const isDraftExpiringSoon = (expiresAt: number): boolean => {
    const now = Date.now();
    const timeLeft = expiresAt - now;
    const oneDayInMs = 24 * 60 * 60 * 1000;
    return timeLeft > 0 && timeLeft <= oneDayInMs; // Expires within 24 hours
  };

  const getExpirationStatus = (expiresAt: number) => {
    const isExpired = isDraftExpired(expiresAt);
    const isExpiringSoon = isDraftExpiringSoon(expiresAt);
    
    if (isExpired) {
      return { status: 'expired', variant: 'destructive' as const, icon: AlertTriangle };
    } else if (isExpiringSoon) {
      return { status: 'expiring', variant: 'secondary' as const, icon: Clock };
    }
    return { status: 'active', variant: 'outline' as const, icon: null };
  };

  const sortedDrafts = [...drafts]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, maxDrafts);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Saved Drafts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Saved Drafts
              </CardTitle>
              <CardDescription>
                {drafts.length === 0 
                  ? "No saved drafts found"
                  : `${drafts.length} draft${drafts.length > 1 ? 's' : ''} available`
                }
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {showAdminControls && drafts.some(d => isDraftExpired(d.expiresAt)) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleCleanupExpired}
                      disabled={isCleaningUp}
                    >
                      {isCleaningUp ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Settings className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clean up expired drafts</TooltipContent>
                </Tooltip>
              )}
              {onCreateNew && (
                <Button onClick={onCreateNew} size="sm">
                  Create New
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sortedDrafts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No drafts yet</p>
              <p className="text-sm">
                Start creating a campaign to automatically save drafts
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedDrafts.map((draft) => {
                const isExpired = isDraftExpired(draft.expiresAt);
                const isExpiringSoon = isDraftExpiringSoon(draft.expiresAt);
                const timeLeft = getTimeUntilExpiry(draft.expiresAt);
                const expirationStatus = getExpirationStatus(draft.expiresAt);

                return (
                  <div
                    key={draft.id}
                    className={cn(
                      "border rounded-lg p-4 transition-colors",
                      isExpired 
                        ? "border-red-200 bg-red-50/50" 
                        : isExpiringSoon
                        ? "border-yellow-200 bg-yellow-50/50"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* Draft name and status */}
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium truncate">{draft.name}</h4>
                          {isExpired && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Expired
                            </Badge>
                          )}
                          {isExpiringSoon && !isExpired && (
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Expiring Soon
                            </Badge>
                          )}
                        </div>

                        {/* Progress and step info */}
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Current step: {getStepName(draft.step)}
                            </span>
                            <span className="font-medium">
                              {draft.completionPercentage}% complete
                            </span>
                          </div>
                          <Progress 
                            value={draft.completionPercentage} 
                            className="h-2"
                          />
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>Created {formatDate(draft.createdAt)}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              Created: {new Date(draft.createdAt).toLocaleString()}
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{timeLeft}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {isExpired 
                                ? "This draft has expired and will be cleaned up"
                                : `Expires: ${new Date(draft.expiresAt).toLocaleString()}`
                              }
                            </TooltipContent>
                          </Tooltip>

                          <div className="flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            <span>Step {draft.step}/4</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        {!isExpired && onSelectDraft && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onSelectDraft(draft.id)}
                                className="h-8 w-8 p-0"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Continue editing</TooltipContent>
                          </Tooltip>
                        )}

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={deletingDraftId === draft.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Draft</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{draft.name}&quot;? 
                                This action cannot be undone and you will lose all progress.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteDraft(draft.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete Draft
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                );
              })}

              {drafts.length > maxDrafts && (
                <div className="text-center py-2">
                  <p className="text-sm text-muted-foreground">
                    Showing {maxDrafts} of {drafts.length} drafts
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

// Compact version for sidebars or smaller spaces
export function CompactDraftManager({
  organizationId,
  onSelectDraft,
  className,
}: Pick<DraftManagerProps, 'organizationId' | 'onSelectDraft' | 'className'>) {
  const { drafts, isLoading } = useCampaignDrafts({ organizationId });

  if (isLoading) {
    return (
      <div className={cn("p-4", className)}>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-3 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const recentDrafts = drafts
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 3);

  return (
    <div className={cn("space-y-2", className)}>
      <h4 className="text-sm font-medium text-muted-foreground">Recent Drafts</h4>
      {recentDrafts.length === 0 ? (
        <p className="text-xs text-muted-foreground">No drafts available</p>
      ) : (
        recentDrafts.map((draft) => (
          <button
            key={draft.id}
            onClick={() => onSelectDraft?.(draft.id)}
            className="w-full text-left p-2 rounded border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium truncate">{draft.name}</span>
              <Badge variant="secondary" className="text-xs">
                {draft.completionPercentage}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Step {draft.step} • {new Date(draft.updatedAt).toLocaleDateString()}
            </p>
          </button>
        ))
      )}
    </div>
  );
}