import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { simulations } from "./api";

// Validation schemas for simulation configuration
const simulationConfigValidator = v.object({
  timeframe: v.object({
    startDate: v.number(),
    endDate: v.number(),
    granularity: v.union(v.literal("daily"), v.literal("weekly")),
  }),
  metrics: v.array(
    v.object({
      type: v.string(),
      weight: v.number(),
      benchmarkSource: v.optional(v.string()),
    })
  ),
  scenarios: v.array(v.string()),
  externalDataSources: v.array(v.string()),
});

const simulationResultsValidator = v.object({
  trajectories: v.array(
    v.object({
      date: v.number(),
      metrics: v.record(v.string(), v.number()),
      confidence: v.number(),
    })
  ),

  scenarios: v.array(
    v.object({
      type: v.string(),
      probability: v.number(),
      trajectory: v.array(
        v.object({
          date: v.number(),
          metrics: v.record(v.string(), v.number()),
        })
      ),
    })
  ),

  risks: v.array(
    v.object({
      type: v.string(),
      severity: v.string(),
      probability: v.number(),
      description: v.string(),
      timeframe: v.object({
        start: v.number(),
        end: v.number(),
      }),
    })
  ),

  recommendations: v.array(
    v.object({
      id: v.string(),
      type: v.string(),
      priority: v.number(),
      impact_estimate: v.object({
        metric: v.string(),
        improvement: v.number(),
        confidence: v.number(),
      }),
      implementation: v.object({
        description: v.string(),
        steps: v.array(v.string()),
        effort: v.string(),
        timeline: v.string(),
      }),
    })
  ),
});

/**
 * Create a new simulation with validation
 * Requirements: 7.1, 7.5
 */
export const createSimulation = mutation({
  args: {
    campaignId: v.id("campaigns"),
    config: simulationConfigValidator,
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Validate campaign exists and user has access
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Check user has access to the campaign's organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", campaign.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error(
        "Access denied: User not member of campaign organization"
      );
    }

    // Validate simulation configuration
    const { config } = args;

    // Validate timeframe
    if (config.timeframe.startDate >= config.timeframe.endDate) {
      throw new Error("Invalid timeframe: start date must be before end date");
    }

    const timeframeDays = Math.ceil(
      (config.timeframe.endDate - config.timeframe.startDate) /
        (1000 * 60 * 60 * 24)
    );

    if (timeframeDays < 5 || timeframeDays > 30) {
      throw new Error("Invalid timeframe: must be between 5 and 30 days");
    }

    // Validate metrics
    if (config.metrics.length === 0) {
      throw new Error("At least one metric must be specified");
    }

    const totalWeight = config.metrics.reduce(
      (sum, metric) => sum + metric.weight,
      0
    );
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      throw new Error("Metric weights must sum to 1.0");
    }

    // Validate scenarios
    const validScenarios = ["optimistic", "realistic", "pessimistic"];
    const invalidScenarios = config.scenarios.filter(
      (s) => !validScenarios.includes(s)
    );
    if (invalidScenarios.length > 0) {
      throw new Error(`Invalid scenarios: ${invalidScenarios.join(", ")}`);
    }

    // Create simulation with queue metadata
    const now = Date.now();
    const estimatedDuration = timeframeDays * config.metrics.length * 1000; // Rough estimate

    const simulationId = await ctx.db.insert("simulations", {
      campaignId: args.campaignId,
      organizationId: campaign.organizationId,
      createdBy: userId,
      config,
      status: "queued",
      queueMetadata: {
        priority: args.priority ?? 5, // Default priority
        estimatedDuration,
        subscriptionTier: membership.role === "owner" ? "premium" : "standard",
        queuedAt: now,
        retryCount: 0,
      },
      createdAt: now,
      updatedAt: now,
    });

    return simulationId;
  },
});

/**
 * Update simulation status
 * Requirements: 7.1, 7.5
 */
export const updateSimulationStatus = mutation({
  args: {
    simulationId: v.id("simulations"),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const simulation = await ctx.db.get(args.simulationId);
    if (!simulation) {
      throw new Error("Simulation not found");
    }

    // Check user has access to the simulation's organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", simulation.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error(
        "Access denied: User not member of simulation organization"
      );
    }

    const now = Date.now();
    const updates: any = {
      status: args.status,
      updatedAt: now,
    };

    // Update queue metadata based on status
    if (args.status === "processing" && simulation.queueMetadata) {
      updates.queueMetadata = {
        ...simulation.queueMetadata,
        startedAt: now,
      };
    } else if (args.status === "failed" && simulation.queueMetadata) {
      updates.queueMetadata = {
        ...simulation.queueMetadata,
        failedAt: now,
        error: args.error,
        retryCount: simulation.queueMetadata.retryCount + 1,
      };
    } else if (args.status === "completed") {
      updates.completedAt = now;
    }

    await ctx.db.patch(args.simulationId, updates);

    return args.simulationId;
  },
});

/**
 * Complete simulation with results
 * Requirements: 7.1, 7.5
 */
