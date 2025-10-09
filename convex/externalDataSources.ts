import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
// Simple encoding utilities for API keys (Note: In production, use proper encryption)
// For now, we'll use base64 encoding as a placeholder until proper encryption is implemented
function encrypt(text: string): string {
  // Simple base64 encoding - NOT secure encryption
  // TODO: Implement proper encryption when Convex supports it
  return btoa(text);
}

function decrypt(encodedText: string): string {
  try {
    // Simple base64 decoding
    return atob(encodedText);
  } catch (error) {
    throw new Error('Failed to decode API key');
  }
}

// Supported external data sources configuration
const SUPPORTED_SOURCES = {
  semrush: {
    name: 'SEMrush',
    endpoint: 'https://api.semrush.com/',
    rateLimit: { requests: 10000, period: 86400000 }, // 10k per day
    requiredScopes: ['domain_analytics', 'keyword_analytics'],
  },
  google_trends: {
    name: 'Google Trends',
    endpoint: 'https://trends.googleapis.com/trends/',
    rateLimit: { requests: 1000, period: 86400000 }, // 1k per day
    requiredScopes: ['trends_data'],
  },
  twitter_api: {
    name: 'Twitter API',
    endpoint: 'https://api.twitter.com/2/',
    rateLimit: { requests: 300, period: 900000 }, // 300 per 15 minutes
    requiredScopes: ['tweet.read', 'users.read'],
  },
  facebook_api: {
    name: 'Facebook Marketing API',
    endpoint: 'https://graph.facebook.com/',
    rateLimit: { requests: 200, period: 3600000 }, // 200 per hour
    requiredScopes: ['ads_read', 'pages_read_engagement'],
  },
  linkedin_api: {
    name: 'LinkedIn Marketing API',
    endpoint: 'https://api.linkedin.com/v2/',
    rateLimit: { requests: 500, period: 86400000 }, // 500 per day
    requiredScopes: ['r_ads', 'r_organization_social'],
  },
} as const;

type SupportedSource = keyof typeof SUPPORTED_SOURCES;

/**
 * Store or update API key for external data source with encryption
 * Requirements: 7.4, 6.5
 */
export const storeAPIKey = mutation({
  args: {
    organizationId: v.id("organizations"),
    source: v.string(),
    apiKey: v.string(),
    additionalConfig: v.optional(v.object({
      endpoint: v.optional(v.string()),
      rateLimit: v.optional(v.object({
        requests: v.number(),
        period: v.number(),
      })),
      scopes: v.optional(v.array(v.string())),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Check user has admin access to the organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      throw new Error("Access denied: Admin privileges required to manage API keys");
    }

    // Validate source
    if (!(args.source in SUPPORTED_SOURCES)) {
      throw new Error(`Unsupported data source: ${args.source}. Supported sources: ${Object.keys(SUPPORTED_SOURCES).join(', ')}`);
    }

    const sourceConfig = SUPPORTED_SOURCES[args.source as SupportedSource];

    // Validate API key format (basic validation)
    if (!args.apiKey || args.apiKey.length < 10) {
      throw new Error("Invalid API key: must be at least 10 characters");
    }

    // Encrypt the API key
    const encryptedApiKey = encrypt(args.apiKey);

    // Prepare configuration
    const config = {
      apiKey: encryptedApiKey,
      endpoint: args.additionalConfig?.endpoint || sourceConfig.endpoint,
      rateLimit: args.additionalConfig?.rateLimit || sourceConfig.rateLimit,
      enabled: true,
      scopes: args.additionalConfig?.scopes || [...sourceConfig.requiredScopes],
    };

    // Check if data source already exists
    const existing = await ctx.db
      .query("externalDataSources")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("source"), args.source))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing data source
      await ctx.db.patch(existing._id, {
        config,
        status: "active",
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new data source
      const dataSourceId = await ctx.db.insert("externalDataSources", {
        organizationId: args.organizationId,
        source: args.source,
        config,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      return dataSourceId;
    }
  },
});

/**
 * Retrieve and decrypt API key for external data source
 * Requirements: 7.4, 6.5
 */
export const getAPIKey = query({
  args: {
    organizationId: v.id("organizations"),
    source: v.string(),
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

    // Only admins and owners can retrieve API keys
    if (!["owner", "admin"].includes(membership.role)) {
      throw new Error("Access denied: Admin privileges required to access API keys");
    }

    const dataSource = await ctx.db
      .query("externalDataSources")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("source"), args.source))
      .first();

    if (!dataSource) {
      return null;
    }

    try {
      const decryptedApiKey = decrypt(dataSource.config.apiKey);
      return {
        source: dataSource.source,
        apiKey: decryptedApiKey,
        config: {
          endpoint: dataSource.config.endpoint,
          rateLimit: dataSource.config.rateLimit,
          enabled: dataSource.config.enabled,
          scopes: dataSource.config.scopes,
        },
        status: dataSource.status,
        lastSync: dataSource.lastSync,
      };
    } catch (error) {
      throw new Error("Failed to decrypt API key. Please re-configure the data source.");
    }
  },
});

/**
 * Test external data source connection
 * Requirements: 7.4, 6.5
 */
export const testDataSourceConnection = mutation({
  args: {
    organizationId: v.id("organizations"),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Check user has admin access to the organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      throw new Error("Access denied: Admin privileges required to test data sources");
    }

    const dataSource = await ctx.db
      .query("externalDataSources")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("source"), args.source))
      .first();

    if (!dataSource) {
      throw new Error("Data source not found");
    }

    try {
      // Decrypt API key for testing
      const decryptedApiKey = decrypt(dataSource.config.apiKey);
      
      // Perform basic connection test based on source type
      let testResult;
      const now = Date.now();

      switch (args.source) {
        case 'semrush':
          testResult = await testSEMrushConnection(decryptedApiKey, dataSource.config.endpoint);
          break;
        case 'google_trends':
          testResult = await testGoogleTrendsConnection(decryptedApiKey, dataSource.config.endpoint);
          break;
        case 'twitter_api':
          testResult = await testTwitterConnection(decryptedApiKey, dataSource.config.endpoint);
          break;
        case 'facebook_api':
          testResult = await testFacebookConnection(decryptedApiKey, dataSource.config.endpoint);
          break;
        case 'linkedin_api':
          testResult = await testLinkedInConnection(decryptedApiKey, dataSource.config.endpoint);
          break;
        default:
          throw new Error(`Connection testing not implemented for source: ${args.source}`);
      }

      // Update data source status based on test result
      const newStatus = testResult.success ? "active" : "error";
      await ctx.db.patch(dataSource._id, {
        status: newStatus,
        lastSync: testResult.success ? now : dataSource.lastSync,
        updatedAt: now,
      });

      return {
        success: testResult.success,
        message: testResult.message,
        details: testResult.details,
        testedAt: now,
      };

    } catch (error) {
      // Update status to error
      await ctx.db.patch(dataSource._id, {
        status: "error",
        updatedAt: Date.now(),
      });

      return {
        success: false,
        message: error instanceof Error ? error.message : "Connection test failed",
        testedAt: Date.now(),
      };
    }
  },
});

