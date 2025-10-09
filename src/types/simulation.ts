/**
 * AI Trajectory Simulation Types
 * 
 * Core TypeScript interfaces and types for the simulation engine components
 */

import { Id } from "../../convex/_generated/dataModel";

// ============================================================================
// Core Simulation Types
// ============================================================================

export interface SimulationRequest {
  campaignId: Id<"campaigns">;
  timeframe: {
    startDate: Date;
    endDate: Date;
    granularity: 'daily' | 'weekly';
  };
  metrics: SimulationMetric[];
  scenarios: ScenarioConfig[];
  externalDataSources: ExternalDataSource[];
}

export interface SimulationMetric {
  type: 'ctr' | 'impressions' | 'engagement' | 'reach' | 'conversions' | 'cpc' | 'cpm';
  weight: number;
  benchmarkSource?: 'industry' | 'historical' | 'competitor';
}

export interface SimulationResult {
  id: string;
  status: SimulationStatus;
  trajectories: TrajectoryPoint[];
  scenarios: ScenarioResult[];
  risks: RiskAlert[];
  recommendations: PivotRecommendation[];
  modelMetadata: ModelMetadata;
  createdAt: Date;
  completedAt?: Date;
}

export type SimulationStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

// ============================================================================
// Data Models
// ============================================================================

export interface TrajectoryPoint {
  date: Date;
  metrics: Record<string, number>;
  confidence: number;
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  confidence_level: number;
}

export interface CampaignDataset {
  campaign: CampaignData;
  historicalPerformance: PerformanceMetric[];
  audienceInsights: AudienceData;
  creativeAssets: CreativeData[];
  budgetAllocation: BudgetData;
}

export interface CampaignData {
  id: string;
  name: string;
  description: string;
  budget: number;
  currency: string;
  startDate: Date;
  endDate: Date;
  status: string;
  category: string;
  channels: ChannelConfig[];
  audiences: AudienceConfig[];
  kpis: KPIConfig[];
}

export interface PerformanceMetric {
  date: Date;
  metric: string;
  value: number;
  channel?: string;
  audience?: string;
}

export interface AudienceData {
  totalSize: number;
  demographics: {
    ageRange: [number, number];
    gender: string;
    locations: string[];
    interests: string[];
  };
  engagementPatterns: {
    peakHours: number[];
    peakDays: string[];
    seasonality: Record<string, number>;
  };
}

export interface CreativeData {
  id: string;
  type: 'image' | 'video' | 'text' | 'carousel';
  content: string;
  performance?: {
    ctr: number;
    engagement: number;
    sentiment: number;
  };
}

export interface BudgetData {
  total: number;
  allocated: Record<string, number>;
  spent: Record<string, number>;
  remaining: Record<string, number>;
}

export interface ChannelConfig {
  type: string;
  enabled: boolean;
  budget: number;
  settings: Record<string, any>;
}

export interface AudienceConfig {
  id: string;
  name: string;
  demographics: {
    ageRange: [number, number];
    gender: string;
    location: string[];
    interests: string[];
  };
  estimatedSize?: number;
}

export interface KPIConfig {
  type: string;
  target: number;
  timeframe: string;
  weight: number;
}

// ============================================================================
// Market Data Types
// ============================================================================

export interface MarketDataset {
  competitorActivity: CompetitorMetric[];
  seasonalTrends: TrendData[];
  industryBenchmarks: BenchmarkData[];
  marketVolatility: VolatilityIndex;
}

export interface CompetitorMetric {
  competitor: string;
  metric: string;
  value: number;
  date: Date;
  source: string;
}

export interface TrendData {
  keyword: string;
  trend: number;
  date: Date;
  region?: string;
  category?: string;
}

export interface BenchmarkData {
  industry: string;
  metric: string;
  percentile25: number;
  percentile50: number;
  percentile75: number;
  sampleSize: number;
  lastUpdated: Date;
}

export interface VolatilityIndex {
  overall: number;
  byChannel: Record<string, number>;
  byAudience: Record<string, number>;
  factors: string[];
}

export interface EnrichedDataset extends CampaignDataset {
  marketData: MarketDataset;
  externalData: ExternalAPIData[];
  dataQuality: DataQualityScore;
}

export interface ExternalAPIData {
  source: string;
  type: string;
  data: any;
  timestamp: Date;
  reliability: number;
}

export interface DataQualityScore {
  completeness: number;
  accuracy: number;
  freshness: number;
  consistency: number;
  overall: number;
}

// ============================================================================
// AI Model Types
// ============================================================================

export interface ModelConfig {
  primary: 'openai-gpt4o' | 'huggingface-prophet' | 'custom-lstm';
  fallback: string[];
  confidence_threshold: number;
  ensemble_weights: Record<string, number>;
}

export interface PredictionOutput {
  trajectories: TrajectoryPoint[];
  confidence_intervals: ConfidenceInterval[];
  feature_importance: FeatureImportance[];
  model_metadata: ModelMetadata;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  category: 'campaign' | 'market' | 'temporal' | 'external';
}