export const completeSimulation = mutation({
  args: {
    simulationId: v.id("simulations"),
    results: simulationResultsValidator,
    modelMetadata: v.optional(
      v.object({
        primaryModel: v.string(),
        modelVersions: v.record(v.string(), v.string()),
        processingTime: v.number(),
        dataQuality: v.object({
          completeness: v.number(),
          accuracy: v.number(),
          freshness: v.number(),
        }),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const simulation = await ctx.db.get(args.simulationId);
    if (!simulation) {
      throw new Error("Simulation not found");
    }

    // Check user has access to the simulation's organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", simulation.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error(
        "Access denied: User not member of simulation organization"
      );
    }

    // Validate simulation is in processing state
    if (simulation.status !== "processing") {
      throw new Error(
        `Cannot complete simulation with status: ${simulation.status}`
      );
    }

    // Validate results
    if (args.results.trajectories.length === 0) {
      throw new Error("Results must contain at least one trajectory point");
    }

    // Validate trajectory dates are within simulation timeframe
    const { startDate, endDate } = simulation.config.timeframe;
    const invalidDates = args.results.trajectories.filter(
      (t) => t.date < startDate || t.date > endDate
    );

    if (invalidDates.length > 0) {
      throw new Error("Trajectory dates must be within simulation timeframe");
    }

    const now = Date.now();
    await ctx.db.patch(args.simulationId, {
      status: "completed",
      results: args.results,
      modelMetadata: args.modelMetadata,
      completedAt: now,
      updatedAt: now,
    });

    return args.simulationId;
  },
});

/**
 * Delete simulation and cleanup associated data
 * Requirements: 7.1, 7.5
 */
export const deleteSimulation = mutation({
  args: {
    simulationId: v.id("simulations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const simulation = await ctx.db.get(args.simulationId);
    if (!simulation) {
      throw new Error("Simulation not found");
    }

    // Check user has access to the simulation's organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", simulation.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (
      !membership ||
      (membership.role !== "owner" &&
        membership.role !== "admin" &&
        simulation.createdBy !== userId)
    ) {
      throw new Error(
        "Access denied: Insufficient permissions to delete simulation"
      );
    }

    // Delete associated cache entries
    const cacheEntries = await ctx.db
      .query("simulationCache")
      .filter((q) => q.eq(q.field("campaignId"), simulation.campaignId))
      .collect();

    for (const entry of cacheEntries) {
      await ctx.db.delete(entry._id);
    }

    // Delete the simulation
    await ctx.db.delete(args.simulationId);

    return { success: true };
  },
});

/**
 * Cancel a queued or processing simulation
 * Requirements: 7.1, 7.5
 */
export const cancelSimulation = mutation({
  args: {
    simulationId: v.id("simulations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const simulation = await ctx.db.get(args.simulationId);
    if (!simulation) {
      throw new Error("Simulation not found");
    }

    // Check user has access to the simulation's organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", simulation.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (
      !membership ||
      (simulation.createdBy !== userId &&
        membership.role !== "owner" &&
        membership.role !== "admin")
    ) {
      throw new Error(
        "Access denied: Can only cancel own simulations or admin/owner can cancel any"
      );
    }

    // Can only cancel queued or processing simulations
    if (!["queued", "processing"].includes(simulation.status)) {
      throw new Error(
        `Cannot cancel simulation with status: ${simulation.status}`
      );
    }

    await ctx.db.patch(args.simulationId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Cleanup expired simulations and cache entries
 * Requirements: 7.1, 7.5
 */
export const cleanupExpiredData = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Cleanup old completed simulations (older than 30 days)
    const oldSimulations = await ctx.db
      .query("simulations")
      .withIndex("by_created_at")
      .filter((q) =>
        q.and(
          q.lt(q.field("createdAt"), thirtyDaysAgo),
          q.eq(q.field("status"), "completed")
        )
      )
      .collect();

    for (const simulation of oldSimulations) {
      await ctx.db.delete(simulation._id);
    }

    // Cleanup expired cache entries
    const expiredCacheEntries = await ctx.db
      .query("simulationCache")
      .withIndex("by_expiry")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const entry of expiredCacheEntries) {
      await ctx.db.delete(entry._id);
    }

    return {
      deletedSimulations: oldSimulations.length,
      deletedCacheEntries: expiredCacheEntries.length,
    };
  },
});

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get a single simulation by ID with access control
 * Requirements: 7.1, 7.2
 */
export const getSimulation = query({
  args: {
    simulationId: v.id("simulations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const simulation = await ctx.db.get(args.simulationId);
    if (!simulation) {
      return null;
    }

    // Check user has access to the simulation's organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", simulation.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error(
        "Access denied: User not member of simulation organization"
      );
    }

    // Include campaign information
    const campaign = await ctx.db.get(simulation.campaignId);

    return {
      ...simulation,
      campaign: campaign
        ? {
            _id: campaign._id,
            name: campaign.name,
            status: campaign.status,
          }
        : null,
    };
  },
});

/**
 * List simulations with filtering and pagination
 * Requirements: 7.1, 7.2
 */
export const listSimulations = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
    campaignId: v.optional(v.id("campaigns")),
    status: v.optional(
      v.union(
        v.literal("queued"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("cancelled")
      )
    ),
    createdBy: v.optional(v.id("users")),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Get user's organizations
    const memberships = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const userOrgIds = memberships.map((m) => m.organizationId);

    if (userOrgIds.length === 0) {
      return { simulations: [], total: 0 };
    }

    // Build query based on filters
    let allResults: any[] = [];

    if (args.organizationId) {
      // Check user has access to the specified organization
      if (!userOrgIds.includes(args.organizationId)) {
        throw new Error(
          "Access denied: User not member of specified organization"
        );
      }
      allResults = await ctx.db
        .query("simulations")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId!)
        )
        .collect();
    } else if (args.campaignId) {
      // Validate campaign access
      const campaign = await ctx.db.get(args.campaignId);
      if (!campaign || !userOrgIds.includes(campaign.organizationId)) {
        throw new Error(
          "Access denied: User not member of campaign organization"
        );
      }
      allResults = await ctx.db
        .query("simulations")
        .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId!))
        .collect();
    } else if (args.status) {
      const statusResults = await ctx.db
        .query("simulations")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
      // Filter by user organizations
      allResults = statusResults.filter((s) =>
        userOrgIds.includes(s.organizationId)
      );
    } else {
      const allSimulations = await ctx.db
        .query("simulations")
        .withIndex("by_created_at")
        .collect();
      // Filter by user organizations
      allResults = allSimulations.filter((s) =>
        userOrgIds.includes(s.organizationId)
      );
    }

    // Apply additional filters
    let filteredResults = allResults;

    if (args.createdBy) {
      filteredResults = filteredResults.filter(
        (s) => s.createdBy === args.createdBy
      );
    }

    // Get total count for pagination
    const total = filteredResults.length;

    // Apply pagination
    const offset = args.offset ?? 0;
    const limit = Math.min(args.limit ?? 50, 100); // Max 100 items per page

    const paginatedResults = filteredResults
      .sort((a, b) => b.createdAt - a.createdAt) // Most recent first
      .slice(offset, offset + limit);

    // Enrich with campaign information
    const simulations = await Promise.all(
      paginatedResults.map(async (simulation) => {
        const campaign = await ctx.db.get(simulation.campaignId);
        const creator = await ctx.db.get(simulation.createdBy);

        return {
          ...simulation,
          campaign: campaign
            ? {
                _id: campaign._id,
                name: (campaign as any).name,
                status: (campaign as any).status,
              }
            : null,
          creator: creator
            ? {
                _id: creator._id,
                name: (creator as any).name || "Unknown",
                email: (creator as any).email || "Unknown",
              }
            : null,
        };
      })
    );

    return {
      simulations,
      total,
      hasMore: offset + limit < total,
    };
  },
});

