/**
 * Campaign Import Components
 * Provides platform-specific campaign import interfaces
 */

"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Id } from "../../../../convex/_generated/dataModel";
import { FacebookCampaignImport } from "../facebook-campaign-import";
import { GoogleCampaignImport } from "../google-campaign-import";
import { useOAuthDataProcessor } from "@/hooks/useOAuthDataProcessor";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Facebook, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { useOAuthCallback } from "@/hooks/usePlatformConnection";

type Platform = "facebook" | "google" | null;

interface CampaignImportProps {
  organizationId: Id<"organizations">;
  onComplete?: (campaignIds: Id<"campaigns">[]) => void;
  onCancel?: () => void;
}

/**
 * Main campaign import component with platform selection
 */
export function CampaignImport({
  organizationId,
  onComplete,
  onCancel,
}: CampaignImportProps) {
  const searchParams = useSearchParams();
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(null);
  const {
    handleCallback,
    isProcessing,
    error: callbackError,
  } = useOAuthCallback();
  
  // Process OAuth data if present
  const { isProcessing: isProcessingOAuth, error: oauthProcessingError } = useOAuthDataProcessor();

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const platform = searchParams.get("platform");
    const connected = searchParams.get("connected");
    const oauthData = searchParams.get("oauth_data");
    const error = searchParams.get("error");

    console.log("[CampaignImport] URL params:", {
      hasCode: !!code,
      hasState: !!state,
      platform,
      connected,
      hasOAuthData: !!oauthData,
      error,
      allParams: Array.from(searchParams.entries()),
    });

    if (error) {
      // OAuth error from provider
      console.error("[CampaignImport] OAuth error in URL:", error);
      return;
    }

    if (connected === "true" && platform) {
      // OAuth completed successfully (server-side or processed by useOAuthDataProcessor)
      console.log("[CampaignImport] OAuth completed successfully, showing platform UI");
      setSelectedPlatform(platform as Platform);
    } else if (oauthData && platform) {
      // OAuth data present - will be processed by useOAuthDataProcessor hook
      console.log("[CampaignImport] OAuth data detected, will be processed by useOAuthDataProcessor");
      setSelectedPlatform(platform as Platform);
    } else if (code && state && platform) {
      // Legacy: Process OAuth callback (fallback)
      console.log("[CampaignImport] Processing OAuth callback (legacy)");
      handleCallback(code, state).then((result) => {
        if (result.success) {
          console.log("[CampaignImport] OAuth callback successful");
          setSelectedPlatform(platform as Platform);

          const url = new URL(window.location.href);
          url.searchParams.delete("code");
          url.searchParams.delete("state");
          url.searchParams.delete("platform");
          window.history.replaceState({}, "", url.toString());
        } else {
          console.error("[CampaignImport] OAuth callback failed:", result.error);
        }
      });
    } else if (platform && !code && !oauthData && !connected) {
      // Platform selected but no OAuth data (direct navigation)
      console.log("[CampaignImport] Platform selected without OAuth data, showing selection");
      setSelectedPlatform(platform as Platform);
    }
  }, [searchParams, handleCallback]);

  // Show processing state during OAuth callback or OAuth data processing
  if (isProcessing || isProcessingOAuth) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connecting Platform</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">
            {isProcessingOAuth ? "Storing platform connection..." : "Completing authentication..."}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show callback error or OAuth processing error
  if (callbackError || oauthProcessingError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Connection Failed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{callbackError || oauthProcessingError}</AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()}>Try Again</Button>
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show OAuth error from URL
  const oauthError = searchParams.get("error");
  if (oauthError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Authorization Failed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {decodeURIComponent(oauthError)}
            </AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.delete("error");
                window.location.href = url.toString();
              }}
            >
              Try Again
            </Button>
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Platform selection view
  if (!selectedPlatform) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import Campaign</CardTitle>
          <CardDescription>
            Choose a platform to import campaigns from
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setSelectedPlatform("facebook")}
            >
              <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                <Facebook className="h-12 w-12 text-blue-600" />
                <div>
                  <h3 className="font-semibold">Facebook Ads</h3>
                  <p className="text-sm text-muted-foreground">
                    Import campaigns from Facebook Ads Manager
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setSelectedPlatform("google")}
            >
              <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                <div className="h-12 w-12 flex items-center justify-center bg-muted rounded">
                  <span className="text-2xl">G</span>
                </div>
                <div>
                  <h3 className="font-semibold">Google Ads</h3>
                  <p className="text-sm text-muted-foreground">
                    Import campaigns from Google Ads
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {onCancel && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Platform-specific import view
  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        onClick={() => setSelectedPlatform(null)}
        className="mb-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Platform Selection
      </Button>

      {selectedPlatform === "facebook" && (
        <FacebookCampaignImport
          organizationId={organizationId}
          onComplete={onComplete}
          onCancel={() => setSelectedPlatform(null)}
        />
      )}

      {selectedPlatform === "google" && (
        <GoogleCampaignImport
          organizationId={organizationId}
          onComplete={onComplete}
          onCancel={() => setSelectedPlatform(null)}
        />
      )}
    </div>
  );
}

// Export individual platform components for direct use
export { FacebookCampaignImport } from "../facebook-campaign-import";
export { GoogleCampaignImport } from "../google-campaign-import";
