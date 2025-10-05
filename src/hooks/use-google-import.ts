/**
 * Hook for managing Google Ads campaign import
 */

import { useState, useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { GoogleAdsClient, GoogleCampaignImportData } from '@/lib/api/google/client';
import {
  transformGoogleCampaign,
  validateCampaignData,
  TransformedCampaignData,
} from '@/lib/api/google/transformer';

export interface GoogleImportState {
  step:
    | 'connect'
    | 'select-customer'
    | 'select-campaigns'
    | 'preview'
    | 'importing'
    | 'complete'
    | 'error';
  customers: any[];
  selectedCustomerId: string | null;
  campaigns: GoogleCampaignImportData[];
  selectedCampaigns: Set<string>;
  transformedCampaigns: Map<string, { data: TransformedCampaignData; validation: any }>;
  error: string | null;
  importedCampaignIds: Id<'campaigns'>[];
}

export function useGoogleImport(organizationId: Id<'organizations'>) {
  const [state, setState] = useState<GoogleImportState>({
    step: 'connect',
    customers: [],
    selectedCustomerId: null,
    campaigns: [],
    selectedCampaigns: new Set(),
    transformedCampaigns: new Map(),
    error: null,
    importedCampaignIds: [],
  });

  const [isLoading, setIsLoading] = useState(false);

  // Query platform connection status
  const connection = useQuery(api.platformConnections.getPlatformConnection, {
    platform: 'google',
  });

  // Query platform tokens (includes decrypted tokens)
  const tokens = useQuery(api.platformConnections.getPlatformTokens, {
    platform: 'google',
  });

  // Mutation for importing campaigns
  const importCampaign = useMutation(api.campaigns.mutations.importCampaignFromPlatform);

  /**
   * Initialize Google Ads client with connection tokens
   */
  const initializeClient = useCallback((): GoogleAdsClient | null => {
    if (!connection || connection.status !== 'connected' || !tokens) {
      return null;
    }

    const client = new GoogleAdsClient();
    client.setTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
    });

    return client;
  }, [connection, tokens]);

  /**
   * Load Google Ads customer accounts
   */
  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    setState((prev) => ({ ...prev, error: null }));

    try {
      const client = initializeClient();
      if (!client) {
        throw new Error('Not connected to Google Ads');
      }

      const customers = await client.getCustomers();
      setState((prev) => ({
        ...prev,
        step: 'select-customer',
        customers,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load customer accounts';
      setState((prev) => ({
        ...prev,
        step: 'error',
        error: errorMessage,
      }));
    } finally {
      setIsLoading(false);
    }
  }, [initializeClient]);

  /**
   * Select customer account and load campaigns
   */
  const selectCustomer = useCallback(
    async (customerId: string) => {
      setIsLoading(true);
      setState((prev) => ({
        ...prev,
        selectedCustomerId: customerId,
        error: null,
      }));

      try {
        const client = initializeClient();
        if (!client) {
          throw new Error('Not connected to Google Ads');
        }

        const campaigns = await client.getCampaignsForImport(customerId);

        // Transform campaigns for preview
        const transformedMap = new Map();
        const customer = state.customers.find((c) => c.id === customerId);
        const currency = customer?.currencyCode || 'USD';

        campaigns.forEach((campaign) => {
          const transformed = transformGoogleCampaign(campaign, currency);
          const validation = validateCampaignData(transformed);
          transformedMap.set(campaign.campaign.id, { data: transformed, validation });
        });

        setState((prev) => ({
          ...prev,
          step: 'select-campaigns',
          campaigns,
          transformedCampaigns: transformedMap,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to load campaigns';
        setState((prev) => ({
          ...prev,
          step: 'error',
          error: errorMessage,
        }));
      } finally {
        setIsLoading(false);
      }
    },
    [initializeClient, state.customers]
  );

  /**
   * Toggle campaign selection
   */
  const toggleCampaignSelection = useCallback((campaignId: string) => {
    setState((prev) => {
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
      setState((prev) => ({
        ...prev,
        error: 'Please select at least one campaign to import',
      }));
      return;
    }

    setState((prev) => ({
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
    setState((prev) => ({ ...prev, step: 'importing', error: null }));

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
        setState((prev) => ({
          ...prev,
          step: 'error',
          error: `Some campaigns failed to import:\n${errors.join('\n')}`,
          importedCampaignIds: importedIds,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          step: 'complete',
          importedCampaignIds: importedIds,
        }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import campaigns';
      setState((prev) => ({
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
      customers: [],
      selectedCustomerId: null,
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
    setState((prev) => {
      if (prev.step === 'select-campaigns') {
        return {
          ...prev,
          step: 'select-customer',
          campaigns: [],
          selectedCampaigns: new Set(),
        };
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
    loadCustomers,
    selectCustomer,
    toggleCampaignSelection,
    previewCampaigns,
    importSelectedCampaigns,
    reset,
    goBack,
  };
}
