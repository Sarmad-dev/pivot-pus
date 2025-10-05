/**
 * Google OAuth callback handler
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Log all parameters for debugging
  console.log("[Google OAuth Callback] ========================================");
  console.log("[Google OAuth Callback] Incoming request URL:", request.url);
  console.log("[Google OAuth Callback] Received parameters:", {
    code: code ? `present (length: ${code.length}, start: ${code.substring(0, 20)}...)` : "missing",
    state: state ? `present (length: ${state.length})` : "missing",
    error,
    errorDescription,
    allParams: Object.fromEntries(searchParams.entries()),
  });
  console.log("[Google OAuth Callback] Request headers:", {
    cookie: request.headers.get("cookie") ? "present" : "missing",
    referer: request.headers.get("referer"),
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

  console.log("[Google OAuth Callback] Success - preparing redirect");
  
  // Build redirect URL with encoded parameters
  const redirectUrl = `/campaign/create?platform=google&code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
  const fullRedirectUrl = new URL(redirectUrl, request.url);
  
  console.log("[Google OAuth Callback] Redirect URL:", redirectUrl);
  console.log("[Google OAuth Callback] Full redirect URL:", fullRedirectUrl.toString());
  console.log("[Google OAuth Callback] Code length:", code.length);
  console.log("[Google OAuth Callback] State length:", state.length);
  console.log("[Google OAuth Callback] ========================================");
  
  // Redirect to frontend - browser will preserve cookies automatically
  return NextResponse.redirect(fullRedirectUrl);
}
