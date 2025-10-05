"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Users,
  Crown,
  Settings,
  Shield,
  Eye,
  Trash2,
  MoreHorizontal,
  UserPlus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InviteUserDialog } from "./invite-user-dialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface OrganizationMembersProps {
  organizationId: Id<"organizations">;
  className?: string;
}

const ROLE_CONFIG = {
  owner: {
    label: "Owner",
    icon: Crown,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
  },
  admin: {
    label: "Admin",
    icon: Settings,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  member: {
    label: "Member",
    icon: Shield,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  viewer: {
    label: "Viewer",
    icon: Eye,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
  },
};

export function OrganizationMembers({
  organizationId,
  className,
}: OrganizationMembersProps) {
  const [selectedRole, setSelectedRole] = useState<string>("all");

  const members = useQuery(api.users.getOrganizationMembers, {
    organizationId,
    role: selectedRole === "all" ? undefined : (selectedRole as any),
    status: "active",
  });

  const updateMemberRole = useMutation(api.users.updateMemberRole);
  const removeMember = useMutation(api.users.removeMember);

  const handleRoleChange = async (userId: Id<"users">, newRole: string) => {
    try {
      await updateMemberRole({
        organizationId,
        userId,
        role: newRole as any,
      });
      toast.success("Member role updated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update role"
      );
    }
  };

  const handleRemoveMember = async (userId: Id<"users">, userName: string) => {
    try {
      await removeMember({
        organizationId,
        userId,
      });
      toast.success(`${userName} has been removed from the organization`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove member"
      );
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (members === undefined) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  const roleStats = members.reduce(
    (acc, member) => {
      const role = member.membership.role;
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Organization Members ({members.length})
            </CardTitle>
            <InviteUserDialog
              organizationId={organizationId}
              trigger={
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              }
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Role Filter */}
          <div className="flex items-center gap-4">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All Members ({members.length})
                </SelectItem>
                {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                  <SelectItem key={role} value={role}>
                    <div className="flex items-center gap-2">
                      <config.icon className={`h-4 w-4 ${config.color}`} />
                      {config.label}s ({roleStats[role] || 0})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Members List */}
          <div className="space-y-4">
            {members.map((member) => {
              const roleConfig =
                ROLE_CONFIG[member.membership.role as keyof typeof ROLE_CONFIG];
              const IconComponent = roleConfig.icon;

              return (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.image} />
                      <AvatarFallback>
                        {getUserInitials(member.name || "User")}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{member.name || "Unknown User"}</h3>
                        <Badge
                          variant="outline"
                          className={`${roleConfig.bgColor} ${roleConfig.borderColor}`}
                        >
                          <IconComponent
                            className={`h-3 w-3 mr-1 ${roleConfig.color}`}
                          />
                          {roleConfig.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {member.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined{" "}
                        {formatDistanceToNow(
                          new Date(member.membership.joinedAt),
                          {
                            addSuffix: true,
                          }
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {member.membership.role !== "owner" && (
                      <>
                        <Select
                          value={member.membership.role}
                          onValueChange={(newRole) =>
                            handleRoleChange(member._id, newRole)
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROLE_CONFIG)
                              .filter(([role]) => role !== "owner")
                              .map(([role, config]) => (
                                <SelectItem key={role} value={role}>
                                  <div className="flex items-center gap-2">
                                    <config.icon
                                      className={`h-4 w-4 ${config.color}`}
                                    />
                                    {config.label}
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="text-red-600 cursor-pointer"
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove Member
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Remove Member
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove{" "}
                                    <strong>{member.name || "this user"}</strong> from this
                                    organization? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleRemoveMember(
                                        member._id,
                                        member.name || "User"
                                      )
                                    }
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Remove Member
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}

                    {member.membership.role === "owner" && (
                      <Badge variant="secondary" className="text-xs">
                        Organization Owner
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {members.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No members found</p>
              <p className="text-sm">
                {selectedRole === "all"
                  ? "Invite users to get started"
                  : `No ${selectedRole}s in this organization`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
