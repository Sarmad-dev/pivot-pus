import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getOrCreateUserProfile } from "./users";

// Get user's organizations
export const getUserOrganizations = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getOrCreateUserProfile(ctx);

    // Get user's organization memberships
    const memberships = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_user", (q: any) => q.eq("userId", currentUser._id))
      .filter((q: any) => q.eq(q.field("status"), "active"))
      .collect();

    // Get organization details for each membership
    const organizations = [];
    for (const membership of memberships) {
      const organization = await ctx.db.get(membership.organizationId);
      if (organization) {
        organizations.push({
          ...organization,
          // Ensure settings have default values for backward compatibility
          settings: {
            defaultCurrency: organization.settings.defaultCurrency || "USD",
            timezone: organization.settings.timezone || "UTC",
            allowPublicJoin: organization.settings.allowPublicJoin ?? false,
            requireInviteApproval: organization.settings.requireInviteApproval ?? true,
          },
          membership: {
            role: membership.role,
            joinedAt: membership.joinedAt,
            permissions: membership.permissions,
          },
        });
      }
    }

    // Also include organizations where user is the creator (for backward compatibility)
    // This handles organizations created before the membership system
    const createdOrganizations = await ctx.db
      .query("organizations")
      .filter((q: any) => q.eq(q.field("createdBy"), currentUser._id))
      .collect();

    for (const org of createdOrganizations) {
      // Check if we already have this organization from memberships
      const alreadyIncluded = organizations.some(o => o._id === org._id);
      if (!alreadyIncluded) {
        organizations.push({
          ...org,
          // Ensure settings have default values for backward compatibility
          settings: {
            defaultCurrency: org.settings.defaultCurrency || "USD",
            timezone: org.settings.timezone || "UTC",
            allowPublicJoin: org.settings.allowPublicJoin ?? false,
            requireInviteApproval: org.settings.requireInviteApproval ?? true,
          },
          membership: {
            role: "owner" as const,
            joinedAt: org.createdAt,
            permissions: {
              canCreateCampaigns: true,
              canManageTeam: true,
              canViewAnalytics: true,
              canManageBilling: true,
            },
          },
        });
      }
    }

    return organizations.sort((a, b) => a.name.localeCompare(b.name));
  },
});

// Create a new organization
export const createOrganization = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    defaultCurrency: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getOrCreateUserProfile(ctx);

    // Check if slug already exists
    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q: any) => q.eq("slug", args.slug))
      .first();

    if (existingOrg) {
      throw new Error("Organization with this slug already exists");
    }

    const now = Date.now();

    // Create organization
    const organizationId = await ctx.db.insert("organizations", {
      name: args.name,
      slug: args.slug,
      description: args.description,
      createdBy: currentUser._id,
      createdAt: now,
      updatedAt: now,
      settings: {
        defaultCurrency: args.defaultCurrency || "USD",
        timezone: args.timezone || "UTC",
        allowPublicJoin: false,
        requireInviteApproval: true,
      },
    });

    // Create owner membership for the creator
    await ctx.db.insert("organizationMemberships", {
      organizationId,
      userId: currentUser._id,
      role: "owner",
      joinedAt: now,
      status: "active",
      permissions: {
        canCreateCampaigns: true,
        canManageTeam: true,
        canViewAnalytics: true,
        canManageBilling: true,
      },
      createdAt: now,
      updatedAt: now,
    });

    return organizationId;
  },
});

// Get organization by slug
export const getOrganizationBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q: any) => q.eq("slug", args.slug))
      .first();
  },
});

// Update organization
export const updateOrganization = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    settings: v.optional(v.object({
      defaultCurrency: v.optional(v.string()),
      timezone: v.optional(v.string()),
      allowPublicJoin: v.optional(v.boolean()),
      requireInviteApproval: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args) => {
    const currentUser = await getOrCreateUserProfile(ctx);
    
    // Check if user is owner or admin
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q: any) => 
        q.eq("organizationId", args.organizationId).eq("userId", currentUser._id)
      )
      .first();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      throw new Error("Not authorized to update this organization");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.settings !== undefined) {
      const org = await ctx.db.get(args.organizationId);
      updates.settings = { ...org?.settings, ...args.settings };
    }

    await ctx.db.patch(args.organizationId, updates);
    return args.organizationId;
  },
});

