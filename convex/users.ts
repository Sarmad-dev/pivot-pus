import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper function to get or create user
export async function getOrCreateUserProfile(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const userId = await getAuthUserId(ctx);

  // Get the user from the users table
  let user = await ctx.db.get(userId);

  if (!user) {
    throw new Error("User not found in auth system");
  }

  // Note: The users table from Convex auth has optional fields
  // We don't need to update them here, just return the user
  return user;
}

// Helper function to check organization membership
async function checkOrganizationMembership(
  ctx: any,
  userId: any,
  organizationId: any
) {
  const membership = await ctx.db
    .query("organizationMemberships")
    .withIndex("by_organization_user", (q: any) =>
      q.eq("organizationId", organizationId).eq("userId", userId)
    )
    .first();

  return membership?.status === "active" ? membership : null;
}

// Get current user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getOrCreateUserProfile(ctx);
    return user;
  },
});

// Update user profile
export const updateUserProfile = mutation({
  args: {
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    timezone: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUserProfile(ctx);

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.bio !== undefined) updates.bio = args.bio;
    if (args.timezone !== undefined) updates.timezone = args.timezone;
    if (args.language !== undefined) updates.language = args.language;

    await ctx.db.patch(user._id, updates);
    return user._id;
  },
});

// Search users within an organization
export const searchUsers = query({
  args: {
    searchTerm: v.string(),
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getOrCreateUserProfile(ctx);

    // Check if current user is a member of the organization
    const membership = await checkOrganizationMembership(
      ctx,
      currentUser._id,
      args.organizationId
    );
    if (!membership) {
      throw new Error("Not authorized to search users in this organization");
    }

    // Get all active members of the organization
    const memberships = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect();

    const userIds = memberships.map((m) => m.userId);

    // Search users by name or email
    const searchLower = args.searchTerm.toLowerCase();
    const users = [];

    for (const userId of userIds) {
      const user = await ctx.db.get(userId);
      if (user) {
        const nameMatch =
          user.name?.toLowerCase().includes(searchLower) || false;
        const emailMatch =
          user.email?.toLowerCase().includes(searchLower) || false;

        if (nameMatch || emailMatch) {
          // Get membership details
          const userMembership = memberships.find((m) => m.userId === userId);
          users.push({
            ...user,
            role: userMembership?.role,
            joinedAt: userMembership?.joinedAt,
          });
        }
      }
    }

    // Sort by name and limit results
    users.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return users.slice(0, args.limit || 20);
  },
});

// Get users by IDs
export const getUsersByIds = query({
  args: {
    userIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const users = [];

    for (const userId of args.userIds) {
      const user = await ctx.db.get(userId);
      if (user) {
        users.push(user);
      }
    }

    return users;
  },
});

// Get user by ID
export const getUserById = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user || null;
  },
});

// Get organization members
export const getOrganizationMembers = query({
  args: {
    organizationId: v.id("organizations"),
    role: v.optional(
      v.union(
        v.literal("owner"),
        v.literal("admin"),
        v.literal("member"),
        v.literal("viewer")
      )
    ),
    status: v.optional(
      v.union(v.literal("active"), v.literal("pending"), v.literal("suspended"))
    ),
  },
  handler: async (ctx, args) => {
    const currentUser = await getOrCreateUserProfile(ctx);

    // Check if current user is a member of the organization
    const membership = await checkOrganizationMembership(
      ctx,
      currentUser._id,
      args.organizationId
    );
    if (!membership) {
      throw new Error("Not authorized to view organization members");
    }

    let query = ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      );

    if (args.role) {
      query = ctx.db
        .query("organizationMemberships")
        .withIndex("by_organization_role", (q: any) =>
          q.eq("organizationId", args.organizationId).eq("role", args.role!)
        );
    }

    if (args.status) {
      query = ctx.db
        .query("organizationMemberships")
        .withIndex("by_organization_status", (q: any) =>
          q.eq("organizationId", args.organizationId).eq("status", args.status!)
        );
    }

    const memberships = await query.collect();

    // Get user details for each membership
    const members = [];
    for (const membership of memberships) {
      const user = await ctx.db.get(membership.userId);
      if (user) {
        members.push({
          ...user,
          membership: {
            role: membership.role,
            status: membership.status,
            joinedAt: membership.joinedAt,
            permissions: membership.permissions,
          },
        });
      }
    }

    return members.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  },
});

// Invite user to organization
export const inviteUserToOrganization = mutation({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getOrCreateUserProfile(ctx);

    // Check if current user can invite (must be owner or admin)
    const membership = await checkOrganizationMembership(
      ctx,
      currentUser._id,
      args.organizationId
    );
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      throw new Error("Not authorized to invite users to this organization");
    }

    // Check if user is already a member
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      const existingMembership = await checkOrganizationMembership(
        ctx,
        existingUser._id,
        args.organizationId
      );
      if (existingMembership) {
        throw new Error("User is already a member of this organization");
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await ctx.db
      .query("userInvitations")
      .withIndex("by_organization_email", (q) =>
        q.eq("organizationId", args.organizationId).eq("email", args.email)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingInvitation) {
      throw new Error("User already has a pending invitation");
    }

    // Create invitation
    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days

    const invitationId = await ctx.db.insert("userInvitations", {
      organizationId: args.organizationId,
      email: args.email,
      role: args.role,
      invitedBy: currentUser._id,
      invitedAt: now,
      expiresAt,
      status: "pending",
      message: args.message,
    });

    return invitationId;
  },
});

