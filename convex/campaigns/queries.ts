import { query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { canViewCampaign, isDraftExpired } from "./helpers";
import { getOrCreateUserProfile } from "../users";
// Note: We now use getOrCreateUserProfile which works with the users table

// Get organization by slug
export const getOrganizationBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

// Get campaigns for an organization
export const getCampaignsByOrganization = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("active"),
        v.literal("paused"),
        v.literal("completed")
      )
    ),
  },
  handler: async (ctx, args) => {
    const userProfile = await getOrCreateUserProfile(ctx);
    const userId = userProfile._id;

    let query = ctx.db
      .query("campaigns")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      );

    if (args.status !== undefined) {
      query = ctx.db
        .query("campaigns")
        .withIndex("by_organization_status", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq(
              "status",
              args.status as "draft" | "active" | "paused" | "completed"
            )
        );
    }

    const campaigns = await query.collect();

    // Filter campaigns based on user permissions
    return campaigns.filter((campaign) => canViewCampaign(userId, campaign));
  },
});

// Get campaign by ID
export const getCampaignById = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const userProfile = await getOrCreateUserProfile(ctx);
    const userId = userProfile._id;
    const campaign = await ctx.db.get(args.campaignId);

    if (!campaign) {
      return null;
    }

    // Check if user has permission to view this campaign
    if (!canViewCampaign(userId, campaign)) {
      throw new Error("Not authorized to view this campaign");
    }

    return campaign;
  },
});

// Get campaigns created by user
export const getCampaignsByCreator = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("active"),
        v.literal("paused"),
        v.literal("completed")
      )
    ),
  },
  handler: async (ctx, args) => {
    const userProfile = await getOrCreateUserProfile(ctx);
    const userId = userProfile._id;

    if (args.status) {
      return await ctx.db
        .query("campaigns")
        .withIndex("by_creator", (q) => q.eq("createdBy", userId))
        .filter((q) => q.eq(q.field("status"), args.status))
        .collect();
    }

    return await ctx.db
      .query("campaigns")
      .withIndex("by_creator", (q) => q.eq("createdBy", userId))
      .collect();
  },
});

// Get campaign drafts for user
export const getCampaignDraftsByUser = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const userProfile = await getOrCreateUserProfile(ctx);
    const userId = userProfile._id;

    let query = ctx.db
      .query("campaignDrafts")
      .withIndex("by_user", (q) => q.eq("createdBy", userId));

    if (args.organizationId) {
      query = ctx.db
        .query("campaignDrafts")
        .withIndex("by_user_organization", (q) =>
          q
            .eq("createdBy", userId)
            .eq("organizationId", args.organizationId as Id<"organizations">)
        );
    }

    const drafts = await query.collect();

    // Filter out expired drafts
    return drafts.filter((draft) => !isDraftExpired(draft.expiresAt));
  },
});

// Get campaign draft by ID
export const getCampaignDraftById = query({
  args: { draftId: v.id("campaignDrafts") },
  handler: async (ctx, args) => {
    const userProfile = await getOrCreateUserProfile(ctx);
    const userId = userProfile._id;
    const draft = await ctx.db.get(args.draftId);

    if (!draft) {
      return null;
    }

    if (draft.createdBy !== userId) {
      throw new Error("Not authorized to view this draft");
    }

    // Check if draft is expired
    if (isDraftExpired(draft.expiresAt)) {
      return null;
    }

    return draft;
  },
});

// Get campaigns by import source
export const getCampaignsByImportSource = query({
  args: {
    platform: v.string(),
    externalId: v.string(),
  },
  handler: async (ctx, args) => {
    const userProfile = await getOrCreateUserProfile(ctx);
    const userId = userProfile._id;

    const campaigns = await ctx.db
      .query("campaigns")
      .withIndex("by_import_source", (q) =>
        q
          .eq("importSource.platform", args.platform)
          .eq("importSource.externalId", args.externalId)
      )
      .collect();

    // Filter campaigns based on user permissions
    return campaigns.filter((campaign) => canViewCampaign(userId, campaign));
  },
});

// Get campaign statistics for organization
export const getCampaignStats = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const userProfile = await getOrCreateUserProfile(ctx);
    const userId = userProfile._id;

    const campaigns = await ctx.db
      .query("campaigns")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter campaigns based on user permissions
    const visibleCampaigns = campaigns.filter((campaign) =>
      canViewCampaign(userId, campaign)
    );

    const stats = {
      total: visibleCampaigns.length,
      draft: visibleCampaigns.filter((c) => c.status === "draft").length,
      active: visibleCampaigns.filter((c) => c.status === "active").length,
      paused: visibleCampaigns.filter((c) => c.status === "paused").length,
      completed: visibleCampaigns.filter((c) => c.status === "completed")
        .length,
      totalBudget: visibleCampaigns.reduce((sum, c) => sum + c.budget, 0),
      averageBudget:
        visibleCampaigns.length > 0
          ? visibleCampaigns.reduce((sum, c) => sum + c.budget, 0) /
            visibleCampaigns.length
          : 0,
    };

    return stats;
  },
});

