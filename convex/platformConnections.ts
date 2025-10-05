/**
 * Convex functions for managing external platform connections and OAuth tokens
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { encryptToken, decryptToken } from "./lib/encryption";

/**
 * Store or update platform connection with OAuth tokens
 */
export const storePlatformConnection = mutation({
  args: {
    platform: v.union(v.literal("facebook"), v.literal("google")),
    organizationId: v.id("organizations"),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.number(),
    scope: v.optional(v.string()),
    platformUserId: v.optional(v.string()),
    platformUserName: v.optional(v.string()),
    platformAccountId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if connection already exists
    const existing = await ctx.db
      .query("platformConnections")
      .withIndex("by_user_platform", (q) =>
        q.eq("userId", userId).eq("platform", args.platform)
      )
      .first();

    const now = Date.now();
    
    // Encrypt tokens
    const encryptedAccessToken = await encryptToken(args.accessToken);
    const encryptedRefreshToken = args.refreshToken 
      ? await encryptToken(args.refreshToken) 
      : undefined;

    const connectionData = {
      platform: args.platform,
      userId,
      organizationId: args.organizationId,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt: args.expiresAt,
      scope: args.scope,
      platformUserId: args.platformUserId,
      platformUserName: args.platformUserName,
      platformAccountId: args.platformAccountId,
      status: "connected" as const,
      lastError: undefined,
      updatedAt: now,
    };

    if (existing) {
      // Update existing connection
      await ctx.db.patch(existing._id, connectionData);
      return existing._id;
    } else {
      // Create new connection
      return await ctx.db.insert("platformConnections", {
        ...connectionData,
        connectedAt: now,
      });
    }
  },
});

/**
 * Get platform connection for current user
 */
export const getPlatformConnection = query({
  args: {
    platform: v.union(v.literal("facebook"), v.literal("google")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const connection = await ctx.db
      .query("platformConnections")
      .withIndex("by_user_platform", (q) =>
        q.eq("userId", userId).eq("platform", args.platform)
      )
      .first();

    if (!connection) {
      return null;
    }

    // Return connection without decrypted tokens (for security)
    return {
      _id: connection._id,
      platform: connection.platform,
      status: connection.status,
      connectedAt: connection.connectedAt,
      lastSyncAt: connection.lastSyncAt,
      expiresAt: connection.expiresAt,
      platformUserName: connection.platformUserName,
      platformAccountId: connection.platformAccountId,
      lastError: connection.lastError,
    };
  },
});

/**
 * Get decrypted tokens for a platform connection (server-side only)
 */
export const getPlatformTokens = query({
  args: {
    platform: v.union(v.literal("facebook"), v.literal("google")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const connection = await ctx.db
      .query("platformConnections")
      .withIndex("by_user_platform", (q) =>
        q.eq("userId", userId).eq("platform", args.platform)
      )
      .first();

    if (!connection) {
      return null;
    }

    // Decrypt and return tokens
    const accessToken = await decryptToken(connection.accessToken);
    const refreshToken = connection.refreshToken
      ? await decryptToken(connection.refreshToken)
      : undefined;

    return {
      accessToken,
      refreshToken,
      expiresAt: connection.expiresAt,
      scope: connection.scope,
    };
  },
});

/**
 * Update connection status
 */
export const updateConnectionStatus = mutation({
  args: {
    platform: v.union(v.literal("facebook"), v.literal("google")),
    status: v.union(
      v.literal("connected"),
      v.literal("expired"),
      v.literal("error")
    ),
    error: v.optional(
      v.object({
        code: v.string(),
        message: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const connection = await ctx.db
      .query("platformConnections")
      .withIndex("by_user_platform", (q) =>
        q.eq("userId", userId).eq("platform", args.platform)
      )
      .first();

    if (!connection) {
      throw new Error("Platform connection not found");
    }

    await ctx.db.patch(connection._id, {
      status: args.status,
      lastError: args.error
        ? {
            code: args.error.code,
            message: args.error.message,
            timestamp: Date.now(),
          }
        : undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update last sync timestamp
 */
export const updateLastSync = mutation({
  args: {
    platform: v.union(v.literal("facebook"), v.literal("google")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const connection = await ctx.db
      .query("platformConnections")
      .withIndex("by_user_platform", (q) =>
        q.eq("userId", userId).eq("platform", args.platform)
      )
      .first();

    if (!connection) {
      throw new Error("Platform connection not found");
    }

    await ctx.db.patch(connection._id, {
      lastSyncAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Disconnect a platform (delete connection)
 */
export const disconnectPlatform = mutation({
  args: {
    platform: v.union(v.literal("facebook"), v.literal("google")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const connection = await ctx.db
      .query("platformConnections")
      .withIndex("by_user_platform", (q) =>
        q.eq("userId", userId).eq("platform", args.platform)
      )
      .first();

    if (connection) {
      await ctx.db.delete(connection._id);
    }
  },
});

/**
 * Get all platform connections for current user
 */
export const getAllPlatformConnections = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const connections = await ctx.db
      .query("platformConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return connections.map((connection) => ({
      _id: connection._id,
      platform: connection.platform,
      status: connection.status,
      connectedAt: connection.connectedAt,
      lastSyncAt: connection.lastSyncAt,
      expiresAt: connection.expiresAt,
      platformUserName: connection.platformUserName,
      platformAccountId: connection.platformAccountId,
      lastError: connection.lastError,
    }));
  },
});

/**
 * Get all platform connections for an organization
 */
export const getOrganizationPlatformConnections = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // TODO: Add permission check to ensure user has access to this organization

    const connections = await ctx.db
      .query("platformConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return connections.map((connection) => ({
      _id: connection._id,
      platform: connection.platform,
      userId: connection.userId,
      status: connection.status,
      connectedAt: connection.connectedAt,
      lastSyncAt: connection.lastSyncAt,
      expiresAt: connection.expiresAt,
      platformUserName: connection.platformUserName,
      platformAccountId: connection.platformAccountId,
      lastError: connection.lastError,
    }));
  },
});
