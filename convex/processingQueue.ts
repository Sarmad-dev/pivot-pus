/**
 * Convex functions for async processing queue operations
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// First, let's add the processing queue table to the schema
// This would need to be added to schema.ts, but for now we'll work with what we have

/**
 * Enqueue a simulation for processing
 */
export const enqueue = mutation({
  args: {
    simulationId: v.id("simulations"),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    priority: v.number(),
    estimatedDuration: v.number(),
    subscriptionTier: v.string(),
    queuedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // For now, we'll store queue information in the simulation record itself
    // In a full implementation, we'd have a separate processingQueue table
    
    await ctx.db.patch(args.simulationId, {
      status: "queued",
      // Store queue metadata in a custom field
      queueMetadata: {
        priority: args.priority,
        estimatedDuration: args.estimatedDuration,
        subscriptionTier: args.subscriptionTier,
        queuedAt: args.queuedAt,
        retryCount: 0,
      }
    });

    return args.simulationId;
  },
});

/**
 * Get next jobs to process based on priority
 */
export const getNextJobs = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Get queued simulations ordered by priority and queue time
    const queuedSimulations = await ctx.db
      .query("simulations")
      .filter((q) => q.eq(q.field("status"), "queued"))
      .collect();

    // Sort by priority (higher first) then by queue time (earlier first)
    const sortedJobs = queuedSimulations
      .filter(sim => sim.queueMetadata)
      .sort((a, b) => {
        const priorityDiff = (b.queueMetadata?.priority || 0) - (a.queueMetadata?.priority || 0);
        if (priorityDiff !== 0) return priorityDiff;
        return (a.queueMetadata?.queuedAt || 0) - (b.queueMetadata?.queuedAt || 0);
      })
      .slice(0, args.limit);

    return sortedJobs.map(sim => ({
      _id: sim._id,
      simulationId: sim._id,
      organizationId: sim.organizationId,
      userId: sim.createdBy,
      priority: sim.queueMetadata?.priority || 0,
      estimatedDuration: sim.queueMetadata?.estimatedDuration || 30000,
      queuedAt: sim.queueMetadata?.queuedAt || sim.createdAt,
      retryCount: sim.queueMetadata?.retryCount || 0,
    }));
  },
});

/**
 * Start processing a job
 */
export const startProcessing = mutation({
  args: {
    id: v.id("simulations"),
    startedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const simulation = await ctx.db.get(args.id);
    if (!simulation) {
      throw new Error("Simulation not found");
    }

    await ctx.db.patch(args.id, {
      status: "processing",
      queueMetadata: {
        priority: simulation.queueMetadata?.priority || 0,
        estimatedDuration: simulation.queueMetadata?.estimatedDuration || 30000,
        subscriptionTier: simulation.queueMetadata?.subscriptionTier || 'free',
        queuedAt: simulation.queueMetadata?.queuedAt || simulation.createdAt,
        retryCount: simulation.queueMetadata?.retryCount || 0,
        startedAt: args.startedAt,
      },
      updatedAt: Date.now(),
    });
  },
});

/**
 * Complete a job
 */
