# Validation Schemas

This directory contains Zod validation schemas for the PivotPulse application.

## Campaign Validation (`campaign.ts`)

Comprehensive validation schemas for campaign creation and management.

### Core Schemas

- `campaignBasicsSchema` - Basic campaign information (name, dates, budget, etc.)
- `audienceSegmentSchema` - Audience targeting and demographics
- `channelConfigSchema` - Marketing channel configuration
- `kpiSchema` - Key Performance Indicators
- `customMetricSchema` - Custom metrics definition
- `teamMemberAssignmentSchema` - Team member roles and permissions

### Combined Schemas

- `audienceChannelsSchema` - Audience segments and channel configuration
- `kpisMetricsSchema` - KPIs and custom metrics
- `teamAccessSchema` - Team and client access management
- `completeCampaignSchema` - Full campaign with cross-field validation

### Step-by-Step Validation

- `campaignStep1Schema` - Campaign basics (Step 1 of wizard)
- `campaignStep2Schema` - Audience & channels (Step 2 of wizard)
- `campaignStep3Schema` - KPIs & metrics (Step 3 of wizard)
- `campaignStep4Schema` - Team & access (Step 4 of wizard)

### Import Schemas

- `facebookCampaignImportSchema` - Facebook Ads API campaign data
- `googleAdsCampaignImportSchema` - Google Ads API campaign data

### Cross-Field Validation Rules

The `completeCampaignSchema` includes sophisticated cross-field validation:

1. **Budget Allocation**: Total allocated budget must equal campaign budget
2. **Channel Budget Consistency**: Enabled channels must have matching budget allocation
3. **KPI Weight Limits**: Total KPI weights cannot exceed 100
4. **Team Ownership**: Campaign must have at least one owner
5. **Duration Validation**: Campaign must run for at least 1 day
6. **Paid Channel Budget**: Warns if daily budget is too low for paid advertising

### Helper Functions

- `validateCampaignStep(step, data)` - Validate specific wizard step
- `validateBudgetAllocation(totalBudget, allocation)` - Check budget allocation
- `validateKPIWeights(kpis)` - Validate KPI weight totals
- `validateCampaignDuration(startDate, endDate)` - Check campaign duration

### Usage Examples

```typescript
import { 
  campaignBasicsSchema, 
  completeCampaignSchema,
  validateCampaignStep 
} from '@/lib/validations/campaign';

// Validate campaign basics
const basicsResult = campaignBasicsSchema.safeParse(campaignData);

// Validate complete campaign
const campaignResult = completeCampaignSchema.safeParse(fullCampaignData);

// Validate wizard step
const stepResult = validateCampaignStep(1, stepData);
```

### Type Exports

All schemas export corresponding TypeScript types:

```typescript
import type { 
  CampaignBasics,
  AudienceSegment,
  ChannelConfig,
  CompleteCampaign 
} from '@/lib/validations/campaign';
```

## Authentication Validation (`auth.ts`)

Basic authentication schemas for sign-in and sign-up forms.

- `signInSchema` - Email and password validation
- `signUpSchema` - User registration validation