/**
 * Get simulation results with real-time updates
 * Requirements: 7.1, 7.2
 */
export const getSimulationResults = query({
  args: {
    simulationId: v.id("simulations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const simulation = await ctx.db.get(args.simulationId);
    if (!simulation) {
      return null;
    }

    // Check user has access to the simulation's organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", simulation.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error(
        "Access denied: User not member of simulation organization"
      );
    }

    // Return simulation with progress information
    const result: any = {
      _id: simulation._id,
      status: simulation.status,
      config: simulation.config,
      results: simulation.results,
      modelMetadata: simulation.modelMetadata,
      createdAt: simulation.createdAt,
      updatedAt: simulation.updatedAt,
      completedAt: simulation.completedAt,
      queueMetadata: simulation.queueMetadata,
    };

    // Calculate progress for processing simulations
    if (
      simulation.status === "processing" &&
      simulation.queueMetadata?.startedAt
    ) {
      const elapsed = Date.now() - simulation.queueMetadata.startedAt;
      const estimated = simulation.queueMetadata.estimatedDuration;
      const progress = Math.min(Math.round((elapsed / estimated) * 100), 95); // Cap at 95% until complete

      result.progress = {
        percentage: progress,
        elapsed,
        estimated,
        remainingTime: Math.max(estimated - elapsed, 0),
      };
    }

    return result;
  },
});

/**
 * Get simulation history and analytics for a campaign
 * Requirements: 7.1, 7.2
 */
export const getCampaignSimulationHistory = query({
  args: {
    campaignId: v.id("campaigns"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Validate campaign access
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", campaign.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error(
        "Access denied: User not member of campaign organization"
      );
    }

    // Get simulation history
    const simulations = await ctx.db
      .query("simulations")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .order("desc")
      .take(args.limit ?? 20);

    // Calculate analytics
    const analytics = {
      total: simulations.length,
      completed: simulations.filter((s) => s.status === "completed").length,
      failed: simulations.filter((s) => s.status === "failed").length,
      processing: simulations.filter((s) => s.status === "processing").length,
      queued: simulations.filter((s) => s.status === "queued").length,
      averageProcessingTime: 0,
      lastSimulation: simulations[0]?.createdAt,
    };

    // Calculate average processing time for completed simulations
    const completedSimulations = simulations.filter(
      (s) =>
        s.status === "completed" && s.completedAt && s.queueMetadata?.startedAt
    );

    if (completedSimulations.length > 0) {
      const totalProcessingTime = completedSimulations.reduce(
        (sum, s) => sum + (s.completedAt! - s.queueMetadata!.startedAt!),
        0
      );
      analytics.averageProcessingTime =
        totalProcessingTime / completedSimulations.length;
    }

    // Enrich simulations with creator info
    const enrichedSimulations = await Promise.all(
      simulations.map(async (simulation) => {
        const creator = await ctx.db.get(simulation.createdBy);
        return {
          _id: simulation._id,
          status: simulation.status,
          config: simulation.config,
          createdAt: simulation.createdAt,
          completedAt: simulation.completedAt,
          creator: creator
            ? {
                _id: creator._id,
                name: creator.name,
              }
            : null,
          hasResults: !!simulation.results,
          modelMetadata: simulation.modelMetadata
            ? {
                primaryModel: simulation.modelMetadata.primaryModel,
                processingTime: simulation.modelMetadata.processingTime,
                dataQuality: simulation.modelMetadata.dataQuality,
              }
            : null,
        };
      })
    );

    return {
      simulations: enrichedSimulations,
      analytics,
    };
  },
});

/**
 * Get organization simulation analytics
 * Requirements: 7.1, 7.2
 */
