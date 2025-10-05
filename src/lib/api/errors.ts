/**
 * Custom error classes for API integrations
 */

import { APIError, PlatformType } from './types';

export class PlatformAPIError extends Error {
  public readonly code: string;
  public readonly platform: PlatformType;
  public readonly retryable: boolean;
  public readonly details?: Record<string, any>;

  constructor(error: APIError) {
    super(error.message);
    this.name = 'PlatformAPIError';
    this.code = error.code;
    this.platform = error.platform;
    this.retryable = error.retryable;
    this.details = error.details;
  }
}

export class AuthenticationError extends PlatformAPIError {
  constructor(platform: PlatformType, message: string, details?: Record<string, any>) {
    super({
      code: 'AUTH_ERROR',
      message,
      platform,
      retryable: false,
      details,
    });
    this.name = 'AuthenticationError';
  }
}

export class TokenExpiredError extends PlatformAPIError {
  constructor(platform: PlatformType) {
    super({
      code: 'TOKEN_EXPIRED',
      message: 'Access token has expired',
      platform,
      retryable: true,
    });
    this.name = 'TokenExpiredError';
  }
}

export class RateLimitError extends PlatformAPIError {
  public readonly retryAfter?: number;

  constructor(platform: PlatformType, retryAfter?: number) {
    super({
      code: 'RATE_LIMIT',
      message: 'API rate limit exceeded',
      platform,
      retryable: true,
      details: { retryAfter },
    });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class NetworkError extends PlatformAPIError {
  constructor(platform: PlatformType, originalError: Error) {
    super({
      code: 'NETWORK_ERROR',
      message: `Network error: ${originalError.message}`,
      platform,
      retryable: true,
      details: { originalError: originalError.message },
    });
    this.name = 'NetworkError';
  }
}
