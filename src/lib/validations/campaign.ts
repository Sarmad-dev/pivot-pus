import { z } from "zod";

// Base validation schemas
export const currencySchema = z.enum([
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "JPY",
  "CHF",
  "SEK",
  "NOK",
  "DKK",
]);

export const campaignCategorySchema = z.enum([
  "pr",
  "content",
  "social",
  "paid",
  "mixed",
]);

export const campaignPrioritySchema = z.enum(["low", "medium", "high"]);

export const campaignStatusSchema = z.enum([
  "draft",
  "active",
  "paused",
  "completed",
]);

// Campaign Basics Schema
export const campaignBasicsSchema = z
  .object({
    name: z
      .string()
      .min(1, "Campaign name is required")
      .max(100, "Campaign name must be less than 100 characters"),
    description: z
      .string()
      .min(10, "Description must be at least 10 characters")
      .max(1000, "Description must be less than 1000 characters"),
    startDate: z.coerce.date({
      message: "Start date is required",
    }),
    endDate: z.coerce.date({
      message: "End date is required",
    }),
    budget: z
      .number()
      .positive("Budget must be greater than 0")
      .max(10000000, "Budget cannot exceed $10,000,000"),
    currency: currencySchema,
    category: campaignCategorySchema,
    priority: campaignPrioritySchema,
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  })
  .refine(
    (data) => {
      const now = new Date();
      const startDate = new Date(data.startDate);
      // Allow start date to be today or in the future
      return (
        startDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate())
      );
    },
    {
      message: "Start date cannot be in the past",
      path: ["startDate"],
    }
  );

// Audience Schema
export const audienceSegmentSchema = z.object({
  id: z.string().min(1, "Audience ID is required"),
  name: z
    .string()
    .min(1, "Audience name is required")
    .max(50, "Audience name must be less than 50 characters"),
  demographics: z.object({
    ageRange: z
      .tuple([
        z.number().min(13, "Minimum age is 13").max(100, "Maximum age is 100"),
        z.number().min(13, "Minimum age is 13").max(100, "Maximum age is 100"),
      ])
      .refine(([min, max]) => min <= max, {
        message: "Minimum age must be less than or equal to maximum age",
      }),
    gender: z.enum(["all", "male", "female", "other"]),
    location: z
      .array(z.string().min(1, "Location cannot be empty"))
      .min(1, "At least one location is required")
      .max(50, "Maximum 50 locations allowed"),
    interests: z
      .array(z.string().min(1, "Interest cannot be empty"))
      .max(100, "Maximum 100 interests allowed"),
  }),
  estimatedSize: z
    .number()
    .positive("Estimated size must be positive")
    .optional(),
});

// Channel Schema
export const channelTypeSchema = z.enum([
  "facebook",
  "instagram",
  "twitter",
  "linkedin",
  "email",
  "content",
  "pr",
  "google_ads",
  "youtube",
]);

export const channelConfigSchema = z.object({
  type: channelTypeSchema,
  enabled: z.boolean(),
  budget: z
    .number()
    .min(0, "Channel budget cannot be negative")
    .max(10000000, "Channel budget cannot exceed $10,000,000"),
  settings: z.record(z.string(), z.any()).optional(),
});

// KPI Schema
export const kpiTypeSchema = z.enum([
  "reach",
  "engagement",
  "conversions",
  "brand_awareness",
  "roi",
  "ctr",
  "cpc",
  "cpm",
]);

export const kpiTimeframeSchema = z.enum([
  "daily",
  "weekly",
  "monthly",
  "campaign",
]);

export const kpiSchema = z.object({
  type: kpiTypeSchema,
  target: z.number().positive("KPI target must be positive"),
  timeframe: kpiTimeframeSchema,
  weight: z
    .number()
    .min(0, "Weight cannot be negative")
    .max(100, "Weight cannot exceed 100"),
});

export const customMetricSchema = z.object({
  name: z
    .string()
    .min(1, "Metric name is required")
    .max(50, "Metric name must be less than 50 characters"),
  description: z
    .string()
    .min(1, "Metric description is required")
    .max(200, "Metric description must be less than 200 characters"),
  target: z.number().positive("Target must be positive"),
  unit: z
    .string()
    .min(1, "Unit is required")
    .max(20, "Unit must be less than 20 characters"),
});

// Team Access Schema
export const teamRoleSchema = z.enum(["owner", "editor", "viewer"]);

export const teamMemberAssignmentSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: teamRoleSchema,
  notifications: z.boolean().default(true),
  assignedAt: z.number().optional(), // Add the assignedAt field
});

export const clientAssignmentSchema = z.object({
  userId: z.string().min(1, "Client ID is required"),
  assignedAt: z.number().optional(),
});

