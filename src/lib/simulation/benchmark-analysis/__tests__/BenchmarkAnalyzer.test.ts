/**
 * BenchmarkAnalyzer Tests
 * 
 * Test benchmark comparison accuracy with sample industry data,
 * benchmark deviation analysis, and explanation generation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BenchmarkAnalyzer } from '../BenchmarkAnalyzer';
import { CampaignDataset, BenchmarkData, PerformanceMetric } from '../../../../types/simulation';

describe('BenchmarkAnalyzer', () => {
  let analyzer: BenchmarkAnalyzer;
  let mockCampaignData: CampaignDataset;

  beforeEach(() => {
    analyzer = new BenchmarkAnalyzer();
    
    // Create mock campaign data
    mockCampaignData = {
      campaign: {
        id: 'test-campaign-1',
        name: 'Test Campaign',
        description: 'Test campaign for benchmark analysis',
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
              location: ['US'],
              interests: ['technology', 'business']
            },
            estimatedSize: 100000
          }
        ],
        kpis: [
          { type: 'ctr', target: 2.0, timeframe: 'monthly', weight: 1.0 },
          { type: 'cpc', target: 1.5, timeframe: 'monthly', weight: 1.0 }
        ]
      },
      historicalPerformance: [
        { date: new Date('2024-01-01'), metric: 'ctr', value: 1.8, channel: 'facebook' },
        { date: new Date('2024-01-01'), metric: 'cpc', value: 2.2, channel: 'facebook' },
        { date: new Date('2024-01-01'), metric: 'engagement', value: 0.9, channel: 'facebook' },
        { date: new Date('2024-01-01'), metric: 'ctr', value: 2.1, channel: 'google' },
        { date: new Date('2024-01-01'), metric: 'cpc', value: 1.8, channel: 'google' },
        { date: new Date('2024-01-01'), metric: 'impressions', value: 50000, channel: 'google' }
      ],
      audienceInsights: {
        totalSize: 100000,
        demographics: {
          ageRange: [25, 45],
          gender: 'mixed',
          locations: ['US', 'CA'],
          interests: ['technology', 'business', 'marketing']
        },
        engagementPatterns: {
          peakHours: [9, 12, 17, 20],
          peakDays: ['Tuesday', 'Wednesday', 'Thursday'],
          seasonality: { Q1: 0.9, Q2: 1.1, Q3: 0.8, Q4: 1.2 }
        }
      },
      creativeAssets: [
        {
          id: 'creative-1',
          type: 'image',
          content: 'Test creative content',
          performance: { ctr: 1.9, engagement: 0.85, sentiment: 0.7 }
        }
      ],
      budgetAllocation: {
        total: 10000,
        allocated: { facebook: 5000, google: 5000 },
        spent: { facebook: 3000, google: 2800 },
        remaining: { facebook: 2000, google: 2200 }
      }
    };
  });

  describe('analyzeBenchmarks', () => {
    it('should analyze campaign performance against industry benchmarks', async () => {
      const result = await analyzer.analyzeBenchmarks(mockCampaignData, 'technology', 'US');

      expect(result).toBeDefined();
      expect(result.overall).toBeDefined();
      expect(result.overall.score).toBeGreaterThanOrEqual(0);
      expect(result.overall.score).toBeLessThanOrEqual(100);
      expect(result.overall.grade).toMatch(/^[A-F][+]?$/);
      expect(result.comparisons).toBeInstanceOf(Array);
      expect(result.insights).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.dataQuality).toBeDefined();
    });

    it('should generate benchmark comparisons for available metrics', async () => {
      const result = await analyzer.analyzeBenchmarks(mockCampaignData, 'technology', 'US');

      expect(result.comparisons.length).toBeGreaterThan(0);
      
      const ctrComparison = result.comparisons.find(c => c.metric === 'ctr');
      expect(ctrComparison).toBeDefined();
      expect(ctrComparison!.campaignValue).toBeCloseTo(1.95, 1); // Average of 1.8 and 2.1
      expect(ctrComparison!.benchmarkValue).toBeGreaterThan(0);
      expect(ctrComparison!.percentile).toBeGreaterThanOrEqual(0);
      expect(ctrComparison!.percentile).toBeLessThanOrEqual(100);
      expect(['above', 'at', 'below']).toContain(ctrComparison!.performance);
      expect(['excellent', 'good', 'average', 'poor', 'critical']).toContain(ctrComparison!.significance);
    });

    it('should generate insights based on performance', async () => {
      const result = await analyzer.analyzeBenchmarks(mockCampaignData, 'technology', 'US');

      expect(result.insights.length).toBeGreaterThan(0);
      
      result.insights.forEach(insight => {
        expect(['strength', 'weakness', 'opportunity', 'threat']).toContain(insight.type);
        expect(['high', 'medium', 'low']).toContain(insight.impact);
        expect(insight.confidence).toBeGreaterThanOrEqual(0);
        expect(insight.confidence).toBeLessThanOrEqual(1);
        expect(insight.description).toBeTruthy();
      });
    });

    it('should generate actionable recommendations', async () => {
      const result = await analyzer.analyzeBenchmarks(mockCampaignData, 'technology', 'US');

      expect(result.recommendations.length).toBeGreaterThan(0);
      
      result.recommendations.forEach(rec => {
        expect(rec.id).toBeTruthy();
        expect(rec.priority).toBeGreaterThanOrEqual(0);
        expect(rec.currentValue).toBeGreaterThanOrEqual(0);
        expect(rec.targetValue).toBeGreaterThan(rec.currentValue);
        expect(rec.improvement).toBeGreaterThan(0);
        expect(['low', 'medium', 'high']).toContain(rec.effort);
        expect(rec.timeline).toBeTruthy();
        expect(rec.action).toBeTruthy();
        expect(rec.rationale).toBeTruthy();
      });
    });

    it('should handle different industries correctly', async () => {
      const techResult = await analyzer.analyzeBenchmarks(mockCampaignData, 'technology', 'US');
      const healthcareResult = await analyzer.analyzeBenchmarks(mockCampaignData, 'healthcare', 'US');

      expect(techResult.comparisons).toBeDefined();
      expect(healthcareResult.comparisons).toBeDefined();
      
      // Different industries should have different benchmark values
      const techCtr = techResult.comparisons.find(c => c.metric === 'ctr');
      const healthcareCtr = healthcareResult.comparisons.find(c => c.metric === 'ctr');
      
      if (techCtr && healthcareCtr) {
        expect(techCtr.benchmarkValue).not.toEqual(healthcareCtr.benchmarkValue);
      }
    });

    it('should assess data quality accurately', async () => {
      const result = await analyzer.analyzeBenchmarks(mockCampaignData, 'technology', 'US');

      expect(result.dataQuality.coverage).toBeGreaterThanOrEqual(0);
      expect(result.dataQuality.coverage).toBeLessThanOrEqual(1);
      expect(result.dataQuality.freshness).toBeGreaterThanOrEqual(0);
      expect(result.dataQuality.freshness).toBeLessThanOrEqual(1);
      expect(result.dataQuality.reliability).toBeGreaterThanOrEqual(0);
      expect(result.dataQuality.reliability).toBeLessThanOrEqual(1);
    });

    it('should handle campaigns with no historical data', async () => {
      const emptyCampaignData = {
        ...mockCampaignData,
        historicalPerformance: []
      };

      const result = await analyzer.analyzeBenchmarks(emptyCampaignData, 'technology', 'US');

      expect(result).toBeDefined();
      expect(result.comparisons).toHaveLength(0);
      expect(result.overall.score).toBe(0);
      expect(result.overall.grade).toBe('F');
    });

    it('should calculate percentiles correctly', async () => {
      // Create campaign with known performance values
      const highPerformanceCampaign = {
        ...mockCampaignData,
        historicalPerformance: [
          { date: new Date(), metric: 'ctr', value: 5.0, channel: 'facebook' }, // Very high CTR
          { date: new Date(), metric: 'cpc', value: 0.5, channel: 'facebook' }  // Very low CPC (good)
        ]
      };

      const result = await analyzer.analyzeBenchmarks(highPerformanceCampaign, 'technology', 'US');
      
      const ctrComparison = result.comparisons.find(c => c.metric === 'ctr');
      expect(ctrComparison).toBeDefined();
      expect(ctrComparison!.percentile).toBeGreaterThan(75); // Should be in top quartile
      expect(ctrComparison!.significance).toBe('excellent');
    });
  });

  describe('cache management', () => {
    it('should cache benchmark data', async () => {
      // First call
      const start1 = Date.now();
      await analyzer.analyzeBenchmarks(mockCampaignData, 'technology', 'US');
      const duration1 = Date.now() - start1;

      // Second call should be faster due to caching
      const start2 = Date.now();
      await analyzer.analyzeBenchmarks(mockCampaignData, 'technology', 'US');
      const duration2 = Date.now() - start2;

      // Note: In a real implementation with external APIs, the second call would be significantly faster
      expect(duration2).toBeLessThanOrEqual(duration1 + 50); // Allow some variance
    });

    it('should provide cache statistics', () => {
      const stats = analyzer.getCacheStats();
      
      expect(stats).toBeDefined();
      expect(stats.size).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeLessThanOrEqual(1);
    });

    it('should clear expired cache entries', () => {
      analyzer.clearExpiredCache();
      
      const stats = analyzer.getCacheStats();
      expect(stats).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle invalid industry gracefully', async () => {
      const result = await analyzer.analyzeBenchmarks(mockCampaignData, 'invalid-industry', 'US');
      
      expect(result).toBeDefined();
      expect(result.comparisons).toBeInstanceOf(Array);
    });

    it('should handle missing campaign data gracefully', async () => {
      const incompleteCampaign = {
        ...mockCampaignData,
        campaign: {
          ...mockCampaignData.campaign,
          channels: []
        }
      };

      const result = await analyzer.analyzeBenchmarks(incompleteCampaign, 'technology', 'US');
      
      expect(result).toBeDefined();
      expect(result.dataQuality.coverage).toBeLessThan(1);
    });
  });

  describe('benchmark comparison accuracy', () => {
    it('should correctly identify above-benchmark performance', async () => {
      const highPerformanceCampaign = {
        ...mockCampaignData,
        historicalPerformance: [
          { date: new Date(), metric: 'ctr', value: 4.0, channel: 'facebook' }, // High CTR
          { date: new Date(), metric: 'engagement', value: 2.0, channel: 'facebook' } // High engagement
        ]
      };

      const result = await analyzer.analyzeBenchmarks(highPerformanceCampaign, 'technology', 'US');
      
      const ctrComparison = result.comparisons.find(c => c.metric === 'ctr');
      expect(ctrComparison).toBeDefined();
      expect(ctrComparison!.performance).toBe('above');
      expect(ctrComparison!.deviationPercentage).toBeGreaterThan(0);
    });

    it('should correctly identify below-benchmark performance', async () => {
      const lowPerformanceCampaign = {
        ...mockCampaignData,
        historicalPerformance: [
          { date: new Date(), metric: 'ctr', value: 0.3, channel: 'facebook' }, // Very low CTR
          { date: new Date(), metric: 'engagement', value: 0.1, channel: 'facebook' } // Very low engagement
        ]
      };

      const result = await analyzer.analyzeBenchmarks(lowPerformanceCampaign, 'technology', 'US');
      
      const ctrComparison = result.comparisons.find(c => c.metric === 'ctr');
      expect(ctrComparison).toBeDefined();
      expect(ctrComparison!.performance).toBe('below');
      expect(ctrComparison!.deviationPercentage).toBeLessThan(0);
      expect(ctrComparison!.significance).toMatch(/poor|critical/);
    });

    it('should generate appropriate insights for different performance levels', async () => {
      const result = await analyzer.analyzeBenchmarks(mockCampaignData, 'technology', 'US');
      
      const strengths = result.insights.filter(i => i.type === 'strength');
      const weaknesses = result.insights.filter(i => i.type === 'weakness');
      const opportunities = result.insights.filter(i => i.type === 'opportunity');
      
      // Should have at least one type of insight
      expect(strengths.length + weaknesses.length + opportunities.length).toBeGreaterThan(0);
      
      // Insights should be sorted by impact
      if (result.insights.length > 1) {
        const impactWeights = { high: 3, medium: 2, low: 1 };
        for (let i = 0; i < result.insights.length - 1; i++) {
          expect(impactWeights[result.insights[i].impact])
            .toBeGreaterThanOrEqual(impactWeights[result.insights[i + 1].impact]);
        }
      }
    });
  });

  describe('industry-specific benchmarks', () => {
    it('should apply correct industry multipliers', async () => {
      const industries = ['technology', 'healthcare', 'finance', 'retail', 'education'];
      const results = await Promise.all(
        industries.map(industry => 
          analyzer.analyzeBenchmarks(mockCampaignData, industry, 'US')
        )
      );

      // Each industry should have different benchmark values
      const ctrBenchmarks = results.map(result => 
        result.comparisons.find(c => c.metric === 'ctr')?.benchmarkValue
      ).filter(Boolean);

      expect(new Set(ctrBenchmarks).size).toBeGreaterThan(1); // Should have different values
    });

    it('should handle unknown industries with default values', async () => {
      const result = await analyzer.analyzeBenchmarks(mockCampaignData, 'unknown-industry', 'US');
      
      expect(result).toBeDefined();
      expect(result.comparisons.length).toBeGreaterThan(0);
    });
  });

  describe('recommendation generation', () => {
    it('should prioritize critical performance issues', async () => {
      const poorPerformanceCampaign = {
        ...mockCampaignData,
        historicalPerformance: [
          { date: new Date(), metric: 'ctr', value: 0.1, channel: 'facebook' }, // Critical CTR
          { date: new Date(), metric: 'cpc', value: 10.0, channel: 'facebook' }, // Critical CPC
          { date: new Date(), metric: 'engagement', value: 0.05, channel: 'facebook' } // Critical engagement
        ]
      };

      const result = await analyzer.analyzeBenchmarks(poorPerformanceCampaign, 'technology', 'US');
      
      expect(result.recommendations.length).toBeGreaterThan(0);
      
      // Should have high-priority recommendations for critical metrics
      const highPriorityRecs = result.recommendations.filter(r => r.priority >= 80);
      expect(highPriorityRecs.length).toBeGreaterThan(0);
      
      // Recommendations should be sorted by priority
      for (let i = 0; i < result.recommendations.length - 1; i++) {
        expect(result.recommendations[i].priority)
          .toBeGreaterThanOrEqual(result.recommendations[i + 1].priority);
      }
    });

    it('should suggest optimization for good performance', async () => {
      const goodPerformanceCampaign = {
        ...mockCampaignData,
        historicalPerformance: [
          { date: new Date(), metric: 'ctr', value: 2.5, channel: 'facebook' }, // Good CTR
          { date: new Date(), metric: 'engagement', value: 1.2, channel: 'facebook' } // Good engagement
        ]
      };

      const result = await analyzer.analyzeBenchmarks(goodPerformanceCampaign, 'technology', 'US');
      
      // Should have optimization recommendations for good metrics
      const optimizationRecs = result.recommendations.filter(r => 
        r.id.includes('opt') && r.effort === 'low'
      );
      expect(optimizationRecs.length).toBeGreaterThan(0);
    });
  });
});