import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const schema = defineSchema({
  ...authTables,

  // Extend the users table from authTables with additional profile fields
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    // Additional profile fields
    bio: v.optional(v.string()),
    timezone: v.optional(v.string()),
    language: v.optional(v.string()),
    // Metadata
    updatedAt: v.optional(v.number()),
  }).index("email", ["email"]),

  // Organizations table
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    image: v.optional(v.string()),

    // Settings
    settings: v.object({
      defaultCurrency: v.string(),
      timezone: v.string(),
      allowPublicJoin: v.optional(v.boolean()), // Optional for backward compatibility
      requireInviteApproval: v.optional(v.boolean()), // Optional for backward compatibility
    }),

    // Metadata
    createdBy: v.optional(v.id("users")), // Optional for backward compatibility
    createdAt: v.number(),
    updatedAt: v.optional(v.number()), // Optional for backward compatibility
  })
    .index("by_slug", ["slug"])
    .index("by_creator", ["createdBy"]),

  // Organization memberships
  organizationMemberships: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("member"),
      v.literal("viewer")
    ),

    // Invitation details
    invitedBy: v.optional(v.id("users")),
    invitedAt: v.optional(v.number()),
    joinedAt: v.number(),

    // Status
    status: v.union(
      v.literal("active"),
      v.literal("pending"),
      v.literal("suspended")
    ),

    // Permissions
    permissions: v.optional(
      v.object({
        canCreateCampaigns: v.boolean(),
        canManageTeam: v.boolean(),
        canViewAnalytics: v.boolean(),
        canManageBilling: v.boolean(),
      })
    ),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_organization_user", ["organizationId", "userId"])
    .index("by_organization_role", ["organizationId", "role"])
    .index("by_organization_status", ["organizationId", "status"]),

  // User invitations
  userInvitations: defineTable({
    organizationId: v.id("organizations"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),

    // Invitation details
    invitedBy: v.id("users"),
    invitedAt: v.number(),
    expiresAt: v.number(),

    // Status
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("expired")
    ),

    // Optional message
    message: v.optional(v.string()),

    // Acceptance details
    acceptedBy: v.optional(v.id("users")),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_email", ["email"])
    .index("by_organization_email", ["organizationId", "email"])
    .index("by_status", ["status"])
    .index("by_expiry", ["expiresAt"]),

  // Campaigns table
  campaigns: defineTable({
    // Basic Information
    name: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed")
    ),

    // Timeline
    startDate: v.number(), // Unix timestamp
    endDate: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),

    // Budget
    budget: v.number(),
    currency: v.string(),
    budgetAllocation: v.object({
      channels: v.record(v.string(), v.number()),
    }),

    // Campaign Details
    category: v.union(
      v.literal("pr"),
      v.literal("content"),
      v.literal("social"),
      v.literal("paid"),
      v.literal("mixed")
    ),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),

    // Audience & Targeting
    audiences: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        demographics: v.object({
          ageRange: v.array(v.number()),
          gender: v.string(),
          location: v.array(v.string()),
          interests: v.array(v.string()),
        }),
        estimatedSize: v.optional(v.number()),
      })
    ),

    // Channels
    channels: v.array(
      v.object({
        type: v.string(),
        enabled: v.boolean(),
        budget: v.number(),
        settings: v.any(), // Platform-specific settings
      })
    ),

    // KPIs and Metrics
    kpis: v.array(
      v.object({
        type: v.string(),
        target: v.number(),
        timeframe: v.string(),
        weight: v.number(),
      })
    ),

    customMetrics: v.array(
      v.object({
        name: v.string(),
        description: v.string(),
        target: v.number(),
        unit: v.string(),
      })
    ),

    // Access Control
    organizationId: v.id("organizations"),
    createdBy: v.id("users"), // User ID
    teamMembers: v.array(
      v.object({
        userId: v.id("users"),
        role: v.union(
          v.literal("owner"),
          v.literal("editor"),
          v.literal("viewer")
        ),
        assignedAt: v.number(),
        notifications: v.optional(v.boolean()),
      })
    ),

    clients: v.array(
      v.object({
        userId: v.id("users"),
        assignedAt: v.number(),
      })
    ),

    // Import Information
    importSource: v.optional(
      v.object({
        platform: v.string(),
        externalId: v.string(),
        importedAt: v.number(),
        lastSyncAt: v.optional(v.number()),
      })
    ),
  })
    .index("by_organization", ["organizationId"])
    .index("by_creator", ["createdBy"])
    .index("by_status", ["status"])
    .index("by_organization_status", ["organizationId", "status"])
    .index("by_import_source", [
      "importSource.platform",
      "importSource.externalId",
    ]),

  // Campaign Drafts table
  campaignDrafts: defineTable({
    name: v.string(),
    data: v.any(), // Serialized form data
    step: v.number(), // Current wizard step
    createdBy: v.id("users"), // User ID
    organizationId: v.id("organizations"),
    createdAt: v.number(),
    updatedAt: v.number(),
    expiresAt: v.number(), // Auto-cleanup old drafts
  })
    .index("by_user", ["createdBy"])
    .index("by_organization", ["organizationId"])
    .index("by_user_organization", ["createdBy", "organizationId"])
    .index("by_expiry", ["expiresAt"]),

  // Platform Connections table - stores OAuth tokens for external platforms
  platformConnections: defineTable({
    platform: v.union(v.literal("facebook"), v.literal("google")),
    userId: v.id("users"),
    organizationId: v.id("organizations"),

    // OAuth tokens (encrypted)
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.number(), // Unix timestamp
    scope: v.optional(v.string()),

    // Connection metadata
    connectedAt: v.number(),
    lastSyncAt: v.optional(v.number()),
    status: v.union(
      v.literal("connected"),
      v.literal("expired"),
      v.literal("error")
    ),

    // Platform-specific data
    platformUserId: v.optional(v.string()),
    platformUserName: v.optional(v.string()),
    platformAccountId: v.optional(v.string()),

    // Error tracking
    lastError: v.optional(
      v.object({
        code: v.string(),
        message: v.string(),
        timestamp: v.number(),
      })
    ),

    // Metadata
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_organization", ["organizationId"])
    .index("by_user_platform", ["userId", "platform"])
    .index("by_organization_platform", ["organizationId", "platform"])
    .index("by_status", ["status"]),

  // Notifications table
  notifications: defineTable({
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
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    read: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_organization", ["organizationId"])
    .index("by_user_organization", ["userId", "organizationId"])
    .index("by_user_read", ["userId", "read"])
    .index("by_campaign", ["campaignId"])
    .index("by_type", ["type"])
    .index("by_created_at", ["createdAt"]),

  // Email logs table for tracking sent emails
  emailLogs: defineTable({
    userId: v.id("users"),
    email: v.string(),
    template: v.string(),
    subject: v.string(),
    data: v.any(),
    status: v.union(v.literal("sent"), v.literal("failed"), v.literal("pending")),
    sentAt: v.number(),
    error: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_email", ["email"])
    .index("by_template", ["template"])
    .index("by_status", ["status"])
    .index("by_sent_at", ["sentAt"]),
});

export default schema;