/**
 * List external data sources for organization
 * Requirements: 7.4, 6.5
 */
export const listDataSources = query({
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

    if (!membership) {
      throw new Error("Access denied: User not member of organization");
    }

    const dataSources = await ctx.db
      .query("externalDataSources")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Return data sources without API keys (security)
    return dataSources.map(ds => ({
      _id: ds._id,
      source: ds.source,
      sourceName: SUPPORTED_SOURCES[ds.source as SupportedSource]?.name || ds.source,
      status: ds.status,
      enabled: ds.config.enabled,
      endpoint: ds.config.endpoint,
      rateLimit: ds.config.rateLimit,
      scopes: ds.config.scopes,
      lastSync: ds.lastSync,
      createdAt: ds.createdAt,
      updatedAt: ds.updatedAt,
      hasApiKey: !!ds.config.apiKey,
    }));
  },
});

/**
 * Update data source configuration (without API key)
 * Requirements: 7.4, 6.5
 */
export const updateDataSourceConfig = mutation({
  args: {
    dataSourceId: v.id("externalDataSources"),
    enabled: v.optional(v.boolean()),
    rateLimit: v.optional(v.object({
      requests: v.number(),
      period: v.number(),
    })),
    endpoint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const dataSource = await ctx.db.get(args.dataSourceId);
    if (!dataSource) {
      throw new Error("Data source not found");
    }

    // Check user has admin access to the organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", dataSource.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      throw new Error("Access denied: Admin privileges required to update data sources");
    }

    // Update configuration
    const updatedConfig = {
      ...dataSource.config,
      ...(args.enabled !== undefined && { enabled: args.enabled }),
      ...(args.rateLimit && { rateLimit: args.rateLimit }),
      ...(args.endpoint && { endpoint: args.endpoint }),
    };

    await ctx.db.patch(args.dataSourceId, {
      config: updatedConfig,
      updatedAt: Date.now(),
    });

    return args.dataSourceId;
  },
});

/**
 * Delete external data source
 * Requirements: 7.4, 6.5
 */
export const deleteDataSource = mutation({
  args: {
    dataSourceId: v.id("externalDataSources"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const dataSource = await ctx.db.get(args.dataSourceId);
    if (!dataSource) {
      throw new Error("Data source not found");
    }

    // Check user has admin access to the organization
    const membership = await ctx.db
      .query("organizationMemberships")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", dataSource.organizationId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      throw new Error("Access denied: Admin privileges required to delete data sources");
    }

    // Delete associated market data cache entries
    const cacheEntries = await ctx.db
      .query("marketDataCache")
      .withIndex("by_source_type", (q) => q.eq("source", dataSource.source))
      .collect();

    for (const entry of cacheEntries) {
      await ctx.db.delete(entry._id);
    }

    // Delete the data source
    await ctx.db.delete(args.dataSourceId);

    return { success: true };
  },
});

/**
 * Get data source health status and monitoring
 * Requirements: 7.4, 6.5
 */
