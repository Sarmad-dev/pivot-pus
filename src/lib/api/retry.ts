/**
 * Retry logic with exponential backoff for API requests
 */

import { RetryConfig, DEFAULT_RETRY_CONFIG } from './types';
import { PlatformAPIError, RateLimitError } from './errors';

/**
 * Sleep for a specified duration
 */
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate delay for exponential backoff
 */
function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig
): number {
  const delay = Math.min(
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelayMs
  );
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if it's not a retryable error
      if (error instanceof PlatformAPIError && !error.retryable) {
        throw error;
      }

      // If we've exhausted retries, throw the error
      if (attempt === retryConfig.maxRetries) {
        throw error;
      }

      // Calculate delay
      let delay: number;
      if (error instanceof RateLimitError && error.retryAfter) {
        // Use the retry-after header if available
        delay = error.retryAfter * 1000;
      } else {
        delay = calculateBackoffDelay(attempt, retryConfig);
      }

      console.warn(
        `API request failed (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}). ` +
        `Retrying in ${Math.round(delay)}ms...`,
        error
      );

      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Batch retry configuration for multiple requests
 */
export class RetryManager {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return withRetry(fn, this.config);
  }

  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
