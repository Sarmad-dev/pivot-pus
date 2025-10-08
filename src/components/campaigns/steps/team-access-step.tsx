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
  Filter,
  CheckSquare,
  Square,
  UserMinus,
  Send,
  Loader2,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { useQuery, useMutation } from "convex/react";
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
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("viewer");
  const [inviteMessage, setInviteMessage] = useState("");
  const [searchFilter, setSearchFilter] = useState<"all" | "members" | "non-members">("all");

  // Get current user and organization context
  const { user: currentUser, isLoading: userLoading } = useCurrentUser();
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const organizationId = currentOrganization?._id;

  // Search for users - MUST be called unconditionally
  const searchResults = useQuery(
    api.users.searchUsers,
    searchTerm.length >= 2 && organizationId
      ? { searchTerm, organizationId, limit: 20 }
      : "skip"
  );

  // Get organization members for enhanced search
  const organizationMembers = useQuery(
    api.users.getOrganizationMembers,
    organizationId ? { organizationId } : "skip"
  );

  // Mutations for invitations
  const inviteUser = useMutation(api.users.inviteUserToOrganization);

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

  // Filter search results based on current assignments and filter - MUST be called unconditionally
  const filteredSearchResults = useMemo(() => {
    if (!searchResults) return [];

    const currentTeamMemberIds = new Set(
      (form.watch("teamAccess.teamMembers") || []).map(m => m.userId)
    );
    const currentClientIds = new Set(
      (form.watch("teamAccess.clients") || []).map(c => c.userId)
    );

    return searchResults.filter((user: any) => {
      const isTeamMember = currentTeamMemberIds.has(user._id);
      const isClient = currentClientIds.has(user._id);
      const isAssigned = isTeamMember || isClient;

      switch (searchFilter) {
        case "members":
          return isAssigned;
        case "non-members":
          return !isAssigned;
        default:
          return true;
      }
    });
  }, [searchResults, form, searchFilter]);

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
        assignedAt: Date.now(),
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

  // Handle bulk add users
  const handleBulkAddUsers = (userIds: string[], type: "team" | "client") => {
    userIds.forEach(userId => {
      if (type === "team") {
        appendTeamMember({
          userId: userId as Id<"users">,
          role: "viewer",
          notifications: true,
          assignedAt: Date.now(),
        });
      } else {
        appendClient({
          userId: userId as Id<"users">,
          assignedAt: Date.now(),
        });
      }
    });

    toast.success(`${userIds.length} ${type === "team" ? "team members" : "clients"} added`);
    setSelectedUsers(new Set());
    setShowUserSearch(false);
  };

  // Handle bulk remove team members
  const handleBulkRemoveTeamMembers = () => {
    const teamMembers = form.watch("teamAccess.teamMembers") || [];
    const indicesToRemove = teamMemberFields
      .map((field, index) => ({ field, index }))
      .filter(({ index }) => selectedUsers.has(teamMembers[index]?.userId))
      .map(({ index }) => index)
      .sort((a, b) => b - a); // Remove from end to start to maintain indices

    indicesToRemove.forEach(index => removeTeamMember(index));
    
    toast.success(`${indicesToRemove.length} team members removed`);
    setSelectedUsers(new Set());
    setShowBulkActions(false);
  };

  // Handle bulk remove clients
  const handleBulkRemoveClients = () => {
    const clients = form.watch("teamAccess.clients") || [];
    const indicesToRemove = clientFields
      .map((field, index) => ({ field, index }))
      .filter(({ index }) => selectedUsers.has(clients[index]?.userId))
      .map(({ index }) => index)
      .sort((a, b) => b - a);

    indicesToRemove.forEach(index => removeClient(index));
    
    toast.success(`${indicesToRemove.length} clients removed`);
    setSelectedUsers(new Set());
    setShowBulkActions(false);
  };

  // Handle invite user
  const handleInviteUser = async () => {
    if (!organizationId || !inviteEmail.trim()) return;

    try {
      await inviteUser({
        organizationId,
        email: inviteEmail.trim(),
        role: inviteRole,
        message: inviteMessage.trim() || undefined,
      });

      toast.success("Invitation sent", {
        description: `An invitation has been sent to ${inviteEmail}`,
      });

      setShowInviteDialog(false);
      setInviteEmail("");
      setInviteMessage("");
      setInviteRole("viewer");
    } catch (error) {
      toast.error("Failed to send invitation", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };



  // Toggle user selection for bulk operations
  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  // Select all filtered users
  const selectAllUsers = () => {
    const allUserIds = new Set(filteredSearchResults.map((u: any) => u._id));
    setSelectedUsers(allUserIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedUsers(new Set());
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
              <Badge variant="secondary" className="ml-2">
                {teamMemberFields.length}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              {teamMemberFields.length > 1 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Bulk Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => setShowBulkActions(true)}
                      className="text-red-600"
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Remove Multiple
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Members
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedSearchType("team");
                      setShowUserSearch(true);
                    }}
                    disabled={teamMemberFields.length >= 50}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search & Add
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowInviteDialog(true)}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Invitation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
              <Badge variant="secondary" className="ml-2">
                {clientFields.length}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              {clientFields.length > 1 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Bulk Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => setShowBulkActions(true)}
                      className="text-red-600"
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Remove Multiple
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
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

      {/* Enhanced User Search Modal */}
      {showUserSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Add {selectedSearchType === "team" ? "Team Members" : "Clients"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowUserSearch(false);
                    setSearchTerm("");
                    setSelectedUsers(new Set());
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 overflow-hidden">
              {/* Search and Filter Controls */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
                <Select value={searchFilter} onValueChange={(value: any) => setSearchFilter(value)}>
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="members">Current Members</SelectItem>
                    <SelectItem value="non-members">Available Users</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Bulk Selection Controls */}
              {filteredSearchResults.length > 0 && (
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedUsers.size === filteredSearchResults.length && filteredSearchResults.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          selectAllUsers();
                        } else {
                          clearSelection();
                        }
                      }}
                    />
                    <span className="text-sm">
                      {selectedUsers.size > 0 
                        ? `${selectedUsers.size} selected`
                        : "Select all"
                      }
                    </span>
                  </div>
                  {selectedUsers.size > 0 && (
                    <Button
                      size="sm"
                      onClick={() => handleBulkAddUsers(Array.from(selectedUsers), selectedSearchType)}
                    >
                      Add {selectedUsers.size} {selectedSearchType === "team" ? "Members" : "Clients"}
                    </Button>
                  )}
                </div>
              )}

              {/* User List */}
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredSearchResults.length > 0 ? (
                  filteredSearchResults.map((user: any) => {
                    const isSelected = selectedUsers.has(user._id);
                    const currentTeamMemberIds = new Set(
                      (form.watch("teamAccess.teamMembers") || []).map(m => m.userId)
                    );
                    const currentClientIds = new Set(
                      (form.watch("teamAccess.clients") || []).map(c => c.userId)
                    );
                    const isTeamMember = currentTeamMemberIds.has(user._id);
                    const isClient = currentClientIds.has(user._id);

                    return (
                      <div
                        key={user._id}
                        className={cn(
                          "flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors",
                          isSelected && "bg-primary/10 border-primary"
                        )}
                        onClick={() => toggleUserSelection(user._id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleUserSelection(user._id)}
                        />
                        <Avatar className="h-10 w-10">
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
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {user.name || "Unknown User"}
                            </p>
                            {user.role && (
                              <Badge variant="outline" className="text-xs">
                                {user.role}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                          {(isTeamMember || isClient) && (
                            <div className="flex items-center gap-1 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {isTeamMember ? "Team Member" : "Client"}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddUser(user._id, selectedSearchType);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })
                ) : searchTerm.length >= 2 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No users found</p>
                    <p className="text-sm">Try a different search term or filter</p>
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

      {/* Bulk Actions Modal */}
      {showBulkActions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Bulk Remove {selectedSearchType === "team" ? "Team Members" : "Clients"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select {selectedSearchType === "team" ? "team members" : "clients"} to remove from the campaign.
              </p>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {selectedSearchType === "team" 
                  ? teamMemberFields.map((field, index) => {
                      const userId = form.watch(`teamAccess.teamMembers.${index}.userId` as any);
                      const userInfo = getUserInfo(userId);
                      const isCurrentUser = currentUser?._id === userId;
                      const isSelected = selectedUsers.has(userId);

                      if (!userInfo || isCurrentUser) return null;

                      return (
                        <div
                          key={field.id}
                          className={cn(
                            "flex items-center gap-3 p-3 border rounded-lg cursor-pointer",
                            isSelected && "bg-red-50 border-red-200"
                          )}
                          onClick={() => toggleUserSelection(userId)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleUserSelection(userId)}
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={userInfo.image} />
                            <AvatarFallback>{userInfo.initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{userInfo.name}</p>
                            <p className="text-sm text-muted-foreground">{userInfo.email}</p>
                          </div>
                        </div>
                      );
                    })
                  : clientFields.map((field, index) => {
                      const userId = form.watch(`teamAccess.clients.${index}.userId` as any);
                      const userInfo = getUserInfo(userId);
                      const isSelected = selectedUsers.has(userId);

                      if (!userInfo) return null;

                      return (
                        <div
                          key={field.id}
                          className={cn(
                            "flex items-center gap-3 p-3 border rounded-lg cursor-pointer",
                            isSelected && "bg-red-50 border-red-200"
                          )}
                          onClick={() => toggleUserSelection(userId)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleUserSelection(userId)}
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={userInfo.image} />
                            <AvatarFallback>{userInfo.initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{userInfo.name}</p>
                            <p className="text-sm text-muted-foreground">{userInfo.email}</p>
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </CardContent>
            <CardContent className="pt-0">
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBulkActions(false);
                    setSelectedUsers(new Set());
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={selectedSearchType === "team" ? handleBulkRemoveTeamMembers : handleBulkRemoveClients}
                  disabled={selectedUsers.size === 0}
                >
                  Remove {selectedUsers.size} {selectedSearchType === "team" ? "Members" : "Clients"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invite User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization and this campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer - Can view campaign data</SelectItem>
                  <SelectItem value="member">Member - Can edit campaign settings</SelectItem>
                  <SelectItem value="admin">Admin - Can manage team and settings</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="invite-message">Personal Message (Optional)</Label>
              <Textarea
                id="invite-message"
                placeholder="Add a personal message to the invitation..."
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteUser} disabled={!inviteEmail.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  const notifications = form.watch(`teamAccess.teamMembers.${index}.notifications`);
  const assignedAt = form.watch(`teamAccess.teamMembers.${index}.assignedAt`);
  const roleInfo = ROLE_OPTIONS.find((r) => r.value === role);

  if (!userInfo) {
    return (
      <div className="flex items-center justify-center p-4 border rounded-lg">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative">
              <Avatar className="h-12 w-12 ring-2 ring-background">
                <AvatarImage src={userInfo.image} />
                <AvatarFallback className="text-sm font-semibold">
                  {userInfo.initials}
                </AvatarFallback>
              </Avatar>
              {roleInfo && (
                <div className={cn(
                  "absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-background",
                  roleInfo.bgColor
                )}>
                  <roleInfo.icon className={cn("h-3 w-3", roleInfo.color)} />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-base truncate">{userInfo.name}</p>
                {isCurrentUser && (
                  <Badge variant="secondary" className="text-xs">
                    You
                  </Badge>
                )}
                {roleInfo && (
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", roleInfo.color, roleInfo.borderColor)}
                  >
                    <roleInfo.icon className="h-3 w-3 mr-1" />
                    {roleInfo.label}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate mb-2">
                {userInfo.email}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  Added {new Date(assignedAt).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  <span>{notifications ? "Notifications on" : "Notifications off"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <FormField
              control={form.control}
              name={`teamAccess.teamMembers.${index}.role`}
              render={({ field }) => (
                <FormItem>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isCurrentUser && role === "owner"}
                  >
                    <FormControl>
                      <SelectTrigger className="w-36">
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
                <FormItem>
                  <FormControl>
                    <div className="flex items-center gap-2 p-2 rounded-md border">
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
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {roleInfo && (
          <div
            className={cn(
              "mt-4 p-3 rounded-lg border",
              roleInfo.bgColor,
              roleInfo.borderColor
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <roleInfo.icon className={cn("h-4 w-4", roleInfo.color)} />
              <span className={cn("text-sm font-medium", roleInfo.color)}>
                {roleInfo.label} Permissions
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
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
  const form = useFormContext();
  const assignedAt = form.watch(`teamAccess.clients.${index}.assignedAt`);

  if (!userInfo) {
    return (
      <div className="flex items-center justify-center p-4 border rounded-lg">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative">
              <Avatar className="h-12 w-12 ring-2 ring-background">
                <AvatarImage src={userInfo.image} />
                <AvatarFallback className="text-sm font-semibold">
                  {userInfo.initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-background bg-green-50">
                <Eye className="h-3 w-3 text-green-600" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-base truncate">{userInfo.name}</p>
                <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                  <Eye className="h-3 w-3 mr-1" />
                  Client
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate mb-2">
                {userInfo.email}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  Added {new Date(assignedAt).toLocaleDateString()}
                </span>
                <span>View-only access</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <Badge variant="outline" className="text-xs text-green-600 border-green-200">
              <Eye className="h-3 w-3 mr-1" />
              View Only
            </Badge>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg border bg-green-50 border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-600">
              Client Permissions
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Can view campaign data, reports, and analytics but cannot make changes to campaign settings
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