export const getDataSourceHealth = query({
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

    if (!membership) {
      throw new Error("Access denied: User not member of organization");
    }

    const dataSources = await ctx.db
      .query("externalDataSources")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    const healthStatus = {
      overall: "healthy" as "healthy" | "degraded" | "critical",
      sources: [] as Array<{
        source: string;
        sourceName: string;
        status: string;
        enabled: boolean;
        lastSync: number | undefined;
        daysSinceLastSync: number | null;
        health: "healthy" | "stale" | "error" | "disabled";
        issues: string[];
      }>,
      summary: {
        total: dataSources.length,
        active: 0,
        error: 0,
        disabled: 0,
        stale: 0,
      },
    };

    for (const ds of dataSources) {
      const daysSinceLastSync = ds.lastSync ? Math.floor((now - ds.lastSync) / (24 * 60 * 60 * 1000)) : null;
      const issues: string[] = [];
      let health: "healthy" | "stale" | "error" | "disabled";

      if (!ds.config.enabled) {
        health = "disabled";
        healthStatus.summary.disabled++;
      } else if (ds.status === "error") {
        health = "error";
        healthStatus.summary.error++;
        issues.push("Connection error detected");
      } else if (!ds.lastSync) {
        health = "error";
        healthStatus.summary.error++;
        issues.push("Never successfully connected");
      } else if (ds.lastSync < oneWeekAgo) {
        health = "stale";
        healthStatus.summary.stale++;
        issues.push(`No sync for ${daysSinceLastSync} days`);
      } else if (ds.lastSync < oneDayAgo) {
        health = "stale";
        healthStatus.summary.stale++;
        issues.push("Data may be stale");
      } else {
        health = "healthy";
        healthStatus.summary.active++;
      }

      healthStatus.sources.push({
        source: ds.source,
        sourceName: SUPPORTED_SOURCES[ds.source as SupportedSource]?.name || ds.source,
        status: ds.status,
        enabled: ds.config.enabled,
        lastSync: ds.lastSync,
        daysSinceLastSync,
        health,
        issues,
      });
    }

    // Determine overall health
    if (healthStatus.summary.error > 0) {
      healthStatus.overall = "critical";
    } else if (healthStatus.summary.stale > 0) {
      healthStatus.overall = "degraded";
    } else {
      healthStatus.overall = "healthy";
    }

    return healthStatus;
  },
});

// ============================================================================
// CONNECTION TEST FUNCTIONS
// ============================================================================

async function testSEMrushConnection(apiKey: string, endpoint: string) {
  try {
    // Test SEMrush API with a simple domain overview request
    const testUrl = `${endpoint}?type=domain_overview&key=${apiKey}&domain=example.com&database=us`;
    const response = await fetch(testUrl);
    
    if (response.ok) {
      return {
        success: true,
        message: "SEMrush API connection successful",
        details: { statusCode: response.status }
      };
    } else {
      return {
        success: false,
        message: `SEMrush API error: ${response.status} ${response.statusText}`,
        details: { statusCode: response.status }
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `SEMrush connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

async function testGoogleTrendsConnection(apiKey: string, endpoint: string) {
  try {
    // Test Google Trends API (note: actual implementation would use proper Google API client)
    const testUrl = `${endpoint}explore?key=${apiKey}`;
    const response = await fetch(testUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    if (response.ok || response.status === 401) { // 401 means API key format is recognized
      return {
        success: response.ok,
        message: response.ok ? "Google Trends API connection successful" : "API key authentication failed",
        details: { statusCode: response.status }
      };
    } else {
      return {
        success: false,
        message: `Google Trends API error: ${response.status}`,
        details: { statusCode: response.status }
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Google Trends connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

async function testTwitterConnection(apiKey: string, endpoint: string) {
  try {
    // Test Twitter API v2 with user lookup
    const testUrl = `${endpoint}users/me`;
    const response = await fetch(testUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    if (response.ok) {
      return {
        success: true,
        message: "Twitter API connection successful",
        details: { statusCode: response.status }
      };
    } else {
      return {
        success: false,
        message: `Twitter API error: ${response.status} ${response.statusText}`,
        details: { statusCode: response.status }
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Twitter connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

async function testFacebookConnection(apiKey: string, endpoint: string) {
  try {
    // Test Facebook Graph API with a simple me request
    const testUrl = `${endpoint}me?access_token=${apiKey}`;
    const response = await fetch(testUrl);
    
    if (response.ok) {
      return {
        success: true,
        message: "Facebook API connection successful",
        details: { statusCode: response.status }
      };
    } else {
      return {
        success: false,
        message: `Facebook API error: ${response.status} ${response.statusText}`,
        details: { statusCode: response.status }
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Facebook connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

async function testLinkedInConnection(apiKey: string, endpoint: string) {
  try {
    // Test LinkedIn API with profile request
    const testUrl = `${endpoint}people/~`;
    const response = await fetch(testUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    if (response.ok) {
      return {
        success: true,
        message: "LinkedIn API connection successful",
        details: { statusCode: response.status }
      };
    } else {
      return {
        success: false,
        message: `LinkedIn API error: ${response.status} ${response.statusText}`,
        details: { statusCode: response.status }
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `LinkedIn connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}