// Audience & Channels Combined Schema
export const audienceChannelsSchema = z.object({
  audiences: z
    .array(audienceSegmentSchema)
    .min(1, "At least one audience segment is required")
    .max(10, "Maximum 10 audience segments allowed"),
  channels: z
    .array(channelConfigSchema)
    .min(1, "At least one channel is required")
    .max(20, "Maximum 20 channels allowed"),
  budgetAllocation: z.record(z.string(), z.number().min(0)),
});

// KPIs & Metrics Combined Schema
export const kpisMetricsSchema = z.object({
  primaryKPIs: z
    .array(kpiSchema)
    .min(1, "At least one primary KPI is required")
    .max(10, "Maximum 10 primary KPIs allowed"),
  customMetrics: z
    .array(customMetricSchema)
    .max(20, "Maximum 20 custom metrics allowed"),
  trackingSettings: z
    .object({
      enableAnalytics: z.boolean().default(true),
      reportingFrequency: z
        .enum(["daily", "weekly", "monthly"])
        .default("weekly"),
      autoReporting: z.boolean().default(false),
    })
    .optional(),
});

// Team & Access Combined Schema
export const teamAccessSchema = z.object({
  teamMembers: z
    .array(teamMemberAssignmentSchema)
    .min(1, "At least one team member (owner) is required")
    .max(50, "Maximum 50 team members allowed"),
  clients: z
    .array(clientAssignmentSchema)
    .max(20, "Maximum 20 clients allowed"),
  permissions: z
    .object({
      allowClientEdit: z.boolean().default(false),
      requireApproval: z.boolean().default(false),
      restrictedFields: z.array(z.string()).optional(),
    })
    .optional(),
});

