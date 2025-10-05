/**
 * Facebook Ads API client
 */

import { BaseAPIClient } from '../base-client';
import { OAuthTokens } from '../types';
import { AuthenticationError } from '../errors';

const FACEBOOK_API_VERSION = 'v21.0';
const FACEBOOK_BASE_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

export interface FacebookAdAccount {
  id: string;
  account_id: string;
  name: string;
  currency: string;
  timezone_name: string;
}

export interface FacebookCampaign {
  id: string;
  name: string;
  objective: string;
  status: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time: string;
  stop_time?: string;
  created_time: string;
  updated_time: string;
}

export interface FacebookCampaignInsights {
  impressions: string;
  clicks: string;
  spend: string;
  reach: string;
  frequency: string;
  ctr: string;
  cpc: string;
  cpm: string;
}

export class FacebookAdsClient extends BaseAPIClient {
  constructor() {
    super('facebook', FACEBOOK_BASE_URL);
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
      const response = await fetch(
        `${FACEBOOK_BASE_URL}/oauth/access_token?` +
        `grant_type=fb_exchange_token&` +
        `client_id=${process.env.NEXT_PUBLIC_FACEBOOK_APP_ID}&` +
        `client_secret=${process.env.FACEBOOK_APP_SECRET}&` +
        `fb_exchange_token=${this.tokens.accessToken}`
      );

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      return {
        accessToken: data.access_token,
        refreshToken: this.tokens.refreshToken,
        expiresAt: Date.now() + (data.expires_in * 1000),
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
   * Get the current user's information
   */
  async getMe(): Promise<{ id: string; name: string; email?: string }> {
    return this.get('/me', { fields: 'id,name,email' });
  }

  /**
   * Get ad accounts accessible by the user
   */
  async getAdAccounts(): Promise<FacebookAdAccount[]> {
    const response = await this.get<{ data: FacebookAdAccount[] }>(
      '/me/adaccounts',
      {
        fields: 'id,account_id,name,currency,timezone_name',
      }
    );

    return response.data;
  }

  /**
   * Get campaigns for a specific ad account
   */
  async getCampaigns(adAccountId: string): Promise<FacebookCampaign[]> {
    const response = await this.get<{ data: FacebookCampaign[] }>(
      `/${adAccountId}/campaigns`,
      {
        fields: 'id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time',
        limit: '100',
      }
    );

    return response.data;
  }

  /**
   * Get a specific campaign by ID
   */
  async getCampaign(campaignId: string): Promise<FacebookCampaign> {
    return this.get(
      `/${campaignId}`,
      {
        fields: 'id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time',
      }
    );
  }

  /**
   * Get campaign insights (performance metrics)
   */
  async getCampaignInsights(
    campaignId: string,
    datePreset: string = 'lifetime'
  ): Promise<FacebookCampaignInsights> {
    const response = await this.get<{ data: FacebookCampaignInsights[] }>(
      `/${campaignId}/insights`,
      {
        fields: 'impressions,clicks,spend,reach,frequency,ctr,cpc,cpm',
        date_preset: datePreset,
      }
    );

    return response.data[0];
  }

  /**
   * Get targeting specifications for a campaign
   */
  async getCampaignTargeting(campaignId: string): Promise<any> {
    const response = await this.get<{ data: any[] }>(
      `/${campaignId}/adsets`,
      {
        fields: 'targeting',
        limit: '1',
      }
    );

    return response.data[0]?.targeting;
  }

  /**
   * Get detailed campaign data for import including targeting and insights
   */
  async getCampaignForImport(campaignId: string): Promise<FacebookCampaignImportData> {
    // Fetch campaign details, targeting, and insights in parallel
    const [campaign, targeting, insights] = await Promise.all([
      this.getCampaign(campaignId),
      this.getCampaignTargeting(campaignId).catch(() => null),
      this.getCampaignInsights(campaignId).catch(() => null),
    ]);

    return {
      campaign,
      targeting,
      insights,
    };
  }

  /**
   * Get multiple campaigns with details for import
   */
  async getCampaignsForImport(adAccountId: string): Promise<FacebookCampaignImportData[]> {
    const campaigns = await this.getCampaigns(adAccountId);
    
    // Fetch detailed data for each campaign
    const detailedCampaigns = await Promise.all(
      campaigns.map(campaign => this.getCampaignForImport(campaign.id))
    );

    return detailedCampaigns;
  }
}

export interface FacebookCampaignImportData {
  campaign: FacebookCampaign;
  targeting: any | null;
  insights: FacebookCampaignInsights | null;
}
