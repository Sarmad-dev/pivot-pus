/**
 * AI Trajectory Simulation Error Handling Utilities
 * 
 * Comprehensive error handling, validation, and recovery mechanisms
 * for the simulation engine
 */

import { ModelError, ValidationResult, ValidationError, ValidationWarning, FallbackResult } from '../../types/simulation';

// ============================================================================
// Custom Error Classes
// ============================================================================

export class SimulationError extends Error {
  public readonly type: string;
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly context: Record<string, any>;

  constructor(
    message: string,
    type: string,
    code: string,
    retryable: boolean = false,
    context: Record<string, any> = {}
  ) {
    super(message);
    this.name = 'SimulationError';
    this.type = type;
    this.code = code;
    this.retryable = retryable;
    this.context = context;
  }
}

export class DataValidationError extends SimulationError {
  constructor(message: string, field: string, value: any) {
    super(message, 'validation_error', 'INVALID_DATA', false, { field, value });
    this.name = 'DataValidationError';
  }
}

export class ModelAPIError extends SimulationError {
  constructor(message: string, apiType: string, statusCode?: number) {
    super(
      message,
      'api_error',
      `${apiType.toUpperCase()}_API_ERROR`,
      statusCode ? statusCode >= 500 : true,
      { apiType, statusCode }
    );
    this.name = 'ModelAPIError';
  }
}

export class InsufficientDataError extends SimulationError {
  constructor(message: string, requiredFields: string[], missingFields: string[]) {
    super(message, 'insufficient_data', 'MISSING_REQUIRED_DATA', false, {
      requiredFields,
      missingFields
    });
    this.name = 'InsufficientDataError';
  }
}

export class RateLimitError extends SimulationError {
  constructor(message: string, service: string, retryAfter?: number) {
    super(message, 'rate_limit_exceeded', 'RATE_LIMIT_EXCEEDED', true, {
      service,
      retryAfter
    });
    this.name = 'RateLimitError';
  }
}

export class ProcessingTimeoutError extends SimulationError {
  constructor(message: string, timeoutMs: number) {
    super(message, 'processing_timeout', 'PROCESSING_TIMEOUT', true, { timeoutMs });
    this.name = 'ProcessingTimeoutError';
  }
}

// ============================================================================
// Error Handler Class
// ============================================================================

export class SimulationErrorHandler {
  private static instance: SimulationErrorHandler;
  private errorCounts: Map<string, number> = new Map();
  private lastErrors: Map<string, Date> = new Map();

  public static getInstance(): SimulationErrorHandler {
    if (!SimulationErrorHandler.instance) {
      SimulationErrorHandler.instance = new SimulationErrorHandler();
    }
    return SimulationErrorHandler.instance;
  }

  /**
   * Handle and categorize errors with appropriate recovery strategies
   */
  public async handleError(error: Error, context: Record<string, any> = {}): Promise<FallbackResult> {
    const errorKey = `${error.name}:${error.message}`;
    this.trackError(errorKey);

    // Convert to SimulationError if not already
    const simError = this.normalizeError(error, context);

    console.error('Simulation Error:', {
      type: simError.type,
      code: simError.code,
      message: simError.message,
      retryable: simError.retryable,
      context: simError.context,
      errorCount: this.errorCounts.get(errorKey) || 0
    });

    // Determine recovery strategy
    return this.determineRecoveryStrategy(simError, context);
  }

  /**
   * Convert any error to SimulationError for consistent handling
   */
  private normalizeError(error: Error, context: Record<string, any>): SimulationError {
    if (error instanceof SimulationError) {
      return error;
    }

    // Handle common error patterns
    if (error.message.includes('timeout')) {
      return new ProcessingTimeoutError(error.message, 30000);
    }

    if (error.message.includes('rate limit') || error.message.includes('429')) {
      return new RateLimitError(error.message, 'unknown');
    }

    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return new DataValidationError(error.message, 'unknown', null);
    }

