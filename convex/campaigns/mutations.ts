import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import {
  validateCampaignData,
  validateDraftData,
  validateCampaignForPublication,
} from "./validation";
import {
  calculateDraftExpiry,
  validateTeamMemberAssignment,
  validateClientAssignment,
} from "./helpers";
import { getOrCreateUserProfile } from "../users";
import {
  canEditCampaign,
  canDeleteCampaign,
  canManageTeamMembers,
  canManageClients,
  canPublishCampaign,
  validateTeamMemberAssignment as validateTeamAssignment,
  validateTeamMemberRemoval as validateTeamRemoval,
  validateRoleChange as validateRoleChangePermission,
  checkOrganizationAccess,
} from "../permissions";
import {
  createNotification,
  notifyTeamAssignment,
  notifyCampaignCreation,
  notifyRoleChange,
} from "../notifications";
// Note: Now using getOrCreateUserProfile from users module and new permission/notification systems

// Create a new campaign
export const createCampaign = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    budget: v.number(),
    currency: v.optional(v.string()),
    category: v.union(
      v.literal("pr"),
      v.literal("content"),
      v.literal("social"),
      v.literal("paid"),
      v.literal("mixed")
    ),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    organizationId: v.id("organizations"),
    audiences: v.optional(v.array(v.any())),
    channels: v.optional(v.array(v.any())),
    kpis: v.optional(v.array(v.any())),
    customMetrics: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const userProfile = await getOrCreateUserProfile(ctx);
    const now = Date.now();

    // Validate organization exists
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const campaignData = {
      name: args.name,
      description: args.description,
      status: "draft" as const,
      startDate: args.startDate,
      endDate: args.endDate,
      createdAt: now,
      updatedAt: now,
      budget: args.budget,
      currency: args.currency || "USD",
      budgetAllocation: {
        channels: {},
      },
      category: args.category,
      priority: args.priority || "medium",
      audiences: args.audiences || [],
      channels: args.channels || [],
      kpis: args.kpis || [],
      customMetrics: args.customMetrics || [],
      organizationId: args.organizationId,
      createdBy: userProfile._id,
      teamMembers: [
        {
          userId: userProfile._id,
          role: "owner" as const,
          assignedAt: now,
        },
      ],
      clients: [],
    };

    // Validate campaign data
    const validation = validateCampaignData(campaignData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    const campaignId = await ctx.db.insert("campaigns", campaignData);
    return campaignId;
  },
});

