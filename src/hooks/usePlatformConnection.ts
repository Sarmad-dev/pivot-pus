/**
 * React hook for managing external platform connections
 */

import { useCallback, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PlatformType } from "@/lib/api/types";
import { generateAuthUrl } from "@/lib/api/oauth/config";
import { exchangeCodeForTokens } from "@/lib/api/oauth/token-exchange";
import { Id } from "../../convex/_generated/dataModel";

export interface UsePlatformConnectionResult {
  connection: any | null;
  isConnected: boolean;
  isLoading: boolean;
  connect: () => void;
  disconnect: () => Promise<void>;
  refreshConnection: () => void;
}

/**
 * Hook for managing a single platform connection
 */
export function usePlatformConnection(
  platform: PlatformType,
  organizationId: Id<"organizations">
): UsePlatformConnectionResult {
  const [isLoading, setIsLoading] = useState(false);

  // Query current connection status
  const connection = useQuery(api.platformConnections.getPlatformConnection, {
    platform,
  });

  // Mutation for disconnecting
  const disconnectPlatform = useMutation(
    api.platformConnections.disconnectPlatform
  );

  /**
   * Initiate OAuth connection flow
   */
  const connect = useCallback(() => {
    // Generate state parameter for CSRF protection
    const state = btoa(
      JSON.stringify({
        platform,
        organizationId,
        timestamp: Date.now(),
      })
    );

    // Store state in session storage for verification
    sessionStorage.setItem("oauth_state", state);

    // Redirect to OAuth authorization URL
    const authUrl = generateAuthUrl(platform, state);
    console.log('[usePlatformConnection] Redirecting to OAuth URL:', authUrl);
    console.log('[usePlatformConnection] State stored:', state);
    window.location.href = authUrl;
  }, [platform, organizationId]);

  /**
   * Disconnect platform
   */
  const disconnect = useCallback(async () => {
    setIsLoading(true);
    try {
      await disconnectPlatform({ platform });
    } finally {
      setIsLoading(false);
    }
  }, [platform, disconnectPlatform]);

  /**
   * Refresh connection data
   */
  const refreshConnection = useCallback(() => {
    // The query will automatically refetch
  }, []);

  return {
    connection,
    isConnected: connection?.status === "connected",
    isLoading: isLoading || connection === undefined,
    connect,
    disconnect,
    refreshConnection,
  };
}

/**
 * Hook for handling OAuth callback
 */
export function useOAuthCallback() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storePlatformConnection = useMutation(
    api.platformConnections.storePlatformConnection
  );

  const handleCallback = useCallback(
    async (code: string, state: string) => {
      setIsProcessing(true);
      setError(null);

      try {
        // Verify state parameter
        const storedState = sessionStorage.getItem("oauth_state");
        if (state !== storedState) {
          throw new Error("Invalid state parameter - possible CSRF attack");
        }

        // Parse state to get platform and organization
        const stateData = JSON.parse(atob(state));
        const { platform, organizationId } = stateData;

        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(platform, code);

        // Store tokens in Convex
        await storePlatformConnection({
          platform,
          organizationId,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          scope: tokens.scope,
        });

        // Clear state from session storage
        sessionStorage.removeItem("oauth_state");

        return { success: true };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to connect platform";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsProcessing(false);
      }
    },
    [storePlatformConnection]
  );

  return {
    handleCallback,
    isProcessing,
    error,
  };
}

/**
 * Hook for getting all platform connections
 */
export function useAllPlatformConnections() {
  const connections = useQuery(
    api.platformConnections.getAllPlatformConnections
  );

  return {
    connections: connections || [],
    isLoading: connections === undefined,
  };
}
