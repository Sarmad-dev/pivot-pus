/**
 * Unit tests for OpenAI GPT-4o Predictor
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIPredictor } from '../OpenAIPredictor';
import { EnrichedDataset } from '../../../../types/simulation';
import { SimulationError } from '../../errors';

// Mock fetch globally
global.fetch = vi.fn();

describe('OpenAIPredictor', () => {
  let predictor: OpenAIPredictor;
  let mockDataset: EnrichedDataset;

  beforeEach(() => {
    predictor = new OpenAIPredictor({
      apiKey: 'test-api-key',
      model: 'gpt-4o',
      timeout: 30000,
      maxTokens: 4000,
      temperature: 0.3,
      dangerouslyAllowBrowser: true
    });

    mockDataset = {
      campaign: {
        id: 'test-campaign-1',
        name: 'Test Campaign',
        description: 'A test campaign for unit testing',
        budget: 10000,
        currency: 'USD',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        status: 'active',
        category: 'pr',
        channels: [
          { type: 'facebook', enabled: true, budget: 5000, settings: {} },
          { type: 'google', enabled: true, budget: 5000, settings: {} }
        ],
        audiences: [
          {
            id: 'audience-1',
            name: 'Primary Audience',
            demographics: {
              ageRange: [25, 45],
              gender: 'all',
              location: ['US', 'CA'],
              interests: ['technology', 'business']
            },
            estimatedSize: 100000
          }
        ],
        kpis: [
          { type: 'ctr', target: 0.05, timeframe: 'monthly', weight: 1 }
        ]
      },
      historicalPerformance: [
        { date: new Date('2023-12-01'), metric: 'ctr', value: 0.045 },
        { date: new Date('2023-12-02'), metric: 'ctr', value: 0.048 },
        { date: new Date('2023-12-03'), metric: 'ctr', value: 0.052 }
      ],
      audienceInsights: {
        totalSize: 100000,
        demographics: {
          ageRange: [25, 45],
          gender: 'all',
          locations: ['US', 'CA'],
          interests: ['technology', 'business']
        },
        engagementPatterns: {
          peakHours: [9, 12, 18],
          peakDays: ['Monday', 'Wednesday', 'Friday'],
          seasonality: { 'Q1': 0.8, 'Q2': 1.2, 'Q3': 0.9, 'Q4': 1.1 }
        }
      },
      creativeAssets: [
        {
          id: 'creative-1',
          type: 'text',
          content: 'Discover amazing technology solutions for your business',
          performance: { ctr: 0.048, engagement: 0.65, sentiment: 0.8 }
        }
      ],
      budgetAllocation: {
        total: 10000,
        allocated: { facebook: 5000, google: 5000 },
        spent: { facebook: 2000, google: 1500 },
        remaining: { facebook: 3000, google: 3500 }
      },
      marketData: {
        competitorActivity: [
          { competitor: 'Competitor A', metric: 'ad_spend', value: 50000, date: new Date(), source: 'semrush' }
        ],
        seasonalTrends: [
          { keyword: 'technology', trend: 1.2, date: new Date() }
        ],
        industryBenchmarks: [
          {
            industry: 'technology',
            metric: 'ctr',
            percentile25: 0.02,
            percentile50: 0.035,
            percentile75: 0.055,
            sampleSize: 1000,
            lastUpdated: new Date()
          }
        ],
        marketVolatility: {
          overall: 0.3,
          byChannel: { facebook: 0.25, google: 0.35 },
          byAudience: { 'primary': 0.3 },
          factors: ['seasonal', 'competitive']
        }
      },
      externalData: [],
      dataQuality: {
        completeness: 0.9,
        accuracy: 0.85,
        freshness: 0.8,
        consistency: 0.88,
        overall: 0.86
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('predict', () => {
    it('should generate predictions successfully with valid data', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              trajectories: [
                {
                  date: '2024-01-01',
                  metrics: { ctr: 0.045, impressions: 10000, engagement: 0.6 },
                  confidence: 0.8
                },
                {
                  date: '2024-01-02',
                  metrics: { ctr: 0.048, impressions: 11000, engagement: 0.65 },
                  confidence: 0.82
                }
              ],
              confidence_intervals: [
                { lower: 0.04, upper: 0.05, confidence_level: 0.8 },
                { lower: 0.043, upper: 0.053, confidence_level: 0.82 }
              ],
              feature_importance: [
                { feature: 'historical_performance', importance: 0.4, category: 'campaign' },
                { feature: 'budget', importance: 0.3, category: 'campaign' }
              ],
              reasoning: 'Based on historical performance and market conditions...'
            })
          }
        }]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await predictor.predict(mockDataset);

      expect(result.trajectories).toHaveLength(2);
      expect(result.trajectories[0].metrics.ctr).toBe(0.045);
      expect(result.confidence_intervals).toHaveLength(2);
      expect(result.feature_importance).toHaveLength(2);
      expect(result.model_metadata.model_name).toBe('OpenAI-GPT-4o');
      expect(result.model_metadata.confidence_score).toBeGreaterThan(0.7);
    });

    it('should handle API timeout errors', async () => {
      (global.fetch as any).mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 100)
        )
      );

      await expect(predictor.predict(mockDataset)).rejects.toThrow(SimulationError);
    });

    it('should handle invalid API responses', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request'
      });

      await expect(predictor.predict(mockDataset)).rejects.toThrow(SimulationError);
    });

    it('should handle malformed JSON responses', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'invalid json'
          }
        }]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await expect(predictor.predict(mockDataset)).rejects.toThrow(SimulationError);
    });

    it('should validate dataset before processing', async () => {
      const invalidDataset = { ...mockDataset };
      delete (invalidDataset as any).campaign;

      await expect(predictor.predict(invalidDataset)).rejects.toThrow(SimulationError);
    });

    it('should handle rate limit errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded'
      });

      await expect(predictor.predict(mockDataset)).rejects.toThrow(SimulationError);
    });
  });

  describe('buildPrompt', () => {
    it('should include campaign details in prompt', () => {
      const prompt = (predictor as any).buildPrompt(mockDataset);
      
      expect(prompt).toContain('Test Campaign');
      expect(prompt).toContain('10000');
      expect(prompt).toContain('technology');
      expect(prompt).toContain('business');
    });

    it('should include historical performance data', () => {
      const prompt = (predictor as any).buildPrompt(mockDataset);
      
      expect(prompt).toContain('0.045');
      expect(prompt).toContain('0.048');
      expect(prompt).toContain('0.052');
    });

    it('should include market context when available', () => {
      const prompt = (predictor as any).buildPrompt(mockDataset);
      
      expect(prompt).toContain('Competitor A');
      expect(prompt).toContain('technology');
      expect(prompt).toContain('0.035'); // Industry benchmark
    });
  });

  describe('parseGPTResponse', () => {
    it('should parse valid GPT response correctly', () => {
      const mockGPTResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              trajectories: [
                {
                  date: '2024-01-01',
                  metrics: { ctr: 0.045 },
                  confidence: 0.8
                }
              ],
              confidence_intervals: [
                { lower: 0.04, upper: 0.05, confidence_level: 0.8 }
              ],
              feature_importance: [
                { feature: 'budget', importance: 0.5, category: 'campaign' }
              ]
            })
          }
        }]
      };

      const result = (predictor as any).parseGPTResponse(mockGPTResponse);
      
      expect(result.trajectories).toHaveLength(1);
      expect(result.trajectories[0].date).toBeInstanceOf(Date);
      expect(result.confidence_intervals).toHaveLength(1);
      expect(result.feature_importance).toHaveLength(1);
    });

    it('should handle missing trajectory data gracefully', () => {
      const mockGPTResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              confidence_intervals: [],
              feature_importance: []
            })
          }
        }]
      };

      expect(() => (predictor as any).parseGPTResponse(mockGPTResponse)).toThrow();
    });
  });

  describe('calculateOverallConfidence', () => {
    it('should calculate confidence from trajectory data', () => {
      const trajectories = [
        { date: new Date(), metrics: { ctr: 0.045 }, confidence: 0.8 },
        { date: new Date(), metrics: { ctr: 0.048 }, confidence: 0.85 },
        { date: new Date(), metrics: { ctr: 0.052 }, confidence: 0.9 }
      ];

      const confidence = (predictor as any).calculateOverallConfidence(trajectories, mockDataset.dataQuality);
      
      expect(confidence).toBeGreaterThan(0.7);
      expect(confidence).toBeLessThanOrEqual(1.0);
    });

    it('should penalize confidence for low data quality', () => {
      const trajectories = [
        { date: new Date(), metrics: { ctr: 0.045 }, confidence: 0.9 }
      ];

      const lowQualityDataset = {
        ...mockDataset.dataQuality,
        overall: 0.3
      };

      const confidence = (predictor as any).calculateOverallConfidence(trajectories, lowQualityDataset);
      
      expect(confidence).toBeLessThan(0.9);
    });
  });
});