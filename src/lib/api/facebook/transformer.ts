/**
 * Transform Facebook Ads campaign data to PivotPulse campaign structure
 */

import { FacebookCampaignImportData } from './client';

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

/**
 * Map Facebook campaign objective to PivotPulse category
 */
function mapObjectiveToCategory(objective: string): 'pr' | 'content' | 'social' | 'paid' | 'mixed' {
  const objectiveLower = objective.toLowerCase();
  
  if (objectiveLower.includes('awareness') || objectiveLower.includes('reach')) {
    return 'pr';
  }
  if (objectiveLower.includes('engagement') || objectiveLower.includes('video')) {
    return 'social';
  }
  if (objectiveLower.includes('conversion') || objectiveLower.includes('sales')) {
    return 'paid';
  }
  
  return 'mixed';
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
 * Transform Facebook targeting to PivotPulse audience format
 */
function transformTargeting(targeting: any): TransformedCampaignData['audiences'] {
  if (!targeting) {
    return [{
      id: 'default',
      name: 'Default Audience',
      demographics: {
        ageRange: [18, 65],
        gender: 'all',
        location: [],
        interests: [],
      },
    }];
  }

  const ageMin = targeting.age_min || 18;
  const ageMax = targeting.age_max || 65;
  
  // Map Facebook gender codes (1=male, 2=female)
  let gender = 'all';
  if (targeting.genders && targeting.genders.length === 1) {
    gender = targeting.genders[0] === 1 ? 'male' : 'female';
  }

  // Extract locations
  const locations: string[] = [];
  if (targeting.geo_locations) {
    if (targeting.geo_locations.countries) {
      locations.push(...targeting.geo_locations.countries);
    }
    if (targeting.geo_locations.cities) {
      locations.push(...targeting.geo_locations.cities.map((c: any) => c.name || c.key));
    }
    if (targeting.geo_locations.regions) {
      locations.push(...targeting.geo_locations.regions.map((r: any) => r.name || r.key));
    }
  }

  // Extract interests
  const interests: string[] = [];
  if (targeting.interests) {
    interests.push(...targeting.interests.map((i: any) => i.name || i.id));
  }
  if (targeting.flexible_spec) {
    targeting.flexible_spec.forEach((spec: any) => {
      if (spec.interests) {
        interests.push(...spec.interests.map((i: any) => i.name || i.id));
      }
    });
  }

  return [{
    id: 'facebook-imported',
    name: 'Imported Facebook Audience',
    demographics: {
      ageRange: [ageMin, ageMax],
      gender,
      location: locations,
      interests: interests,
    },
  }];
}

/**
 * Generate KPIs based on campaign objective and insights
 */
function generateKPIs(objective: string, insights: any): TransformedCampaignData['kpis'] {
  const kpis: TransformedCampaignData['kpis'] = [];
  const objectiveLower = objective.toLowerCase();

  // Add KPIs based on objective
  if (objectiveLower.includes('awareness') || objectiveLower.includes('reach')) {
    kpis.push({
      type: 'reach',
      target: insights?.reach ? parseFloat(insights.reach) * 1.2 : 10000,
      timeframe: 'campaign',
      weight: 1.0,
    });
    kpis.push({
      type: 'brand_awareness',
      target: insights?.impressions ? parseFloat(insights.impressions) * 1.2 : 50000,
      timeframe: 'campaign',
      weight: 0.8,
    });
  } else if (objectiveLower.includes('engagement')) {
    kpis.push({
      type: 'engagement',
      target: insights?.clicks ? parseFloat(insights.clicks) * 1.2 : 1000,
      timeframe: 'campaign',
      weight: 1.0,
    });
  } else if (objectiveLower.includes('conversion')) {
    kpis.push({
      type: 'conversions',
      target: 100,
      timeframe: 'campaign',
      weight: 1.0,
    });
    kpis.push({
      type: 'roi',
      target: 2.0,
      timeframe: 'campaign',
      weight: 0.9,
    });
  }

  // Always add engagement as a secondary KPI if not primary
  if (!objectiveLower.includes('engagement') && kpis.length > 0) {
    kpis.push({
      type: 'engagement',
      target: insights?.clicks ? parseFloat(insights.clicks) * 1.2 : 500,
      timeframe: 'campaign',
      weight: 0.5,
    });
  }

  return kpis;
}

/**
 * Transform Facebook campaign data to PivotPulse format
 */
export function transformFacebookCampaign(
  data: FacebookCampaignImportData,
  currency: string = 'USD'
): TransformedCampaignData {
  const { campaign, targeting, insights } = data;

  // Calculate budget (prefer lifetime, fallback to daily * 30)
  let budget = 0;
  if (campaign.lifetime_budget) {
    budget = parseFloat(campaign.lifetime_budget) / 100; // Facebook stores in cents
  } else if (campaign.daily_budget) {
    budget = (parseFloat(campaign.daily_budget) / 100) * 30; // Estimate 30 days
  }

  // Parse dates
  const startDate = new Date(campaign.start_time).getTime();
  const endDate = campaign.stop_time 
    ? new Date(campaign.stop_time).getTime()
    : startDate + (90 * 24 * 60 * 60 * 1000); // Default 90 days

  const category = mapObjectiveToCategory(campaign.objective);
  const priority = determinePriority(budget);
  const audiences = transformTargeting(targeting);
  const kpis = generateKPIs(campaign.objective, insights);

  // Create Facebook channel
  const facebookChannel = {
    type: 'facebook',
    enabled: campaign.status === 'ACTIVE',
    budget: budget,
    settings: {
      objective: campaign.objective,
      status: campaign.status,
      externalId: campaign.id,
    },
  };

  return {
    name: campaign.name,
    description: `Imported from Facebook Ads - ${campaign.objective}`,
    startDate,
    endDate,
    budget,
    currency,
    category,
    priority,
    audiences,
    channels: [facebookChannel],
    kpis,
    customMetrics: [],
    budgetAllocation: {
      channels: {
        facebook: budget,
      },
    },
    importSource: {
      platform: 'facebook',
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
    errors.push('Campaign budget must be greater than 0');
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
 * Transform multiple Facebook campaigns
 */
export function transformFacebookCampaigns(
  campaigns: FacebookCampaignImportData[],
  currency: string = 'USD'
): Array<{ data: TransformedCampaignData; validation: ValidationResult }> {
  return campaigns.map(campaign => {
    const transformed = transformFacebookCampaign(campaign, currency);
    const validation = validateCampaignData(transformed);
    
    return {
      data: transformed,
      validation,
    };
  });
}
