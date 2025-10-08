"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  UserPlus,
  Crown,
  Edit3,
  Eye,
  MoreHorizontal,
  Mail,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { Campaign, CampaignPermissions } from "@/types/campaign";
import { Id } from "@/../convex/_generated/dataModel";

interface CampaignTeamManagementProps {
  campaign: Campaign;
  permissions?: CampaignPermissions;
}

export const CampaignTeamManagement = ({
  campaign,
  permissions,
}: CampaignTeamManagementProps) => {
  // Mock user data - in real implementation, this would come from user queries
  const getUserDisplayName = (userId: Id<"users">) => {
    // This would be replaced with actual user data fetching
    return `User ${userId.slice(-4)}`;
  };

  const getUserEmail = (userId: Id<"users">) => {
    // This would be replaced with actual user data fetching
    return `user${userId.slice(-4)}@example.com`;
  };

  const getUserInitials = (userId: Id<"users">) => {
    const name = getUserDisplayName(userId);
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case "editor":
        return <Edit3 className="h-4 w-4 text-blue-600" />;
      case "viewer":
        return <Eye className="h-4 w-4 text-gray-600" />;
      default:
        return <Users className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "editor":
        return "secondary";
      case "viewer":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Team Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members ({campaign.teamMembers.length})
            </CardTitle>
            {permissions?.canManageTeam && (
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {campaign.teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No team members assigned</p>
            </div>
          ) : (
            <div className="space-y-4">
              {campaign.teamMembers.map((member, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src="" />
                      <AvatarFallback>
                        {getUserInitials(member.userId)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {getUserDisplayName(member.userId)}
                        </p>
                        {member.userId === campaign.createdBy && (
                          <Badge variant="outline" className="text-xs">
                            Creator
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getUserEmail(member.userId)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Added{" "}
                        {formatDistanceToNow(new Date(member.assignedAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(member.role)}
                      <Badge
                        variant={getRoleBadgeVariant(member.role) as any}
                        className="capitalize"
                      >
                        {member.role}
                      </Badge>
                    </div>
                    {permissions?.canManageTeam &&
                      member.userId !== campaign.createdBy && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit3 className="h-4 w-4 mr-2" />
                              Change Role
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="h-4 w-4 mr-2" />
                              Send Message
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              Remove from Campaign
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clients */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Clients ({campaign.clients.length})
            </CardTitle>
            {permissions?.canManageClients && (
              <Button size="sm" variant="outline">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {campaign.clients.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No clients assigned</p>
              {permissions?.canManageClients && (
                <p className="text-sm text-muted-foreground mt-2">
                  Add clients to give them view-only access to this campaign
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {campaign.clients.map((client, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src="" />
                      <AvatarFallback>
                        {getUserInitials(client.userId)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {getUserDisplayName(client.userId)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getUserEmail(client.userId)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Added{" "}
                        {formatDistanceToNow(new Date(client.assignedAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      <Eye className="h-3 w-3 mr-1" />
                      View Only
                    </Badge>
                    {permissions?.canManageClients && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Message
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            Remove Client Access
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Access Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle>Access Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium">Owner</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Full access to edit, manage team, and delete campaign
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Edit3 className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Editor</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Can edit campaign details and manage clients
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-gray-600" />
                  <span className="font-medium">Viewer</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Read-only access to campaign information
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
