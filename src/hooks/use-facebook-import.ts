/**
 * Hook for managing Facebook Ads campaign import
 */

import { useState, useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { FacebookAdsClient, FacebookCampaignImportData } from '@/lib/api/facebook/client';
import { transformFacebookCampaign, validateCampaignData, TransformedCampaignData } from '@/lib/api/facebook/transformer';

export interface FacebookImportState {
  step: 'connect' | 'select-account' | 'select-campaigns' | 'preview' | 'importing' | 'complete' | 'error';
  adAccounts: any[];
  selectedAccountId: string | null;
  campaigns: FacebookCampaignImportData[];
  selectedCampaigns: Set<string>;
  transformedCampaigns: Map<string, { data: TransformedCampaignData; validation: any }>;
  error: string | null;
  importedCampaignIds: Id<'campaigns'>[];
}

export function useFacebookImport(organizationId: Id<'organizations'>) {
  const [state, setState] = useState<FacebookImportState>({
    step: 'connect',
    adAccounts: [],
    selectedAccountId: null,
    campaigns: [],
    selectedCampaigns: new Set(),
    transformedCampaigns: new Map(),
    error: null,
    importedCampaignIds: [],
  });

  const [isLoading, setIsLoading] = useState(false);

  // Query platform connection status
  const connection = useQuery(api.platformConnections.getPlatformConnection, {
    platform: 'facebook',
  });

  // Query platform tokens (includes decrypted tokens)
  const tokens = useQuery(api.platformConnections.getPlatformTokens, {
    platform: 'facebook',
  });

  // Mutation for importing campaigns
  const importCampaign = useMutation(api.campaigns.mutations.importCampaignFromPlatform);

  /**
   * Initialize Facebook client with connection tokens
   */
  const initializeClient = useCallback((): FacebookAdsClient | null => {
    if (!connection || connection.status !== 'connected' || !tokens) {
      return null;
    }

    const client = new FacebookAdsClient();
    client.setTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
    });

    return client;
  }, [connection, tokens]);

  /**
   * Load ad accounts
   */
  const loadAdAccounts = useCallback(async () => {
    setIsLoading(true);
    setState(prev => ({ ...prev, error: null }));

    try {
      const client = initializeClient();
      if (!client) {
        throw new Error('Not connected to Facebook Ads');
      }

      const accounts = await client.getAdAccounts();
      setState(prev => ({
        ...prev,
        step: 'select-account',
        adAccounts: accounts,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load ad accounts';
      setState(prev => ({
        ...prev,
        step: 'error',
        error: errorMessage,
      }));
    } finally {
      setIsLoading(false);
    }
  }, [initializeClient]);

  /**
   * Select ad account and load campaigns
   */
  const selectAdAccount = useCallback(async (accountId: string) => {
    setIsLoading(true);
    setState(prev => ({ 
      ...prev, 
      selectedAccountId: accountId,
      error: null,
    }));

    try {
      const client = initializeClient();
      if (!client) {
        throw new Error('Not connected to Facebook Ads');
      }

      const campaigns = await client.getCampaignsForImport(accountId);
      
      // Transform campaigns for preview
      const transformedMap = new Map();
      const organization = await fetch(`/api/organizations/${organizationId}`).catch(() => null);
      const currency = organization ? 'USD' : 'USD'; // Default to USD

      campaigns.forEach(campaign => {
        const transformed = transformFacebookCampaign(campaign, currency);
        const validation = validateCampaignData(transformed);
        transformedMap.set(campaign.campaign.id, { data: transformed, validation });
      });

      setState(prev => ({
        ...prev,
        step: 'select-campaigns',
        campaigns,
        transformedCampaigns: transformedMap,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load campaigns';
      setState(prev => ({
        ...prev,
        step: 'error',
        error: errorMessage,
      }));
    } finally {
      setIsLoading(false);
    }
  }, [initializeClient, organizationId]);

  /**
   * Toggle campaign selection
   */
  const toggleCampaignSelection = useCallback((campaignId: string) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedCampaigns);
      if (newSelected.has(campaignId)) {
        newSelected.delete(campaignId);
      } else {
        newSelected.add(campaignId);
      }
      return {
        ...prev,
        selectedCampaigns: newSelected,
      };
    });
  }, []);

  /**
   * Preview selected campaigns
   */
  const previewCampaigns = useCallback(() => {
    if (state.selectedCampaigns.size === 0) {
      setState(prev => ({
        ...prev,
        error: 'Please select at least one campaign to import',
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      step: 'preview',
      error: null,
    }));
  }, [state.selectedCampaigns]);

  /**
   * Import selected campaigns
   */
  const importSelectedCampaigns = useCallback(async () => {
    setIsLoading(true);
    setState(prev => ({ ...prev, step: 'importing', error: null }));

    try {
      const importedIds: Id<'campaigns'>[] = [];
      const errors: string[] = [];

      for (const campaignId of state.selectedCampaigns) {
        const transformed = state.transformedCampaigns.get(campaignId);
        if (!transformed) continue;

        if (!transformed.validation.isValid) {
          errors.push(`${transformed.data.name}: ${transformed.validation.errors.join(', ')}`);
          continue;
        }

        try {
          const id = await importCampaign({
            campaignData: transformed.data,
            organizationId,
          });
          importedIds.push(id);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Import failed';
          errors.push(`${transformed.data.name}: ${errorMessage}`);
        }
      }

      if (errors.length > 0) {
        setState(prev => ({
          ...prev,
          step: 'error',
          error: `Some campaigns failed to import:\n${errors.join('\n')}`,
          importedCampaignIds: importedIds,
        }));
      } else {
        setState(prev => ({
          ...prev,
          step: 'complete',
          importedCampaignIds: importedIds,
        }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import campaigns';
      setState(prev => ({
        ...prev,
        step: 'error',
        error: errorMessage,
      }));
    } finally {
      setIsLoading(false);
    }
  }, [state.selectedCampaigns, state.transformedCampaigns, importCampaign, organizationId]);

  /**
   * Reset import flow
   */
  const reset = useCallback(() => {
    setState({
      step: 'connect',
      adAccounts: [],
      selectedAccountId: null,
      campaigns: [],
      selectedCampaigns: new Set(),
      transformedCampaigns: new Map(),
      error: null,
      importedCampaignIds: [],
    });
  }, []);

  /**
   * Go back to previous step
   */
  const goBack = useCallback(() => {
    setState(prev => {
      if (prev.step === 'select-campaigns') {
        return { ...prev, step: 'select-account', campaigns: [], selectedCampaigns: new Set() };
      }
      if (prev.step === 'preview') {
        return { ...prev, step: 'select-campaigns' };
      }
      return prev;
    });
  }, []);

  return {
    state,
    isLoading,
    isConnected: connection?.status === 'connected',
    connection,
    loadAdAccounts,
    selectAdAccount,
    toggleCampaignSelection,
    previewCampaigns,
    importSelectedCampaigns,
    reset,
    goBack,
  };
}
