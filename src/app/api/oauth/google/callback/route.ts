/**
 * Google OAuth callback handler
 * Completes the OAuth flow server-side to avoid middleware issues
 */

import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/api/oauth/token-exchange";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  console.log("Search Params: ", searchParams);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth errors
  if (error) {
    const errorMessage = errorDescription || error;
    console.error("[Google OAuth Callback] OAuth error:", errorMessage);
    return NextResponse.redirect(
      new URL(
        `/campaign/create?error=${encodeURIComponent(errorMessage)}`,
        request.url
      )
    );
  }

  // Validate required parameters
  if (!code || !state) {
    console.error("[Google OAuth Callback] Missing code or state", {
      hasCode: !!code,
      hasState: !!state,
      url: request.url,
    });
    return NextResponse.redirect(
      new URL(
        `/campaign/create?error=Missing authorization code or state. Please check Google Cloud Console redirect URI configuration.`,
        request.url
      )
    );
  }

  try {
    console.log("[Google OAuth Callback] Starting token exchange...");

    // Parse state to get platform and organization info
    const stateData = JSON.parse(atob(state));
    const { platform, organizationId } = stateData;

    console.log("[Google OAuth Callback] State data:", {
      platform,
      organizationId,
    });

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(platform, code);
    console.log("[Google OAuth Callback] Token exchange successful");

    // Store tokens temporarily and let frontend complete the flow
    // This avoids authentication issues during OAuth redirect
    console.log(
      "[Google OAuth Callback] Storing tokens temporarily for frontend processing"
    );

    // Create a temporary token storage key
    const tempKey = `oauth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // In a real app, you'd store this in Redis or a database with expiration
    // For now, we'll pass the tokens securely to the frontend
    const tokenData = {
      platform,
      organizationId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
      tempKey,
      timestamp: Date.now(),
    };

    // Encode the token data (in production, encrypt this)
    const encodedTokens = Buffer.from(JSON.stringify(tokenData)).toString(
      "base64"
    );

    console.log(
      "[Google OAuth Callback] Redirecting to frontend with temporary tokens"
    );

    // Redirect to campaign create page with temporary token data
    return NextResponse.redirect(
      new URL(
        `/campaign/create?platform=google&oauth_data=${encodeURIComponent(encodedTokens)}`,
        request.url
      )
    );
  } catch (error) {
    console.error(
      "[Google OAuth Callback] Error during token exchange:",
      error
    );

    const errorMessage =
      error instanceof Error ? error.message : "Failed to complete OAuth flow";

    return NextResponse.redirect(
      new URL(
        `/campaign/create?error=${encodeURIComponent(errorMessage)}`,
        request.url
      )
    );
  } finally {
    console.log(
      "[Google OAuth Callback] ========================================"
    );
  }
}
