/**
 * Enhanced OAuth error handling with better user feedback and recovery mechanisms
 */

import { PlatformType } from '@/lib/api/types';
import { AuthenticationError, TokenExpiredError } from '@/lib/api/errors';

export interface OAuthError {
  type: 'auth_error' | 'token_expired' | 'permission_denied' | 'rate_limit' | 'network_error' | 'unknown';
  platform: PlatformType;
  message: string;
  userMessage: string;
  recoverable: boolean;
  retryable: boolean;
  suggestedAction?: string;
  details?: Record<string, any>;
}

export interface OAuthRecoveryOptions {
  autoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number) => void;
  onRecovery?: () => void;
  onFailure?: (error: OAuthError) => void;
}

export class OAuthErrorHandler {
  private retryAttempts = new Map<string, number>();
  
  /**
   * Parse and categorize OAuth errors
   */
  parseOAuthError(error: any, platform: PlatformType): OAuthError {
    // Handle URL parameters from OAuth callback
    if (typeof error === 'string') {
      return this.parseOAuthUrlError(error, platform);
    }

    // Handle API errors
    if (error instanceof AuthenticationError) {
      return {
        type: 'auth_error',
        platform,
        message: error.message,
        userMessage: 'Authentication failed. Please check your credentials and try again.',
        recoverable: true,
        retryable: false,
        suggestedAction: 'Reconnect your account',
        details: error.details,
      };
    }

    if (error instanceof TokenExpiredError) {
      return {
        type: 'token_expired',
        platform,
        message: error.message,
        userMessage: 'Your session has expired. Please reconnect your account.',
        recoverable: true,
        retryable: true,
        suggestedAction: 'Refresh connection',
        details: error.details,
      };
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        type: 'network_error',
        platform,
        message: error.message,
        userMessage: 'Network connection failed. Please check your internet connection and try again.',
        recoverable: true,
        retryable: true,
        suggestedAction: 'Check your internet connection',
      };
    }

    // Handle rate limiting
    if (error.message?.toLowerCase().includes('rate limit') || error.message?.toLowerCase().includes('too many requests')) {
      return {
        type: 'rate_limit',
        platform,
        message: error.message,
        userMessage: 'Too many requests. Please wait a moment before trying again.',
        recoverable: true,
        retryable: true,
        suggestedAction: 'Wait and try again',
      };
    }