    // Default to generic simulation error
    return new SimulationError(
      error.message,
      'unknown_error',
      'GENERIC_ERROR',
      true,
      context
    );
  }

  /**
   * Track error frequency for circuit breaker pattern
   */
  private trackError(errorKey: string): void {
    const count = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, count + 1);
    this.lastErrors.set(errorKey, new Date());
  }

  /**
   * Determine appropriate recovery strategy based on error type
   */
  private async determineRecoveryStrategy(
    error: SimulationError,
    context: Record<string, any>
  ): Promise<FallbackResult> {
    switch (error.type) {
      case 'api_timeout':
        return this.handleAPITimeout(error, context);
      
      case 'model_unavailable':
        return this.handleModelUnavailable(error, context);
      
      case 'insufficient_data':
        return this.handleInsufficientData(error, context);
      
      case 'rate_limit_exceeded':
        return this.handleRateLimit(error, context);
      
      case 'validation_error':
        return this.handleValidationError(error, context);
      
      default:
        return this.handleGenericError(error, context);
    }
  }

  private async handleAPITimeout(error: SimulationError, context: Record<string, any>): Promise<FallbackResult> {
    return {
      success: false,
      fallback_used: 'timeout_recovery',
      confidence_degradation: 0.3,
      message: 'API timeout occurred. Consider using cached results or simplified model.'
    };
  }

  private async handleModelUnavailable(error: SimulationError, context: Record<string, any>): Promise<FallbackResult> {
    return {
      success: false,
      fallback_used: 'fallback_model',
      confidence_degradation: 0.2,
      message: 'Primary model unavailable. Switching to fallback model.'
    };
  }

  private async handleInsufficientData(error: SimulationError, context: Record<string, any>): Promise<FallbackResult> {
    return {
      success: false,
      fallback_used: 'basic_projection',
      confidence_degradation: 0.5,
      message: 'Insufficient data for full simulation. Using basic trend projection.'
    };
  }

  private async handleRateLimit(error: SimulationError, context: Record<string, any>): Promise<FallbackResult> {
    const retryAfter = error.context.retryAfter || 60;
    return {
      success: false,
      fallback_used: 'queue_for_retry',
      confidence_degradation: 0,
      message: `Rate limit exceeded. Queued for retry in ${retryAfter} seconds.`
    };
  }

  private async handleValidationError(error: SimulationError, context: Record<string, any>): Promise<FallbackResult> {
    return {
      success: false,
      fallback_used: 'validation_recovery',
      confidence_degradation: 0.4,
      message: 'Data validation failed. Using available valid data subset.'
    };
  }

  private async handleGenericError(error: SimulationError, context: Record<string, any>): Promise<FallbackResult> {
    return {
      success: false,
      fallback_used: 'generic_recovery',
      confidence_degradation: 0.6,
      message: 'Unexpected error occurred. Using simplified simulation approach.'
    };
  }

  /**
   * Check if service should be circuit-broken based on error frequency
   */
  public shouldCircuitBreak(service: string): boolean {
    const errorKey = `service:${service}`;
    const errorCount = this.errorCounts.get(errorKey) || 0;
    const lastError = this.lastErrors.get(errorKey);

    // Circuit break if more than 5 errors in the last 5 minutes
    if (errorCount >= 5 && lastError) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      return lastError > fiveMinutesAgo;
    }

    return false;
  }

  /**
   * Reset error tracking for a service
   */
  public resetErrorTracking(service: string): void {
    const errorKey = `service:${service}`;
    this.errorCounts.delete(errorKey);
    this.lastErrors.delete(errorKey);
  }
}

// ============================================================================
// Retry Utilities
// ============================================================================

export class RetryManager {
  /**
   * Execute function with exponential backoff retry
   */
  public static async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000,
    maxDelayMs: number = 10000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on final attempt
        if (attempt === maxRetries) {
          break;
        }

        // Don't retry non-retryable errors
        if (error instanceof SimulationError && !error.retryable) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
          maxDelayMs
        );

        console.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay:`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Execute function with timeout
   */
  public static async withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new ProcessingTimeoutError(
          `Operation timed out after ${timeoutMs}ms`,
          timeoutMs
        )), timeoutMs)
      )
    ]);
  }
}

// ============================================================================
// Error Recovery Strategies
// ============================================================================

export class ErrorRecoveryStrategies {
  /**
   * Graceful degradation for model failures
   */
  public static async gracefulDegradation(
    primaryFunction: () => Promise<any>,
    fallbackFunction: () => Promise<any>,
    context: Record<string, any> = {}
  ): Promise<{ result: any; degraded: boolean; strategy: string }> {
    try {
      const result = await primaryFunction();
      return { result, degraded: false, strategy: 'primary' };
    } catch (error) {
      console.warn('Primary function failed, using fallback:', error);
      
      try {
        const result = await fallbackFunction();
        return { result, degraded: true, strategy: 'fallback' };
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        throw new SimulationError(
          'Both primary and fallback strategies failed',
          'complete_failure',
          'TOTAL_FAILURE',
          false,
          { primaryError: error, fallbackError, context }
        );
      }
    }
  }

  /**
   * Partial success handling for data aggregation
   */
  public static async partialSuccess<T>(
    operations: Array<() => Promise<T>>,
    minimumSuccessRate: number = 0.5
  ): Promise<{ results: T[]; successRate: number; errors: Error[] }> {
    const results: T[] = [];
    const errors: Error[] = [];

    await Promise.allSettled(
      operations.map(async (operation, index) => {
        try {
          const result = await operation();
          results.push(result);
        } catch (error) {
          errors.push(error as Error);
          console.warn(`Operation ${index} failed:`, error);
        }
      })
    );

    const successRate = results.length / operations.length;

    if (successRate < minimumSuccessRate) {
      throw new SimulationError(
        `Insufficient success rate: ${successRate} < ${minimumSuccessRate}`,
        'insufficient_success',
        'LOW_SUCCESS_RATE',
        false,
        { successRate, minimumSuccessRate, errorCount: errors.length }
      );
    }

    return { results, successRate, errors };
  }
}

// ============================================================================
// Exported Utilities
// ============================================================================

export const errorHandler = SimulationErrorHandler.getInstance();

export function createSimulationError(
  message: string,
  type: string,
  code: string,
  retryable: boolean = false,
  context: Record<string, any> = {}
): SimulationError {
  return new SimulationError(message, type, code, retryable, context);
}

export function isRetryableError(error: Error): boolean {
  if (error instanceof SimulationError) {
    return error.retryable;
  }
  
  // Default retry logic for common error patterns
  const retryablePatterns = [
    /timeout/i,
    /network/i,
    /connection/i,
    /503/,
    /502/,
    /500/
  ];

  return retryablePatterns.some(pattern => pattern.test(error.message));
}

export function getErrorSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
  if (error instanceof InsufficientDataError) return 'medium';
  if (error instanceof DataValidationError) return 'medium';
  if (error instanceof RateLimitError) return 'low';
  if (error instanceof ProcessingTimeoutError) return 'medium';
  if (error instanceof ModelAPIError) return 'high';
  
  return 'high'; // Default for unknown errors
}