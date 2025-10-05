/**
 * Google OAuth callback handler
 * Completes the OAuth flow server-side to avoid middleware issues
 */

import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/api/oauth/token-exchange";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Log all parameters for debugging
  console.log(
    "[Google OAuth Callback] ========================================"
  );
  console.log("[Google OAuth Callback] Incoming request URL:", request.url);
  console.log("[Google OAuth Callback] Received parameters:", {
    code: code
      ? `present (length: ${code.length}, start: ${code.substring(0, 20)}...)`
      : "missing",
    state: state ? `present (length: ${state.length})` : "missing",
    error,
    errorDescription,
    allParams: Object.fromEntries(searchParams.entries()),
  });

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

    // Get the current user's auth token to make Convex mutations
    const authToken = await convexAuthNextjsToken();

    if (!authToken) {
      console.error(
        "[Google OAuth Callback] No auth token - user not authenticated"
      );
      return NextResponse.redirect(
        new URL(
          "/auth/sign-in?error=Please sign in first before connecting platforms",
          request.url
        )
      );
    }

    // Store tokens in Convex database
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL not configured");
    }

    const response = await fetch(`${convexUrl}/api/mutation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        path: "platformConnections:storePlatformConnection",
        args: {
          platform,
          organizationId,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          scope: tokens.scope,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to store platform connection: ${errorData.message || response.statusText}`
      );
    }

    console.log(
      "[Google OAuth Callback] Platform connection stored successfully"
    );

    // Redirect to campaign create page with success message
    return NextResponse.redirect(
      new URL("/campaign/create?platform=google&connected=true", request.url)
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
