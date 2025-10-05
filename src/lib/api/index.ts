/**
 * External API integration exports
 */

// Types
export type { PlatformType, OAuthTokens, PlatformConnection, APIError, RetryConfig } from './types';
export { DEFAULT_RETRY_CONFIG } from './types';

// Errors
export {
  PlatformAPIError,
  AuthenticationError,
  TokenExpiredError,
  RateLimitError,
  NetworkError,
} from './errors';

// Retry utilities
export { withRetry, RetryManager } from './retry';

// Base client
export { BaseAPIClient } from './base-client';
export type { RequestOptions } from './base-client';

// Facebook Ads
export { FacebookAdsClient } from './facebook/client';
export type {
  FacebookAdAccount,
  FacebookCampaign,
  FacebookCampaignInsights,
} from './facebook/client';

// Google Ads
export { GoogleAdsClient } from './google/client';
export type {
  GoogleAdsCustomer,
  GoogleAdsCampaign,
  GoogleAdsCampaignMetrics,
  GoogleAdsBudget,
  GoogleCampaignImportData,
} from './google/client';
export {
  transformGoogleCampaign,
  transformGoogleCampaigns,
  validateCampaignData as validateGoogleCampaignData,
} from './google/transformer';
export type {
  TransformedCampaignData as GoogleTransformedCampaignData,
  ValidationResult as GoogleValidationResult,
} from './google/transformer';

// OAuth
export { getOAuthConfig, generateAuthUrl } from './oauth/config';
export type { OAuthConfig } from './oauth/config';
export {
  exchangeCodeForTokens,
  refreshTokens,
  revokeToken,
} from './oauth/token-exchange';
