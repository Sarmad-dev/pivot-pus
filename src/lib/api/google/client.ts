/**
 * Google Ads API client
 */

import { BaseAPIClient } from '../base-client';
import { OAuthTokens } from '../types';
import { AuthenticationError } from '../errors';

// Use Next.js API routes instead of direct Google API calls
const GOOGLE_ADS_BASE_URL = '/api/google-ads';

export interface GoogleAdsCustomer {
  resourceName: string;
  id: string;
  descriptiveName: string;
  currencyCode: string;
  timeZone: string;
}

export interface GoogleAdsCampaign {
  resourceName: string;
  id: string;
  name: string;
  status: string;
  advertisingChannelType: string;
  biddingStrategyType: string;
  startDate: string;
  endDate?: string;
  campaignBudget: string;
}

export interface GoogleAdsCampaignMetrics {
  impressions: string;
  clicks: string;
  cost: string;
  conversions: string;
  ctr: string;
  averageCpc: string;
  averageCpm: string;
}

export class GoogleAdsClient extends BaseAPIClient {
  constructor() {
    super('google', GOOGLE_ADS_BASE_URL);
  }

  /**
   * Refresh the access token using the refresh token
   */
  protected async refreshAccessToken(): Promise<OAuthTokens> {
    if (!this.tokens?.refreshToken) {
      throw new AuthenticationError(
        this.platform,
        'No refresh token available'
      );
    }

    try {
      const response = await fetch('/api/oauth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: this.platform,
          refreshToken: this.tokens.refreshToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Token refresh failed:', errorData);
        throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        scope: data.scope,
      };
    } catch (error) {
      throw new AuthenticationError(
        this.platform,
        'Failed to refresh access token',
        { error: (error as Error).message }
      );
    }
  }

  /**
   * Override to make requests through Next.js API routes
   */
  protected async request<T>(
    endpoint: string,
    options: any = {}
  ): Promise<T> {
    const method = options.method || 'GET';
    
    // For GET requests, pass tokens as query parameters
    if (method === 'GET') {
      const params = {
        ...options.params,
        accessToken: this.tokens?.accessToken || '',
        refreshToken: this.tokens?.refreshToken || '',
      };
      return super.request<T>(endpoint, { ...options, params });
    }
    
    // For POST/PUT/DELETE requests, pass tokens in the request body
    const body = {
      ...options.body,
      tokens: this.tokens,
    };

    return super.request<T>(endpoint, { ...options, body });
  }

  /**
   * Get accessible customer accounts
   */
  async getCustomers(): Promise<GoogleAdsCustomer[]> {
    // First get accessible customers using the base client's GET method (handles token refresh)
    console.log('Getting accessible customers...');

    const accessibleResponse = await this.get<{ resourceNames: string[] }>('/customers');
    console.log('Accessible customers response:', accessibleResponse);

    // Then get details for each customer
    const customers: GoogleAdsCustomer[] = [];
    
    for (const resourceName of accessibleResponse.resourceNames) {
      const customerId = resourceName.split('/')[1];
      
      const query = `
        SELECT
          customer.id,
          customer.descriptive_name,
          customer.currency_code,
          customer.time_zone
        FROM customer
        LIMIT 1
      `;

      try {
        const response = await this.post<{ results: any[] }>(
          `/customers/${customerId}/campaigns`,
          { query }
        );

        if (response.results && response.results.length > 0) {
          const result = response.results[0];
          customers.push({
            resourceName: result.customer.resourceName,
            id: result.customer.id,
            descriptiveName: result.customer.descriptiveName,
            currencyCode: result.customer.currencyCode,
            timeZone: result.customer.timeZone,
          });
        }
      } catch (error) {
        console.warn(`Failed to get details for customer ${customerId}:`, error);
      }
    }

    return customers;
  }

  /**
   * Get campaigns for a specific customer
   */
  async getCampaigns(customerId: string): Promise<GoogleAdsCampaign[]> {
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.bidding_strategy_type,
        campaign.start_date,
        campaign.end_date,
        campaign.campaign_budget
      FROM campaign
      WHERE campaign.status != 'REMOVED'
      ORDER BY campaign.id
    `;

    const response = await this.post<{ results: any[] }>(
      `/customers/${customerId}/campaigns`,
      { query }
    );

    return response.results.map((result: any) => ({
      resourceName: result.campaign.resourceName,
      id: result.campaign.id,
      name: result.campaign.name,
      status: result.campaign.status,
      advertisingChannelType: result.campaign.advertisingChannelType,
      biddingStrategyType: result.campaign.biddingStrategyType,
      startDate: result.campaign.startDate,
      endDate: result.campaign.endDate,
      campaignBudget: result.campaign.campaignBudget,
    }));
  }

  /**
   * Get a specific campaign by ID
   */
  async getCampaign(
    customerId: string,
    campaignId: string
  ): Promise<GoogleAdsCampaign> {
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.bidding_strategy_type,
        campaign.start_date,
        campaign.end_date,
        campaign.campaign_budget
      FROM campaign
      WHERE campaign.id = ${campaignId}
    `;

    const response = await this.post<{ results: any[] }>(
      `/customers/${customerId}/campaigns`,
      { query }
    );

    const result = response.results[0];
    return {
      resourceName: result.campaign.resourceName,
      id: result.campaign.id,
      name: result.campaign.name,
      status: result.campaign.status,
      advertisingChannelType: result.campaign.advertisingChannelType,
      biddingStrategyType: result.campaign.biddingStrategyType,
      startDate: result.campaign.startDate,
      endDate: result.campaign.endDate,
      campaignBudget: result.campaign.campaignBudget,
    };
  }