export const complete = mutation({
  args: {
    simulationId: v.id("simulations"),
  },
  handler: async (ctx, args) => {
    const simulation = await ctx.db.get(args.simulationId);
    if (!simulation) {
      throw new Error("Simulation not found");
    }

    // Remove queue metadata since job is complete
    await ctx.db.patch(args.simulationId, {
      queueMetadata: undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Cancel a job
 */
export const cancel = mutation({
  args: {
    simulationId: v.id("simulations"),
  },
  handler: async (ctx, args) => {
    const simulation = await ctx.db.get(args.simulationId);
    if (!simulation) {
      throw new Error("Simulation not found");
    }

    await ctx.db.patch(args.simulationId, {
      status: "cancelled",
      queueMetadata: undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Mark a job as failed
 */
export const fail = mutation({
  args: {
    simulationId: v.id("simulations"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const simulation = await ctx.db.get(args.simulationId);
    if (!simulation) {
      throw new Error("Simulation not found");
    }

    await ctx.db.patch(args.simulationId, {
      status: "failed",
      queueMetadata: {
        priority: simulation.queueMetadata?.priority || 0,
        estimatedDuration: simulation.queueMetadata?.estimatedDuration || 30000,
        subscriptionTier: simulation.queueMetadata?.subscriptionTier || 'free',
        queuedAt: simulation.queueMetadata?.queuedAt || simulation.createdAt,
        retryCount: simulation.queueMetadata?.retryCount || 0,
        error: args.error,
        failedAt: Date.now(),
      },
      updatedAt: Date.now(),
    });
  },
});

/**
 * Retry a failed job
 */
export const retry = mutation({
  args: {
    id: v.id("simulations"),
    retryCount: v.number(),
    retryAt: v.number(),
  },
  handler: async (ctx, args) => {
    const simulation = await ctx.db.get(args.id);
    if (!simulation) {
      throw new Error("Simulation not found");
    }

    await ctx.db.patch(args.id, {
      status: "queued",
      queueMetadata: {
        priority: simulation.queueMetadata?.priority || 0,
        estimatedDuration: simulation.queueMetadata?.estimatedDuration || 30000,
        subscriptionTier: simulation.queueMetadata?.subscriptionTier || 'free',
        queuedAt: simulation.queueMetadata?.queuedAt || simulation.createdAt,
        retryCount: args.retryCount,
        retryAt: args.retryAt,
        error: undefined,
        failedAt: undefined,
      },
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get job by simulation ID
 */
export const getBySimulationId = query({
  args: {
    simulationId: v.id("simulations"),
  },
  handler: async (ctx, args) => {
    const simulation = await ctx.db.get(args.simulationId);
    if (!simulation || !simulation.queueMetadata) {
      return null;
    }

    return {
      _id: simulation._id,
      simulationId: simulation._id,
      organizationId: simulation.organizationId,
      userId: simulation.createdBy,
      status: simulation.status,
      priority: simulation.queueMetadata.priority,
      estimatedDuration: simulation.queueMetadata.estimatedDuration,
      queuedAt: simulation.queueMetadata.queuedAt,
      startedAt: simulation.queueMetadata.startedAt,
      retryCount: simulation.queueMetadata.retryCount || 0,
      error: simulation.queueMetadata.error,
    };
  },
});

/**
 * Get queue status for an organization
 */
export const getOrganizationStatus = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get all simulations for this organization
    const orgSimulations = await ctx.db
      .query("simulations")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const queuedJobs = orgSimulations.filter(sim => sim.status === "queued").length;
    const processingJobs = orgSimulations.filter(sim => sim.status === "processing").length;

    // Calculate estimated wait time based on queued jobs and average processing time
    const averageProcessingTime = 60000; // 1 minute default
    const estimatedWaitTime = queuedJobs * averageProcessingTime;

    return {
      queuedJobs,
      processingJobs,
      estimatedWaitTime,
    };
  },
});

/**
 * Get count of queued jobs for an organization
 */
export const getUserQueuedCount = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const queuedSimulations = await ctx.db
      .query("simulations")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("status"), "queued"))
      .collect();

    return queuedSimulations.length;
  },
});

/**
 * Get current queue size
 */
export const getQueueSize = query({
  args: {},
  handler: async (ctx) => {
    const queuedSimulations = await ctx.db
      .query("simulations")
      .filter((q) => q.eq(q.field("status"), "queued"))
      .collect();

    return queuedSimulations.length;
  },
});

/**
 * Get queue statistics
 */
export const getQueueStatistics = query({
  args: {
    timeRangeHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const timeRange = args.timeRangeHours || 24;
    const cutoffTime = Date.now() - (timeRange * 60 * 60 * 1000);

    // Get recent simulations
    const recentSimulations = await ctx.db
      .query("simulations")
      .withIndex("by_created_at")
      .filter((q) => q.gte(q.field("createdAt"), cutoffTime))
      .collect();

    const totalJobs = recentSimulations.length;
    const completedJobs = recentSimulations.filter(sim => sim.status === "completed").length;
    const failedJobs = recentSimulations.filter(sim => sim.status === "failed").length;
    const queuedJobs = recentSimulations.filter(sim => sim.status === "queued").length;
    const processingJobs = recentSimulations.filter(sim => sim.status === "processing").length;

    // Calculate average processing time for completed jobs
    const completedWithTimes = recentSimulations.filter(sim => 
      sim.status === "completed" && sim.completedAt && sim.createdAt
    );
    
    const averageProcessingTime = completedWithTimes.length > 0
      ? completedWithTimes.reduce((sum, sim) => 
          sum + (sim.completedAt! - sim.createdAt), 0) / completedWithTimes.length
      : 0;

    return {
      totalJobs,
      completedJobs,
      failedJobs,
      queuedJobs,
      processingJobs,
      averageProcessingTime,
      successRate: totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0,
      timeRangeHours: timeRange,
    };
  },
});

/**
 * Get jobs by status
 */
export const getJobsByStatus = query({
  args: {
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    const simulations = await ctx.db
      .query("simulations")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .take(limit);

    return simulations.map(sim => ({
      id: sim._id,
      campaignId: sim.campaignId,
      organizationId: sim.organizationId,
      createdBy: sim.createdBy,
      status: sim.status,
      createdAt: sim.createdAt,
      updatedAt: sim.updatedAt,
      completedAt: sim.completedAt,
      queueMetadata: sim.queueMetadata,
    }));
  },
});

/**
 * Clean up old completed/failed jobs
 */
export const cleanupOldJobs = mutation({
  args: {
    olderThanDays: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - (args.olderThanDays * 24 * 60 * 60 * 1000);
    
    const oldSimulations = await ctx.db
      .query("simulations")
      .filter((q) => 
        q.and(
          q.lt(q.field("createdAt"), cutoffTime),
          q.or(
            q.eq(q.field("status"), "completed"),
            q.eq(q.field("status"), "failed"),
            q.eq(q.field("status"), "cancelled")
          )
        )
      )
      .collect();

    let deletedCount = 0;
    for (const simulation of oldSimulations) {
      await ctx.db.delete(simulation._id);
      deletedCount++;
    }

    return deletedCount;
  },
});