// Search campaigns
export const searchCampaigns = query({
  args: {
    organizationId: v.id("organizations"),
    searchTerm: v.string(),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("active"),
        v.literal("paused"),
        v.literal("completed")
      )
    ),
    category: v.optional(
      v.union(
        v.literal("pr"),
        v.literal("content"),
        v.literal("social"),
        v.literal("paid"),
        v.literal("mixed")
      )
    ),
  },
  handler: async (ctx, args) => {
    const userProfile = await getOrCreateUserProfile(ctx);
    const userId = userProfile._id;

    let campaigns = await ctx.db
      .query("campaigns")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter campaigns based on user permissions
    campaigns = campaigns.filter((campaign) =>
      canViewCampaign(userId, campaign)
    );

    // Apply search filters
    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      campaigns = campaigns.filter(
        (campaign) =>
          campaign.name.toLowerCase().includes(searchLower) ||
          campaign.description.toLowerCase().includes(searchLower)
      );
    }

    if (args.status) {
      campaigns = campaigns.filter(
        (campaign) => campaign.status === args.status
      );
    }

    if (args.category) {
      campaigns = campaigns.filter(
        (campaign) => campaign.category === args.category
      );
    }

    return campaigns;
  },
});

// Get expired drafts (for cleanup)
export const getExpiredDrafts = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    return await ctx.db
      .query("campaignDrafts")
      .withIndex("by_expiry", (q) => q.lt("expiresAt", now))
      .collect();
  },
});

// Get team members for a campaign
export const getCampaignTeamMembers = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const userProfile = await getOrCreateUserProfile(ctx);
    const userId = userProfile._id;
    const campaign = await ctx.db.get(args.campaignId);

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Check if user has permission to view team members
    if (!canViewCampaign(userId, campaign)) {
      throw new Error("Not authorized to view this campaign");
    }

    return {
      teamMembers: campaign.teamMembers,
      clients: campaign.clients,
      createdBy: campaign.createdBy,
    };
  },
});

// Get campaigns where user is a team member
export const getCampaignsAsTeamMember = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
    role: v.optional(
      v.union(v.literal("owner"), v.literal("editor"), v.literal("viewer"))
    ),
  },
  handler: async (ctx, args) => {
    const userProfile = await getOrCreateUserProfile(ctx);
    const userId = userProfile._id;

    let campaigns;

    if (args.organizationId) {
      campaigns = await ctx.db
        .query("campaigns")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId as Id<"organizations">)
        )
        .collect();
    } else {
      campaigns = await ctx.db.query("campaigns").collect();
    }

    // Filter campaigns where user is a team member
    return campaigns.filter((campaign) => {
      const teamMember = campaign.teamMembers.find(
        (member) => member.userId === userId
      );
      if (!teamMember) return false;

      if (args.role) {
        return teamMember.role === args.role;
      }

      return true;
    });
  },
});

// Get campaigns where user is a client
export const getCampaignsAsClient = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const userProfile = await getOrCreateUserProfile(ctx);
    const userId = userProfile._id;

    let campaigns;

    if (args.organizationId) {
      campaigns = await ctx.db
        .query("campaigns")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId as Id<"organizations">)
        )
        .collect();
    } else {
      campaigns = await ctx.db.query("campaigns").collect();
    }

    // Filter campaigns where user is a client
    return campaigns.filter((campaign) => {
      return campaign.clients.some((client) => client.userId === userId);
    });
  },
});

// Get user's campaign permissions
export const getUserCampaignPermissions = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const userProfile = await getOrCreateUserProfile(ctx);
    const userId = userProfile._id;
    const campaign = await ctx.db.get(args.campaignId);

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    const isCreator = campaign.createdBy === userId;
    const teamMember = campaign.teamMembers.find(
      (member) => member.userId === userId
    );
    const isClient = campaign.clients.some(
      (client) => client.userId === userId
    );

    return {
      canView: isCreator || !!teamMember || isClient,
      canEdit:
        isCreator ||
        teamMember?.role === "owner" ||
        teamMember?.role === "editor",
      canDelete: isCreator || teamMember?.role === "owner",
      canManageTeam: isCreator || teamMember?.role === "owner",
      canManageClients:
        isCreator ||
        teamMember?.role === "owner" ||
        teamMember?.role === "editor",
      role: isCreator
        ? "creator"
        : teamMember?.role || (isClient ? "client" : null),
    };
  },
});
