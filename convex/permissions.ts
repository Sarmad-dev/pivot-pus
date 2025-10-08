import { Id } from "./_generated/dataModel";

/**
 * Permission checking utilities for campaigns and organizations
 */

// Organization permission types
export type OrganizationPermission = 
  | "canCreateCampaigns"
  | "canManageTeam" 
  | "canViewAnalytics"
  | "canManageBilling";

// Campaign permission types
export type CampaignPermission =
  | "canView"
  | "canEdit"
  | "canDelete"
  | "canManageTeam"
  | "canManageClients"
  | "canPublish";

// User roles in organization
export type OrganizationRole = "owner" | "admin" | "member" | "viewer";

// User roles in campaign
export type CampaignRole = "owner" | "editor" | "viewer" | "client";

// Check if user has organization permission
export function hasOrganizationPermission(
  userRole: OrganizationRole,
  permission: OrganizationPermission
): boolean {
  const rolePermissions: Record<OrganizationRole, OrganizationPermission[]> = {
    owner: ["canCreateCampaigns", "canManageTeam", "canViewAnalytics", "canManageBilling"],
    admin: ["canCreateCampaigns", "canManageTeam", "canViewAnalytics", "canManageBilling"],
    member: ["canCreateCampaigns", "canViewAnalytics"],
    viewer: ["canViewAnalytics"],
  };

  return rolePermissions[userRole]?.includes(permission) || false;
}

// Check if user has campaign permission
export function hasCampaignPermission(
  userRole: CampaignRole | null,
  isCreator: boolean,
  permission: CampaignPermission
): boolean {
  // Creator always has all permissions
  if (isCreator) {
    return true;
  }

  if (!userRole) {
    return false;
  }

  const rolePermissions: Record<CampaignRole, CampaignPermission[]> = {
    owner: ["canView", "canEdit", "canDelete", "canManageTeam", "canManageClients", "canPublish"],
    editor: ["canView", "canEdit", "canManageClients", "canPublish"],
    viewer: ["canView"],
    client: ["canView"],
  };

  return rolePermissions[userRole]?.includes(permission) || false;
}

// Get user's effective role in campaign
export function getUserCampaignRole(
  userId: Id<"users">,
  campaign: {
    createdBy: Id<"users">;
    teamMembers: Array<{ userId: Id<"users">; role: string }>;
    clients: Array<{ userId: Id<"users"> }>;
  }
): { role: CampaignRole | null; isCreator: boolean } {
  const isCreator = campaign.createdBy === userId;
  
  if (isCreator) {
    return { role: "owner", isCreator: true };
  }

  // Check team member role
  const teamMember = campaign.teamMembers.find(member => member.userId === userId);
  if (teamMember) {
    return { 
      role: teamMember.role as CampaignRole, 
      isCreator: false 
    };
  }

  // Check if user is a client
  const isClient = campaign.clients.some(client => client.userId === userId);
  if (isClient) {
    return { role: "client", isCreator: false };
  }

  return { role: null, isCreator: false };
}

// Check if user can view campaign
export function canViewCampaign(
  userId: Id<"users">,
  campaign: {
    createdBy: Id<"users">;
    teamMembers: Array<{ userId: Id<"users">; role: string }>;
    clients: Array<{ userId: Id<"users"> }>;
  }
): boolean {
  const { role, isCreator } = getUserCampaignRole(userId, campaign);
  return hasCampaignPermission(role, isCreator, "canView");
}

// Check if user can edit campaign
export function canEditCampaign(
  userId: Id<"users">,
  campaign: {
    createdBy: Id<"users">;
    teamMembers: Array<{ userId: Id<"users">; role: string }>;
    clients: Array<{ userId: Id<"users"> }>;
  }
): boolean {
  const { role, isCreator } = getUserCampaignRole(userId, campaign);
  return hasCampaignPermission(role, isCreator, "canEdit");
}

// Check if user can delete campaign
export function canDeleteCampaign(
  userId: Id<"users">,
  campaign: {
    createdBy: Id<"users">;
    teamMembers: Array<{ userId: Id<"users">; role: string }>;
    clients: Array<{ userId: Id<"users"> }>;
  }
): boolean {
  const { role, isCreator } = getUserCampaignRole(userId, campaign);
  return hasCampaignPermission(role, isCreator, "canDelete");
}

// Check if user can manage team members
export function canManageTeamMembers(
  userId: Id<"users">,
  campaign: {
    createdBy: Id<"users">;
    teamMembers: Array<{ userId: Id<"users">; role: string }>;
    clients: Array<{ userId: Id<"users"> }>;
  }
): boolean {
  const { role, isCreator } = getUserCampaignRole(userId, campaign);
  return hasCampaignPermission(role, isCreator, "canManageTeam");
}

// Check if user can manage clients
export function canManageClients(
  userId: Id<"users">,
  campaign: {
    createdBy: Id<"users">;
    teamMembers: Array<{ userId: Id<"users">; role: string }>;
    clients: Array<{ userId: Id<"users"> }>;
  }
): boolean {
  const { role, isCreator } = getUserCampaignRole(userId, campaign);
  return hasCampaignPermission(role, isCreator, "canManageClients");
}

// Check if user can publish campaign
export function canPublishCampaign(
  userId: Id<"users">,
  campaign: {
    createdBy: Id<"users">;
    teamMembers: Array<{ userId: Id<"users">; role: string }>;
    clients: Array<{ userId: Id<"users"> }>;
  }
): boolean {
  const { role, isCreator } = getUserCampaignRole(userId, campaign);
  return hasCampaignPermission(role, isCreator, "canPublish");
}

