import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getOrCreateUserProfile } from "./users";
import { api } from "./_generated/api";

// Create a notification
export const createNotification = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("campaign_assignment"),
      v.literal("campaign_created"),
      v.literal("role_changed"),
      v.literal("campaign_updated"),
      v.literal("campaign_deleted"),
      v.literal("team_member_added"),
      v.literal("team_member_removed")
    ),
    title: v.string(),
    message: v.string(),
    campaignId: v.optional(v.id("campaigns")),
    organizationId: v.id("organizations"),
    metadata: v.optional(v.any()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      campaignId: args.campaignId,
      organizationId: args.organizationId,
      metadata: args.metadata,
      priority: args.priority || "medium",
      read: false,
      createdAt: now,
      updatedAt: now,
    });

    return notificationId;
  },
});

// Get notifications for a user
export const getUserNotifications = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
    unreadOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userProfile = await getOrCreateUserProfile(ctx);
    const userId = userProfile._id;

    let query = ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId));

    if (args.organizationId) {
      query = ctx.db
        .query("notifications")
        .withIndex("by_user_organization", (q) =>
          q.eq("userId", userId).eq("organizationId", args.organizationId!)
        );
    }

    let notifications = await query
      .order("desc")
      .take(args.limit || 50);

    if (args.unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }

    return notifications;
  },
});

// Mark notification as read
export const markNotificationAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const userProfile = await getOrCreateUserProfile(ctx);
    const userId = userProfile._id;
    
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== userId) {
      throw new Error("Not authorized to update this notification");
    }

    await ctx.db.patch(args.notificationId, {
      read: true,
      updatedAt: Date.now(),
    });

    return true;
  },
});

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = mutation({
  args: {
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const userProfile = await getOrCreateUserProfile(ctx);
    const userId = userProfile._id;

    let query = ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId));

    if (args.organizationId) {
      query = ctx.db
        .query("notifications")
        .withIndex("by_user_organization", (q) =>
          q.eq("userId", userId).eq("organizationId", args.organizationId!)
        );
    }

    const notifications = await query
      .filter((q) => q.eq(q.field("read"), false))
      .collect();

    const now = Date.now();
    for (const notification of notifications) {
      await ctx.db.patch(notification._id, {
        read: true,
        updatedAt: now,
      });
    }

    return notifications.length;
  },
});

// Delete notification
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const userProfile = await getOrCreateUserProfile(ctx);
    const userId = userProfile._id;
    
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== userId) {
      throw new Error("Not authorized to delete this notification");
    }

    await ctx.db.delete(args.notificationId);
    return true;
  },
});

// Get unread notification count
export const getUnreadNotificationCount = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const userProfile = await getOrCreateUserProfile(ctx);
    const userId = userProfile._id;

    let query = ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId));

    if (args.organizationId) {
      query = ctx.db
        .query("notifications")
        .withIndex("by_user_organization", (q) =>
          q.eq("userId", userId).eq("organizationId", args.organizationId!)
        );
    }

    const unreadNotifications = await query
      .filter((q) => q.eq(q.field("read"), false))
      .collect();

    return unreadNotifications.length;
  },
});

// Helper function to create team assignment notification
export const notifyTeamAssignment = mutation({
  args: {
    campaignId: v.id("campaigns"),
    assignedUserId: v.id("users"),
    assignedByUserId: v.id("users"),
    role: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get campaign details
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Get organization details
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    // Get assigner details
    const assignedByUser = await ctx.db.get(args.assignedByUserId);
    if (!assignedByUser) {
      throw new Error("Assigner user not found");
    }

    const title = "New Campaign Assignment";
    const message = `You have been assigned to the campaign "${campaign.name}" as ${args.role} by ${assignedByUser.name || assignedByUser.email}`;

    // Create notification
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.assignedUserId,
      type: "campaign_assignment",
      title,
      message,
      campaignId: args.campaignId,
      organizationId: args.organizationId,
      metadata: {
        role: args.role,
        assignedBy: args.assignedByUserId,
        campaignName: campaign.name,
      },
      priority: "medium",
      read: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Send email notification
    await ctx.runMutation(api.emailService.sendCampaignAssignmentEmail, {
      userId: args.assignedUserId,
      campaignName: campaign.name,
      role: args.role,
      assignedByUserId: args.assignedByUserId,
      organizationName: organization.name,
    });

    return notificationId;
  },
});

// Helper function to create campaign creation notification
export const notifyCampaignCreation = mutation({
  args: {
    campaignId: v.id("campaigns"),
    createdByUserId: v.id("users"),
    organizationId: v.id("organizations"),
    teamMemberIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Get campaign details
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Get organization details
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    // Get creator details
    const createdByUser = await ctx.db.get(args.createdByUserId);
    if (!createdByUser) {
      throw new Error("Creator user not found");
    }

    const title = "New Campaign Created";
    const message = `A new campaign "${campaign.name}" has been created by ${createdByUser.name || createdByUser.email}`;

    const now = Date.now();
    const notificationIds = [];

    // Notify all team members except the creator
    for (const userId of args.teamMemberIds) {
      if (userId !== args.createdByUserId) {
        const notificationId = await ctx.db.insert("notifications", {
          userId,
          type: "campaign_created",
          title,
          message,
          campaignId: args.campaignId,
          organizationId: args.organizationId,
          metadata: {
            createdBy: args.createdByUserId,
            campaignName: campaign.name,
          },
          priority: "medium",
          read: false,
          createdAt: now,
          updatedAt: now,
        });
        notificationIds.push(notificationId);

        // Send email notification
        await ctx.runMutation(api.emailService.sendCampaignCreationEmail, {
          userId,
          campaignName: campaign.name,
          createdByUserId: args.createdByUserId,
          organizationName: organization.name,
        });
      }
    }

    return notificationIds;
  },
});

// Helper function to create role change notification
export const notifyRoleChange = mutation({
  args: {
    campaignId: v.id("campaigns"),
    userId: v.id("users"),
    newRole: v.string(),
    changedByUserId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get campaign details
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Get changer details
    const changedByUser = await ctx.db.get(args.changedByUserId);
    if (!changedByUser) {
      throw new Error("Changer user not found");
    }

    const title = "Role Updated";
    const message = `Your role in campaign "${campaign.name}" has been changed to ${args.newRole} by ${changedByUser.name || changedByUser.email}`;

    // Create notification
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "role_changed",
      title,
      message,
      campaignId: args.campaignId,
      organizationId: args.organizationId,
      metadata: {
        newRole: args.newRole,
        changedBy: args.changedByUserId,
        campaignName: campaign.name,
      },
      priority: "medium",
      read: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Send email notification
    await ctx.runMutation(api.emailService.sendRoleChangeEmail, {
      userId: args.userId,
      campaignName: campaign.name,
      newRole: args.newRole,
      changedByUserId: args.changedByUserId,
    });

    return notificationId;
  },
});