// Accept organization invitation
export const acceptOrganizationInvitation = mutation({
  args: {
    invitationId: v.id("userInvitations"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getOrCreateUserProfile(ctx);
    const invitation = await ctx.db.get(args.invitationId);

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("Invitation is no longer valid");
    }

    if (invitation.expiresAt < Date.now()) {
      // Mark as expired
      await ctx.db.patch(args.invitationId, { status: "expired" });
      throw new Error("Invitation has expired");
    }

    if (invitation.email !== currentUser.email) {
      throw new Error("This invitation is not for your email address");
    }

    // Check if user is already a member
    const existingMembership = await checkOrganizationMembership(
      ctx,
      currentUser._id,
      invitation.organizationId
    );
    if (existingMembership) {
      throw new Error("You are already a member of this organization");
    }

    const now = Date.now();

    // Create membership
    await ctx.db.insert("organizationMemberships", {
      organizationId: invitation.organizationId,
      userId: currentUser._id,
      role: invitation.role,
      invitedBy: invitation.invitedBy,
      invitedAt: invitation.invitedAt,
      joinedAt: now,
      status: "active",
      permissions: {
        canCreateCampaigns: invitation.role !== "viewer",
        canManageTeam: invitation.role === "admin",
        canViewAnalytics: true,
        canManageBilling: invitation.role === "admin",
      },
      createdAt: now,
      updatedAt: now,
    });

    // Mark invitation as accepted
    await ctx.db.patch(args.invitationId, {
      status: "accepted",
      acceptedBy: currentUser._id,
      acceptedAt: now,
    });

    return invitation.organizationId;
  },
});

// Get user's organization invitations
export const getUserInvitations = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getOrCreateUserProfile(ctx);

    const invitations = await ctx.db
      .query("userInvitations")
      .withIndex("by_email", (q) => q.eq("email", currentUser.email))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    // Get organization details for each invitation
    const invitationsWithOrgs = [];
    for (const invitation of invitations) {
      const organization = await ctx.db.get(invitation.organizationId);
      const invitedByUser = await ctx.db.get(invitation.invitedBy);

      if (organization && invitedByUser) {
        invitationsWithOrgs.push({
          ...invitation,
          organization,
          invitedByUser,
        });
      }
    }

    return invitationsWithOrgs;
  },
});

// Update organization member role
export const updateMemberRole = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const currentUser = await getOrCreateUserProfile(ctx);

    // Check if current user can manage team (must be owner or admin)
    const currentMembership = await checkOrganizationMembership(
      ctx,
      currentUser._id,
      args.organizationId
    );
    if (
      !currentMembership ||
      !["owner", "admin"].includes(currentMembership.role)
    ) {
      throw new Error("Not authorized to manage team members");
    }

    // Get target member
    const targetMembership = await checkOrganizationMembership(
      ctx,
      args.userId,
      args.organizationId
    );
    if (!targetMembership) {
      throw new Error("User is not a member of this organization");
    }

    // Cannot change owner role
    if (targetMembership.role === "owner") {
      throw new Error("Cannot change owner role");
    }

    // Update role and permissions
    await ctx.db.patch(targetMembership._id, {
      role: args.role,
      permissions: {
        canCreateCampaigns: args.role !== "viewer",
        canManageTeam: args.role === "admin",
        canViewAnalytics: true,
        canManageBilling: args.role === "admin",
      },
      updatedAt: Date.now(),
    });

    return targetMembership._id;
  },
});

// Remove organization member
export const removeMember = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getOrCreateUserProfile(ctx);

    // Check if current user can manage team (must be owner or admin)
    const currentMembership = await checkOrganizationMembership(
      ctx,
      currentUser._id,
      args.organizationId
    );
    if (
      !currentMembership ||
      !["owner", "admin"].includes(currentMembership.role)
    ) {
      throw new Error("Not authorized to remove team members");
    }

    // Get target member
    const targetMembership = await checkOrganizationMembership(
      ctx,
      args.userId,
      args.organizationId
    );
    if (!targetMembership) {
      throw new Error("User is not a member of this organization");
    }

    // Cannot remove owner
    if (targetMembership.role === "owner") {
      throw new Error("Cannot remove organization owner");
    }

    // Remove membership
    await ctx.db.delete(targetMembership._id);

    return true;
  },
});

// Create user profile after signup
export const createUserProfileAfterSignup = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Find the auth session to get the stable user ID
    const authSession = await ctx.db
      .query("authSessions")
      .filter((q: any) => q.eq(q.field("sessionId"), identity.subject))
      .first();

    if (!authSession) {
      throw new Error("Auth session not found");
    }

    const stableUserId = authSession.userId;

    // Check if user profile already exists
    // Get the user from the users table
    const user = await ctx.db.get(stableUserId);

    if (!user) {
      throw new Error("User not found");
    }

    // Update optional fields if provided
    const updates: any = {};
    if (args.name) updates.name = args.name;
    if (args.email) updates.email = args.email;
    if (args.image) updates.image = args.image;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(stableUserId, updates);
    }

    return stableUserId;
  },
});
