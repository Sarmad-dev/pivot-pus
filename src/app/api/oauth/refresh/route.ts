import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { platform, refreshToken } = await request.json();
    
    if (!platform || !refreshToken) {
      return NextResponse.json(
        { error: 'Missing platform or refresh token' },
        { status: 400 }
      );
    }

    let tokenUrl: string;
    let clientId: string;
    let clientSecret: string;

    // Get platform-specific configuration
    switch (platform) {
      case 'google':
        tokenUrl = 'https://oauth2.googleapis.com/token';
        clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
        clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
        break;
      
      case 'facebook':
        tokenUrl = 'https://graph.facebook.com/v21.0/oauth/access_token';
        clientId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '';
        clientSecret = process.env.FACEBOOK_APP_SECRET || '';
        break;
      
      default:
        return NextResponse.json(
          { error: `Unsupported platform: ${platform}` },
          { status: 400 }
        );
    }

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: `Missing client credentials for ${platform}` },
        { status: 500 }
      );
    }

    // Make the token refresh request
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Token refresh error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorData
      });
      return NextResponse.json(
        { error: 'Token refresh failed', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // Some platforms don't return new refresh token
      expiresAt: Date.now() + (data.expires_in * 1000),
      scope: data.scope,
    });
  } catch (error) {
    console.error('Token refresh API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}