    // Default unknown error
    return {
      type: 'unknown',
      platform,
      message: error.message || 'Unknown error occurred',
      userMessage: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
      recoverable: true,
      retryable: true,
      suggestedAction: 'Try again',
      details: { originalError: error },
    };
  }

  /**
   * Parse OAuth errors from URL parameters
   */
  private parseOAuthUrlError(errorParam: string, platform: PlatformType): OAuthError {
    const decodedError = decodeURIComponent(errorParam);
    
    // Common OAuth error codes
    const errorMappings: Record<string, Partial<OAuthError>> = {
      'access_denied': {
        type: 'permission_denied',
        userMessage: 'Access was denied. Please grant the necessary permissions to continue.',
        recoverable: true,
        retryable: false,
        suggestedAction: 'Grant permissions and try again',
      },
      'invalid_request': {
        type: 'auth_error',
        userMessage: 'Invalid request. Please try connecting again.',
        recoverable: true,
        retryable: true,
        suggestedAction: 'Try connecting again',
      },
      'invalid_client': {
        type: 'auth_error',
        userMessage: 'Application configuration error. Please contact support.',
        recoverable: false,
        retryable: false,
        suggestedAction: 'Contact support',
      },
      'invalid_grant': {
        type: 'auth_error',
        userMessage: 'Authorization expired or invalid. Please try connecting again.',
        recoverable: true,
        retryable: true,
        suggestedAction: 'Try connecting again',
      },
      'unauthorized_client': {
        type: 'auth_error',
        userMessage: 'Application not authorized. Please contact support.',
        recoverable: false,
        retryable: false,
        suggestedAction: 'Contact support',
      },
      'unsupported_response_type': {
        type: 'auth_error',
        userMessage: 'Configuration error. Please contact support.',
        recoverable: false,
        retryable: false,
        suggestedAction: 'Contact support',
      },
      'invalid_scope': {
        type: 'permission_denied',
        userMessage: 'Invalid permissions requested. Please contact support.',
        recoverable: false,
        retryable: false,
        suggestedAction: 'Contact support',
      },
      'server_error': {
        type: 'unknown',
        userMessage: `${platform} is experiencing issues. Please try again later.`,
        recoverable: true,
        retryable: true,
        suggestedAction: 'Try again later',
      },
      'temporarily_unavailable': {
        type: 'unknown',
        userMessage: `${platform} is temporarily unavailable. Please try again later.`,
        recoverable: true,
        retryable: true,
        suggestedAction: 'Try again later',
      },
    };

    // Find matching error code
    const errorCode = Object.keys(errorMappings).find(code => 
      decodedError.toLowerCase().includes(code)
    );

    const baseError = errorCode ? errorMappings[errorCode] : {};

    return {
      type: 'auth_error',
      platform,
      message: decodedError,
      userMessage: 'Authentication failed. Please try again.',
      recoverable: true,
      retryable: true,
      suggestedAction: 'Try again',
      ...baseError,
    } as OAuthError;
  }

  /**
   * Attempt to recover from OAuth errors with retry logic
   */
  async attemptRecovery(
    error: OAuthError,
    recoveryFn: () => Promise<void>,
    options: OAuthRecoveryOptions = {}
  ): Promise<boolean> {
    const {
      autoRetry = true,
      maxRetries = 3,
      retryDelay = 2000,
      onRetry,
      onRecovery,
      onFailure,
    } = options;

    if (!error.recoverable || !autoRetry) {
      onFailure?.(error);
      return false;
    }

    const errorKey = `${error.platform}-${error.type}`;
    const currentAttempts = this.retryAttempts.get(errorKey) || 0;

    if (currentAttempts >= maxRetries) {
      onFailure?.(error);
      return false;
    }

    try {
      // Wait before retry (with exponential backoff)
      const delay = retryDelay * Math.pow(2, currentAttempts);
      await this.sleep(delay);

      this.retryAttempts.set(errorKey, currentAttempts + 1);
      onRetry?.(currentAttempts + 1);

      await recoveryFn();
      
      // Success - reset retry count
      this.retryAttempts.delete(errorKey);
      onRecovery?.();
      return true;
    } catch (retryError) {
      // Parse the new error and potentially retry again
      const newError = this.parseOAuthError(retryError, error.platform);
      
      if (newError.retryable && currentAttempts < maxRetries - 1) {
        return this.attemptRecovery(newError, recoveryFn, options);
      }

      onFailure?.(newError);
      return false;
    }
  }

  /**
   * Get user-friendly error message with suggested actions
   */
  getErrorMessage(error: OAuthError): string {
    let message = error.userMessage;
    
    if (error.suggestedAction) {
      message += ` ${error.suggestedAction}.`;
    }

    return message;
  }

  /**
   * Get recovery instructions for different error types
   */
  getRecoveryInstructions(error: OAuthError): string[] {
    const instructions: Record<OAuthError['type'], string[]> = {
      auth_error: [
        'Check that you have the correct permissions',
        'Ensure your account is active and in good standing',
        'Try disconnecting and reconnecting your account',
      ],
      token_expired: [
        'Your session has expired',
        'Click "Reconnect" to refresh your connection',
        'You may need to re-authorize the application',
      ],
      permission_denied: [
        'Grant all requested permissions during authorization',
        'Check your account settings for any restrictions',
        'Contact your administrator if using a business account',
      ],
      rate_limit: [
        'Wait a few minutes before trying again',
        'Reduce the number of simultaneous requests',
        'Try importing fewer campaigns at once',
      ],
      network_error: [
        'Check your internet connection',
        'Try refreshing the page',
        'Disable any VPN or proxy that might interfere',
      ],
      unknown: [
        'Try refreshing the page and attempting again',
        'Clear your browser cache and cookies',
        'Contact support if the problem persists',
      ],
    };

    return instructions[error.type] || instructions.unknown;
  }

  /**
   * Reset retry attempts for a platform
   */
  resetRetryAttempts(platform: PlatformType): void {
    const keysToDelete = Array.from(this.retryAttempts.keys())
      .filter(key => key.startsWith(platform));
    
    keysToDelete.forEach(key => this.retryAttempts.delete(key));
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global instance
export const oauthErrorHandler = new OAuthErrorHandler();