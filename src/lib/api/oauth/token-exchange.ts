/**
 * OAuth token exchange utilities
 */

import { PlatformType, OAuthTokens } from '../types';
import { getOAuthConfig } from './config';
import { AuthenticationError } from '../errors';

/**
 * Exchange authorization code for access tokens
 */
export async function exchangeCodeForTokens(
  platform: PlatformType,
  code: string
): Promise<OAuthTokens> {
  const config = getOAuthConfig(platform);

  try {
    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error_description || 'Token exchange failed');
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
      scope: data.scope,
    };
  } catch (error) {
    throw new AuthenticationError(
      platform,
      'Failed to exchange authorization code for tokens',
      { error: (error as Error).message }
    );
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshTokens(
  platform: PlatformType,
  refreshToken: string
): Promise<OAuthTokens> {
  const config = getOAuthConfig(platform);

  try {
    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error_description || 'Token refresh failed');
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // Some platforms don't return new refresh token
      expiresAt: Date.now() + (data.expires_in * 1000),
      scope: data.scope,
    };
  } catch (error) {
    throw new AuthenticationError(
      platform,
      'Failed to refresh access token',
      { error: (error as Error).message }
    );
  }
}

/**
 * Revoke access token
 */
export async function revokeToken(
  platform: PlatformType,
  token: string
): Promise<void> {
  try {
    let revokeUrl: string;

    switch (platform) {
      case 'facebook':
        revokeUrl = `https://graph.facebook.com/v21.0/me/permissions?access_token=${token}`;
        await fetch(revokeUrl, { method: 'DELETE' });
        break;

      case 'google':
        revokeUrl = `https://oauth2.googleapis.com/revoke?token=${token}`;
        await fetch(revokeUrl, { method: 'POST' });
        break;

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  } catch (error) {
    throw new AuthenticationError(
      platform,
      'Failed to revoke token',
      { error: (error as Error).message }
    );
  }
}
