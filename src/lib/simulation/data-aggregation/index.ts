/**
 * Data Aggregation Module
 * 
 * Main entry point for data aggregation components
 */

// Export main classes
export { CampaignDataAggregator } from './CampaignDataAggregator';
export { MarketDataAggregator } from './MarketDataAggregator';
export { DataEnrichmentService } from './DataEnrichmentService';
export { APIKeyManager } from './APIKeyManager';

// Export types and interfaces
export type { CampaignDataAggregatorConfig } from './CampaignDataAggregator';
export type { MarketDataAggregatorConfig, APIConnector } from './MarketDataAggregator';
export type { DataEnrichmentConfig, EnrichmentResult } from './DataEnrichmentService';
export type { APIKeyConfig, EncryptedAPIKey } from './APIKeyManager';

// Re-export simulation types for convenience
export type {
  CampaignDataset,
  MarketDataset,
  EnrichedDataset,
  ExternalAPIData,
  DataQualityScore,
  MarketContext,
  ExternalDataSource,
  SEMrushCompetitorData,
  GoogleTrendsData,
  SocialMediaMetrics
} from '../../../types/simulation';