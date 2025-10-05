/**
 * Common types for external API integrations
 */

export type PlatformType = "facebook" | "google";

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp
  scope?: string;
}

export interface PlatformConnection {
  platform: PlatformType;
  userId: string;
  organizationId: string;
  tokens: OAuthTokens;
  connectedAt: number;
  lastSyncAt?: number;
  status: "connected" | "expired" | "error";
}

export interface APIError {
  code: string;
  message: string;
  platform: PlatformType;
  retryable: boolean;
  details?: Record<string, any>;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};
