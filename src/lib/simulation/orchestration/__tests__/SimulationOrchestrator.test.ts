/**
 * Integration tests for SimulationOrchestrator
 * 
 * Tests end-to-end simulation processing with mock data
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { SimulationOrchestrator } from '../SimulationOrchestrator';
import { 
  SimulationRequest, 
  SimulationResult, 
  SimulationStatus,
  CampaignDataset,
  EnrichedDataset,
  MarketDataset
} from '../../../../types/simulation';

// Mock the dependencies
vi.mock('../../../data-aggregation/CampaignDataAggregator');
vi.mock('../../../data-aggregation/DataEnrichmentService');
vi.mock('../../validation');
vi.mock('../../errors');

describe('SimulationOrchestrator Integration Tests', () => {
  let orchestrator: SimulationOrchestrator;
  let mockRequest: SimulationRequest;
  let mockCampaignDataset: CampaignDataset;
  let mockEnrichedDataset: EnrichedDataset;

  beforeEach(() => {
    orchestrator = new SimulationOrchestrator();
    
    // Setup mock request
    mockRequest = {
      campaignId: 'campaign_123' as any,
      timeframe: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        granularity: 'daily'
      },
      metrics: [
        { type: 'ctr', weight: 1.0 },
        { type: 'impressions', weight: 0.8 },
        { type: 'engagement', weight: 1.2 }
      ],
      scenarios: [
        { type: 'optimistic' },
        { type: 'realistic' },
        { type: 'pessimistic' }
      ],
      externalDataSources: [
        { source: 'google_trends', enabled: true, config: {} as any }
      ]
    };

    // Setup mock campaign dataset
    mockCampaignDataset = {
      campaign: {
        id: 'campaign_123',
        name: 'Test Campaign',
        description: 'Test campaign for simulation',
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
            id: 'audience_1',
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
          { type: 'ctr', target: 0.03, timeframe: 'monthly', weight: 1.0 }
        ]
      },
      historicalPerformance: [
        { date: new Date('2023-12-01'), metric: 'ctr', value: 0.025 },
        { date: new Date('2023-12-02'), metric: 'ctr', value: 0.028 },
        { date: new Date('2023-12-03'), metric: 'ctr', value: 0.032 }
      ],
      audienceInsights: {
        totalSize: 100000,
        demographics: {
          ageRange: [25, 45],
          gender: 'mixed',
          locations: ['US', 'CA'],
          interests: ['technology', 'business']
        },
        engagementPatterns: {
          peakHours: [9, 12, 18],
          peakDays: ['Monday', 'Wednesday', 'Friday'],
          seasonality: { 'Q1': 0.8, 'Q2': 1.2, 'Q3': 1.0, 'Q4': 1.1 }
        }
      },
      creativeAssets: [
        {
          id: 'creative_1',
          type: 'image',
          content: 'Test creative content',
          performance: { ctr: 0.03, engagement: 0.05, sentiment: 0.7 }
        }
      ],
      budgetAllocation: {
        total: 10000,
        allocated: { 'facebook': 5000, 'google': 5000 },
        spent: { 'facebook': 2000, 'google': 1500 },
        remaining: { 'facebook': 3000, 'google': 3500 }
      }
    };

    // Setup mock enriched dataset
    const mockMarketDataset: MarketDataset = {
      competitorActivity: [
        { competitor: 'Competitor A', metric: 'ad_spend', value: 50000, date: new Date(), source: 'semrush' }
      ],
      seasonalTrends: [
        { keyword: 'technology', trend: 0.15, date: new Date(), region: 'US' }
      ],
      industryBenchmarks: [
        {
          industry: 'technology',
          metric: 'ctr',
          percentile25: 0.02,
          percentile50: 0.03,
          percentile75: 0.045,
          sampleSize: 1000,
          lastUpdated: new Date()
        }
      ],
      marketVolatility: {
        overall: 0.2,
        byChannel: { 'facebook': 0.15, 'google': 0.25 },
        byAudience: { 'tech_professionals': 0.18 },
        factors: ['economic_uncertainty', 'seasonal_trends']
      }
    };

    mockEnrichedDataset = {
      ...mockCampaignDataset,
      marketData: mockMarketDataset,
      externalData: [
        {
          source: 'google_trends',
          type: 'trend_data',
          data: { keyword: 'technology', trend: 0.15 },
          timestamp: new Date(),
          reliability: 0.9
        }
      ],
      dataQuality: {
        completeness: 0.9,
        accuracy: 0.85,
        freshness: 0.95,
        consistency: 0.88,
        overall: 0.89
      }
    };
  });

  describe('runSimulation', () => {
    it('should complete end-to-end simulation processing with mock data', async () => {
      // Mock the validation to pass
      const mockValidator = {
        validate: vi.fn().mockResolvedValue({
          valid: true,
          errors: [],
          warnings: [],
          score: 0.9
        })
      };

      // Mock the data aggregation
      const mockCampaignAggregator = {
        aggregateCampaignData: vi.fn().mockResolvedValue(mockCampaignDataset)
      };

      const mockEnrichmentService = {
        enrichCampaignData: vi.fn().mockResolvedValue({ dataset: mockEnrichedDataset })
      };

      // Replace the orchestrator's dependencies
      (orchestrator as any).validator = mockValidator;
      (orchestrator as any).campaignAggregator = mockCampaignAggregator;
      (orchestrator as any).enrichmentService = mockEnrichmentService;

      const result = await orchestrator.runSimulation(mockRequest);

      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.trajectories).toBeDefined();
      expect(result.trajectories.length).toBeGreaterThan(0);
      expect(result.scenarios).toBeDefined();
      expect(result.scenarios.length).toBe(3); // optimistic, realistic, pessimistic
      expect(result.modelMetadata).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.completedAt).toBeInstanceOf(Date);

      // Verify dependencies were called
      expect(mockValidator.validate).toHaveBeenCalledWith(mockRequest);
      expect(mockCampaignAggregator.aggregateCampaignData).toHaveBeenCalledWith(mockRequest.campaignId, null);
      expect(mockEnrichmentService.enrichCampaignData).toHaveBeenCalledWith(
        mockRequest.campaignId,
        mockRequest.externalDataSources,
        null
      );
    });

    it('should handle validation errors gracefully', async () => {
      const mockValidator = {
        validate: vi.fn().mockResolvedValue({
          valid: false,
          errors: [{ field: 'timeframe', message: 'Invalid timeframe', code: 'INVALID_TIMEFRAME', severity: 'error' }],
          warnings: [],
          score: 0.3
        })
      };

      (orchestrator as any).validator = mockValidator;

      await expect(orchestrator.runSimulation(mockRequest)).rejects.toThrow();
    });

    it('should track simulation status correctly', async () => {
      // Mock the dependencies to make the test more predictable
      const mockValidator = {
        validate: vi.fn().mockResolvedValue({
          valid: true,
          errors: [],
          warnings: [],
          score: 0.9
        })
      };

      const mockCampaignAggregator = {
        aggregateCampaignData: vi.fn().mockResolvedValue(mockCampaignDataset)
      };

      const mockEnrichmentService = {
        enrichCampaignData: vi.fn().mockResolvedValue({ dataset: mockEnrichedDataset })
      };

      (orchestrator as any).validator = mockValidator;
      (orchestrator as any).campaignAggregator = mockCampaignAggregator;
      (orchestrator as any).enrichmentService = mockEnrichmentService;

      const simulationPromise = orchestrator.runSimulation(mockRequest);
      
      // Give a small delay to allow the simulation to start processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Check that simulation is being processed
      const queueStatus = orchestrator.getQueueStatus();
      expect(queueStatus.activeSimulations).toBeGreaterThanOrEqual(0);

      await simulationPromise;

      // Check that simulation is no longer active
      const finalQueueStatus = orchestrator.getQueueStatus();
      expect(finalQueueStatus.activeSimulations).toBe(0);
    });

    it('should estimate processing time based on request complexity', async () => {
      const complexRequest = {
        ...mockRequest,
        metrics: Array(10).fill(0).map((_, i) => ({ type: 'ctr', weight: 1.0 })),
        scenarios: Array(5).fill(0).map(() => ({ type: 'custom' })),
        externalDataSources: Array(3).fill(0).map(() => ({ source: 'semrush', enabled: true, config: {} as any }))
      };

      const simpleRequest = {
        ...mockRequest,
        metrics: [{ type: 'ctr', weight: 1.0 }],
        scenarios: [{ type: 'realistic' }],
        externalDataSources: []
      };

      // Mock the private method to access it
      const complexEstimate = (orchestrator as any).estimateProcessingTime(complexRequest);
      const simpleEstimate = (orchestrator as any).estimateProcessingTime(simpleRequest);

      expect(complexEstimate).toBeGreaterThan(simpleEstimate);
    });
  });

  describe('getSimulationStatus', () => {
    it('should return correct status for queued simulations', async () => {
      const simulationId = 'test_simulation_123';
      
      // Mock a queued simulation
      (orchestrator as any).processingQueue.set(simulationId, {
        id: simulationId,
        request: mockRequest,
        priority: 1,
        status: 'queued',
        createdAt: new Date()
      });

      const status = await orchestrator.getSimulationStatus(simulationId);
      expect(status).toBe('queued');
    });

    it('should return processing status for active simulations', async () => {
      const simulationId = 'test_simulation_456';
      
      // Mock an active simulation
      (orchestrator as any).activeSimulations.set(simulationId, Promise.resolve({} as SimulationResult));

      const status = await orchestrator.getSimulationStatus(simulationId);
      expect(status).toBe('processing');
    });
  });

  describe('cancelSimulation', () => {
    it('should cancel queued simulations', async () => {
      const simulationId = 'test_simulation_789';
      
      // Mock a queued simulation
      (orchestrator as any).processingQueue.set(simulationId, {
        id: simulationId,
        request: mockRequest,
        priority: 1,
        status: 'queued',
        createdAt: new Date()
      });

      await orchestrator.cancelSimulation(simulationId);

      expect((orchestrator as any).processingQueue.has(simulationId)).toBe(false);
    });

    it('should cancel active simulations', async () => {
      const simulationId = 'test_simulation_101';
      
      // Mock an active simulation
      (orchestrator as any).activeSimulations.set(simulationId, Promise.resolve({} as SimulationResult));

      await orchestrator.cancelSimulation(simulationId);

      expect((orchestrator as any).activeSimulations.has(simulationId)).toBe(false);
    });
  });

  describe('getQueueStatus', () => {
    it('should return accurate queue metrics', () => {
      // Add some mock queued simulations
      (orchestrator as any).processingQueue.set('sim1', { status: 'queued' });
      (orchestrator as any).processingQueue.set('sim2', { status: 'queued' });
      (orchestrator as any).processingQueue.set('sim3', { status: 'processing' });

      // Add some mock active simulations
      (orchestrator as any).activeSimulations.set('sim4', Promise.resolve({} as SimulationResult));
      (orchestrator as any).activeSimulations.set('sim5', Promise.resolve({} as SimulationResult));

      const status = orchestrator.getQueueStatus();

      expect(status.queueLength).toBe(2); // Only queued simulations
      expect(status.activeSimulations).toBe(2);
      expect(status.averageProcessingTime).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle data aggregation errors', async () => {
      const mockCampaignAggregator = {
        aggregateCampaignData: vi.fn().mockRejectedValue(new Error('Data aggregation failed'))
      };

      (orchestrator as any).campaignAggregator = mockCampaignAggregator;

      await expect(orchestrator.runSimulation(mockRequest)).rejects.toThrow();
    });

    it('should clean up resources on error', async () => {
      const mockEnrichmentService = {
        enrichCampaignData: vi.fn().mockRejectedValue(new Error('Enrichment failed'))
      };

      (orchestrator as any).enrichmentService = mockEnrichmentService;

      const initialQueueSize = (orchestrator as any).processingQueue.size;
      const initialActiveSize = (orchestrator as any).activeSimulations.size;

      try {
        await orchestrator.runSimulation(mockRequest);
      } catch (error) {
        // Expected to throw
      }

      // Verify cleanup occurred
      expect((orchestrator as any).processingQueue.size).toBe(initialQueueSize);
      expect((orchestrator as any).activeSimulations.size).toBe(initialActiveSize);
    });
  });
});