export interface ModelMetadata {
  model_name: string;
  model_version: string;
  confidence_score: number;
  processing_time: number;
  data_quality: DataQualityScore;
  feature_count: number;
  prediction_horizon: number;
}

export interface ModelPrediction {
  modelName: string;
  prediction: PredictionOutput;
  weight: number;
  confidence: number;
  processingTime: number;
}

// ============================================================================
// Scenario and Risk Types
// ============================================================================

export interface ScenarioConfig {
  type: 'optimistic' | 'realistic' | 'pessimistic' | 'custom';
  percentile?: number;
  adjustments?: ScenarioAdjustment[];
}

export interface ScenarioAdjustment {
  factor: 'budget' | 'competition' | 'seasonality' | 'creative_fatigue';
  multiplier: number;
  timeframe?: DateRange;
}

export interface ScenarioResult {
  type: string;
  probability: number;
  trajectory: TrajectoryPoint[];
  key_factors: string[];
  confidence: number;
}

export interface RiskAlert {
  type: 'performance_dip' | 'budget_overrun' | 'audience_fatigue' | 'competitor_threat';
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  impact: number;
  timeframe: DateRange;
  description: string;
  recommendations: string[];
  confidence: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

// ============================================================================
// Pivot Recommendation Types
// ============================================================================

export interface PivotRecommendation {
  id: string;
  type: 'budget_reallocation' | 'creative_refresh' | 'audience_expansion' | 'channel_shift' | 'timing_adjustment';
  priority: number;
  impact_estimate: {
    metric: string;
    improvement: number;
    confidence: number;
  };
  implementation: {
    description: string;
    steps: string[];
    effort: 'low' | 'medium' | 'high';
    timeline: string;
  };
  simulation_preview?: TrajectoryPoint[];
}

// ============================================================================
// External Data Source Types
// ============================================================================

export interface ExternalDataSource {
  source: 'semrush' | 'google_trends' | 'twitter_api' | 'facebook_api' | 'custom';
  enabled: boolean;
  config: ExternalDataSourceConfig;
}

export interface ExternalDataSourceConfig {
  apiKey: string;
  endpoint: string;
  rateLimit: {
    requests: number;
    period: number;
  };
  enabled: boolean;
}

// SEMrush API Integration
export interface SEMrushCompetitorData {
  domain: string;
  traffic: {
    organic: number;
    paid: number;
    total: number;
  };
  keywords: {
    organic_count: number;
    paid_count: number;
    top_keywords: string[];
  };
  ad_spend_estimate: number;
  market_share: number;
}

// Google Trends API Integration
export interface GoogleTrendsData {
  keyword: string;
  timeframe: string;
  geo: string;
  interest_over_time: Array<{
    date: string;
    value: number;
  }>;
  related_queries: string[];
  rising_queries: string[];
}

// Social Media API Integration
export interface SocialMediaMetrics {
  platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin';
  metrics: {
    mentions: number;
    sentiment_score: number;
    engagement_rate: number;
    reach: number;
    impressions: number;
  };
  trending_topics: string[];
  competitor_activity: Array<{
    competitor: string;
    activity_score: number;
    content_themes: string[];
  }>;
}

// ============================================================================
// Processing and Cache Types
// ============================================================================

export interface SimulationContext {
  simulationId: string;
  organizationId: string;
  userId: string;
  request: SimulationRequest;
  dataset: EnrichedDataset;
}

export interface CacheKey {
  campaignId: string;
  timeframe: string;
  metrics: string;
  hash: string;
}

export interface ProcessingQueue {
  id: string;
  priority: number;
  estimatedDuration: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// ============================================================================
// Validation and Error Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface ModelError extends Error {
  type: 'api_timeout' | 'model_unavailable' | 'insufficient_data' | 'rate_limit_exceeded' | 'validation_error';
  code: string;
  retryable: boolean;
  context?: Record<string, any>;
}

export interface FallbackResult {
  success: boolean;
  result?: PredictionOutput;
  fallback_used: string;
  confidence_degradation: number;
  message: string;
}

// ============================================================================
// Market Context Types
// ============================================================================

export interface MarketContext {
  industry: string;
  region: string;
  timeframe: DateRange;
  competitors: string[];
  keywords: string[];
}

// ============================================================================
// Utility Types
// ============================================================================

export type MetricType = 'ctr' | 'impressions' | 'engagement' | 'reach' | 'conversions' | 'cpc' | 'cpm';
export type ChannelType = 'facebook' | 'google' | 'twitter' | 'linkedin' | 'instagram' | 'tiktok' | 'email' | 'display';
export type CampaignCategory = 'pr' | 'content' | 'social' | 'paid' | 'mixed';
export type RiskType = 'performance_dip' | 'budget_overrun' | 'audience_fatigue' | 'competitor_threat';
export type RecommendationType = 'budget_reallocation' | 'creative_refresh' | 'audience_expansion' | 'channel_shift' | 'timing_adjustment';