export const getOrganizationSimulationAnalytics = query({
  args: {
    organizationId: v.id("organizations"),
    timeframe: v.optional(
      v.object({
        startDate: v.number(),
        endDate: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Check user has access to the organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error("Access denied: User not member of organization");
    }

    // Get simulations for the organization
    let query = ctx.db
      .query("simulations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      );

    // Apply timeframe filter if provided
    if (args.timeframe) {
      query = query.filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), args.timeframe!.startDate),
          q.lte(q.field("createdAt"), args.timeframe!.endDate)
        )
      );
    }

    const simulations = await query.collect();

    // Calculate comprehensive analytics
    const analytics = {
      overview: {
        total: simulations.length,
        completed: simulations.filter((s) => s.status === "completed").length,
        failed: simulations.filter((s) => s.status === "failed").length,
        processing: simulations.filter((s) => s.status === "processing").length,
        queued: simulations.filter((s) => s.status === "queued").length,
        cancelled: simulations.filter((s) => s.status === "cancelled").length,
      },
      performance: {
        averageProcessingTime: 0,
        successRate: 0,
        totalProcessingTime: 0,
      },
      usage: {
        simulationsPerDay: {} as Record<string, number>,
        topUsers: [] as Array<{
          userId: Id<"users">;
          count: number;
          name?: string;
        }>,
        modelUsage: {} as Record<string, number>,
      },
      trends: {
        dailySimulations: [] as Array<{ date: string; count: number }>,
        weeklySuccess: [] as Array<{ week: string; successRate: number }>,
      },
    };

    // Calculate performance metrics
    const completedSimulations = simulations.filter(
      (s) =>
        s.status === "completed" && s.completedAt && s.queueMetadata?.startedAt
    );

    if (completedSimulations.length > 0) {
      const totalProcessingTime = completedSimulations.reduce(
        (sum, s) => sum + (s.completedAt! - s.queueMetadata!.startedAt!),
        0
      );
      analytics.performance.averageProcessingTime =
        totalProcessingTime / completedSimulations.length;
      analytics.performance.totalProcessingTime = totalProcessingTime;
    }

    const totalNonQueued = simulations.filter(
      (s) => s.status !== "queued"
    ).length;
    if (totalNonQueued > 0) {
      analytics.performance.successRate =
        completedSimulations.length / totalNonQueued;
    }

    // Calculate usage patterns
    const userCounts = new Map<Id<"users">, number>();
    const modelCounts = new Map<string, number>();
    const dailyCounts = new Map<string, number>();

    for (const simulation of simulations) {
      // User usage
      const currentCount = userCounts.get(simulation.createdBy) || 0;
      userCounts.set(simulation.createdBy, currentCount + 1);

      // Model usage
      if (simulation.modelMetadata?.primaryModel) {
        const modelCount =
          modelCounts.get(simulation.modelMetadata.primaryModel) || 0;
        modelCounts.set(simulation.modelMetadata.primaryModel, modelCount + 1);
      }

      // Daily usage
      const date = new Date(simulation.createdAt).toISOString().split("T")[0];
      const dayCount = dailyCounts.get(date) || 0;
      dailyCounts.set(date, dayCount + 1);
    }

    // Convert maps to arrays and objects
    analytics.usage.simulationsPerDay = Object.fromEntries(dailyCounts);
    analytics.usage.modelUsage = Object.fromEntries(modelCounts);

    // Get top users with names
    const topUserEntries = Array.from(userCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    analytics.usage.topUsers = await Promise.all(
      topUserEntries.map(async ([userId, count]) => {
        const user = await ctx.db.get(userId);
        return {
          userId,
          count,
          name: user?.name,
        };
      })
    );

    // Generate trend data
    const sortedDates = Array.from(dailyCounts.keys()).sort();
    analytics.trends.dailySimulations = sortedDates.map((date) => ({
      date,
      count: dailyCounts.get(date) || 0,
    }));

    return analytics;
  },
});

/**
 * Search simulations by campaign name or description
 * Requirements: 7.1, 7.2
 */
export const searchSimulations = query({
  args: {
    organizationId: v.id("organizations"),
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Check user has access to the organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error("Access denied: User not member of organization");
    }

    // Get all simulations for the organization
    const simulations = await ctx.db
      .query("simulations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Get campaigns for search matching
    const campaignIds = [...new Set(simulations.map((s) => s.campaignId))];
    const campaigns = await Promise.all(
      campaignIds.map((id) => ctx.db.get(id))
    );

    const campaignMap = new Map(
      campaigns.filter(Boolean).map((c) => [c!._id, c])
    );

    // Filter simulations by search term (matching campaign name)
    const searchLower = args.searchTerm.toLowerCase();
    const matchingSimulations = simulations.filter((simulation) => {
      const campaign = campaignMap.get(simulation.campaignId);
      if (!campaign) return false;

      return (
        (campaign as any).name.toLowerCase().includes(searchLower) ||
        (campaign as any).description?.toLowerCase().includes(searchLower)
      );
    });

    // Sort by creation date and limit results
    const sortedResults = matchingSimulations
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, args.limit ?? 20);

    // Enrich with campaign information
    const enrichedResults = sortedResults.map((simulation) => {
      const campaign = campaignMap.get(simulation.campaignId);
      return {
        ...simulation,
        campaign: campaign
          ? {
              _id: campaign._id,
              name: (campaign as any).name,
              status: (campaign as any).status,
            }
          : null,
      };
    });

    return enrichedResults;
  },
});

/**
 * Get recent simulations by campaign for quick access
 * Requirements: 7.1, 7.2
 */
export const getRecentSimulationsByCampaign = query({
  args: {
    campaignId: v.id("campaigns"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Validate campaign access
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      return [];
    }

    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", campaign.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      return [];
    }

    // Get recent simulations
    const simulations = await ctx.db
      .query("simulations")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .order("desc")
      .take(args.limit ?? 5);

    return simulations.map((simulation) => ({
      _id: simulation._id,
      status: simulation.status,
      config: {
        scenarios: simulation.config.scenarios,
        metrics: simulation.config.metrics.map((m) => ({ type: m.type })),
      },
      createdAt: simulation.createdAt,
      completedAt: simulation.completedAt,
    }));
  },
});

/**
 * Get simulations by campaign with full details
 * Requirements: 7.1, 7.2
 */
export const getSimulationsByCampaign = query({
  args: {
    campaignId: v.id("campaigns"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Validate campaign access
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      return [];
    }

    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", campaign.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      return [];
    }

    // Get simulations with optional limit
    let query = ctx.db
      .query("simulations")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .order("desc");

    const simulations = args.limit
      ? await query.take(args.limit)
      : await query.collect();

    // Enrich with creator information
    const enrichedSimulations = await Promise.all(
      simulations.map(async (simulation) => {
        const creator = await ctx.db.get(simulation.createdBy);
        return {
          ...simulation,
          creator: creator
            ? {
                _id: creator._id,
                name: creator.name,
              }
            : null,
        };
      })
    );

    return enrichedSimulations;
  },
});

// ============================================================================
// MODEL PERFORMANCE TRACKING FUNCTIONS
// ============================================================================

/**
 * Store performance comparison data for a simulation
 * Requirements: 6.5, 6.6
 */
