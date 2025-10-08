"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  FileText, 
  Activity, 
  Pause, 
  CheckCircle 
} from "lucide-react";

interface CampaignStatusBadgeProps {
  status: "draft" | "active" | "paused" | "completed";
  className?: string;
  showIcon?: boolean;
}

export const CampaignStatusBadge = ({ 
  status, 
  className,
  showIcon = true 
}: CampaignStatusBadgeProps) => {
  const statusConfig = {
    draft: {
      label: "Draft",
      variant: "secondary" as const,
      className: "bg-gray-100 text-gray-700 hover:bg-gray-200",
      icon: FileText,
    },
    active: {
      label: "Active",
      variant: "default" as const,
      className: "bg-green-100 text-green-700 hover:bg-green-200",
      icon: Activity,
    },
    paused: {
      label: "Paused",
      variant: "outline" as const,
      className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-300",
      icon: Pause,
    },
    completed: {
      label: "Completed",
      variant: "outline" as const,
      className: "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300",
      icon: CheckCircle,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  );
};