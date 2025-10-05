"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import {
  Plus,
  Trash2,
  Users,
  Shield,
  Mail,
  Search,
  X,
  UserCheck,
  UserPlus,
  Crown,
  Edit,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useOrganization } from "@/contexts/organization-context";
import { toast } from "sonner";

// User type from Convex
type User = {
  _id: Id<"users">;
  name?: string;
  email?: string;
  image?: string;
};
import {
  type TeamAccess,
  type TeamMemberAssignment,
  type ClientAssignment,
} from "@/lib/validations/campaign";

// Role configuration with display information
const ROLE_OPTIONS = [
  {
    value: "owner" as const,
    label: "Owner",
    description: "Full access to campaign and team management",
    icon: Crown,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
  },
  {
    value: "editor" as const,
    label: "Editor",
    description: "Can edit campaign settings and view all data",
    icon: Edit,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  {
    value: "viewer" as const,
    label: "Viewer",
    description: "Can view campaign data but cannot make changes",
    icon: Eye,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
] as const;

interface TeamAccessStepProps {
  className?: string;
}

export function TeamAccessStep({ className }: TeamAccessStepProps) {
  const form = useFormContext<{
    teamAccess: TeamAccess;
    basics?: { name: string };
  }>();

  const [searchTerm, setSearchTerm] = useState("");
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [selectedSearchType, setSelectedSearchType] = useState<
    "team" | "client"
  >("team");

  // Get current user and organization context
  const { user: currentUser, isLoading: userLoading } = useCurrentUser();
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const organizationId = currentOrganization?._id;

  // Search for users - MUST be called unconditionally
  const searchResults = useQuery(
    api.users.searchUsers,
    searchTerm.length >= 2 && organizationId
      ? { searchTerm, organizationId, limit: 10 }
      : "skip"
  );

  // Field arrays for dynamic forms - MUST be called unconditionally
  const {
    fields: teamMemberFields,
    append: appendTeamMember,
    remove: removeTeamMember,
  } = useFieldArray({
    control: form.control,
    name: "teamAccess.teamMembers",
  });

  const {
    fields: clientFields,
    append: appendClient,
    remove: removeClient,
  } = useFieldArray({
    control: form.control,
    name: "teamAccess.clients",
  });

  // Get user details for team members and clients - MUST be called unconditionally
  const teamMemberIds = useMemo(
    () =>
      (form.watch("teamAccess.teamMembers") || []).map(
        (m) => m.userId as Id<"users">
      ),
    [form]
  );

  const clientIds = useMemo(
    () =>
      (form.watch("teamAccess.clients") || []).map(
        (c) => c.userId as Id<"users">
      ),
    [form]
  );

  const teamMemberUsers = useQuery(
    api.users.getUsersByIds,
    teamMemberIds.length > 0 ? { userIds: teamMemberIds } : "skip"
  );

  const clientUsers = useQuery(
    api.users.getUsersByIds,
    clientIds.length > 0 ? { userIds: clientIds } : "skip"
  );

  // Initialize with current user as owner if empty - MUST be called unconditionally
  useEffect(() => {
    if (currentUser && teamMemberFields.length === 0) {
      appendTeamMember({
        userId: currentUser._id,
        role: "owner",
        notifications: true,
        assignedAt: Date.now(),
      });
    }
  }, [currentUser, teamMemberFields.length, appendTeamMember]);

  // Show loading state if we're still loading user or organization data
  // AFTER all hooks have been called
  if (userLoading || orgLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">
              Loading team access settings...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if no organization is available
  // AFTER all hooks have been called
  if (!currentOrganization) {
    return (
      <div className={cn("space-y-6", className)}>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No organization selected. Please select an organization to manage
            team access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Handle adding team member or client
  const handleAddUser = (userId: string, type: "team" | "client") => {
    const userInfo = searchResults?.find((u: any) => u._id === userId);

    if (type === "team") {
      appendTeamMember({
        userId: userId as Id<"users">,
        role: "viewer",
        notifications: true,
        assignedAt: Date.now(), // Add the missing assignedAt field
      });

      toast.success("Team member added", {
        description: `${userInfo?.name || "User"} has been added as a team member.`,
      });
    } else {
      appendClient({
        userId: userId as Id<"users">,
        assignedAt: Date.now(),
      });

      toast.success("Client added", {
        description: `${userInfo?.name || "User"} has been added as a client.`,
      });
    }

    setSearchTerm("");
    setShowUserSearch(false);
  };

  // Get user display info
  const getUserInfo = (userId: string) => {
    const teamUser = teamMemberUsers?.find(
      (u: any) => u._id === (userId as Id<"users">)
    );
    const clientUser = clientUsers?.find(
      (u: any) => u._id === (userId as Id<"users">)
    );
    const user = teamUser || clientUser;

    if (!user) return null;

    return {
      name: user.name || "Unknown User",
      email: user.email || "",
      image: user.image,
      initials: user.name
        ? user.name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
        : "?",
    };
  };

  // Check if user has owner role
  const hasOwner = (form.watch("teamAccess.teamMembers") || []).some(
    (m) => m.role === "owner"
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Team Members Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedSearchType("team");
                setShowUserSearch(true);
              }}
              disabled={teamMemberFields.length >= 50}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Team Member
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasOwner && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                At least one team member must have the "Owner" role to manage
                the campaign.
              </AlertDescription>
            </Alert>
          )}

          {teamMemberFields.map((field, index) => (
            <TeamMemberForm
              key={field.id}
              index={index}
              onRemove={() => removeTeamMember(index)}
              canRemove={teamMemberFields.length > 1}
              userInfo={getUserInfo(
                form.watch(`teamAccess.teamMembers.${index}.userId`)
              )}
              isCurrentUser={
                currentUser?._id ===
                form.watch(`teamAccess.teamMembers.${index}.userId`)
              }
            />
          ))}

          {teamMemberFields.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No team members assigned</p>
              <p className="text-sm">
                Add team members to collaborate on this campaign
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clients Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Clients
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedSearchType("client");
                setShowUserSearch(true);
              }}
              disabled={clientFields.length >= 20}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            <p>Clients have view-only access to campaign data and reports.</p>
          </div>

          {clientFields.map((field, index) => (
            <ClientForm
              key={field.id}
              index={index}
              onRemove={() => removeClient(index)}
              userInfo={getUserInfo(
                form.watch(`teamAccess.clients.${index}.userId`)
              )}
            />
          ))}

          {clientFields.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No clients assigned</p>
              <p className="text-sm">
                Add clients to give them view access to campaign results
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Campaign Permissions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="teamAccess.permissions.allowClientEdit"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div>
                  <FormLabel>Allow Client Editing</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Allow clients to edit certain campaign fields (not
                    recommended)
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="teamAccess.permissions.requireApproval"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div>
                  <FormLabel>Require Approval for Changes</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Require owner approval before campaign changes take effect
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* User Search Modal */}
      {showUserSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Add {selectedSearchType === "team" ? "Team Member" : "Client"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowUserSearch(false);
                    setSearchTerm("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {searchResults && searchResults.length > 0 ? (
                  searchResults.map((user: any) => (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() =>
                        handleAddUser(user._id, selectedSearchType)
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.image} />
                          <AvatarFallback>
                            {user.name
                              ? user.name
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")
                                  .toUpperCase()
                              : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {user.name || "Unknown User"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : searchTerm.length >= 2 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No users found</p>
                    <p className="text-sm">Try a different search term</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Type to search for users</p>
                    <p className="text-sm">Enter at least 2 characters</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Team Member Form Component
interface TeamMemberFormProps {
  index: number;
  onRemove: () => void;
  canRemove: boolean;
  userInfo: {
    name: string;
    email: string;
    image?: string;
    initials: string;
  } | null;
  isCurrentUser: boolean;
}

function TeamMemberForm({
  index,
  onRemove,
  canRemove,
  userInfo,
  isCurrentUser,
}: TeamMemberFormProps) {
  const form = useFormContext();

  const role = form.watch(`teamAccess.teamMembers.${index}.role`);
  const roleInfo = ROLE_OPTIONS.find((r) => r.value === role);

  if (!userInfo) {
    return (
      <div className="flex items-center justify-center p-4 border rounded-lg">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarImage src={userInfo.image} />
              <AvatarFallback>{userInfo.initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{userInfo.name}</p>
                {isCurrentUser && (
                  <Badge variant="secondary" className="text-xs">
                    You
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{userInfo.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <FormField
              control={form.control}
              name={`teamAccess.teamMembers.${index}.role`}
              render={({ field }) => (
                <FormItem>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROLE_OPTIONS.map((option) => {
                        const IconComponent = option.icon;
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <IconComponent
                                className={cn("h-4 w-4", option.color)}
                              />
                              <span>{option.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`teamAccess.teamMembers.${index}.notifications`}
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <Switch
                        checked={field.value ?? true}
                        onCheckedChange={field.onChange}
                      />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            {canRemove && !isCurrentUser && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {roleInfo && (
          <div
            className={cn(
              "mt-3 p-3 rounded-lg border",
              roleInfo.bgColor,
              roleInfo.borderColor
            )}
          >
            <div className="flex items-center gap-2">
              <roleInfo.icon className={cn("h-4 w-4", roleInfo.color)} />
              <span className={cn("text-sm font-medium", roleInfo.color)}>
                {roleInfo.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {roleInfo.description}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Client Form Component
interface ClientFormProps {
  index: number;
  onRemove: () => void;
  userInfo: {
    name: string;
    email: string;
    image?: string;
    initials: string;
  } | null;
}

function ClientForm({ index, onRemove, userInfo }: ClientFormProps) {
  if (!userInfo) {
    return (
      <div className="flex items-center justify-center p-4 border rounded-lg">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarImage src={userInfo.image} />
              <AvatarFallback>{userInfo.initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <p className="font-medium">{userInfo.name}</p>
              <p className="text-sm text-muted-foreground">{userInfo.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs">
              <Eye className="h-3 w-3 mr-1" />
              View Only
            </Badge>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-3 p-3 rounded-lg border bg-green-50 border-green-200">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-600">
              Client Access
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Can view campaign data and reports but cannot make changes
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