export const storePerformanceComparison = mutation({
  args: {
    simulationId: v.id("simulations"),
    comparisons: v.array(
      v.object({
        date: v.number(),
        metric: v.string(),
        predictedValue: v.number(),
        actualValue: v.number(),
        confidence: v.number(),
        error: v.number(),
        percentageError: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const simulation = await ctx.db.get(args.simulationId);
    if (!simulation) {
      throw new Error("Simulation not found");
    }

    // Check user has access to the simulation's organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", simulation.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error(
        "Access denied: User not member of simulation organization"
      );
    }

    // Update simulation with performance comparison data
    await ctx.db.patch(args.simulationId, {
      performanceComparison: {
        comparisons: args.comparisons,
        updatedAt: Date.now(),
      },
      updatedAt: Date.now(),
    });

    return args.simulationId;
  },
});

/**
 * Store performance alerts for a simulation
 * Requirements: 6.5, 6.6
 */
export const storePerformanceAlerts = mutation({
  args: {
    simulationId: v.id("simulations"),
    alerts: v.array(
      v.object({
        type: v.string(),
        severity: v.string(),
        message: v.string(),
        triggeredAt: v.number(),
        acknowledged: v.boolean(),
        metadata: v.record(v.string(), v.any()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const simulation = await ctx.db.get(args.simulationId);
    if (!simulation) {
      throw new Error("Simulation not found");
    }

    // Check user has access to the simulation's organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", simulation.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error(
        "Access denied: User not member of simulation organization"
      );
    }

    // Update simulation with performance alerts
    await ctx.db.patch(args.simulationId, {
      performanceAlerts: {
        alerts: args.alerts,
        updatedAt: Date.now(),
      },
      updatedAt: Date.now(),
    });

    return args.simulationId;
  },
});

/**
 * Store comprehensive performance report for a simulation
 * Requirements: 6.5, 6.6
 */
export const storePerformanceReport = mutation({
  args: {
    simulationId: v.id("simulations"),
    report: v.object({
      simulationId: v.string(),
      campaignId: v.string(),
      modelName: v.string(),
      modelVersion: v.string(),
      predictions: v.array(
        v.object({
          date: v.number(),
          metric: v.string(),
          predictedValue: v.number(),
          actualValue: v.number(),
          confidence: v.number(),
          error: v.number(),
          percentageError: v.number(),
        })
      ),
      accuracyMetrics: v.optional(
        v.object({
          mape: v.number(),
          rmse: v.number(),
          mae: v.number(),
          r2Score: v.number(),
          confidenceCalibration: v.number(),
        })
      ),
      performanceStatus: v.string(),
      alerts: v.array(
        v.object({
          type: v.string(),
          severity: v.string(),
          message: v.string(),
          triggeredAt: v.number(),
          acknowledged: v.boolean(),
          metadata: v.record(v.string(), v.any()),
        })
      ),
      evaluatedAt: v.number(),
      recommendations: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const simulation = await ctx.db.get(args.simulationId);
    if (!simulation) {
      throw new Error("Simulation not found");
    }

    // Check user has access to the simulation's organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", simulation.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error(
        "Access denied: User not member of simulation organization"
      );
    }

    // Update simulation with performance report
    await ctx.db.patch(args.simulationId, {
      performanceReport: args.report,
      updatedAt: Date.now(),
    });

    return args.simulationId;
  },
});

/**
 * Get historical performance metrics for baseline comparison
 * Requirements: 6.5, 6.6
 */
export const getHistoricalPerformanceMetrics = query({
  args: {
    simulationId: v.id("simulations"),
    lookbackDays: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const simulation = await ctx.db.get(args.simulationId);
    if (!simulation) {
      return [];
    }

    // Check user has access to the simulation's organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", simulation.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error(
        "Access denied: User not member of simulation organization"
      );
    }

    const lookbackDate = Date.now() - args.lookbackDays * 24 * 60 * 60 * 1000;

    // Get historical simulations for the same campaign
    const historicalSimulations = await ctx.db
      .query("simulations")
      .withIndex("by_campaign", (q) => q.eq("campaignId", simulation.campaignId))
      .filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), lookbackDate),
          q.neq(q.field("_id"), args.simulationId),
          q.eq(q.field("status"), "completed")
        )
      )
      .collect();

    // Extract performance metrics from historical simulations
    const historicalMetrics = historicalSimulations
      .filter((s) => s.performanceReport?.accuracyMetrics)
      .map((s) => ({
        date: s.createdAt,
        ...s.performanceReport!.accuracyMetrics!,
      }));

    return historicalMetrics;
  },
});

/**
 * Get performance trends for a campaign
 * Requirements: 6.5, 6.6
 */
export const getPerformanceTrends = query({
  args: {
    campaignId: v.id("campaigns"),
    days: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Validate campaign access
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", campaign.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error(
        "Access denied: User not member of campaign organization"
      );
    }

    const lookbackDate = Date.now() - args.days * 24 * 60 * 60 * 1000;

    // Get simulations with performance reports
    const simulations = await ctx.db
      .query("simulations")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), lookbackDate),
          q.eq(q.field("status"), "completed")
        )
      )
      .collect();

    // Extract trends data
    const trends = simulations
      .filter((s) => s.performanceReport?.accuracyMetrics)
      .map((s) => ({
        date: s.createdAt,
        metrics: s.performanceReport!.accuracyMetrics!,
      }))
      .sort((a, b) => a.date - b.date);

    return trends;
  },
});

/**
 * Acknowledge a performance alert
 * Requirements: 6.5, 6.6
 */
export const acknowledgePerformanceAlert = mutation({
  args: {
    simulationId: v.id("simulations"),
    alertIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const simulation = await ctx.db.get(args.simulationId);
    if (!simulation) {
      throw new Error("Simulation not found");
    }

    // Check user has access to the simulation's organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", simulation.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error(
        "Access denied: User not member of simulation organization"
      );
    }

    // Update the specific alert
    if (simulation.performanceAlerts?.alerts) {
      const alerts = [...simulation.performanceAlerts.alerts];
      if (args.alertIndex >= 0 && args.alertIndex < alerts.length) {
        alerts[args.alertIndex] = {
          ...alerts[args.alertIndex],
          acknowledged: true,
        };

        await ctx.db.patch(args.simulationId, {
          performanceAlerts: {
            alerts,
            updatedAt: Date.now(),
          },
          updatedAt: Date.now(),
        });
      }
    }

    return args.simulationId;
  },
});

