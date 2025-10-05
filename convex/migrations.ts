import { mutation } from "./_generated/server";

// Migration to update existing organizations with missing fields
export const migrateOrganizations = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all organizations
    const organizations = await ctx.db.query("organizations").collect();
    
    let updatedCount = 0;
    
    for (const org of organizations) {
      const updates: any = {};
      let needsUpdate = false;
      
      // Add missing updatedAt field
      if (!org.updatedAt) {
        updates.updatedAt = org.createdAt || Date.now();
        needsUpdate = true;
      }
      
      // Update settings to include missing fields
      if (!org.settings.allowPublicJoin && org.settings.allowPublicJoin !== false) {
        updates.settings = {
          ...org.settings,
          allowPublicJoin: false,
        };
        needsUpdate = true;
      }
      
      if (!org.settings.requireInviteApproval && org.settings.requireInviteApproval !== false) {
        updates.settings = {
          ...updates.settings || org.settings,
          requireInviteApproval: true,
        };
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await ctx.db.patch(org._id, updates);
        updatedCount++;
      }
    }
    
    return {
      message: `Migration completed. Updated ${updatedCount} organizations.`,
      updatedCount,
    };
  },
});

// Migration to create organization memberships for existing organizations
export const createMissingMemberships = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all organizations that have a createdBy field
    const organizations = await ctx.db
      .query("organizations")
      .filter((q: any) => q.neq(q.field("createdBy"), undefined))
      .collect();
    
    let createdCount = 0;
    
    for (const org of organizations) {
      if (!org.createdBy) continue;
      
      // Check if membership already exists
      const existingMembership = await ctx.db
        .query("organizationMemberships")
        .withIndex("by_organization_user", (q: any) => 
          q.eq("organizationId", org._id).eq("userId", org.createdBy)
        )
        .first();
      
      if (!existingMembership) {
        // Create owner membership for the creator
        await ctx.db.insert("organizationMemberships", {
          organizationId: org._id,
          userId: org.createdBy,
          role: "owner",
          joinedAt: org.createdAt,
          status: "active",
          permissions: {
            canCreateCampaigns: true,
            canManageTeam: true,
            canViewAnalytics: true,
            canManageBilling: true,
          },
          createdAt: org.createdAt,
          updatedAt: org.updatedAt || org.createdAt,
        });
        createdCount++;
      }
    }
    
    return {
      message: `Migration completed. Created ${createdCount} organization memberships.`,
      createdCount,
    };
  },
});