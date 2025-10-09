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

  // AI Trajectory Simulation tables
  simulations: defineTable({
    campaignId: v.id("campaigns"),
    organizationId: v.id("organizations"),
    createdBy: v.id("users"),
    
    // Simulation Configuration
    config: v.object({
      timeframe: v.object({
        startDate: v.number(),
        endDate: v.number(),
        granularity: v.union(v.literal("daily"), v.literal("weekly")),
      }),
      metrics: v.array(v.object({
        type: v.string(),
        weight: v.number(),
        benchmarkSource: v.optional(v.string()),
      })),
      scenarios: v.array(v.string()),
      externalDataSources: v.array(v.string()),
    }),
    
    // Simulation Status
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),

    // Queue Metadata for async processing
    queueMetadata: v.optional(v.object({
      priority: v.number(),
      estimatedDuration: v.number(),
      subscriptionTier: v.string(),
      queuedAt: v.number(),
      startedAt: v.optional(v.number()),
      retryCount: v.number(),
      retryAt: v.optional(v.number()),
      error: v.optional(v.string()),
      failedAt: v.optional(v.number()),
    })),
    
    // Results
    results: v.optional(v.object({
      trajectories: v.array(v.object({
        date: v.number(),
        metrics: v.record(v.string(), v.number()),
        confidence: v.number(),
      })),
      
      scenarios: v.array(v.object({
        type: v.string(),
        probability: v.number(),
        trajectory: v.array(v.object({
          date: v.number(),
          metrics: v.record(v.string(), v.number()),
        })),
      })),
      
      risks: v.array(v.object({
        type: v.string(),
        severity: v.string(),
        probability: v.number(),
        description: v.string(),
        timeframe: v.object({
          start: v.number(),
          end: v.number(),
        }),
      })),
      
      recommendations: v.array(v.object({
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
      })),
    })),
    
    // Model Metadata
    modelMetadata: v.optional(v.object({
      primaryModel: v.string(),
      modelVersions: v.record(v.string(), v.string()),
      processingTime: v.number(),
      dataQuality: v.object({
        completeness: v.number(),
        accuracy: v.number(),
        freshness: v.number(),
      }),
    })),

    // Performance tracking data
    performanceComparison: v.optional(v.object({
      comparisons: v.array(v.object({
        date: v.number(),
        metric: v.string(),
        predictedValue: v.number(),
        actualValue: v.number(),
        confidence: v.number(),
        error: v.number(),
        percentageError: v.number(),
      })),
      updatedAt: v.number(),
    })),

    performanceAlerts: v.optional(v.object({
      alerts: v.array(v.object({
        type: v.string(),
        severity: v.string(),
        message: v.string(),
        triggeredAt: v.number(),
        acknowledged: v.boolean(),
        metadata: v.record(v.string(), v.any()),
      })),
      updatedAt: v.number(),
    })),

    performanceReport: v.optional(v.object({
      simulationId: v.string(),
      campaignId: v.string(),
      modelName: v.string(),
      modelVersion: v.string(),
      predictions: v.array(v.object({
        date: v.number(),
        metric: v.string(),
        predictedValue: v.number(),
        actualValue: v.number(),
        confidence: v.number(),
        error: v.number(),
        percentageError: v.number(),
      })),
      accuracyMetrics: v.optional(v.object({
        mape: v.number(),
        rmse: v.number(),
        mae: v.number(),
        r2Score: v.number(),
        confidenceCalibration: v.number(),
      })),
      performanceStatus: v.string(),
      alerts: v.array(v.object({
        type: v.string(),
        severity: v.string(),
        message: v.string(),
        triggeredAt: v.number(),
        acknowledged: v.boolean(),
        metadata: v.record(v.string(), v.any()),
      })),
      evaluatedAt: v.number(),
      recommendations: v.array(v.string()),
    })),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
  .index("by_campaign", ["campaignId"])
  .index("by_organization", ["organizationId"])
  .index("by_status", ["status"])
  .index("by_created_at", ["createdAt"]),

  // simulation_cache table (for performance optimization)
  simulationCache: defineTable({
    cacheKey: v.string(), // Hash of input parameters
    campaignId: v.id("campaigns"),
    results: v.any(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
  .index("by_cache_key", ["cacheKey"])
  .index("by_expiry", ["expiresAt"]),

  // external_data_sources table
  externalDataSources: defineTable({
    organizationId: v.id("organizations"),
    source: v.string(), // 'semrush', 'google_trends', 'twitter_api', etc.
    
    config: v.object({
      apiKey: v.string(), // Encrypted
      endpoint: v.string(),
      rateLimit: v.object({
        requests: v.number(),
        period: v.number(),
      }),
      enabled: v.boolean(),
      scopes: v.optional(v.array(v.string())),
    }),
    
    lastSync: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("error"), v.literal("disabled")),
    
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_organization", ["organizationId"])
  .index("by_source", ["source"]),

  // market_data_cache table
  marketDataCache: defineTable({
    source: v.string(),
    dataType: v.string(), // 'competitor_metrics', 'trend_data', 'benchmarks'
    context: v.string(), // Hash of query parameters
    
    data: v.any(),
    
    expiresAt: v.number(),
    createdAt: v.number(),
  })
  .index("by_source_type", ["source", "dataType"])
  .index("by_expiry", ["expiresAt"]),

  // Model performance tracking tables
  modelPerformanceMetrics: defineTable({
    simulationId: v.id("simulations"),
    campaignId: v.id("campaigns"),
    organizationId: v.id("organizations"),
    
    // Model identification
    modelName: v.string(),
    modelVersion: v.string(),
    
    // Prediction vs actual comparison
    predictions: v.array(v.object({
      date: v.number(),
      metric: v.string(), // 'ctr', 'impressions', 'engagement', etc.
      predictedValue: v.number(),
      actualValue: v.optional(v.number()),
      confidence: v.number(),
    })),
    
    // Accuracy metrics
    accuracyMetrics: v.optional(v.object({
      mape: v.number(), // Mean Absolute Percentage Error
      rmse: v.number(), // Root Mean Square Error
      mae: v.number(),  // Mean Absolute Error
      r2Score: v.number(), // R-squared score
      confidenceCalibration: v.number(), // How well calibrated confidence scores are
    })),
    
    // Performance degradation tracking
    performanceStatus: v.union(
      v.literal("excellent"),
      v.literal("good"),
      v.literal("degraded"),
      v.literal("poor")
    ),
    
    // Alerts and notifications
    alerts: v.array(v.object({
      type: v.string(),
      severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
      message: v.string(),
      triggeredAt: v.number(),
      acknowledged: v.boolean(),
    })),
    
    // Metadata
    evaluatedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_simulation", ["simulationId"])
  .index("by_campaign", ["campaignId"])
  .index("by_organization", ["organizationId"])
  .index("by_model", ["modelName", "modelVersion"])
  .index("by_performance_status", ["performanceStatus"])
  .index("by_evaluated_at", ["evaluatedAt"]),

  // Model validation and feedback
  modelValidationFeedback: defineTable({
    simulationId: v.id("simulations"),
    campaignId: v.id("campaigns"),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    
    // Feedback details
    feedbackType: v.union(
      v.literal("accuracy_rating"),
      v.literal("usefulness_rating"),
      v.literal("prediction_correction"),
      v.literal("general_feedback")
    ),
    
    // Rating (1-5 scale)
    rating: v.optional(v.number()),
    
    // Specific corrections or feedback
    feedback: v.object({
      originalPrediction: v.optional(v.any()),
      correctedValue: v.optional(v.any()),
      comments: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
    }),
    
    // Context
    metricType: v.optional(v.string()),
    timeframe: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
    
    // Processing status
    processed: v.boolean(),
    processedAt: v.optional(v.number()),
    
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_simulation", ["simulationId"])
  .index("by_campaign", ["campaignId"])
  .index("by_organization", ["organizationId"])
  .index("by_user", ["userId"])
  .index("by_feedback_type", ["feedbackType"])
  .index("by_processed", ["processed"])
  .index("by_created_at", ["createdAt"]),

  // A/B testing for models
  modelABTests: defineTable({
    organizationId: v.id("organizations"),
    
    // Test configuration
    testName: v.string(),
    description: v.string(),
    
    // Models being tested
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
    
    // Test parameters
    trafficSplit: v.number(), // 0.5 = 50/50 split
    testDuration: v.number(), // Duration in days
    
    // Success metrics
    successMetrics: v.array(v.object({
      metric: v.string(),
      weight: v.number(),
      target: v.optional(v.number()),
    })),
    
    // Test status
    status: v.union(
      v.literal("draft"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("stopped")
    ),
    
    // Results
    results: v.optional(v.object({
      modelAPerformance: v.record(v.string(), v.number()),
      modelBPerformance: v.record(v.string(), v.number()),
      statisticalSignificance: v.number(),
      winner: v.optional(v.string()),
      confidence: v.number(),
    })),
    
    // Metadata
    createdBy: v.id("users"),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_organization", ["organizationId"])
  .index("by_status", ["status"])
  .index("by_created_by", ["createdBy"])
  .index("by_created_at", ["createdAt"]),
});

export default schema;