/**
 * Get simulation by ID (used by ModelPerformanceTracker)
 * Requirements: 6.5, 6.6
 */
export const get = query({
  args: {
    id: v.id("simulations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const simulation = await ctx.db.get(args.id);
    if (!simulation) {
      return null;
    }

    // Check user has access to the simulation's organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", simulation.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error(
        "Access denied: User not member of simulation organization"
      );
    }

    return simulation;
  },
});

// ============================================================================
// MODEL VALIDATION AND A/B TESTING FUNCTIONS
// ============================================================================

/**
 * Create a new A/B test for model comparison
 * Requirements: 6.1, 6.5
 */
export const createABTest = mutation({
  args: {
    organizationId: v.id("organizations"),
    testName: v.string(),
    description: v.string(),
    modelA: v.object({
      name: v.string(),
      version: v.string(),
      config: v.any(),
    }),
    modelB: v.object({
      name: v.string(),
      version: v.string(),
      config: v.any(),
    }),
    trafficSplit: v.number(),
    testDuration: v.number(),
    successMetrics: v.array(
      v.object({
        metric: v.string(),
        weight: v.number(),
        target: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Check user has access to the organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("Access denied: Admin or owner role required for A/B testing");
    }

    const now = Date.now();
    const testId = await ctx.db.insert("modelABTests", {
      organizationId: args.organizationId,
      testName: args.testName,
      description: args.description,
      modelA: args.modelA,
      modelB: args.modelB,
      trafficSplit: args.trafficSplit,
      testDuration: args.testDuration,
      successMetrics: args.successMetrics,
      status: "draft",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    return testId;
  },
});

/**
 * Start an A/B test
 * Requirements: 6.1, 6.5
 */
export const startABTest = mutation({
  args: {
    testId: v.id("modelABTests"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const test = await ctx.db.get(args.testId);
    if (!test) {
      throw new Error("A/B test not found");
    }

    // Check user has access to the organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", test.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("Access denied: Admin or owner role required");
    }

    if (test.status !== "draft") {
      throw new Error(`Cannot start test with status: ${test.status}`);
    }

    const now = Date.now();
    await ctx.db.patch(args.testId, {
      status: "running",
      startedAt: now,
      updatedAt: now,
    });

    return args.testId;
  },
});

/**
 * Stop an A/B test
 * Requirements: 6.1, 6.5
 */
export const stopABTest = mutation({
  args: {
    testId: v.id("modelABTests"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const test = await ctx.db.get(args.testId);
    if (!test) {
      throw new Error("A/B test not found");
    }

    // Check user has access to the organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", test.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("Access denied: Admin or owner role required");
    }

    if (test.status !== "running") {
      throw new Error(`Cannot stop test with status: ${test.status}`);
    }

    const now = Date.now();
    await ctx.db.patch(args.testId, {
      status: "stopped",
      completedAt: now,
      updatedAt: now,
    });

    return args.testId;
  },
});

/**
 * Get A/B test details
 * Requirements: 6.1, 6.5
 */
export const getABTest = query({
  args: {
    testId: v.id("modelABTests"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const test = await ctx.db.get(args.testId);
    if (!test) {
      return null;
    }

    // Check user has access to the organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", test.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error("Access denied: User not member of organization");
    }

    return test;
  },
});

/**
 * List A/B tests for an organization
 * Requirements: 6.1, 6.5
 */
export const listABTests = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Check user has access to the organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error("Access denied: User not member of organization");
    }

    let query = ctx.db
      .query("modelABTests")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    const tests = await query
      .order("desc")
      .take(args.limit ?? 50);

    return tests;
  },
});

/**
 * Submit user feedback for a simulation
 * Requirements: 6.1, 6.5
 */
export const submitModelFeedback = mutation({
  args: {
    simulationId: v.id("simulations"),
    feedbackType: v.union(
      v.literal("accuracy_rating"),
      v.literal("usefulness_rating"),
      v.literal("prediction_correction"),
      v.literal("general_feedback")
    ),
    rating: v.optional(v.number()),
    feedback: v.object({
      originalPrediction: v.optional(v.any()),
      correctedValue: v.optional(v.any()),
      comments: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
    }),
    metricType: v.optional(v.string()),
    timeframe: v.optional(
      v.object({
        start: v.number(),
        end: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const simulation = await ctx.db.get(args.simulationId);
    if (!simulation) {
      throw new Error("Simulation not found");
    }

    // Check user has access to the simulation's organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", simulation.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error("Access denied: User not member of simulation organization");
    }

    // Validate rating if provided
    if (args.rating !== undefined && (args.rating < 1 || args.rating > 5)) {
      throw new Error("Rating must be between 1 and 5");
    }

    const now = Date.now();
    const feedbackId = await ctx.db.insert("modelValidationFeedback", {
      simulationId: args.simulationId,
      campaignId: simulation.campaignId,
      organizationId: simulation.organizationId,
      userId,
      feedbackType: args.feedbackType,
      rating: args.rating,
      feedback: args.feedback,
      metricType: args.metricType,
      timeframe: args.timeframe,
      processed: false,
      createdAt: now,
      updatedAt: now,
    });

    return feedbackId;
  },
});

/**
 * Get feedback summary for a model
 * Requirements: 6.1, 6.5
 */
export const getFeedbackSummary = query({
  args: {
    modelName: v.string(),
    modelVersion: v.string(),
    organizationId: v.id("organizations"),
    days: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Check user has access to the organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error("Access denied: User not member of organization");
    }

    const lookbackDate = Date.now() - args.days * 24 * 60 * 60 * 1000;

    // Get simulations for this model
    const simulations = await ctx.db
      .query("simulations")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), lookbackDate),
          q.eq(q.field("modelMetadata.primaryModel"), args.modelName)
        )
      )
      .collect();

    const simulationIds = simulations.map(s => s._id);

    // Get feedback for these simulations
    const allFeedback = await Promise.all(
      simulationIds.map(id =>
        ctx.db
          .query("modelValidationFeedback")
          .withIndex("by_simulation", (q) => q.eq("simulationId", id))
          .filter((q) => q.gte(q.field("createdAt"), lookbackDate))
          .collect()
      )
    );

    const feedback = allFeedback.flat();

    // Calculate summary statistics
    const totalFeedback = feedback.length;
    const ratingsOnly = feedback.filter(f => f.rating !== undefined);
    const averageRating = ratingsOnly.length > 0 
      ? ratingsOnly.reduce((sum, f) => sum + f.rating!, 0) / ratingsOnly.length 
      : 0;

    // Group by feedback type
    const feedbackByType: Record<string, number> = {};
    feedback.forEach(f => {
      feedbackByType[f.feedbackType] = (feedbackByType[f.feedbackType] || 0) + 1;
    });

    // Extract common issues from comments
    const comments = feedback
      .map(f => f.feedback.comments)
      .filter(c => c && c.length > 0) as string[];
    
    const commonIssues = extractCommonIssues(comments);

    // Get recent feedback
    const recentFeedback = feedback
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10)
      .map(f => ({
        date: f.createdAt,
        rating: f.rating,
        comments: f.feedback.comments,
        type: f.feedbackType,
      }));

    return {
      totalFeedback,
      averageRating,
      feedbackByType,
      commonIssues,
      recentFeedback,
    };
  },
});