// Create campaign from complete wizard data
export const createCampaignFromWizard = mutation({
  args: {
    campaignData: v.any(), // Complete campaign form data
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const userProfile = await getOrCreateUserProfile(ctx);
    const now = Date.now();

    // Validate organization exists
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const { basics, audienceChannels, kpisMetrics, teamAccess } =
      args.campaignData;

    if (!basics || !audienceChannels || !kpisMetrics || !teamAccess) {
      throw new Error("Incomplete campaign data");
    }

    // Transform wizard data to campaign schema
    const campaignData = {
      // Basic Information
      name: basics.name,
      description: basics.description,
      status: "active" as const, // Set to active when created from preview
      startDate:
        typeof basics.startDate === "number"
          ? basics.startDate
          : basics.startDate instanceof Date
            ? basics.startDate.getTime()
            : typeof basics.startDate === "string"
              ? new Date(basics.startDate).getTime()
              : (() => {
                  const timestamp = Number(basics.startDate);
                  if (isNaN(timestamp)) {
                    throw new Error(`Invalid start date: ${basics.startDate}`);
                  }
                  return timestamp;
                })(),
      endDate:
        typeof basics.endDate === "number"
          ? basics.endDate
          : basics.endDate instanceof Date
            ? basics.endDate.getTime()
            : typeof basics.endDate === "string"
              ? new Date(basics.endDate).getTime()
              : (() => {
                  const timestamp = Number(basics.endDate);
                  if (isNaN(timestamp)) {
                    throw new Error(`Invalid end date: ${basics.endDate}`);
                  }
                  return timestamp;
                })(),
      createdAt: now,
      updatedAt: now,

      // Budget
      budget: basics.budget,
      currency: basics.currency,
      budgetAllocation: {
        channels: audienceChannels.budgetAllocation,
      },

      // Campaign Details
      category: basics.category,
      priority: basics.priority,

      // Audience & Targeting
      audiences: audienceChannels.audiences,

      // Channels
      channels: audienceChannels.channels,

      // KPIs and Metrics
      kpis: kpisMetrics.primaryKPIs,
      customMetrics: kpisMetrics.customMetrics,

      // Access Control
      organizationId: args.organizationId,
      createdBy: userProfile._id,
      teamMembers:
        teamAccess.teamMembers.length > 0
          ? teamAccess.teamMembers.map((member: any) => ({
              ...member,
              assignedAt: member.assignedAt || now, // Ensure assignedAt is set
            }))
          : [
              {
                userId: userProfile._id,
                role: "owner" as const,
                assignedAt: now,
              },
            ],
      clients: teamAccess.clients || [],
    };

    // Validate campaign data
    const validation = validateCampaignData(campaignData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    const campaignId = await ctx.db.insert("campaigns", campaignData);

    // Send notifications to team members about campaign creation
    const teamMemberIds = campaignData.teamMembers.map((member: any) => member.userId);
    if (teamMemberIds.length > 1) { // Only notify if there are team members besides creator
      await ctx.runMutation(api.notifications.notifyCampaignCreation, {
        campaignId,
        createdByUserId: userProfile._id,
        organizationId: args.organizationId,
        teamMemberIds,
      });
    }

    // Clean up any related drafts for this user/organization
    const userDrafts = await ctx.db
      .query("campaignDrafts")
      .withIndex("by_user_organization", (q) =>
        q
          .eq("createdBy", userProfile._id)
          .eq("organizationId", args.organizationId)
      )
      .collect();

    // Delete drafts that might be related to this campaign
    for (const draft of userDrafts) {
      if (draft.data?.basics?.name === basics.name) {
        await ctx.db.delete(draft._id);
      }
    }

    return campaignId;
  },
});

// Create or update a campaign draft
export const saveCampaignDraft = mutation({
  args: {
    name: v.string(),
    data: v.any(),
    step: v.number(),
    organizationId: v.id("organizations"),
    draftId: v.optional(v.id("campaignDrafts")),
  },
  handler: async (ctx, args) => {
    const userProfile = await getOrCreateUserProfile(ctx);
    const userId = userProfile._id;
    const now = Date.now();

    // Validate organization exists
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const draftData = {
      name: args.name,
      data: args.data,
      step: args.step,
      createdBy: userId,
      organizationId: args.organizationId,
      updatedAt: now,
    };

    // Validate draft data
    const validation = validateDraftData({
      ...draftData,
      createdAt: now,
      expiresAt: calculateDraftExpiry(now),
    });

    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    if (args.draftId) {
      // Update existing draft
      const existingDraft = await ctx.db.get(args.draftId);
      if (!existingDraft) {
        throw new Error("Draft not found");
      }

      if (existingDraft.createdBy !== userId) {
        throw new Error("Not authorized to update this draft");
      }

      await ctx.db.patch(args.draftId, draftData);
      return args.draftId;
    } else {
      // Create new draft
      const fullDraftData = {
        ...draftData,
        createdAt: now,
        expiresAt: calculateDraftExpiry(now),
      };

      const draftId = await ctx.db.insert("campaignDrafts", fullDraftData);
      return draftId;
    }
  },
});

// Update campaign
export const updateCampaign = mutation({
  args: {
    campaignId: v.id("campaigns"),
    updates: v.any(),
  },
  handler: async (ctx, args) => {
    const userProfile = await getOrCreateUserProfile(ctx);
    const userId = userProfile._id;
    const campaign = await ctx.db.get(args.campaignId);

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Check permissions using new permission system
    if (!canEditCampaign(userId, campaign)) {
      throw new Error("Not authorized to update this campaign");
    }

    const updatedData = {
      ...campaign,
      ...args.updates,
      updatedAt: Date.now(),
    };

    // Validate updated campaign data
    const validation = validateCampaignData(updatedData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    await ctx.db.patch(args.campaignId, {
      ...args.updates,
      updatedAt: Date.now(),
    });

    // Notify team members about campaign update (except the updater)
    const teamMemberIds = campaign.teamMembers
      .filter((member: any) => member.userId !== userId && member.notifications !== false)
      .map((member: any) => member.userId);

    for (const memberId of teamMemberIds) {
      await ctx.runMutation(api.notifications.createNotification, {
        userId: memberId,
        type: "campaign_updated",
        title: "Campaign Updated",
        message: `The campaign "${campaign.name}" has been updated`,
        campaignId: args.campaignId,
        organizationId: campaign.organizationId,
        metadata: {
          updatedBy: userId,
          campaignName: campaign.name,
        },
        priority: "low",
      });
    }

    return args.campaignId;
  },
});

// Delete campaign draft
export const deleteCampaignDraft = mutation({
  args: {
    draftId: v.id("campaignDrafts"),
  },
  handler: async (ctx, args) => {
    const userProfile = await getOrCreateUserProfile(ctx);
    const userId = userProfile._id;
    const draft = await ctx.db.get(args.draftId);

    if (!draft) {
      throw new Error("Draft not found");
    }

    if (draft.createdBy !== userId) {
      throw new Error("Not authorized to delete this draft");
    }

    await ctx.db.delete(args.draftId);
    return true;
  },
});

// Add team member to campaign
export const addTeamMember = mutation({
  args: {
    campaignId: v.id("campaigns"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("editor"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const currentUserProfile = await getOrCreateUserProfile(ctx);
    const currentUserId = currentUserProfile._id;
    const campaign = await ctx.db.get(args.campaignId);

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Check permissions using new permission system
    if (!canManageTeamMembers(currentUserId, campaign)) {
      throw new Error("Not authorized to manage team members");
    }

    // Validate team member assignment using new permission system
    const validation = validateTeamAssignment(
      currentUserId,
      args.userId,
      args.role,
      campaign
    );
    if (!validation.isValid) {
      throw new Error(validation.error!);
    }

    const newTeamMember = {
      userId: args.userId,
      role: args.role,
      assignedAt: Date.now(),
      notifications: true, // Default to notifications enabled
    };

    await ctx.db.patch(args.campaignId, {
      teamMembers: [...campaign.teamMembers, newTeamMember],
      updatedAt: Date.now(),
    });

    // Send notification to the assigned user
    await ctx.runMutation(api.notifications.notifyTeamAssignment, {
      campaignId: args.campaignId,
      assignedUserId: args.userId,
      assignedByUserId: currentUserId,
      role: args.role,
      organizationId: campaign.organizationId,
    });

    return true;
  },
});

// Remove team member from campaign
export const removeTeamMember = mutation({
  args: {
    campaignId: v.id("campaigns"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserProfile = await getOrCreateUserProfile(ctx);
    const currentUserId = currentUserProfile._id;
    const campaign = await ctx.db.get(args.campaignId);

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Check permissions using new permission system
    if (!canManageTeamMembers(currentUserId, campaign)) {
      throw new Error("Not authorized to manage team members");
    }

    // Validate team member removal using new permission system
    const validation = validateTeamRemoval(
      currentUserId,
      args.userId,
      campaign
    );
    if (!validation.isValid) {
      throw new Error(validation.error!);
    }

    const updatedTeamMembers = campaign.teamMembers.filter(
      (member) => member.userId !== args.userId
    );

    await ctx.db.patch(args.campaignId, {
      teamMembers: updatedTeamMembers,
      updatedAt: Date.now(),
    });

    // Send notification to the removed user
    await ctx.runMutation(api.notifications.createNotification, {
      userId: args.userId,
      type: "team_member_removed",
      title: "Removed from Campaign",
      message: `You have been removed from the campaign "${campaign.name}"`,
      campaignId: args.campaignId,
      organizationId: campaign.organizationId,
      metadata: {
        campaignName: campaign.name,
        removedBy: currentUserId,
      },
      priority: "medium",
    });

    return true;
  },
});

// Update team member role
export const updateTeamMemberRole = mutation({
  args: {
    campaignId: v.id("campaigns"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("editor"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const currentUserProfile = await getOrCreateUserProfile(ctx);
    const currentUserId = currentUserProfile._id;
    const campaign = await ctx.db.get(args.campaignId);

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Check permissions using new permission system
    if (!canManageTeamMembers(currentUserId, campaign)) {
      throw new Error("Not authorized to manage team members");
    }

    // Validate role change using new permission system
    const validation = validateRoleChangePermission(
      currentUserId,
      args.userId,
      args.role,
      campaign
    );
    if (!validation.isValid) {
      throw new Error(validation.error!);
    }

    // Find the team member
    const memberIndex = campaign.teamMembers.findIndex(
      (member) => member.userId === args.userId
    );
    const currentMember = campaign.teamMembers[memberIndex];

    const updatedTeamMembers = [...campaign.teamMembers];
    updatedTeamMembers[memberIndex] = {
      ...currentMember,
      role: args.role,
    };

    await ctx.db.patch(args.campaignId, {
      teamMembers: updatedTeamMembers,
      updatedAt: Date.now(),
    });

    // Send notification to the user about role change
    await ctx.runMutation(api.notifications.notifyRoleChange, {
      campaignId: args.campaignId,
      userId: args.userId,
      newRole: args.role,
      changedByUserId: currentUserId,
      organizationId: campaign.organizationId,
    });

    return true;
  },
});

// Add client to campaign
export const addClient = mutation({
  args: {
    campaignId: v.id("campaigns"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserProfile = await getOrCreateUserProfile(ctx);
    const currentUserId = currentUserProfile._id;
    const campaign = await ctx.db.get(args.campaignId);

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Check permissions using new permission system
    if (!canManageClients(currentUserId, campaign)) {
      throw new Error("Not authorized to manage clients");
    }

    // Validate client assignment
    const validation = validateClientAssignment(args.userId, campaign);
    if (!validation.isValid) {
      throw new Error(validation.error!);
    }

    const newClient = {
      userId: args.userId,
      assignedAt: Date.now(),
    };

    await ctx.db.patch(args.campaignId, {
      clients: [...campaign.clients, newClient],
      updatedAt: Date.now(),
    });

    // Send notification to the assigned client
    await ctx.runMutation(api.notifications.createNotification, {
      userId: args.userId,
      type: "campaign_assignment",
      title: "Added as Campaign Client",
      message: `You have been added as a client to the campaign "${campaign.name}"`,
      campaignId: args.campaignId,
      organizationId: campaign.organizationId,
      metadata: {
        role: "client",
        assignedBy: currentUserId,
        campaignName: campaign.name,
      },
      priority: "medium",
    });

    return true;
  },
});

// Remove client from campaign
export const removeClient = mutation({
  args: {
    campaignId: v.id("campaigns"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserProfile = await getOrCreateUserProfile(ctx);
    const currentUserId = currentUserProfile._id;
    const campaign = await ctx.db.get(args.campaignId);

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Check permissions using new permission system
    if (!canManageClients(currentUserId, campaign)) {
      throw new Error("Not authorized to manage clients");
    }

    // Check if user is a client
    const clientExists = campaign.clients.find(
      (client) => client.userId === args.userId
    );
    if (!clientExists) {
      throw new Error("User is not a client");
    }

    const updatedClients = campaign.clients.filter(
      (client) => client.userId !== args.userId
    );

    await ctx.db.patch(args.campaignId, {
      clients: updatedClients,
      updatedAt: Date.now(),
    });

    // Send notification to the removed client
    await ctx.runMutation(api.notifications.createNotification, {
      userId: args.userId,
      type: "team_member_removed",
      title: "Removed from Campaign",
      message: `You have been removed as a client from the campaign "${campaign.name}"`,
      campaignId: args.campaignId,
      organizationId: campaign.organizationId,
      metadata: {
        campaignName: campaign.name,
        removedBy: currentUserId,
        role: "client",
      },
      priority: "medium",
    });

    return true;
  },
});

// Delete campaign
export const deleteCampaign = mutation({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    const currentUserProfile = await getOrCreateUserProfile(ctx);
    const currentUserId = currentUserProfile._id;
    const campaign = await ctx.db.get(args.campaignId);

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Check permissions using new permission system
    if (!canDeleteCampaign(currentUserId, campaign)) {
      throw new Error("Not authorized to delete this campaign");
    }

    // Cannot delete active campaigns
    if (campaign.status === "active") {
      throw new Error(
        "Cannot delete active campaigns. Please pause or complete the campaign first."
      );
    }

    // Notify team members about campaign deletion (except the deleter)
    const teamMemberIds = campaign.teamMembers
      .filter((member: any) => member.userId !== currentUserId && member.notifications !== false)
      .map((member: any) => member.userId);

    for (const memberId of teamMemberIds) {
      await ctx.runMutation(api.notifications.createNotification, {
        userId: memberId,
        type: "campaign_deleted",
        title: "Campaign Deleted",
        message: `The campaign "${campaign.name}" has been deleted`,
        organizationId: campaign.organizationId,
        metadata: {
          deletedBy: currentUserId,
          campaignName: campaign.name,
        },
        priority: "medium",
      });
    }

    await ctx.db.delete(args.campaignId);
    return true;
  },
});

// Publish campaign (change from draft to active)
export const publishCampaign = mutation({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    const currentUserProfile = await getOrCreateUserProfile(ctx);
    const currentUserId = currentUserProfile._id;
    const campaign = await ctx.db.get(args.campaignId);

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Check permissions using new permission system
    if (!canPublishCampaign(currentUserId, campaign)) {
      throw new Error("Not authorized to publish this campaign");
    }

    // Can only publish draft campaigns
    if (campaign.status !== "draft") {
      throw new Error("Only draft campaigns can be published");
    }

    // Validate campaign is ready for publication
    const validation = validateCampaignForPublication(campaign);
    if (!validation.isValid) {
      throw new Error(
        `Cannot publish campaign: ${validation.errors.join(", ")}`
      );
    }

    await ctx.db.patch(args.campaignId, {
      status: "active",
      updatedAt: Date.now(),
    });

    // Notify team members about campaign publication (except the publisher)
    const teamMemberIds = campaign.teamMembers
      .filter((member: any) => member.userId !== currentUserId && member.notifications !== false)
      .map((member: any) => member.userId);

    for (const memberId of teamMemberIds) {
      await ctx.runMutation(api.notifications.createNotification, {
        userId: memberId,
        type: "campaign_updated",
        title: "Campaign Published",
        message: `The campaign "${campaign.name}" has been published and is now active`,
        campaignId: args.campaignId,
        organizationId: campaign.organizationId,
        metadata: {
          publishedBy: currentUserId,
          campaignName: campaign.name,
          action: "published",
        },
        priority: "medium",
      });
    }

    return true;
  },
});

// Update campaign status
export const updateCampaignStatus = mutation({
  args: {
    campaignId: v.id("campaigns"),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed")
    ),
  },
  handler: async (ctx, args) => {
    const currentUserProfile = await getOrCreateUserProfile(ctx);
    const currentUserId = currentUserProfile._id;
    const campaign = await ctx.db.get(args.campaignId);

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Check permissions using new permission system
    if (!canEditCampaign(currentUserId, campaign)) {
      throw new Error("Not authorized to update this campaign");
    }

    // Validate status transitions
    const currentStatus = campaign.status;
    const newStatus = args.status;

    // Define valid status transitions
    const validTransitions: Record<string, string[]> = {
      draft: ["active"],
      active: ["paused", "completed"],
      paused: ["active", "completed"],
      completed: [], // Cannot transition from completed
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }

    // Additional validation for specific transitions
    if (newStatus === "active" && currentStatus === "draft") {
      const validation = validateCampaignForPublication(campaign);
      if (!validation.isValid) {
        throw new Error(
          `Cannot activate campaign: ${validation.errors.join(", ")}`
        );
      }
    }

    await ctx.db.patch(args.campaignId, {
      status: newStatus,
      updatedAt: Date.now(),
    });

    // Notify team members about status change (except the updater)
    const teamMemberIds = campaign.teamMembers
      .filter((member: any) => member.userId !== currentUserId && member.notifications !== false)
      .map((member: any) => member.userId);

    const statusMessages = {
      active: "activated",
      paused: "paused",
      completed: "completed",
      draft: "moved to draft",
    };

    for (const memberId of teamMemberIds) {
      await ctx.runMutation(api.notifications.createNotification, {
        userId: memberId,
        type: "campaign_updated",
        title: "Campaign Status Updated",
        message: `The campaign "${campaign.name}" has been ${statusMessages[newStatus]}`,
        campaignId: args.campaignId,
        organizationId: campaign.organizationId,
        metadata: {
          updatedBy: currentUserId,
          campaignName: campaign.name,
          oldStatus: currentStatus,
          newStatus: newStatus,
        },
        priority: "medium",
      });
    }

    return true;
  },
});

// Import campaign from external platform
export const importCampaignFromPlatform = mutation({
  args: {
    campaignData: v.object({
      name: v.string(),
      description: v.string(),
      startDate: v.number(),
      endDate: v.number(),
      budget: v.number(),
      currency: v.string(),
      category: v.union(
        v.literal("pr"),
        v.literal("content"),
        v.literal("social"),
        v.literal("paid"),
        v.literal("mixed")
      ),
      priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
      audiences: v.array(v.any()),
      channels: v.array(v.any()),
      kpis: v.array(v.any()),
      customMetrics: v.array(v.any()),
      budgetAllocation: v.object({
        channels: v.any(),
      }),
      importSource: v.object({
        platform: v.string(),
        externalId: v.string(),
        importedAt: v.number(),
      }),
    }),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const userProfile = await getOrCreateUserProfile(ctx);
    const now = Date.now();

    // Validate organization exists
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    // Check if campaign with same external ID already exists
    const existingCampaign = await ctx.db
      .query("campaigns")
      .withIndex("by_import_source", (q) =>
        q
          .eq("importSource.platform", args.campaignData.importSource.platform)
          .eq("importSource.externalId", args.campaignData.importSource.externalId)
      )
      .first();

    if (existingCampaign) {
      throw new Error(
        `Campaign already imported from ${args.campaignData.importSource.platform} (ID: ${args.campaignData.importSource.externalId})`
      );
    }

    const campaignData = {
      ...args.campaignData,
      status: "active" as const,
      createdAt: now,
      updatedAt: now,
      organizationId: args.organizationId,
      createdBy: userProfile._id,
      teamMembers: [
        {
          userId: userProfile._id,
          role: "owner" as const,
          assignedAt: now,
        },
      ],
      clients: [],
    };

    // Validate campaign data
    const validation = validateCampaignData(campaignData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    const campaignId = await ctx.db.insert("campaigns", campaignData);
    return campaignId;
  },
});