// Validate team member assignment permissions
export function validateTeamMemberAssignment(
  assignerId: Id<"users">,
  targetUserId: Id<"users">,
  targetRole: string,
  campaign: {
    createdBy: Id<"users">;
    teamMembers: Array<{ userId: Id<"users">; role: string }>;
    clients: Array<{ userId: Id<"users"> }>;
  }
): { isValid: boolean; error?: string } {
  // Check if assigner has permission to manage team
  if (!canManageTeamMembers(assignerId, campaign)) {
    return { isValid: false, error: "Not authorized to manage team members" };
  }

  // Cannot assign creator as team member
  if (targetUserId === campaign.createdBy) {
    return { isValid: false, error: "Campaign creator is automatically an owner" };
  }

  // Check if user is already a team member
  const existingMember = campaign.teamMembers.find(member => member.userId === targetUserId);
  if (existingMember) {
    return { isValid: false, error: "User is already a team member" };
  }

  // Check if user is already a client
  const isClient = campaign.clients.some(client => client.userId === targetUserId);
  if (isClient) {
    return { isValid: false, error: "User is already assigned as a client" };
  }

  // Validate role
  const validRoles = ["owner", "editor", "viewer"];
  if (!validRoles.includes(targetRole)) {
    return { isValid: false, error: "Invalid role specified" };
  }

  return { isValid: true };
}

// Validate team member removal permissions
export function validateTeamMemberRemoval(
  removerId: Id<"users">,
  targetUserId: Id<"users">,
  campaign: {
    createdBy: Id<"users">;
    teamMembers: Array<{ userId: Id<"users">; role: string }>;
    clients: Array<{ userId: Id<"users"> }>;
  }
): { isValid: boolean; error?: string } {
  // Check if remover has permission to manage team
  if (!canManageTeamMembers(removerId, campaign)) {
    return { isValid: false, error: "Not authorized to manage team members" };
  }

  // Cannot remove campaign creator
  if (targetUserId === campaign.createdBy) {
    return { isValid: false, error: "Cannot remove campaign creator" };
  }

  // Find the member to remove
  const memberToRemove = campaign.teamMembers.find(member => member.userId === targetUserId);
  if (!memberToRemove) {
    return { isValid: false, error: "User is not a team member" };
  }

  // If removing an owner, ensure at least one owner remains
  if (memberToRemove.role === "owner") {
    const remainingOwners = campaign.teamMembers.filter(member => 
      member.role === "owner" && member.userId !== targetUserId
    );
    
    if (remainingOwners.length === 0) {
      return { isValid: false, error: "Cannot remove the last owner from campaign" };
    }
  }

  return { isValid: true };
}

// Validate role change permissions
export function validateRoleChange(
  changerId: Id<"users">,
  targetUserId: Id<"users">,
  newRole: string,
  campaign: {
    createdBy: Id<"users">;
    teamMembers: Array<{ userId: Id<"users">; role: string }>;
    clients: Array<{ userId: Id<"users"> }>;
  }
): { isValid: boolean; error?: string } {
  // Check if changer has permission to manage team
  if (!canManageTeamMembers(changerId, campaign)) {
    return { isValid: false, error: "Not authorized to manage team members" };
  }

  // Cannot change role of campaign creator
  if (targetUserId === campaign.createdBy) {
    return { isValid: false, error: "Cannot change role of campaign creator" };
  }

  // Validate new role
  const validRoles = ["owner", "editor", "viewer"];
  if (!validRoles.includes(newRole)) {
    return { isValid: false, error: "Invalid role specified" };
  }

  // Find current member
  const currentMember = campaign.teamMembers.find(member => member.userId === targetUserId);
  if (!currentMember) {
    return { isValid: false, error: "User is not a team member" };
  }

  // If changing from owner to non-owner, ensure at least one owner remains
  if (currentMember.role === "owner" && newRole !== "owner") {
    const remainingOwners = campaign.teamMembers.filter(member => 
      member.role === "owner" && member.userId !== targetUserId
    );
    
    if (remainingOwners.length === 0) {
      return { isValid: false, error: "Cannot remove the last owner from campaign" };
    }
  }

  return { isValid: true };
}

// Get user's organization role from membership
export function getUserOrganizationRole(
  membership: {
    role: string;
    status: string;
    permissions?: {
      canCreateCampaigns: boolean;
      canManageTeam: boolean;
      canViewAnalytics: boolean;
      canManageBilling: boolean;
    };
  } | null
): OrganizationRole | null {
  if (!membership || membership.status !== "active") {
    return null;
  }

  return membership.role as OrganizationRole;
}

// Check organization membership and permissions
export function checkOrganizationAccess(
  userId: Id<"users">,
  organizationId: Id<"organizations">,
  membership: {
    organizationId: Id<"organizations">;
    userId: Id<"users">;
    role: string;
    status: string;
  } | null,
  requiredPermission?: OrganizationPermission
): { hasAccess: boolean; role: OrganizationRole | null; error?: string } {
  if (!membership || membership.status !== "active") {
    return { 
      hasAccess: false, 
      role: null, 
      error: "Not a member of this organization" 
    };
  }

  if (membership.organizationId !== organizationId || membership.userId !== userId) {
    return { 
      hasAccess: false, 
      role: null, 
      error: "Invalid organization membership" 
    };
  }

  const role = getUserOrganizationRole(membership);
  if (!role) {
    return { 
      hasAccess: false, 
      role: null, 
      error: "Invalid organization role" 
    };
  }

  if (requiredPermission && !hasOrganizationPermission(role, requiredPermission)) {
    return { 
      hasAccess: false, 
      role, 
      error: `Insufficient permissions: ${requiredPermission} required` 
    };
  }

  return { hasAccess: true, role };
}