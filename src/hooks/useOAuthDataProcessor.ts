/**
 * Hook for processing OAuth data after authentication
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface OAuthData {
  platform: string;
  organizationId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
  tempKey: string;
  timestamp: number;
}

export function useOAuthDataProcessor() {
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storePlatformConnection = useMutation(
    api.platformConnections.storePlatformConnection
  );

  useEffect(() => {
    const oauthData = searchParams.get("oauth_data");

    if (!oauthData) return;

    const processOAuthData = async () => {
      setIsProcessing(true);
      setError(null);

      try {
        console.log("[useOAuthDataProcessor] Processing OAuth data...");

        // Decode the OAuth data
        const decodedData = JSON.parse(
          Buffer.from(decodeURIComponent(oauthData), "base64").toString()
        ) as OAuthData;

        console.log("[useOAuthDataProcessor] Decoded OAuth data:", {
          platform: decodedData.platform,
          organizationId: decodedData.organizationId,
          hasAccessToken: !!decodedData.accessToken,
          hasRefreshToken: !!decodedData.refreshToken,
          expiresAt: decodedData.expiresAt,
          timestamp: decodedData.timestamp,
        });

        // Check if data is not too old (5 minutes max)
        const maxAge = 5 * 60 * 1000; // 5 minutes
        if (Date.now() - decodedData.timestamp > maxAge) {
          throw new Error(
            "OAuth data has expired. Please try connecting again."
          );
        }

        // Store the platform connection
        await storePlatformConnection({
          platform: decodedData.platform as "google" | "facebook",
          organizationId: decodedData.organizationId as any, // Type assertion for Convex ID
          accessToken: decodedData.accessToken,
          refreshToken: decodedData.refreshToken,
          expiresAt: decodedData.expiresAt,
          scope: decodedData.scope,
        });

        console.log(
          "[useOAuthDataProcessor] Platform connection stored successfully"
        );

        // Show success message
        toast.success("Platform connected successfully!", {
          description: `${decodedData.platform.charAt(0).toUpperCase() + decodedData.platform.slice(1)} account has been connected.`,
        });

        // Clean up URL parameters
        const url = new URL(window.location.href);
        url.searchParams.delete("oauth_data");
        url.searchParams.set("connected", "true");
        window.history.replaceState({}, "", url.toString());
      } catch (err) {
        console.error(
          "[useOAuthDataProcessor] Error processing OAuth data:",
          err
        );

        const errorMessage =
          err instanceof Error ? err.message : "Failed to process OAuth data";
        setError(errorMessage);

        toast.error("Failed to connect platform", {
          description: errorMessage,
        });

        // Clean up URL parameters and show error
        const url = new URL(window.location.href);
        url.searchParams.delete("oauth_data");
        url.searchParams.set("error", encodeURIComponent(errorMessage));
        window.history.replaceState({}, "", url.toString());
      } finally {
        setIsProcessing(false);
      }
    };

    processOAuthData();
  }, [searchParams, storePlatformConnection]);

  return {
    isProcessing,
    error,
  };
}
