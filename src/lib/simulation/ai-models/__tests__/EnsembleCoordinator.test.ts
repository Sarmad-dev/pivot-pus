/**
 * Unit tests for Ensemble Coordinator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnsembleCoordinator } from '../EnsembleCoordinator';
import { ModelPrediction } from '../../../../types/simulation';
import { SimulationError } from '../../errors';

describe('EnsembleCoordinator', () => {
  let coordinator: EnsembleCoordinator;
  let mockPredictions: ModelPrediction[];

  beforeEach(() => {
    coordinator = new EnsembleCoordinator({
      models: [
        { name: 'openai', weight: 0.4, confidenceWeight: 0.3, enabled: true, fallbackPriority: 1 },
        { name: 'huggingface', weight: 0.6, confidenceWeight: 0.7, enabled: true, fallbackPriority: 2 }
      ],
      weightingStrategy: 'dynamic',
      confidenceThreshold: 0.6,
      fallbackStrategy: 'weighted_average'
    });

    mockPredictions = [
      {
        modelName: 'openai',
        prediction: {
          trajectories: [
            {
              date: new Date('2024-01-01'),
              metrics: { ctr: 0.045, impressions: 10000 },
              confidence: 0.8
            },
            {
              date: new Date('2024-01-02'),
              metrics: { ctr: 0.048, impressions: 11000 },
              confidence: 0.82
            }
          ],
          confidence_intervals: [
            { lower: 0.04, upper: 0.05, confidence_level: 0.8 },
            { lower: 0.043, upper: 0.053, confidence_level: 0.82 }
          ],
          feature_importance: [
            { feature: 'historical_performance', importance: 0.4, category: 'campaign' },
            { feature: 'budget', importance: 0.3, category: 'campaign' },
            { feature: 'seasonality', importance: 0.3, category: 'temporal' }
          ],
          model_metadata: {
            model_name: 'OpenAI-GPT-4o',
            model_version: '1.0.0',
            confidence_score: 0.81,
            processing_time: 2500,
            data_quality: {
              completeness: 0.9,
              accuracy: 0.85,
              freshness: 0.8,
              consistency: 0.88,
              overall: 0.86
            },
            feature_count: 8,
            prediction_horizon: 30
          }
        },
        weight: 0.4,
        confidence: 0.81,
        processingTime: 2500
      },
      {
        modelName: 'huggingface',
        prediction: {
          trajectories: [
            {
              date: new Date('2024-01-01'),
              metrics: { ctr: 0.046, impressions: 10200 },
              confidence: 0.75
            },
            {
              date: new Date('2024-01-02'),
              metrics: { ctr: 0.049, impressions: 11200 },
              confidence: 0.78
            }
          ],
          confidence_intervals: [
            { lower: 0.041, upper: 0.051, confidence_level: 0.75 },
            { lower: 0.044, upper: 0.054, confidence_level: 0.78 }
          ],
          feature_importance: [
            { feature: 'historical_performance', importance: 0.35, category: 'campaign' },
            { feature: 'market_volatility', importance: 0.25, category: 'market' },
            { feature: 'audience_size', importance: 0.4, category: 'campaign' }
          ],
          model_metadata: {
            model_name: 'HuggingFace-Ensemble',
            model_version: '1.0.0',
            confidence_score: 0.765,
            processing_time: 3200,
            data_quality: {
              completeness: 0.9,
              accuracy: 0.85,
              freshness: 0.8,
              consistency: 0.88,
              overall: 0.86
            },
            feature_count: 10,
            prediction_horizon: 30
          }
        },
        weight: 0.6,
        confidence: 0.765,
        processingTime: 3200
      }
    ];
  });

  describe('combineModels', () => {
    it('should combine multiple model predictions successfully', async () => {
      const result = await coordinator.combineModels(mockPredictions);

      expect(result.trajectories).toHaveLength(2);
      expect(result.confidence_intervals).toHaveLength(2);
      expect(result.feature_importance.length).toBeGreaterThan(0);
      expect(result.model_metadata.model_name).toBe('Ensemble');
    });

    it('should throw error when no predictions provided', async () => {
      await expect(coordinator.combineModels([])).rejects.toThrow(SimulationError);
    });

    it('should filter out low-confidence predictions', async () => {
      const lowConfidencePredictions = mockPredictions.map(p => ({
        ...p,
        confidence: 0.3 // Below threshold of 0.6
      }));

      await expect(coordinator.combineModels(lowConfidencePredictions))
        .rejects.toThrow(SimulationError);
    });

    it('should filter out disabled models', async () => {
      const coordinatorWithDisabledModel = new EnsembleCoordinator({
        models: [
          { name: 'openai', weight: 0.5, confidenceWeight: 0.5, enabled: false, fallbackPriority: 1 },
          { name: 'huggingface', weight: 0.5, confidenceWeight: 0.5, enabled: true, fallbackPriority: 2 }
        ],
        weightingStrategy: 'static',
        confidenceThreshold: 0.6,
        fallbackStrategy: 'weighted_average'
      });

      const result = await coordinatorWithDisabledModel.combineModels(mockPredictions);

      // Should only use huggingface model
      expect(result.trajectories).toHaveLength(2);
      expect(result.trajectories[0].metrics.ctr).toBeCloseTo(0.046, 3);
    });
  });

  describe('calculateDynamicWeights', () => {
    it('should calculate static weights from configuration', () => {
      const staticCoordinator = new EnsembleCoordinator({
        models: [
          { name: 'openai', weight: 0.3, confidenceWeight: 0.5, enabled: true, fallbackPriority: 1 },
          { name: 'huggingface', weight: 0.7, confidenceWeight: 0.5, enabled: true, fallbackPriority: 2 }
        ],
        weightingStrategy: 'static',
        confidenceThreshold: 0.6,
        fallbackStrategy: 'weighted_average'
      });

      const weights = (staticCoordinator as any).calculateDynamicWeights(mockPredictions);

      expect(weights.openai).toBeCloseTo(0.3, 2);
      expect(weights.huggingface).toBeCloseTo(0.7, 2);
    });

    it('should calculate confidence-based weights', () => {
      const confidenceCoordinator = new EnsembleCoordinator({
        models: [],
        weightingStrategy: 'confidence_based',
        confidenceThreshold: 0.6,
        fallbackStrategy: 'weighted_average'
      });

      const weights = (confidenceCoordinator as any).calculateDynamicWeights(mockPredictions);

      // Higher confidence model should get higher weight
      expect(weights.openai).toBeGreaterThan(weights.huggingface);
    });

    it('should calculate performance-based weights', () => {
      const performanceCoordinator = new EnsembleCoordinator({
        models: [],
        weightingStrategy: 'performance_based',
        confidenceThreshold: 0.6,
        fallbackStrategy: 'weighted_average'
      });

      // Set some performance history
      (performanceCoordinator as any).modelPerformanceHistory.set('openai', [0.9, 0.85, 0.88]);
      (performanceCoordinator as any).modelPerformanceHistory.set('huggingface', [0.7, 0.75, 0.72]);

      const weights = (performanceCoordinator as any).calculateDynamicWeights(mockPredictions);

      // Better performing model should get higher weight
      expect(weights.openai).toBeGreaterThan(weights.huggingface);
    });

    it('should handle equal weights when no performance history', () => {
      const performanceCoordinator = new EnsembleCoordinator({
        models: [],
        weightingStrategy: 'performance_based',
        confidenceThreshold: 0.6,
        fallbackStrategy: 'weighted_average'
      });

      const weights = (performanceCoordinator as any).calculateDynamicWeights(mockPredictions);

      // Should default to equal weights
      expect(weights.openai).toBeCloseTo(0.5, 1);
      expect(weights.huggingface).toBeCloseTo(0.5, 1);
    });
  });

  describe('combineTrajectories', () => {
    it('should combine trajectories using weighted ensemble', () => {
      const weights = { openai: 0.4, huggingface: 0.6 };
      const trajectories = (coordinator as any).combineTrajectories(mockPredictions, weights);

      expect(trajectories).toHaveLength(2);
      
      // First trajectory point should be weighted average
      const expectedCTR = (0.045 * 0.4) + (0.046 * 0.6);
      expect(trajectories[0].metrics.ctr).toBeCloseTo(expectedCTR, 4);
      
      const expectedImpressions = (10000 * 0.4) + (10200 * 0.6);
      expect(trajectories[0].metrics.impressions).toBeCloseTo(expectedImpressions, 1);
    });

    it('should handle missing trajectory points gracefully', () => {
      const predictionsWithMissingData = [
        mockPredictions[0], // Has 2 trajectory points
        {
          ...mockPredictions[1],
          prediction: {
            ...mockPredictions[1].prediction,
            trajectories: [mockPredictions[1].prediction.trajectories[0]] // Only 1 trajectory point
          }
        }
      ];

      const weights = { openai: 0.5, huggingface: 0.5 };
      const trajectories = (coordinator as any).combineTrajectories(predictionsWithMissingData, weights);

      expect(trajectories).toHaveLength(2);
      expect(trajectories[1]).toBeDefined(); // Should still create second point from available data
    });
  });

  describe('combineConfidenceIntervals', () => {
    it('should combine confidence intervals using weighted average', () => {
      const weights = { openai: 0.4, huggingface: 0.6 };
      const intervals = (coordinator as any).combineConfidenceIntervals(mockPredictions, weights);

      expect(intervals).toHaveLength(2);
      
      // First interval should be weighted average
      const expectedLower = (0.04 * 0.4) + (0.041 * 0.6);
      const expectedUpper = (0.05 * 0.4) + (0.051 * 0.6);
      
      expect(intervals[0].lower).toBeCloseTo(expectedLower, 4);
      expect(intervals[0].upper).toBeCloseTo(expectedUpper, 4);
    });
  });

  describe('aggregateFeatureImportance', () => {
    it('should aggregate feature importance across models', () => {
      const weights = { openai: 0.4, huggingface: 0.6 };
      const importance = (coordinator as any).aggregateFeatureImportance(mockPredictions, weights);

      expect(importance.length).toBeGreaterThan(0);
      
      // Should include features from both models
      const featureNames = importance.map((f: any) => f.feature);
      expect(featureNames).toContain('historical_performance');
      expect(featureNames).toContain('budget');
      expect(featureNames).toContain('market_volatility');
      expect(featureNames).toContain('audience_size');

      // Importance scores should sum to 1
      const totalImportance = importance.reduce((sum: number, f: any) => sum + f.importance, 0);
      expect(totalImportance).toBeCloseTo(1, 2);
    });

    it('should sort features by importance', () => {
      const weights = { openai: 0.4, huggingface: 0.6 };
      const importance = (coordinator as any).aggregateFeatureImportance(mockPredictions, weights);

      for (let i = 1; i < importance.length; i++) {
        expect(importance[i - 1].importance).toBeGreaterThanOrEqual(importance[i].importance);
      }
    });
  });

  describe('calculateConsensusScore', () => {
    it('should calculate agreement between models', () => {
      const consensusScore = (coordinator as any).calculateConsensusScore(mockPredictions);

      expect(consensusScore).toBeGreaterThan(0);
      expect(consensusScore).toBeLessThanOrEqual(1);
    });

    it('should return 1.0 for single model', () => {
      const singlePrediction = [mockPredictions[0]];
      const consensusScore = (coordinator as any).calculateConsensusScore(singlePrediction);

      expect(consensusScore).toBe(1.0);
    });
  });

  describe('calculateDiversityScore', () => {
    it('should calculate diversity as inverse of consensus', () => {
      const diversityScore = (coordinator as any).calculateDiversityScore(mockPredictions);

      expect(diversityScore).toBeGreaterThanOrEqual(0);
      expect(diversityScore).toBeLessThanOrEqual(1);
    });

    it('should return 0 for single model', () => {
      const singlePrediction = [mockPredictions[0]];
      const diversityScore = (coordinator as any).calculateDiversityScore(singlePrediction);

      expect(diversityScore).toBe(0);
    });
  });

  describe('updateModelPerformance', () => {
    it('should update model performance history', () => {
      coordinator.updateModelPerformance('openai', 0.9);
      coordinator.updateModelPerformance('openai', 0.85);

      const history = (coordinator as any).modelPerformanceHistory.get('openai');
      expect(history).toEqual([0.9, 0.85]);
    });

    it('should limit performance history to 10 entries', () => {
      // Add 12 performance scores
      for (let i = 0; i < 12; i++) {
        coordinator.updateModelPerformance('openai', 0.8 + (i * 0.01));
      }

      const history = (coordinator as any).modelPerformanceHistory.get('openai');
      expect(history).toHaveLength(10);
      expect(history[0]).toBeCloseTo(0.82, 2); // Should have removed first two entries
    });
  });

  describe('getEnsembleMetrics', () => {
    it('should return comprehensive ensemble metrics', () => {
      const weights = { openai: 0.4, huggingface: 0.6 };
      const metrics = coordinator.getEnsembleMetrics(mockPredictions, weights);

      expect(metrics.totalModels).toBe(2);
      expect(metrics.activeModels).toBe(2);
      expect(metrics.averageConfidence).toBeCloseTo(0.7875, 3);
      expect(metrics.weightDistribution).toEqual(weights);
      expect(metrics.consensusScore).toBeGreaterThan(0);
      expect(metrics.diversityScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('resetPerformanceHistory', () => {
    it('should clear all performance history', () => {
      coordinator.updateModelPerformance('openai', 0.9);
      coordinator.updateModelPerformance('huggingface', 0.8);

      coordinator.resetPerformanceHistory();

      const openaiHistory = (coordinator as any).modelPerformanceHistory.get('openai');
      const hfHistory = (coordinator as any).modelPerformanceHistory.get('huggingface');

      expect(openaiHistory).toBeUndefined();
      expect(hfHistory).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle predictions with different metric sets', async () => {
      const predictionsWithDifferentMetrics = [
        {
          ...mockPredictions[0],
          prediction: {
            ...mockPredictions[0].prediction,
            trajectories: [
              {
                date: new Date('2024-01-01'),
                metrics: { ctr: 0.045, impressions: 10000 },
                confidence: 0.8
              }
            ]
          }
        },
        {
          ...mockPredictions[1],
          prediction: {
            ...mockPredictions[1].prediction,
            trajectories: [
              {
                date: new Date('2024-01-01'),
                metrics: { ctr: 0.046, engagement: 0.65 }, // Different metric set
                confidence: 0.75
              }
            ]
          }
        }
      ];

      const result = await coordinator.combineModels(predictionsWithDifferentMetrics);

      expect(result.trajectories).toHaveLength(1);
      expect(result.trajectories[0].metrics).toHaveProperty('ctr');
      expect(result.trajectories[0].metrics).toHaveProperty('impressions');
      expect(result.trajectories[0].metrics).toHaveProperty('engagement');
    });

    it('should handle empty trajectory arrays', async () => {
      const predictionsWithEmptyTrajectories = [
        {
          ...mockPredictions[0],
          prediction: {
            ...mockPredictions[0].prediction,
            trajectories: []
          }
        }
      ];

      await expect(coordinator.combineModels(predictionsWithEmptyTrajectories))
        .rejects.toThrow(SimulationError);
    });
  });
});