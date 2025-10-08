"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  CheckCircle,
  FileText,
  Activity
} from "lucide-react";
import Link from "next/link";
import { Campaign, CampaignPermissions, CampaignStatus } from "@/types/campaign";
import { Id } from "@/convex/_generated/dataModel";

interface CampaignActionsMenuProps {
  campaign: Campaign;
  onStatusChange: (campaignId: Id<"campaigns">, newStatus: CampaignStatus) => void;
  onDelete: (campaignId: Id<"campaigns">, campaignName: string) => void;
  permissions?: CampaignPermissions;
}

export const CampaignActionsMenu = ({ 
  campaign, 
  onStatusChange, 
  onDelete,
  permissions
}: CampaignActionsMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Default permissions if not provided (for backward compatibility)
  const defaultPermissions = {
    canView: true,
    canEdit: true,
    canDelete: true,
    canManageTeam: true,
    canManageClients: true,
    canPublish: true,
    role: "owner",
    isCreator: true,
  };

  const perms = permissions || defaultPermissions;

  const getAvailableStatusTransitions = (currentStatus: string) => {
    const transitions: Record<string, Array<{ status: string; label: string; icon: any }>> = {
      draft: [
        { status: "active", label: "Activate Campaign", icon: Play },
      ],
      active: [
        { status: "paused", label: "Pause Campaign", icon: Pause },
        { status: "completed", label: "Mark as Completed", icon: CheckCircle },
      ],
      paused: [
        { status: "active", label: "Resume Campaign", icon: Play },
        { status: "completed", label: "Mark as Completed", icon: CheckCircle },
      ],
      completed: [], // Cannot transition from completed
    };

    return transitions[currentStatus] || [];
  };

  const availableTransitions = getAvailableStatusTransitions(campaign.status);

  const handleStatusChange = (newStatus: CampaignStatus) => {
    onStatusChange(campaign._id, newStatus);
    setIsOpen(false);
  };

  const handleDelete = () => {
    onDelete(campaign._id, campaign.name);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Campaign Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* View Campaign */}
        <Link href={`/campaigns/${campaign._id}`}>
          <DropdownMenuItem>
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </DropdownMenuItem>
        </Link>

        {/* Edit Campaign */}
        {perms.canEdit && (
          <Link href={`/campaigns/${campaign._id}/edit`}>
            <DropdownMenuItem>
              <Edit className="h-4 w-4 mr-2" />
              Edit Campaign
            </DropdownMenuItem>
          </Link>
        )}

        {/* Status Changes */}
        {perms.canEdit && availableTransitions.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Activity className="h-4 w-4 mr-2" />
                Change Status
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {availableTransitions.map((transition) => (
                  <DropdownMenuItem
                    key={transition.status}
                    onClick={() => handleStatusChange(transition.status as any)}
                  >
                    <transition.icon className="h-4 w-4 mr-2" />
                    {transition.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        )}

        {/* Delete Campaign */}
        {perms.canDelete && campaign.status !== "active" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleDelete}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Campaign
            </DropdownMenuItem>
          </>
        )}

        {/* Show warning for active campaigns */}
        {perms.canDelete && campaign.status === "active" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="text-muted-foreground">
              <Trash2 className="h-4 w-4 mr-2" />
              Cannot delete active campaign
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};