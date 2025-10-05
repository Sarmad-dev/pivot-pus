"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { AutoSaveStatus } from "@/hooks/use-auto-save";
import { Save, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SaveStatusIndicatorProps {
  autoSaveStatus: AutoSaveStatus;
  onManualSave?: () => void;
  onClearError?: () => void;
  className?: string;
  showManualSave?: boolean;
  showSaveCount?: boolean;
}

export const SaveStatusIndicator = React.memo(function SaveStatusIndicator({
  autoSaveStatus,
  onManualSave,
  onClearError,
  className,
  showManualSave = true,
  showSaveCount = false,
}: SaveStatusIndicatorProps) {
  // Simplified version to prevent infinite loops
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Clock className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">
        Auto-save ready
      </span>
      
      {/* Manual save button */}
      {showManualSave && onManualSave && (
        <Button
          variant="outline"
          size="sm"
          onClick={onManualSave}
          className="h-6 px-2 text-xs"
        >
          <Save className="h-3 w-3 mr-1" />
          Save Now
        </Button>
      )}
    </div>
  );
});

// Compact version for smaller spaces
export const CompactSaveStatusIndicator = React.memo(function CompactSaveStatusIndicator({
  autoSaveStatus,
  onManualSave,
  className,
}: Pick<SaveStatusIndicatorProps, 'autoSaveStatus' | 'onManualSave' | 'className'>) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onManualSave}
      className={cn("h-8 w-8 p-0", className)}
    >
      <Save className="h-4 w-4" />
    </Button>
  );
});