// Complete Campaign Schema with Cross-Field Validation
export const completeCampaignSchema = z
  .object({
    // Basic Information
    basics: campaignBasicsSchema,

    // Audience & Channels
    audienceChannels: audienceChannelsSchema,

    // KPIs & Metrics
    kpisMetrics: kpisMetricsSchema,

    // Team & Access
    teamAccess: teamAccessSchema,

    // Optional fields for existing campaigns
    id: z.string().optional(),
    status: campaignStatusSchema.optional(),
    organizationId: z.string().optional(),
    createdBy: z.string().optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),

    // Import information
    importSource: z
      .object({
        platform: z.string(),
        externalId: z.string(),
        importedAt: z.number(),
        lastSyncAt: z.number().optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    // Cross-field validation: Budget allocation must equal total budget
    const totalAllocated = Object.values(
      data.audienceChannels.budgetAllocation
    ).reduce((sum, amount) => sum + amount, 0);

    const campaignBudget = data.basics.budget;
    const tolerance = 0.01; // Allow for small rounding differences

    if (Math.abs(totalAllocated - campaignBudget) > tolerance) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Budget allocation (${totalAllocated}) must equal campaign budget (${campaignBudget})`,
        path: ["audienceChannels", "budgetAllocation"],
      });
    }

    // Validate that enabled channels have budget allocation
    const enabledChannels = data.audienceChannels.channels
      .filter((channel) => channel.enabled)
      .map((channel) => channel.type);

    for (const channelType of enabledChannels) {
      if (
        !data.audienceChannels.budgetAllocation[channelType] ||
        data.audienceChannels.budgetAllocation[channelType] <= 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Enabled channel '${channelType}' must have budget allocation`,
          path: ["audienceChannels", "budgetAllocation", channelType],
        });
      }
    }

    // Validate that budget allocation matches channel budgets
    for (const channel of data.audienceChannels.channels) {
      if (channel.enabled) {
        const allocatedBudget =
          data.audienceChannels.budgetAllocation[channel.type] || 0;
        if (Math.abs(channel.budget - allocatedBudget) > tolerance) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Channel budget (${channel.budget}) must match allocated budget (${allocatedBudget})`,
            path: ["audienceChannels", "channels"],
          });
        }
      }
    }

    // Validate KPI weights sum to reasonable total (optional constraint)
    const totalWeight = data.kpisMetrics.primaryKPIs.reduce(
      (sum, kpi) => sum + kpi.weight,
      0
    );

    if (totalWeight > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Total KPI weights (${totalWeight}) cannot exceed 100`,
        path: ["kpisMetrics", "primaryKPIs"],
      });
    }

    // Validate team member roles - must have at least one owner
    const owners = data.teamAccess.teamMembers.filter(
      (member) => member.role === "owner"
    );

    if (owners.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Campaign must have at least one owner",
        path: ["teamAccess", "teamMembers"],
      });
    }

    // Validate campaign duration for budget reasonableness
    const startDate = new Date(data.basics.startDate);
    const endDate = new Date(data.basics.endDate);
    const durationDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (durationDays < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Campaign must run for at least 1 day",
        path: ["basics", "endDate"],
      });
    }

    // Warn if daily budget is very low for paid channels
    const paidChannels = data.audienceChannels.channels.filter(
      (channel) =>
        channel.enabled &&
        ["facebook", "instagram", "google_ads", "linkedin"].includes(
          channel.type
        )
    );

    if (paidChannels.length > 0) {
      const dailyBudget = campaignBudget / durationDays;
      const minDailyBudget = 10; // Minimum $10/day for paid channels

      if (dailyBudget < minDailyBudget) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Daily budget ($${dailyBudget.toFixed(2)}) may be too low for paid advertising channels (minimum recommended: $${minDailyBudget})`,
          path: ["basics", "budget"],
        });
      }
    }
  });

// Campaign Draft Schema (for auto-save functionality)
export const campaignDraftSchema = z.object({
  name: z.string().min(1, "Draft name is required"),
  data: z.any(), // Partial campaign data
  step: z.number().min(1).max(4),
  createdBy: z.string(),
  organizationId: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  expiresAt: z.number(),
});

// Partial schemas for step-by-step validation
export const campaignStep1Schema = campaignBasicsSchema;
export const campaignStep2Schema = audienceChannelsSchema;
export const campaignStep3Schema = kpisMetricsSchema;
export const campaignStep4Schema = teamAccessSchema;

// Import schemas for external platforms
export const facebookCampaignImportSchema = z.object({
  id: z.string(),
  name: z.string(),
  objective: z.string(),
  status: z.string(),
  daily_budget: z.string().optional(),
  lifetime_budget: z.string().optional(),
  start_time: z.string(),
  stop_time: z.string().optional(),
  targeting: z
    .object({
      age_min: z.number().optional(),
      age_max: z.number().optional(),
      genders: z.array(z.number()).optional(),
      geo_locations: z.any().optional(),
      interests: z.array(z.any()).optional(),
    })
    .optional(),
});

export const googleAdsCampaignImportSchema = z.object({
  resourceName: z.string(),
  id: z.string(),
  name: z.string(),
  status: z.string(),
  advertisingChannelType: z.string(),
  biddingStrategy: z.any(),
  budget: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
});

// Type exports for TypeScript
export type CampaignBasics = z.infer<typeof campaignBasicsSchema>;
export type AudienceSegment = z.infer<typeof audienceSegmentSchema>;
export type ChannelConfig = z.infer<typeof channelConfigSchema>;
export type CampaignKPI = z.infer<typeof kpiSchema>;
export type CustomMetric = z.infer<typeof customMetricSchema>;
export type TeamMemberAssignment = z.infer<typeof teamMemberAssignmentSchema>;
export type ClientAssignment = z.infer<typeof clientAssignmentSchema>;
export type AudienceChannels = z.infer<typeof audienceChannelsSchema>;
export type KPIsMetrics = z.infer<typeof kpisMetricsSchema>;
export type TeamAccess = z.infer<typeof teamAccessSchema>;
export type CompleteCampaign = z.infer<typeof completeCampaignSchema>;
export type CampaignDraft = z.infer<typeof campaignDraftSchema>;
export type FacebookCampaignImport = z.infer<
  typeof facebookCampaignImportSchema
>;
export type GoogleAdsCampaignImport = z.infer<
  typeof googleAdsCampaignImportSchema
>;

// Validation helper functions
export const validateCampaignStep = (step: number, data: unknown) => {
  switch (step) {
    case 1:
      return campaignStep1Schema.safeParse(data);
    case 2:
      return campaignStep2Schema.safeParse(data);
    case 3:
      return campaignStep3Schema.safeParse(data);
    case 4:
      return campaignStep4Schema.safeParse(data);
    default:
      throw new Error(`Invalid step: ${step}`);
  }
};

export const validateBudgetAllocation = (
  totalBudget: number,
  allocation: Record<string, number>
): { isValid: boolean; error?: string } => {
  const totalAllocated = Object.values(allocation).reduce(
    (sum, amount) => sum + amount,
    0
  );
  const tolerance = 0.01;

  if (Math.abs(totalAllocated - totalBudget) > tolerance) {
    return {
      isValid: false,
      error: `Budget allocation (${totalAllocated}) must equal total budget (${totalBudget})`,
    };
  }

  return { isValid: true };
};

export const validateKPIWeights = (
  kpis: CampaignKPI[]
): { isValid: boolean; error?: string } => {
  const totalWeight = kpis.reduce((sum, kpi) => sum + kpi.weight, 0);

  if (totalWeight > 100) {
    return {
      isValid: false,
      error: `Total KPI weights (${totalWeight}) cannot exceed 100`,
    };
  }

  return { isValid: true };
};

export const validateCampaignDuration = (
  startDate: Date,
  endDate: Date
): { isValid: boolean; error?: string } => {
  const durationDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (durationDays < 1) {
    return {
      isValid: false,
      error: "Campaign must run for at least 1 day",
    };
  }

  return { isValid: true };
};
