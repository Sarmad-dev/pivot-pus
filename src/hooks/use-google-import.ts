/**
 * Hook for managing Google Ads campaign import with enhanced error handling
 */

import { useState, useCallback, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { GoogleAdsClient, GoogleCampaignImportData } from '@/lib/api/google/client';
import {
  transformGoogleCampaign,
  validateCampaignData,
  TransformedCampaignData,
} from '@/lib/api/google/transformer';
import { ImportManager, ImportProgress, ImportItem, ImportResult } from '@/lib/import/import-manager';
import { OAuthErrorHandler, OAuthError } from '@/lib/import/oauth-error-handler';

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
  oauthError: OAuthError | null;
  importedCampaignIds: Id<'campaigns'>[];
  importProgress: ImportProgress | null;
  importResult: ImportResult | null;
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
    oauthError: null,
    importedCampaignIds: [],
    importProgress: null,
    importResult: null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const importManagerRef = useRef<ImportManager | null>(null);
  const oauthErrorHandler = useRef(new OAuthErrorHandler());

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
   * Import selected campaigns with enhanced progress tracking and error handling
   */
  const importSelectedCampaigns = useCallback(async () => {
    setIsLoading(true);
    setState((prev) => ({ ...prev, step: 'importing', error: null, oauthError: null }));

    try {
      // Prepare import items
      const importItems: ImportItem[] = Array.from(state.selectedCampaigns)
        .map(campaignId => {
          const transformed = state.transformedCampaigns.get(campaignId);
          if (!transformed) return null;

          return {
            id: campaignId,
            name: transformed.data.name,
            data: transformed.data,
            validation: transformed.validation,
          };
        })
        .filter(Boolean) as ImportItem[];

      // Create import manager with progress tracking
      importManagerRef.current = new ImportManager({
        retryFailedItems: true,
        maxRetries: 3,
        batchSize: 3, // Import 3 campaigns at a time
        delayBetweenBatches: 2000, // 2 second delay between batches
        onProgress: (progress) => {
          setState(prev => ({ ...prev, importProgress: progress }));
        },
        onError: (error) => {
          console.warn('Import error:', error);
        },
        onWarning: (warning) => {
          console.warn('Import warning:', warning);
        },
      });

      // Execute import
      const result = await importManagerRef.current.importCampaigns(
        importItems,
        async (data, orgId) => {
          return await importCampaign({
            campaignData: data,
            organizationId: orgId,
          });
        },
        organizationId
      );

      setState(prev => ({
        ...prev,
        step: result.cancelled ? 'error' : (result.success ? 'complete' : 'error'),
        importedCampaignIds: result.importedIds,
        importResult: result,
        error: result.cancelled 
          ? 'Import was cancelled' 
          : result.failedItems.length > 0 
            ? `${result.failedItems.length} campaign(s) failed to import`
            : null,
      }));
    } catch (error) {
      const oauthError = oauthErrorHandler.current.parseOAuthError(error, 'google');
      setState(prev => ({
        ...prev,
        step: 'error',
        error: oauthError.message,
        oauthError,
      }));
    } finally {
      setIsLoading(false);
    }
  }, [state.selectedCampaigns, state.transformedCampaigns, importCampaign, organizationId]);

  /**
   * Cancel ongoing import
   */
  const cancelImport = useCallback(() => {
    if (importManagerRef.current) {
      importManagerRef.current.cancel();
    }
  }, []);

  /**
   * Retry failed imports
   */
  const retryFailedImports = useCallback(async (errorIds: string[]) => {
    if (!state.importResult || !importManagerRef.current) return;

    const failedItems = state.importResult.failedItems
      .filter(error => errorIds.includes(error.id))
      .map(error => {
        const transformed = state.transformedCampaigns.get(error.id);
        if (!transformed) return null;

        return {
          id: error.id,
          name: transformed.data.name,
          data: transformed.data,
          validation: transformed.validation,
        };
      })
      .filter(Boolean) as ImportItem[];

    if (failedItems.length === 0) return;

    setIsLoading(true);
    setState(prev => ({ ...prev, error: null, oauthError: null }));

    try {
      const result = await importManagerRef.current.importCampaigns(
        failedItems,
        async (data, orgId) => {
          return await importCampaign({
            campaignData: data,
            organizationId: orgId,
          });
        },
        organizationId
      );

      // Update the existing result
      setState(prev => {
        if (!prev.importResult) return prev;

        const updatedResult = {
          ...prev.importResult,
          importedIds: [...prev.importResult.importedIds, ...result.importedIds],
          failedItems: prev.importResult.failedItems.filter(
            error => !result.importedIds.some(id => 
              failedItems.some(item => item.id === error.id)
            )
          ),
        };

        return {
          ...prev,
          importedCampaignIds: updatedResult.importedIds,
          importResult: updatedResult,
          error: updatedResult.failedItems.length > 0 
            ? `${updatedResult.failedItems.length} campaign(s) still failed to import`
            : null,
        };
      });
    } catch (error) {
      const oauthError = oauthErrorHandler.current.parseOAuthError(error, 'google');
      setState(prev => ({
        ...prev,
        error: oauthError.message,
        oauthError,
      }));
    } finally {
      setIsLoading(false);
    }
  }, [state.importResult, state.transformedCampaigns, importCampaign, organizationId]);

  /**
   * Reset import flow
   */
  const reset = useCallback(() => {
    if (importManagerRef.current) {
      importManagerRef.current.cancel();
    }
    oauthErrorHandler.current.resetRetryAttempts('google');
    
    setState({
      step: 'connect',
      customers: [],
      selectedCustomerId: null,
      campaigns: [],
      selectedCampaigns: new Set(),
      transformedCampaigns: new Map(),
      error: null,
      oauthError: null,
      importedCampaignIds: [],
      importProgress: null,
      importResult: null,
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
    cancelImport,
    retryFailedImports,
    reset,
    goBack,
  };
}
