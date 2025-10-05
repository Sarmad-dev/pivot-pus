/**
 * OAuth configuration for external platforms
 */

import { PlatformType } from '../types';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authorizationUrl: string;
  tokenUrl: string;
}

/**
 * Get OAuth configuration for a platform
 */
export function getOAuthConfig(platform: PlatformType): OAuthConfig {
  switch (platform) {
    case 'facebook':
      return {
        clientId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
        clientSecret: process.env.FACEBOOK_APP_SECRET || '',
        redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/facebook/callback`,
        scopes: [
          'ads_read',
          'ads_management',
          'business_management',
          'read_insights',
        ],
        authorizationUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
      };

    case 'google':
      return {
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/google/callback`,
        scopes: [
          'https://www.googleapis.com/auth/adwords',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
        ],
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
      };

    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Generate OAuth authorization URL
 */
export function generateAuthUrl(
  platform: PlatformType,
  state: string
): string {
  const config = getOAuthConfig(platform);
  
  console.log(`[generateAuthUrl] Config for ${platform}:`, {
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    scopes: config.scopes,
  });
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    response_type: 'code',
    state,
    access_type: 'offline', // For Google to get refresh token
    prompt: 'consent', // Force consent screen to get refresh token
  });

  const authUrl = `${config.authorizationUrl}?${params.toString()}`;
  
  console.log(`[generateAuthUrl] Generated URL:`, authUrl);
  console.log(`[generateAuthUrl] Redirect URI in URL:`, config.redirectUri);
  console.log(`[generateAuthUrl] ⚠️ This MUST match exactly in Google Cloud Console!`);
  
  return authUrl;
}
