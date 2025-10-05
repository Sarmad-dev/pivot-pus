"use client";

import React from "react";
import { useCampaignDrafts } from "@/hooks/use-campaign-drafts";
import { Id } from "../../../convex/_generated/dataModel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraftExpirationAlertProps {
  organizationId?: Id<"organizations">;
  onSelectDraft?: (draftId: Id<"campaignDrafts">) => void;
  className?: string;
  maxAlertsShown?: number;
}

export function DraftExpirationAlert({
  organizationId,
  onSelectDraft,
  className,
  maxAlertsShown = 3,
}: DraftExpirationAlertProps) {
  const { drafts, isDraftExpired } = useCampaignDrafts({ organizationId });

  // Helper function to check if draft is expiring soon (within 24 hours)
  const isDraftExpiringSoon = (expiresAt: number): boolean => {
    const now = Date.now();
    const timeLeft = expiresAt - now;
    const oneDayInMs = 24 * 60 * 60 * 1000;
    return timeLeft > 0 && timeLeft <= oneDayInMs;
  };

  // Get time until expiry in a readable format
  const getTimeUntilExpiry = (expiresAt: number): string => {
    const now = Date.now();
    const timeLeft = expiresAt - now;

    if (timeLeft <= 0) return "Expired";

    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""} left`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? "s" : ""} left`;
    } else {
      return "Less than 1 minute left";
    }
  };

  // Filter drafts that are expiring soon or expired
  const expiringSoonDrafts = drafts.filter(draft => 
    isDraftExpiringSoon(draft.expiresAt) && !isDraftExpired(draft.expiresAt)
  );
  
  const expiredDrafts = drafts.filter(draft => isDraftExpired(draft.expiresAt));

  // Don't show anything if no drafts are expiring
  if (expiringSoonDrafts.length === 0 && expiredDrafts.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Expired drafts alert */}
      {expiredDrafts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Expired Drafts</AlertTitle>
          <AlertDescription>
            You have {expiredDrafts.length} expired draft{expiredDrafts.length > 1 ? 's' : ''} that will be automatically cleaned up.
            {expiredDrafts.slice(0, maxAlertsShown).map(draft => (
              <div key={draft.id} className="mt-2 flex items-center justify-between">
                <span className="text-sm font-medium">{draft.name}</span>
                <Badge variant="destructive" className="text-xs">
                  Expired
                </Badge>
              </div>
            ))}
            {expiredDrafts.length > maxAlertsShown && (
              <p className="text-xs mt-2 opacity-75">
                And {expiredDrafts.length - maxAlertsShown} more...
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Expiring soon drafts alert */}
      {expiringSoonDrafts.length > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Drafts Expiring Soon</AlertTitle>
          <AlertDescription>
            You have {expiringSoonDrafts.length} draft{expiringSoonDrafts.length > 1 ? 's' : ''} expiring within 24 hours.
            {expiringSoonDrafts.slice(0, maxAlertsShown).map(draft => (
              <div key={draft.id} className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  <span className="text-sm font-medium">{draft.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {getTimeUntilExpiry(draft.expiresAt)}
                  </Badge>
                  {onSelectDraft && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectDraft(draft.id)}
                      className="h-6 px-2 text-xs"
                    >
                      Continue
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {expiringSoonDrafts.length > maxAlertsShown && (
              <p className="text-xs mt-2 opacity-75">
                And {expiringSoonDrafts.length - maxAlertsShown} more...
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// Compact version for smaller spaces like sidebars
export function CompactDraftExpirationAlert({
  organizationId,
  onSelectDraft,
  className,
}: Pick<DraftExpirationAlertProps, 'organizationId' | 'onSelectDraft' | 'className'>) {
  const { drafts, isDraftExpired } = useCampaignDrafts({ organizationId });

  const isDraftExpiringSoon = (expiresAt: number): boolean => {
    const now = Date.now();
    const timeLeft = expiresAt - now;
    const oneDayInMs = 24 * 60 * 60 * 1000;
    return timeLeft > 0 && timeLeft <= oneDayInMs;
  };

  const expiringSoonCount = drafts.filter(draft => 
    isDraftExpiringSoon(draft.expiresAt) && !isDraftExpired(draft.expiresAt)
  ).length;
  
  const expiredCount = drafts.filter(draft => isDraftExpired(draft.expiresAt)).length;

  if (expiringSoonCount === 0 && expiredCount === 0) {
    return null;
  }

  return (
    <div className={cn("p-3 bg-yellow-50 border border-yellow-200 rounded-lg", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-4 w-4 text-yellow-600" />
        <span className="text-sm font-medium text-yellow-800">Draft Alerts</span>
      </div>
      <div className="text-xs text-yellow-700 space-y-1">
        {expiredCount > 0 && (
          <p>{expiredCount} expired draft{expiredCount > 1 ? 's' : ''}</p>
        )}
        {expiringSoonCount > 0 && (
          <p>{expiringSoonCount} expiring soon</p>
        )}
      </div>
    </div>
  );
}