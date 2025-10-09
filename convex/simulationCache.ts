/**
 * Convex functions for simulation caching operations
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Get cached simulation result by cache key
 */
export const getCachedResult = query({
  args: { 
    cacheKey: v.string() 
  },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("simulationCache")
      .withIndex("by_cache_key", (q) => q.eq("cacheKey", args.cacheKey))
      .first();

    if (!cached) {
      return null;
    }

    // Check if expired
    if (cached.expiresAt <= Date.now()) {
      // Clean up expired entry (note: this would be handled by a cleanup job in production)
      return null;
    }

    return cached;
  },
});

/**
 * Store simulation result in cache
 */
export const setCachedResult = mutation({
  args: {
    cacheKey: v.string(),
    campaignId: v.id("campaigns"),
    results: v.any(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if entry already exists
    const existing = await ctx.db
      .query("simulationCache")
      .withIndex("by_cache_key", (q) => q.eq("cacheKey", args.cacheKey))
      .first();

    if (existing) {
      // Update existing entry
      await ctx.db.patch(existing._id, {
        results: args.results,
        expiresAt: args.expiresAt,
      });
    } else {
      // Create new entry
      await ctx.db.insert("simulationCache", {
        cacheKey: args.cacheKey,
        campaignId: args.campaignId,
        results: args.results,
        expiresAt: args.expiresAt,
        createdAt: Date.now(),
      });
    }
  },
});

/**
 * Invalidate all cache entries for a specific campaign
 */
export const invalidateCampaignCache = mutation({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("simulationCache")
      .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
      .collect();

    // Delete all entries for this campaign
    for (const entry of entries) {
      await ctx.db.delete(entry._id);
    }

    return entries.length;
  },
});

/**
 * Clean up expired cache entries
 */
export const cleanupExpiredCache = mutation({
  args: {
    currentTime: v.number(),
  },
  handler: async (ctx, args) => {
    const expiredEntries = await ctx.db
      .query("simulationCache")
      .withIndex("by_expiry", (q) => q.lt("expiresAt", args.currentTime))
      .collect();

    // Delete expired entries
    for (const entry of expiredEntries) {
      await ctx.db.delete(entry._id);
    }

    return expiredEntries.length;
  },
});

/**
 * Get total cache size
 */
export const getCacheSize = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("simulationCache").collect();
    return entries.length;
  },
});

/**
 * Get comprehensive cache statistics
 */
export const getCacheStatistics = query({
  args: {},
  handler: async (ctx) => {
    const allEntries = await ctx.db.query("simulationCache").collect();
    const currentTime = Date.now();
    
    const expiredEntries = allEntries.filter(entry => entry.expiresAt <= currentTime);
    const validEntries = allEntries.filter(entry => entry.expiresAt > currentTime);
    
    // Calculate average entry age
    const totalAge = validEntries.reduce((sum, entry) => {
      return sum + (currentTime - entry.createdAt);
    }, 0);
    const averageEntryAge = validEntries.length > 0 ? totalAge / validEntries.length : 0;
    
    // Calculate cache utilization (assuming max 10000 entries)
    const maxCacheSize = 10000;
    const cacheUtilization = (allEntries.length / maxCacheSize) * 100;
    
    // Get top campaigns by cache entry count
    const campaignCounts = validEntries.reduce((acc, entry) => {
      const campaignId = entry.campaignId;
      acc[campaignId] = (acc[campaignId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topCampaigns = Object.entries(campaignCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([campaignId, hitCount]) => ({ campaignId, hitCount }));
    
    return {
      totalEntries: allEntries.length,
      expiredEntries: expiredEntries.length,
      cacheUtilization,
      averageEntryAge,
      topCampaigns,
    };
  },
});

/**
 * Get cache entries for a specific campaign (for debugging)
 */
export const getCampaignCacheEntries = query({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("simulationCache")
      .filter((q) => q.eq(q.field("campaignId"), args.campaignId))
      .collect();

    return entries.map(entry => ({
      cacheKey: entry.cacheKey,
      createdAt: entry.createdAt,
      expiresAt: entry.expiresAt,
      isExpired: entry.expiresAt <= Date.now(),
    }));
  },
});

/**
 * Force invalidate all cache entries (admin function)
 */
export const invalidateAllCache = mutation({
  args: {},
  handler: async (ctx) => {
    const allEntries = await ctx.db.query("simulationCache").collect();
    
    for (const entry of allEntries) {
      await ctx.db.delete(entry._id);
    }
    
    return allEntries.length;
  },
});

/**
 * Get cache hit/miss statistics by analyzing recent simulation requests
 * This would require tracking cache access patterns
 */
export const getCachePerformanceMetrics = query({
  args: {
    timeRangeHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const timeRange = args.timeRangeHours || 24;
    const cutoffTime = Date.now() - (timeRange * 60 * 60 * 1000);
    
    // Get recent cache entries
    const recentEntries = await ctx.db
      .query("simulationCache")
      .filter((q) => q.gte(q.field("createdAt"), cutoffTime))
      .collect();
    
    // Get recent simulations to compare
    const recentSimulations = await ctx.db
      .query("simulations")
      .withIndex("by_created_at")
      .filter((q) => q.gte(q.field("createdAt"), cutoffTime))
      .collect();
    
    return {
      cacheEntriesCreated: recentEntries.length,
      simulationsRun: recentSimulations.length,
      estimatedCacheHitRate: recentEntries.length > 0 
        ? Math.min((recentEntries.length / recentSimulations.length) * 100, 100)
        : 0,
      timeRangeHours: timeRange,
    };
  },
});