/**
 * Configure model retraining triggers
 * Requirements: 6.1, 6.5
 */
export const configureRetrainingTriggers = mutation({
  args: {
    organizationId: v.id("organizations"),
    triggers: v.array(
      v.object({
        type: v.string(),
        threshold: v.number(),
        condition: v.string(),
        action: v.string(),
        enabled: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Check user has access to the organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("Access denied: Admin or owner role required");
    }

    // Store triggers in organization settings or separate table
    // For now, we'll store in a simple way - in production you might want a dedicated table
    const now = Date.now();
    
    // Update organization with retraining triggers
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    await ctx.db.patch(args.organizationId, {
      settings: {
        ...organization.settings,
        retrainingTriggers: args.triggers,
      } as any, // Type assertion needed for extended settings
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Check if retraining is needed based on configured triggers
 * Requirements: 6.1, 6.5
 */
export const checkRetrainingTriggers = query({
  args: {
    modelName: v.string(),
    modelVersion: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Check user has access to the organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error("Access denied: User not member of organization");
    }

    // Get organization settings with triggers
    const organization = await ctx.db.get(args.organizationId);
    const triggers = (organization?.settings as any)?.retrainingTriggers || [];

    const triggeredBy: string[] = [];
    const recommendations: string[] = [];

    // Check each trigger
    for (const trigger of triggers) {
      if (!trigger.enabled) continue;

      let shouldTrigger = false;

      switch (trigger.type) {
        case 'performance_degradation':
          // Check recent performance metrics
          const recentMetrics = await getRecentPerformanceMetrics(ctx, args.modelName, args.organizationId);
          if (recentMetrics && recentMetrics.accuracy < trigger.threshold) {
            shouldTrigger = true;
          }
          break;

        case 'feedback_threshold':
          // Check feedback ratings
          // Get feedback summary directly from database
          const lookbackDate = Date.now() - 30 * 24 * 60 * 60 * 1000;
          const simulations = await ctx.db
            .query("simulations")
            .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
            .filter((q: any) =>
              q.and(
                q.gte(q.field("createdAt"), lookbackDate),
                q.eq(q.field("modelMetadata.primaryModel"), args.modelName)
              )
            )
            .collect();

          const simulationIds = simulations.map((s: any) => s._id);
          const allFeedback = await Promise.all(
            simulationIds.map((id: any) =>
              ctx.db
                .query("modelValidationFeedback")
                .withIndex("by_simulation", (q: any) => q.eq("simulationId", id))
                .filter((q: any) => q.gte(q.field("createdAt"), lookbackDate))
                .collect()
            )
          );

          const feedback = allFeedback.flat();
          const ratingsOnly = feedback.filter((f: any) => f.rating !== undefined);
          const averageRating = ratingsOnly.length > 0 
            ? ratingsOnly.reduce((sum: number, f: any) => sum + f.rating!, 0) / ratingsOnly.length 
            : 0;
          if (averageRating < trigger.threshold) {
            shouldTrigger = true;
          }
          break;

        case 'scheduled':
          // Check if enough time has passed since last retraining
          // This would require tracking last retraining date
          break;
      }

      if (shouldTrigger) {
        triggeredBy.push(trigger.type);
        
        switch (trigger.action) {
          case 'retrain':
            recommendations.push(`Retrain ${args.modelName} due to ${trigger.type}`);
            break;
          case 'alert':
            recommendations.push(`Alert: ${args.modelName} performance issue detected`);
            break;
          case 'switch_model':
            recommendations.push(`Consider switching from ${args.modelName} to alternative model`);
            break;
        }
      }
    }

    return {
      retrainingNeeded: triggeredBy.length > 0,
      triggeredBy,
      recommendations,
    };
  },
});

/**
 * Store validation report
 * Requirements: 6.1, 6.5
 */
export const storeValidationReport = mutation({
  args: {
    organizationId: v.id("organizations"),
    report: v.any(), // Full validation report object
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Check user has access to the organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error("Access denied: User not member of organization");
    }

    // Store the validation report
    // In a real implementation, you might want a dedicated table for validation reports
    const now = Date.now();
    
    // For now, store as a document - in production consider a dedicated table
    const reportId = await ctx.db.insert("modelPerformanceMetrics", {
      simulationId: "validation_report" as Id<"simulations">, // Placeholder
      campaignId: "validation_report" as Id<"campaigns">, // Placeholder
      organizationId: args.organizationId,
      modelName: args.report.modelName,
      modelVersion: args.report.modelVersion,
      predictions: [], // Not applicable for validation reports
      performanceStatus: args.report.performanceMetrics.accuracy > 0.8 ? "excellent" : 
                        args.report.performanceMetrics.accuracy > 0.6 ? "good" : "degraded",
      alerts: [],
      evaluatedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return reportId;
  },
});

/**
 * Process pending feedback for model improvement
 * Requirements: 6.1, 6.5
 */
export const processPendingFeedback = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Check user has access to the organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("Access denied: Admin or owner role required");
    }

    // Get unprocessed feedback
    const pendingFeedback = await ctx.db
      .query("modelValidationFeedback")
      .withIndex("by_processed", (q) => q.eq("processed", false))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();

    const improvements: string[] = [];
    let processed = 0;

    // Process each feedback item
    for (const feedback of pendingFeedback) {
      // Mark as processed
      await ctx.db.patch(feedback._id, {
        processed: true,
        processedAt: Date.now(),
        updatedAt: Date.now(),
      });

      processed++;

      // Generate improvement suggestions based on feedback type
      switch (feedback.feedbackType) {
        case 'accuracy_rating':
          if (feedback.rating && feedback.rating < 3) {
            improvements.push('Low accuracy ratings detected - consider model retraining');
          }
          break;
        case 'prediction_correction':
          improvements.push('User corrections available - implement active learning pipeline');
          break;
        case 'general_feedback':
          if (feedback.feedback.comments?.includes('slow')) {
            improvements.push('Performance optimization needed based on user feedback');
          }
          break;
      }
    }

    return {
      processed,
      improvements: [...new Set(improvements)], // Remove duplicates
    };
  },
});

/**
 * Get validation history
 * Requirements: 6.1, 6.5
 */
export const getValidationHistory = query({
  args: {
    organizationId: v.id("organizations"),
    modelName: v.optional(v.string()),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Check user has access to the organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error("Access denied: User not member of organization");
    }

    // Get validation history from performance metrics
    let query = ctx.db
      .query("modelPerformanceMetrics")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId));

    if (args.modelName) {
      query = query.filter((q) => q.eq(q.field("modelName"), args.modelName));
    }

    const history = await query
      .order("desc")
      .take(args.limit);

    return history.map(item => ({
      date: item.evaluatedAt,
      modelName: item.modelName,
      modelVersion: item.modelVersion,
      performanceStatus: item.performanceStatus,
      userSatisfaction: 0.8, // Placeholder - would calculate from actual feedback
      recommendations: [], // Placeholder - would extract from stored reports
    }));
  },
});

