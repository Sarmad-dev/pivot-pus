/**
 * AI Trajectory Simulation Infrastructure
 * 
 * Main entry point for simulation infrastructure components
 */

// Export all types
export * from '../../types/simulation';

// Export error handling utilities
export * from './errors';

// Export validation utilities
export * from './validation';

// Export data aggregation utilities
export * from './data-aggregation';

// Export orchestration utilities
export * from './orchestration';

// Export caching and performance optimization utilities
export * from './caching';

// Export utility functions
export { 
  SimulationErrorHandler,
  RetryManager,
  ErrorRecoveryStrategies,
  errorHandler,
  createSimulationError,
  isRetryableError,
  getErrorSeverity
} from './errors';

export {
  SimulationRequestValidator,
  DataQualityValidator,
  ModelOutputValidator,
  simulationRequestValidator,
  dataQualityValidator,
  modelOutputValidator,
  validateSimulationRequest,
  validateDataQuality,
  validateModelOutput,
  throwIfInvalid
} from './validation';

// Constants and configuration
export const SIMULATION_CONFIG = {
  // Timeframe limits
  MIN_TIMEFRAME_DAYS: 5,
  MAX_TIMEFRAME_DAYS: 90,
  
  // Processing limits
  MAX_CONCURRENT_SIMULATIONS: 10,
  DEFAULT_TIMEOUT_MS: 30000,
  MAX_RETRY_ATTEMPTS: 3,
  
  // Data quality thresholds
  MIN_DATA_QUALITY_SCORE: 0.6,
  MIN_CONFIDENCE_THRESHOLD: 0.7,
  
  // Cache settings
  CACHE_TTL_HOURS: 24,
  MAX_CACHE_SIZE_MB: 100,
  
  // Model settings
  DEFAULT_MODEL: 'openai-gpt4o',
  FALLBACK_MODELS: ['huggingface-prophet', 'custom-lstm'],
  
  // Validation settings
  REQUIRED_HISTORICAL_DAYS: 7,
  MAX_METRICS_PER_SIMULATION: 10
} as const;

// Metric type mappings
export const METRIC_TYPES = {
  CTR: 'ctr',
  IMPRESSIONS: 'impressions', 
  ENGAGEMENT: 'engagement',
  REACH: 'reach',
  CONVERSIONS: 'conversions',
  CPC: 'cpc',
  CPM: 'cpm'
} as const;

// Channel type mappings
export const CHANNEL_TYPES = {
  FACEBOOK: 'facebook',
  GOOGLE: 'google',
  TWITTER: 'twitter',
  LINKEDIN: 'linkedin',
  INSTAGRAM: 'instagram',
  TIKTOK: 'tiktok',
  EMAIL: 'email',
  DISPLAY: 'display'
} as const;

// Risk type mappings
export const RISK_TYPES = {
  PERFORMANCE_DIP: 'performance_dip',
  BUDGET_OVERRUN: 'budget_overrun',
  AUDIENCE_FATIGUE: 'audience_fatigue',
  COMPETITOR_THREAT: 'competitor_threat'
} as const;

// Recommendation type mappings
export const RECOMMENDATION_TYPES = {
  BUDGET_REALLOCATION: 'budget_reallocation',
  CREATIVE_REFRESH: 'creative_refresh',
  AUDIENCE_EXPANSION: 'audience_expansion',
  CHANNEL_SHIFT: 'channel_shift',
  TIMING_ADJUSTMENT: 'timing_adjustment'
} as const;

// Utility type guards
export function isValidMetricType(type: string): type is keyof typeof METRIC_TYPES {
  return Object.values(METRIC_TYPES).includes(type as any);
}

export function isValidChannelType(type: string): type is keyof typeof CHANNEL_TYPES {
  return Object.values(CHANNEL_TYPES).includes(type as any);
}

export function isValidRiskType(type: string): type is keyof typeof RISK_TYPES {
  return Object.values(RISK_TYPES).includes(type as any);
}

export function isValidRecommendationType(type: string): type is keyof typeof RECOMMENDATION_TYPES {
  return Object.values(RECOMMENDATION_TYPES).includes(type as any);
}