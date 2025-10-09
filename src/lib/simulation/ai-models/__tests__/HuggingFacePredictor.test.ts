/**
 * Unit tests for Hugging Face Predictor
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HuggingFacePredictor } from '../HuggingFacePredictor';
import { EnrichedDataset } from '../../../../types/simulation';
import { SimulationError } from '../../errors';

// Mock fetch globally
global.fetch = vi.fn();

describe('HuggingFacePredictor', () => {
  let predictor: HuggingFacePredictor;
  let mockDataset: EnrichedDataset;

  beforeEach(() => {
    predictor = new HuggingFacePredictor({
      apiKey: 'test-hf-key',
      baseUrl: 'https://api-inference.huggingface.co',
      timeout: 30000,
      models: {
        prophet: 'facebook/prophet',
        lstm: 'huggingface/time-series-transformer',
        sentiment: 'cardiffnlp/twitter-roberta-base-sentiment-latest'
      }
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
          { type: 'facebook', enabled: true, budget: 5000, settings: {} }
        ],
        audiences: [
          {
            id: 'audience-1',
            name: 'Primary Audience',
            demographics: {
              ageRange: [25, 45],
              gender: 'all',
              location: ['US'],
              interests: ['technology']
            }
          }
        ],
        kpis: [
          { type: 'ctr', target: 0.05, timeframe: 'monthly', weight: 1 }
        ]
      },
      historicalPerformance: [
        { date: new Date('2023-12-01'), metric: 'ctr', value: 0.045 },
        { date: new Date('2023-12-02'), metric: 'ctr', value: 0.048 },
        { date: new Date('2023-12-03'), metric: 'ctr', value: 0.052 },
        { date: new Date('2023-12-04'), metric: 'impressions', value: 10000 },
        { date: new Date('2023-12-05'), metric: 'impressions', value: 11000 }
      ],
      audienceInsights: {
        totalSize: 100000,
        demographics: {
          ageRange: [25, 45],
          gender: 'all',
          locations: ['US'],
          interests: ['technology']
        },
        engagementPatterns: {
          peakHours: [9, 18],
          peakDays: ['Monday', 'Friday'],
          seasonality: { 'Q1': 0.8, 'Q4': 1.1 }
        }
      },
      creativeAssets: [
        {
          id: 'creative-1',
          type: 'text',
          content: 'Amazing technology solutions for your business needs',
          performance: { ctr: 0.048, engagement: 0.65, sentiment: 0.8 }
        },
        {
          id: 'creative-2',
          type: 'image',
          content: 'Product showcase image',
          performance: { ctr: 0.052, engagement: 0.7, sentiment: 0.75 }
        }
      ],
      budgetAllocation: {
        total: 10000,
        allocated: { facebook: 10000 },
        spent: { facebook: 3000 },
        remaining: { facebook: 7000 }
      },
      marketData: {
        competitorActivity: [],
        seasonalTrends: [],
        industryBenchmarks: [],
        marketVolatility: {
          overall: 0.3,
          byChannel: { facebook: 0.25 },
          byAudience: { 'primary': 0.3 },
          factors: ['seasonal']
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
      // Mock Prophet API response
      const mockProphetResponse = [
        {
          ds: '2024-01-01',
          yhat: 0.045,
          yhat_lower: 0.04,
          yhat_upper: 0.05,
          trend: 0.045,
          seasonal: 0,
          confidence: 0.8
        },
        {
          ds: '2024-01-02',
          yhat: 0.048,
          yhat_lower: 0.043,
          yhat_upper: 0.053,
          trend: 0.048,
          seasonal: 0,
          confidence: 0.82
        }
      ];

      // Mock LSTM API response
      const mockLSTMResponse = {
        prediction: [0.046, 0.049]
      };

      // Mock Sentiment API response
      const mockSentimentResponse = [
        { label: 'POSITIVE', score: 0.8, confidence: 0.85 }
      ];

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProphetResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLSTMResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSentimentResponse
        });

      const result = await predictor.predict(mockDataset);

      expect(result.trajectories).toHaveLength(2);
      expect(result.trajectories[0].metrics.ctr).toBeCloseTo(0.045, 2);
      expect(result.confidence_intervals).toHaveLength(2);
      expect(result.feature_importance.length).toBeGreaterThan(0);
      expect(result.model_metadata.model_name).toBe('HuggingFace-Ensemble');
    });

    it('should handle Prophet API failures gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      });

      await expect(predictor.predict(mockDataset)).rejects.toThrow(SimulationError);
    });

    it('should validate dataset before processing', async () => {
      const invalidDataset = { ...mockDataset };
      delete (invalidDataset as any).campaign;

      await expect(predictor.predict(invalidDataset)).rejects.toThrow(SimulationError);
    });

    it('should handle insufficient historical data', async () => {
      const datasetWithoutHistory = {
        ...mockDataset,
        historicalPerformance: []
      };

      await expect(predictor.predict(datasetWithoutHistory)).rejects.toThrow(SimulationError);
    });

    it('should handle low data quality', async () => {
      const lowQualityDataset = {
        ...mockDataset,
        dataQuality: {
          ...mockDataset.dataQuality,
          overall: 0.3
        }
      };

      await expect(predictor.predict(lowQualityDataset)).rejects.toThrow(SimulationError);
    });
  });

  describe('prepareTimeSeriesData', () => {
    it('should convert historical performance to Prophet format', () => {
      const timeSeriesData = (predictor as any).prepareTimeSeriesData(mockDataset);

      expect(timeSeriesData).toHaveLength(5); // 5 historical data points
      expect(timeSeriesData[0]).toHaveProperty('ds');
      expect(timeSeriesData[0]).toHaveProperty('y');
      expect(timeSeriesData[0].ds).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof timeSeriesData[0].y).toBe('number');
    });

    it('should include additional features in time series data', () => {
      const timeSeriesData = (predictor as any).prepareTimeSeriesData(mockDataset);

      expect(timeSeriesData[0]).toHaveProperty('budget');
      expect(timeSeriesData[0]).toHaveProperty('audience_size');
      expect(timeSeriesData[0]).toHaveProperty('channel_count');
      expect(timeSeriesData[0]).toHaveProperty('creative_count');
    });

    it('should sort data by date', () => {
      const timeSeriesData = (predictor as any).prepareTimeSeriesData(mockDataset);

      for (let i = 1; i < timeSeriesData.length; i++) {
        const prevDate = new Date(timeSeriesData[i - 1].ds);
        const currDate = new Date(timeSeriesData[i].ds);
        expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime());
      }
    });
  });

  describe('prepareCreativeData', () => {
    it('should extract text content from creative assets', () => {
      const creativeData = (predictor as any).prepareCreativeData(mockDataset);

      expect(creativeData).toHaveLength(2);
      expect(creativeData[0]).toBe('Amazing technology solutions for your business needs');
      expect(creativeData[1]).toBe('Product showcase image');
    });

    it('should filter out empty content', () => {
      const datasetWithEmptyCreatives = {
        ...mockDataset,
        creativeAssets: [
          ...mockDataset.creativeAssets,
          { id: 'empty', type: 'text', content: '' },
          { id: 'null', type: 'text', content: null as any }
        ]
      };

      const creativeData = (predictor as any).prepareCreativeData(datasetWithEmptyCreatives);

      expect(creativeData).toHaveLength(2); // Should still be 2, not 4
    });
  });

  describe('runProphetForecasting', () => {
    it('should call Hugging Face Prophet API correctly', async () => {
      const mockResponse = [
        {
          ds: '2024-01-01',
          yhat: 0.045,
          yhat_lower: 0.04,
          yhat_upper: 0.05,
          confidence: 0.8
        }
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const timeSeriesData = [
        { ds: '2023-12-01', y: 0.045, budget: 1000, audience_size: 10000 }
      ];

      const result = await (predictor as any).runProphetForecasting(timeSeriesData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('facebook/prophet'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-hf-key',
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('periods')
        })
      );

      expect(result).toHaveLength(1);
      expect(result[0].yhat).toBe(0.045);
    });

    it('should handle API timeout', async () => {
      (global.fetch as any).mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 100)
        )
      );

      const timeSeriesData = [
        { ds: '2023-12-01', y: 0.045 }
      ];

      await expect((predictor as any).runProphetForecasting(timeSeriesData))
        .rejects.toThrow(SimulationError);
    });
  });

  describe('runLSTMForecasting', () => {
    it('should format LSTM input correctly', async () => {
      const mockResponse = {
        prediction: [0.045, 0.048, 0.052]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const timeSeriesData = [
        { ds: '2023-12-01', y: 0.045, budget: 1000, audience_size: 10000, channel_count: 1, creative_count: 2 }
      ];

      const result = await (predictor as any).runLSTMForecasting(timeSeriesData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('time-series-transformer'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('inputs')
        })
      );

      expect(result).toHaveLength(3);
      expect(result[0].prediction).toBe(0.045);
    });
  });

  describe('runSentimentAnalysis', () => {
    it('should analyze creative content sentiment', async () => {
      const mockResponse = [
        { label: 'POSITIVE', score: 0.8 },
        { label: 'NEUTRAL', score: 0.6 }
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const creativeData = ['Great product!', 'Okay service'];

      const result = await (predictor as any).runSentimentAnalysis(creativeData);

      expect(result).toHaveLength(2);
      expect(result[0].label).toBe('POSITIVE');
      expect(result[0].score).toBe(0.8);
    });

    it('should handle empty creative data gracefully', async () => {
      const result = await (predictor as any).runSentimentAnalysis([]);

      expect(result).toHaveLength(0);
    });

    it('should not fail entire prediction on sentiment analysis error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Sentiment API error'));

      const result = await (predictor as any).runSentimentAnalysis(['test content']);

      expect(result).toHaveLength(0);
    });
  });

  describe('combineModelOutputs', () => {
    it('should combine Prophet and LSTM predictions correctly', () => {
      const prophetForecasts = [
        { ds: '2024-01-01', yhat: 0.045, confidence: 0.8 },
        { ds: '2024-01-02', yhat: 0.048, confidence: 0.82 }
      ];

      const lstmPredictions = [
        { timestamp: '2024-01-01', prediction: 0.046, confidence: 0.75 },
        { timestamp: '2024-01-02', prediction: 0.049, confidence: 0.78 }
      ];

      const trajectories = (predictor as any).combineModelOutputs(
        prophetForecasts, 
        lstmPredictions, 
        mockDataset
      );

      expect(trajectories).toHaveLength(2);
      expect(trajectories[0].metrics.ctr).toBeCloseTo(0.0454, 3); // Weighted average
      expect(trajectories[0].confidence).toBeCloseTo(0.782, 2); // Weighted confidence
    });

    it('should handle mismatched prediction lengths', () => {
      const prophetForecasts = [
        { ds: '2024-01-01', yhat: 0.045, confidence: 0.8 }
      ];

      const lstmPredictions = [
        { timestamp: '2024-01-01', prediction: 0.046, confidence: 0.75 },
        { timestamp: '2024-01-02', prediction: 0.049, confidence: 0.78 }
      ];

      const trajectories = (predictor as any).combineModelOutputs(
        prophetForecasts, 
        lstmPredictions, 
        mockDataset
      );

      expect(trajectories).toHaveLength(2);
    });
  });

  describe('calculateConfidenceIntervals', () => {
    it('should use Prophet confidence intervals when available', () => {
      const prophetForecasts = [
        { 
          ds: '2024-01-01', 
          yhat: 0.045, 
          yhat_lower: 0.04, 
          yhat_upper: 0.05, 
          confidence: 0.8 
        }
      ];

      const lstmPredictions = [
        { timestamp: '2024-01-01', prediction: 0.046, confidence: 0.75 }
      ];

      const intervals = (predictor as any).calculateConfidenceIntervals(
        prophetForecasts, 
        lstmPredictions
      );

      expect(intervals).toHaveLength(1);
      expect(intervals[0].lower).toBe(0.04);
      expect(intervals[0].upper).toBe(0.05);
      expect(intervals[0].confidence_level).toBe(0.8);
    });

    it('should estimate intervals for LSTM when Prophet not available', () => {
      const prophetForecasts: any[] = [];
      const lstmPredictions = [
        { timestamp: '2024-01-01', prediction: 0.046, confidence: 0.75 }
      ];

      const intervals = (predictor as any).calculateConfidenceIntervals(
        prophetForecasts, 
        lstmPredictions
      );

      expect(intervals).toHaveLength(1);
      expect(intervals[0].lower).toBeLessThan(0.046);
      expect(intervals[0].upper).toBeGreaterThan(0.046);
    });
  });

  describe('calculateFeatureImportance', () => {
    it('should calculate feature importance scores', () => {
      const sentimentAnalysis = [
        { label: 'POSITIVE', score: 0.8, confidence: 0.85 }
      ];

      const importance = (predictor as any).calculateFeatureImportance(
        mockDataset, 
        sentimentAnalysis
      );

      expect(importance.length).toBeGreaterThan(0);
      expect(importance[0]).toHaveProperty('feature');
      expect(importance[0]).toHaveProperty('importance');
      expect(importance[0]).toHaveProperty('category');

      // Check that importance scores sum to 1
      const totalImportance = importance.reduce((sum: number, item: any) => sum + item.importance, 0);
      expect(totalImportance).toBeCloseTo(1, 2);
    });

    it('should handle missing sentiment analysis', () => {
      const importance = (predictor as any).calculateFeatureImportance(
        mockDataset, 
        []
      );

      expect(importance.length).toBeGreaterThan(0);
      
      // Should not include creative_sentiment when no sentiment data
      const sentimentFeature = importance.find((f: any) => f.feature === 'creative_sentiment');
      expect(sentimentFeature?.importance || 0).toBe(0);
    });
  });
});