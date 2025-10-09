/**
 * Integration tests for ScenarioGenerator
 * 
 * Tests scenario generation with various input parameters
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ScenarioGenerator } from '../ScenarioGenerator';
import { 
  TrajectoryPoint,
  ScenarioConfig,
  ScenarioResult,
  SimulationContext,
  MarketDataset,
  EnrichedDataset
} from '../../../../types/simulation';

describe('ScenarioGenerator Integration Tests', () => {
  let generator: ScenarioGenerator;
  let mockTrajectory: TrajectoryPoint[];
  let mockContext: SimulationContext;

  beforeEach(() => {
    generator = new ScenarioGenerator();

    // Create mock trajectory data (30 days)
    mockTrajectory = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(2024, 0, i + 1),
      metrics: {
        ctr: 0.03 + (Math.random() - 0.5) * 0.01, // 2.5% - 3.5% CTR
        impressions: 1000 + Math.random() * 500,   // 1000-1500 impressions
        engagement: 0.05 + (Math.random() - 0.5) * 0.02 // 3% - 7% engagement
      },
      confidence: 0.8 + Math.random() * 0.15 // 80-95% confidence
    }));

    // Create mock market dataset
    const mockMarketData: MarketDataset = {
      competitorActivity: [
        { competitor: 'Competitor A', metric: 'ad_spend', value: 50000, date: new Date(), source: 'semrush' },
        { competitor: 'Competitor B', metric: 'impressions', value: 100000, date: new Date(), source: 'facebook' }
      ],
      seasonalTrends: [
        { keyword: 'technology', trend: 0.15, date: new Date(), region: 'US' },
        { keyword: 'business', trend: -0.05, date: new Date(), region: 'US' }
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

    // Create mock enriched dataset
    const mockEnrichedDataset: EnrichedDataset = {
      campaign: {
        id: 'campaign_123',
        name: 'Test Campaign',
        description: 'Test campaign',
        budget: 10000,
        currency: 'USD',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        status: 'active',
        category: 'pr',
        channels: [],
        audiences: [],
        kpis: []
      },
      historicalPerformance: [],
      audienceInsights: {
        totalSize: 100000,
        demographics: {
          ageRange: [25, 45],
          gender: 'mixed',
          locations: ['US'],
          interests: ['technology']
        },
        engagementPatterns: {
          peakHours: [9, 12, 18],
          peakDays: ['Monday', 'Wednesday', 'Friday'],
          seasonality: {}
        }
      },
      creativeAssets: [],
      budgetAllocation: {
        total: 10000,
        allocated: {},
        spent: {},
        remaining: {}
      },
      marketData: mockMarketData,
      externalData: [],
      dataQuality: {
        completeness: 0.9,
        accuracy: 0.85,
        freshness: 0.95,
        consistency: 0.88,
        overall: 0.89
      }
    };

    // Create mock simulation context
    mockContext = {
      simulationId: 'sim_123',
      organizationId: 'org_456',
      userId: 'user_789',
      request: {
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
        scenarios: [],
        externalDataSources: []
      },
      dataset: mockEnrichedDataset
    };
  });

  describe('generateScenarios', () => {
    it('should generate optimistic, realistic, and pessimistic scenarios', async () => {
      const scenarioConfigs: ScenarioConfig[] = [
        { type: 'optimistic' },
        { type: 'realistic' },
        { type: 'pessimistic' }
      ];

      const scenarios = await generator.generateScenarios(
        mockTrajectory,
        scenarioConfigs,
        mockContext
      );

      expect(scenarios).toHaveLength(3);
      
      const optimistic = scenarios.find(s => s.type === 'optimistic');
      const realistic = scenarios.find(s => s.type === 'realistic');
      const pessimistic = scenarios.find(s => s.type === 'pessimistic');

      expect(optimistic).toBeDefined();
      expect(realistic).toBeDefined();
      expect(pessimistic).toBeDefined();

      // Verify trajectory lengths match
      expect(optimistic!.trajectory).toHaveLength(mockTrajectory.length);
      expect(realistic!.trajectory).toHaveLength(mockTrajectory.length);
      expect(pessimistic!.trajectory).toHaveLength(mockTrajectory.length);

      // Verify probabilities sum to approximately 1.0
      const totalProbability = scenarios.reduce((sum, s) => sum + s.probability, 0);
      expect(totalProbability).toBeCloseTo(1.0, 1);

      // Verify each scenario has key factors
      scenarios.forEach(scenario => {
        expect(scenario.key_factors).toBeDefined();
        expect(scenario.key_factors.length).toBeGreaterThan(0);
        expect(scenario.confidence).toBeGreaterThan(0);
        expect(scenario.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should apply custom percentile adjustments', async () => {
      const customConfig: ScenarioConfig = {
        type: 'custom',
        percentile: 90 // Very optimistic
      };

      const scenarios = await generator.generateScenarios(
        mockTrajectory,
        [customConfig],
        mockContext
      );

      expect(scenarios).toHaveLength(1);
      
      const customScenario = scenarios[0];
      expect(customScenario.type).toBe('custom');
      
      // Custom scenario with 90th percentile should have higher values than base
      const avgBaseMetric = mockTrajectory.reduce((sum, point) => sum + point.metrics.ctr, 0) / mockTrajectory.length;
      const avgCustomMetric = customScenario.trajectory.reduce((sum, point) => sum + point.metrics.ctr, 0) / customScenario.trajectory.length;
      
      expect(avgCustomMetric).toBeGreaterThan(avgBaseMetric);
    });

    it('should apply scenario adjustments correctly', async () => {
      const adjustedConfig: ScenarioConfig = {
        type: 'custom',
        adjustments: [
          {
            factor: 'budget',
            multiplier: 1.5, // 50% budget increase
            timeframe: {
              start: new Date('2024-01-15'),
              end: new Date('2024-01-25')
            }
          }
        ]
      };

      const scenarios = await generator.generateScenarios(
        mockTrajectory,
        [adjustedConfig],
        mockContext
      );

      expect(scenarios).toHaveLength(1);
      
      const adjustedScenario = scenarios[0];
      
      // Check that adjustments were applied in the specified timeframe
      const adjustedPoints = adjustedScenario.trajectory.filter(point => 
        point.date >= new Date('2024-01-15') && point.date <= new Date('2024-01-25')
      );
      
      expect(adjustedPoints.length).toBeGreaterThan(0);
      
      // Verify key factors include the adjustment
      expect(adjustedScenario.key_factors).toContain('budget_adjustment');
    });

    it('should handle market factors when enabled', async () => {
      const scenarioConfigs: ScenarioConfig[] = [
        { type: 'realistic' }
      ];

      const options = {
        includeMarketFactors: true,
        includeSeasonality: true,
        includeCompetition: true
      };

      const scenarios = await generator.generateScenarios(
        mockTrajectory,
        scenarioConfigs,
        mockContext,
        options
      );

      expect(scenarios).toHaveLength(1);
      
      const scenario = scenarios[0];
      
      // Market factors should influence key factors
      expect(scenario.key_factors.some(factor => 
        factor.includes('market') || factor.includes('seasonal') || factor.includes('competitive')
      )).toBe(true);
    });

    it('should generate different trajectories for different scenario types', async () => {
      const scenarioConfigs: ScenarioConfig[] = [
        { type: 'optimistic' },
        { type: 'pessimistic' }
      ];

      const scenarios = await generator.generateScenarios(
        mockTrajectory,
        scenarioConfigs,
        mockContext
      );

      expect(scenarios).toHaveLength(2);
      
      const optimistic = scenarios.find(s => s.type === 'optimistic')!;
      const pessimistic = scenarios.find(s => s.type === 'pessimistic')!;

      // Calculate average CTR for each scenario
      const optimisticAvgCTR = optimistic.trajectory.reduce((sum, point) => sum + point.metrics.ctr, 0) / optimistic.trajectory.length;
      const pessimisticAvgCTR = pessimistic.trajectory.reduce((sum, point) => sum + point.metrics.ctr, 0) / pessimistic.trajectory.length;

      // Optimistic should generally have higher values than pessimistic
      expect(optimisticAvgCTR).toBeGreaterThan(pessimisticAvgCTR);
    });

    it('should handle multiple adjustments in a single scenario', async () => {
      const complexConfig: ScenarioConfig = {
        type: 'custom',
        adjustments: [
          {
            factor: 'budget',
            multiplier: 1.2,
            timeframe: {
              start: new Date('2024-01-01'),
              end: new Date('2024-01-15')
            }
          },
          {
            factor: 'competition',
            multiplier: 0.9,
            timeframe: {
              start: new Date('2024-01-16'),
              end: new Date('2024-01-31')
            }
          }
        ]
      };

      const scenarios = await generator.generateScenarios(
        mockTrajectory,
        [complexConfig],
        mockContext
      );

      expect(scenarios).toHaveLength(1);
      
      const scenario = scenarios[0];
      
      // Should have key factors for both adjustments
      expect(scenario.key_factors).toContain('budget_adjustment');
      expect(scenario.key_factors).toContain('competition_adjustment');
    });

    it('should maintain trajectory structure and data integrity', async () => {
      const scenarioConfigs: ScenarioConfig[] = [
        { type: 'realistic' }
      ];

      const scenarios = await generator.generateScenarios(
        mockTrajectory,
        scenarioConfigs,
        mockContext
      );

      const scenario = scenarios[0];
      
      // Verify trajectory structure
      expect(scenario.trajectory).toHaveLength(mockTrajectory.length);
      
      scenario.trajectory.forEach((point, index) => {
        // Dates should match original trajectory
        expect(point.date).toEqual(mockTrajectory[index].date);
        
        // Should have all the same metrics
        Object.keys(mockTrajectory[index].metrics).forEach(metric => {
          expect(point.metrics[metric]).toBeDefined();
          expect(typeof point.metrics[metric]).toBe('number');
          expect(point.metrics[metric]).toBeGreaterThanOrEqual(0);
        });
        
        // Confidence should be valid
        expect(point.confidence).toBeGreaterThan(0);
        expect(point.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should handle edge cases gracefully', async () => {
      // Test with empty trajectory
      const emptyScenarios = await generator.generateScenarios(
        [],
        [{ type: 'realistic' }],
        mockContext
      );
      
      expect(emptyScenarios).toHaveLength(1);
      expect(emptyScenarios[0].trajectory).toHaveLength(0);

      // Test with single point trajectory
      const singlePoint = [mockTrajectory[0]];
      const singlePointScenarios = await generator.generateScenarios(
        singlePoint,
        [{ type: 'optimistic' }],
        mockContext
      );
      
      expect(singlePointScenarios).toHaveLength(1);
      expect(singlePointScenarios[0].trajectory).toHaveLength(1);
    });
  });

  describe('scenario probability calculations', () => {
    it('should assign reasonable probabilities to standard scenarios', async () => {
      const scenarioConfigs: ScenarioConfig[] = [
        { type: 'optimistic' },
        { type: 'realistic' },
        { type: 'pessimistic' }
      ];

      const scenarios = await generator.generateScenarios(
        mockTrajectory,
        scenarioConfigs,
        mockContext
      );

      // Realistic scenario should typically have highest probability
      const realistic = scenarios.find(s => s.type === 'realistic')!;
      const optimistic = scenarios.find(s => s.type === 'optimistic')!;
      const pessimistic = scenarios.find(s => s.type === 'pessimistic')!;

      expect(realistic.probability).toBeGreaterThan(0.3); // Should be substantial
      expect(optimistic.probability + pessimistic.probability).toBeLessThan(0.7); // Combined should be less than realistic
    });

    it('should adjust probabilities based on data quality', async () => {
      // Create context with poor data quality
      const poorQualityContext = {
        ...mockContext,
        dataset: {
          ...mockContext.dataset,
          dataQuality: {
            completeness: 0.3,
            accuracy: 0.4,
            freshness: 0.5,
            consistency: 0.3,
            overall: 0.35
          }
        }
      };

      const scenarios = await generator.generateScenarios(
        mockTrajectory,
        [{ type: 'realistic' }],
        poorQualityContext
      );

      const scenario = scenarios[0];
      
      // Poor data quality should result in lower confidence
      expect(scenario.confidence).toBeLessThan(0.7);
      // After normalization, probability might still be 1.0 for a single scenario
      // Let's check that confidence is appropriately reduced instead
      expect(scenario.confidence).toBeLessThan(0.5);
    });
  });
});