// Helper functions for the validation service
function extractCommonIssues(comments: string[]): string[] {
  const issues: string[] = [];
  const keywords = {
    'overconfident': 'overconfident predictions',
    'slow': 'slow response times',
    'inaccurate': 'prediction accuracy issues',
    'edge case': 'poor performance on edge cases',
    'bias': 'model bias detected',
  };

  for (const [keyword, issue] of Object.entries(keywords)) {
    const count = comments.filter(comment => 
      comment.toLowerCase().includes(keyword)
    ).length;
    
    if (count > comments.length * 0.1) { // If >10% of comments mention this issue
      issues.push(issue);
    }
  }

  return issues;
}

async function getRecentPerformanceMetrics(ctx: any, modelName: string, organizationId: Id<"organizations">) {
  const recentMetrics = await ctx.db
    .query("modelPerformanceMetrics")
    .withIndex("by_organization", (q: any) => q.eq("organizationId", organizationId))
    .filter((q: any) => q.eq(q.field("modelName"), modelName))
    .order("desc")
    .first();

  return recentMetrics?.accuracyMetrics;
}/**

 * Get model performance metrics for validation
 * Requirements: 6.1, 6.5
 */
export const getModelPerformanceMetrics = query({
  args: {
    modelName: v.string(),
    modelVersion: v.string(),
    organizationId: v.id("organizations"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Check user has access to the organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error("Access denied: User not member of organization");
    }

    // Get performance metrics for the specified model and time period
    const metrics = await ctx.db
      .query("modelPerformanceMetrics")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) =>
        q.and(
          q.eq(q.field("modelName"), args.modelName),
          q.eq(q.field("modelVersion"), args.modelVersion),
          q.gte(q.field("evaluatedAt"), args.startDate),
          q.lte(q.field("evaluatedAt"), args.endDate)
        )
      )
      .collect();

    if (metrics.length === 0) {
      return {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
      };
    }

    // Calculate average metrics
    const avgMetrics = metrics.reduce(
      (acc, metric) => {
        if (metric.accuracyMetrics) {
          acc.accuracy += metric.accuracyMetrics.r2Score || 0;
          acc.precision += metric.accuracyMetrics.confidenceCalibration || 0;
          acc.recall += (1 - (metric.accuracyMetrics.mape || 100) / 100) || 0;
          acc.f1Score += (metric.accuracyMetrics.r2Score || 0);
        }
        return acc;
      },
      { accuracy: 0, precision: 0, recall: 0, f1Score: 0 }
    );

    const count = metrics.length;
    return {
      accuracy: avgMetrics.accuracy / count,
      precision: avgMetrics.precision / count,
      recall: avgMetrics.recall / count,
      f1Score: avgMetrics.f1Score / count,
    };
  },
});

/**
 * Get A/B test results for a specific model
 * Requirements: 6.1, 6.5
 */
export const getModelABTestResults = query({
  args: {
    modelName: v.string(),
    modelVersion: v.string(),
    organizationId: v.id("organizations"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Check user has access to the organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error("Access denied: User not member of organization");
    }

    // Get A/B tests that involve this model
    const tests = await ctx.db
      .query("modelABTests")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) =>
        q.and(
          q.or(
            q.and(
              q.eq(q.field("modelA.name"), args.modelName),
              q.eq(q.field("modelA.version"), args.modelVersion)
            ),
            q.and(
              q.eq(q.field("modelB.name"), args.modelName),
              q.eq(q.field("modelB.version"), args.modelVersion)
            )
          ),
          q.gte(q.field("createdAt"), args.startDate),
          q.lte(q.field("createdAt"), args.endDate)
        )
      )
      .collect();

    return tests;
  },
});