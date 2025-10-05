/**
 * Transform Google Ads campaign data to PivotPulse campaign structure
 */

import { GoogleAdsCampaign, GoogleAdsCampaignMetrics } from './client';

export interface TransformedCampaignData {
  name: string;
  description: string;
  startDate: number;
  endDate: number;
  budget: number;
  currency: string;
  category: 'pr' | 'content' | 'social' | 'paid' | 'mixed';
  priority: 'low' | 'medium' | 'high';
  audiences: Array<{
    id: string;
    name: string;
    demographics: {
      ageRange: [number, number];
      gender: string;
      location: string[];
      interests: string[];
    };
    estimatedSize?: number;
  }>;
  channels: Array<{
    type: string;
    enabled: boolean;
    budget: number;
    settings: any;
  }>;
  kpis: Array<{
    type: string;
    target: number;
    timeframe: string;
    weight: number;
  }>;
  customMetrics: Array<{
    name: string;
    description: string;
    target: number;
    unit: string;
  }>;
  budgetAllocation: {
    channels: Record<string, number>;
  };
  importSource: {
    platform: string;
    externalId: string;
    importedAt: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface GoogleCampaignImportData {
  campaign: GoogleAdsCampaign;
  budget: GoogleAdsBudget | null;
  targeting: any | null;
  metrics: GoogleAdsCampaignMetrics | null;
}

export interface GoogleAdsBudget {
  amountMicros: string;
  deliveryMethod: string;
  period: string;
}

/**
 * Map Google Ads channel type to PivotPulse category
 */
function mapChannelTypeToCategory(
  channelType: string
): 'pr' | 'content' | 'social' | 'paid' | 'mixed' {
  const channelLower = channelType.toLowerCase();

  if (channelLower.includes('search')) {
    return 'paid';
  }
  if (channelLower.includes('display')) {
    return 'paid';
  }
  if (channelLower.includes('video') || channelLower.includes('youtube')) {
    return 'social';
  }
  if (channelLower.includes('shopping')) {
    return 'paid';
  }

  return 'mixed';
}

/**
 * Map Google Ads channel type to PivotPulse channel
 */
function mapChannelType(channelType: string): string {
  const channelLower = channelType.toLowerCase();

  if (channelLower.includes('search')) return 'google-search';
  if (channelLower.includes('display')) return 'google-display';
  if (channelLower.includes('video') || channelLower.includes('youtube')) return 'youtube';
  if (channelLower.includes('shopping')) return 'google-shopping';

  return 'google';
}

/**
 * Determine campaign priority based on budget
 */
function determinePriority(budget: number): 'low' | 'medium' | 'high' {
  if (budget >= 10000) return 'high';
  if (budget >= 5000) return 'medium';
  return 'low';
}

/**
 * Transform Google Ads targeting to PivotPulse audience format
 */
function transformTargeting(targeting: any): TransformedCampaignData['audiences'] {
  if (!targeting || targeting.length === 0) {
    return [
      {
        id: 'default',
        name: 'Default Audience',
        demographics: {
          ageRange: [18, 65],
          gender: 'all',
          location: [],
          interests: [],
        },
      },
    ];
  }

  const locations: string[] = [];
  const keywords: string[] = [];
  const ageRanges: string[] = [];
  const genders: string[] = [];

  targeting.forEach((criterion: any) => {
    if (criterion.campaignCriterion) {
      const cc = criterion.campaignCriterion;

      // Extract locations
      if (cc.location?.geoTargetConstant) {
        locations.push(cc.location.geoTargetConstant);
      }

      // Extract keywords as interests
      if (cc.keyword?.text) {
        keywords.push(cc.keyword.text);
      }

      // Extract age ranges
      if (cc.ageRange?.type) {
        ageRanges.push(cc.ageRange.type);
      }

      // Extract gender
      if (cc.gender?.type) {
        genders.push(cc.gender.type);
      }
    }
  });

  // Determine age range from Google's age range types
  let ageMin = 18;
  let ageMax = 65;
  if (ageRanges.length > 0) {
    const ranges = ageRanges.map((r) => {
      if (r.includes('18_24')) return [18, 24];
      if (r.includes('25_34')) return [25, 34];
      if (r.includes('35_44')) return [35, 44];
      if (r.includes('45_54')) return [45, 54];
      if (r.includes('55_64')) return [55, 64];
      if (r.includes('65')) return [65, 100];
      return [18, 65];
    });
    ageMin = Math.min(...ranges.map((r) => r[0]));
    ageMax = Math.max(...ranges.map((r) => r[1]));
  }

  // Determine gender
  let gender = 'all';
  if (genders.length === 1) {
    if (genders[0].toLowerCase().includes('male')) {
      gender = genders[0].toLowerCase().includes('female') ? 'all' : 'male';
    } else if (genders[0].toLowerCase().includes('female')) {
      gender = 'female';
    }
  }

  return [
    {
      id: 'google-imported',
      name: 'Imported Google Ads Audience',
      demographics: {
        ageRange: [ageMin, ageMax],
        gender,
        location: locations,
        interests: keywords,
      },
    },
  ];
}

/**
 * Generate KPIs based on campaign channel type and metrics
 */
function generateKPIs(
  channelType: string,
  metrics: GoogleAdsCampaignMetrics | null
): TransformedCampaignData['kpis'] {
  const kpis: TransformedCampaignData['kpis'] = [];
  const channelLower = channelType.toLowerCase();

  // Add KPIs based on channel type
  if (channelLower.includes('search') || channelLower.includes('shopping')) {
    kpis.push({
      type: 'conversions',
      target: metrics?.conversions ? parseFloat(metrics.conversions) * 1.2 : 100,
      timeframe: 'campaign',
      weight: 1.0,
    });
    kpis.push({
      type: 'roi',
      target: 2.5,
      timeframe: 'campaign',
      weight: 0.9,
    });
  } else if (channelLower.includes('display') || channelLower.includes('video')) {
    kpis.push({
      type: 'reach',
      target: metrics?.impressions ? parseFloat(metrics.impressions) * 1.2 : 50000,
      timeframe: 'campaign',
      weight: 1.0,
    });
    kpis.push({
      type: 'brand_awareness',
      target: metrics?.impressions ? parseFloat(metrics.impressions) * 1.3 : 100000,
      timeframe: 'campaign',
      weight: 0.8,
    });
  }

  // Always add engagement as a secondary KPI
  kpis.push({
    type: 'engagement',
    target: metrics?.clicks ? parseFloat(metrics.clicks) * 1.2 : 1000,
    timeframe: 'campaign',
    weight: 0.7,
  });

  return kpis;
}

/**
 * Parse Google Ads date format (YYYY-MM-DD) to timestamp
 */
function parseGoogleDate(dateStr: string): number {
  const date = new Date(dateStr);
  return date.getTime();
}

/**
 * Transform Google Ads campaign data to PivotPulse format
 */
export function transformGoogleCampaign(
  data: GoogleCampaignImportData,
  currency: string = 'USD'
): TransformedCampaignData {
  const { campaign, budget, targeting, metrics } = data;

  // Calculate budget from micros (Google stores in micros - millionths)
  let budgetAmount = 0;
  if (budget?.amountMicros) {
    budgetAmount = parseInt(budget.amountMicros) / 1000000;
  }

  // Parse dates
  const startDate = parseGoogleDate(campaign.startDate);
  const endDate = campaign.endDate
    ? parseGoogleDate(campaign.endDate)
    : startDate + 90 * 24 * 60 * 60 * 1000; // Default 90 days

  const category = mapChannelTypeToCategory(campaign.advertisingChannelType);
  const priority = determinePriority(budgetAmount);
  const audiences = transformTargeting(targeting);
  const kpis = generateKPIs(campaign.advertisingChannelType, metrics);
  const channelType = mapChannelType(campaign.advertisingChannelType);

  // Create Google Ads channel
  const googleChannel = {
    type: channelType,
    enabled: campaign.status === 'ENABLED',
    budget: budgetAmount,
    settings: {
      advertisingChannelType: campaign.advertisingChannelType,
      biddingStrategyType: campaign.biddingStrategyType,
      status: campaign.status,
      externalId: campaign.id,
      resourceName: campaign.resourceName,
    },
  };

  return {
    name: campaign.name,
    description: `Imported from Google Ads - ${campaign.advertisingChannelType}`,
    startDate,
    endDate,
    budget: budgetAmount,
    currency,
    category,
    priority,
    audiences,
    channels: [googleChannel],
    kpis,
    customMetrics: [],
    budgetAllocation: {
      channels: {
        [channelType]: budgetAmount,
      },
    },
    importSource: {
      platform: 'google',
      externalId: campaign.id,
      importedAt: Date.now(),
    },
  };
}

/**
 * Validate transformed campaign data
 */
export function validateCampaignData(data: TransformedCampaignData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields validation
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Campaign name is required');
  }

  if (data.budget <= 0) {
    warnings.push('Campaign budget is 0 or not available - please verify budget settings');
  }

  if (data.startDate >= data.endDate) {
    errors.push('End date must be after start date');
  }

  if (data.audiences.length === 0) {
    warnings.push('No audience targeting data available');
  }

  if (data.kpis.length === 0) {
    warnings.push('No KPIs defined - consider adding success metrics');
  }

  // Budget allocation validation
  const totalAllocated = Object.values(data.budgetAllocation.channels).reduce(
    (sum, amount) => sum + amount,
    0
  );

  if (Math.abs(totalAllocated - data.budget) > 0.01) {
    errors.push('Budget allocation does not match total budget');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Transform multiple Google Ads campaigns
 */
export function transformGoogleCampaigns(
  campaigns: GoogleCampaignImportData[],
  currency: string = 'USD'
): Array<{ data: TransformedCampaignData; validation: ValidationResult }> {
  return campaigns.map((campaign) => {
    const transformed = transformGoogleCampaign(campaign, currency);
    const validation = validateCampaignData(transformed);

    return {
      data: transformed,
      validation,
    };
  });
}