  /**
   * Get campaign metrics
   */
  async getCampaignMetrics(
    customerId: string,
    campaignId: string,
    startDate: string,
    endDate: string
  ): Promise<GoogleAdsCampaignMetrics> {
    const query = `
      SELECT
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.ctr,
        metrics.average_cpc,
        metrics.average_cpm
      FROM campaign
      WHERE campaign.id = ${campaignId}
        AND segments.date BETWEEN '${startDate}' AND '${endDate}'
    `;

    const response = await this.post<{ results: any[] }>(
      `/customers/${customerId}/campaigns`,
      { query }
    );

    const result = response.results[0];
    return {
      impressions: result.metrics.impressions,
      clicks: result.metrics.clicks,
      cost: (parseInt(result.metrics.costMicros) / 1000000).toString(),
      conversions: result.metrics.conversions,
      ctr: result.metrics.ctr,
      averageCpc: (parseInt(result.metrics.averageCpc) / 1000000).toString(),
      averageCpm: (parseInt(result.metrics.averageCpm) / 1000000).toString(),
    };
  }

  /**
   * Get campaign targeting criteria
   */
  async getCampaignTargeting(
    customerId: string,
    campaignId: string
  ): Promise<any> {
    const query = `
      SELECT
        campaign_criterion.criterion_id,
        campaign_criterion.type,
        campaign_criterion.negative,
        campaign_criterion.location.geo_target_constant,
        campaign_criterion.keyword.text,
        campaign_criterion.age_range.type,
        campaign_criterion.gender.type
      FROM campaign_criterion
      WHERE campaign.id = ${campaignId}
    `;

    const response = await this.post<{ results: any[] }>(
      `/customers/${customerId}/campaigns`,
      { query }
    );

    return response.results;
  }

  /**
   * Get campaign budget details
   */
  async getCampaignBudget(
    customerId: string,
    budgetResourceName: string
  ): Promise<GoogleAdsBudget> {
    const query = `
      SELECT
        campaign_budget.amount_micros,
        campaign_budget.delivery_method,
        campaign_budget.period
      FROM campaign_budget
      WHERE campaign_budget.resource_name = '${budgetResourceName}'
    `;

    const response = await this.post<{ results: any[] }>(
      `/customers/${customerId}/campaigns`,
      { query }
    );

    const result = response.results[0];
    return {
      amountMicros: result.campaignBudget.amountMicros,
      deliveryMethod: result.campaignBudget.deliveryMethod,
      period: result.campaignBudget.period,
    };
  }

  /**
   * Get detailed campaign data for import including budget, targeting, and metrics
   */
  async getCampaignForImport(
    customerId: string,
    campaignId: string
  ): Promise<GoogleCampaignImportData> {
    // Fetch campaign details
    const campaign = await this.getCampaign(customerId, campaignId);

    // Fetch budget, targeting, and metrics in parallel
    const [budget, targeting, metrics] = await Promise.all([
      this.getCampaignBudget(customerId, campaign.campaignBudget).catch(() => null),
      this.getCampaignTargeting(customerId, campaignId).catch(() => null),
      this.getCampaignMetrics(
        customerId,
        campaignId,
        campaign.startDate,
        campaign.endDate || new Date().toISOString().split('T')[0]
      ).catch(() => null),
    ]);

    return {
      campaign,
      budget,
      targeting,
      metrics,
    };
  }

  /**
   * Get multiple campaigns with details for import
   */
  async getCampaignsForImport(customerId: string): Promise<GoogleCampaignImportData[]> {
    const campaigns = await this.getCampaigns(customerId);

    // Fetch detailed data for each campaign
    const detailedCampaigns = await Promise.all(
      campaigns.map((campaign) =>
        this.getCampaignForImport(customerId, campaign.id)
      )
    );

    return detailedCampaigns;
  }
}

export interface GoogleAdsBudget {
  amountMicros: string;
  deliveryMethod: string;
  period: string;
}

export interface GoogleCampaignImportData {
  campaign: GoogleAdsCampaign;
  budget: GoogleAdsBudget | null;
  targeting: any | null;
  metrics: GoogleAdsCampaignMetrics | null;
}
