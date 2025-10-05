import { internalMutation, mutation } from "../_generated/server";
import { getUserIdFromIdentity } from "../auth_helpers";

// Clean up expired campaign drafts (internal - used by cron job)
export const cleanupExpiredDrafts = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    
    // Get all expired drafts
    const expiredDrafts = await ctx.db
      .query("campaignDrafts")
      .withIndex("by_expiry", (q) => q.lt("expiresAt", now))
      .collect();

    // Delete expired drafts
    const deletionPromises = expiredDrafts.map(draft => ctx.db.delete(draft._id));
    await Promise.all(deletionPromises);

    return {
      deletedCount: expiredDrafts.length,
      deletedIds: expiredDrafts.map(draft => draft._id),
    };
  },
});

// Manual cleanup for administrators (user-triggered)
export const manualCleanupExpiredDrafts = mutation({
  handler: async (ctx) => {
    // Verify user is authenticated
    await getUserIdFromIdentity(ctx);
    
    const now = Date.now();
    
    // Get all expired drafts
    const expiredDrafts = await ctx.db
      .query("campaignDrafts")
      .withIndex("by_expiry", (q) => q.lt("expiresAt", now))
      .collect();

    // Delete expired drafts
    const deletionPromises = expiredDrafts.map(draft => ctx.db.delete(draft._id));
    await Promise.all(deletionPromises);

    return {
      deletedCount: expiredDrafts.length,
      deletedIds: expiredDrafts.map(draft => draft._id),
    };
  },
});