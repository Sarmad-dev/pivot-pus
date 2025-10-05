/**
 * Facebook OAuth callback handler
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    const errorMessage = errorDescription || error;
    return NextResponse.redirect(
      new URL(
        `/campaign/create?error=${encodeURIComponent(errorMessage)}`,
        request.url
      )
    );
  }

  // Validate required parameters
  if (!code || !state) {
    return NextResponse.redirect(
      new URL(
        '/campaign/create?error=Missing authorization code or state',
        request.url
      )
    );
  }

  // Redirect to frontend with code and state for processing
  return NextResponse.redirect(
    new URL(
      `/campaign/create?platform=facebook&code=${code}&state=${state}`,
      request.url
    )
  );
}
