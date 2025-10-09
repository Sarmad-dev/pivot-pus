/**
 * Ensemble Coordinator for AI Model Integration
 * 
 * This module coordinates multiple AI model outputs to create
 * more accurate and robust predictions through ensemble methods.
 */

import { 
  PredictionOutput, 
  TrajectoryPoint, 
  ConfidenceInterval, 
  FeatureImportance, 
  ModelMetadata,
  EnrichedDataset
} from '../../../types/simulation';
import { SimulationError } from '../errors';

export interface EnsembleConfig {
  models: EnsembleModelConfig[];
  weightingStrategy: 'static' | 'dynamic' | 'confidence_based' | 'performance_based';
  confidenceThreshold: number;
  fallbackStrategy: 'best_model' | 'average' | 'weighted_average';
}

export interface EnsembleModelConfig {
  name: string;
  weight: number;
  confidenceWeight: number;
  enabled: boolean;
  fallbackPriority: number;
}

export interface ModelPrediction {
  modelName: string;
  prediction: PredictionOutput;
  weight: number;
  confidence: number;
  processingTime: number;
}

export interface EnsembleWeights {
  [modelName: string]: number;
}

export interface EnsembleMetrics {
  totalModels: number;
  activeModels: number;
  averageConfidence: number;
  weightDistribution: EnsembleWeights;
  consensusScore: number;
  diversityScore: number;
}

export class EnsembleCoordinator {
  private config: EnsembleConfig;
  private modelPerformanceHistory: Map<string, number[]> = new Map();

  constructor(config: EnsembleConfig) {
    this.config = {
      ...config,
      confidenceThreshold: config.confidenceThreshold || 0.6,
      fallbackStrategy: config.fallbackStrategy || 'weighted_average'
    };
  }

  /**
   * Combine multiple model predictions into a single ensemble prediction
   */
  async combineModels(predictions: ModelPrediction[], dataset?: EnrichedDataset): Promise<PredictionOutput> {
    if (predictions.length === 0) {
      throw new SimulationError(
        'No model predictions provided for ensemble',
        'validation_error',
        'NO_PREDICTIONS',
        false
      );
    }

    // Filter out low-confidence predictions
    const validPredictions = this.filterValidPredictions(predictions);
    
    if (validPredictions.length === 0) {
      throw new SimulationError(
        'No valid predictions meet confidence threshold',
        'insufficient_data',
        'LOW_CONFIDENCE_PREDICTIONS',
        false,
        { threshold: this.config.confidenceThreshold, totalPredictions: predictions.length }
      );
    }

    // Calculate dynamic weights based on strategy
    const weights = this.calculateDynamicWeights(validPredictions, dataset);

    // Combine trajectories using weighted ensemble
    const ensembleTrajectories = this.combineTrajectories(validPredictions, weights);

    // Combine confidence intervals
    const ensembleConfidenceIntervals = this.combineConfidenceIntervals(validPredictions, weights);

    // Aggregate feature importance
    const ensembleFeatureImportance = this.aggregateFeatureImportance(validPredictions, weights);

    // Calculate ensemble metadata
    const ensembleMetadata = this.calculateEnsembleMetadata(validPredictions, weights);

    return {
      trajectories: ensembleTrajectories,
      confidence_intervals: ensembleConfidenceIntervals,
      feature_importance: ensembleFeatureImportance,
      model_metadata: ensembleMetadata
    };
  }

  /**
   * Filter predictions based on confidence threshold and validity
   */
  private filterValidPredictions(predictions: ModelPrediction[]): ModelPrediction[] {
    return predictions.filter(prediction => {
      // Check if model is enabled in config
      const modelConfig = this.config.models.find(m => m.name === prediction.modelName);
      if (modelConfig && !modelConfig.enabled) {
        return false;
      }

      // Check confidence threshold
      if (prediction.confidence < this.config.confidenceThreshold) {
        return false;
      }

      // Check if prediction has valid trajectories
      if (!prediction.prediction.trajectories || prediction.prediction.trajectories.length === 0) {
        return false;
      }

      return true;
    });
  }

  /**
   * Calculate dynamic weights for ensemble based on configured strategy
   */
  private calculateDynamicWeights(predictions: ModelPrediction[], dataset?: EnrichedDataset): EnsembleWeights {
    const weights: EnsembleWeights = {};

    switch (this.config.weightingStrategy) {
      case 'static':
        return this.calculateStaticWeights(predictions);
      
      case 'confidence_based':
        return this.calculateConfidenceBasedWeights(predictions);
      
      case 'performance_based':
        return this.calculatePerformanceBasedWeights(predictions);
      
      case 'dynamic':
      default:
        return this.calculateDynamicAdaptiveWeights(predictions, dataset);
    }
  }

  /**
   * Calculate static weights from configuration
   */
  private calculateStaticWeights(predictions: ModelPrediction[]): EnsembleWeights {
    const weights: EnsembleWeights = {};
    let totalWeight = 0;

    predictions.forEach(prediction => {
      const modelConfig = this.config.models.find(m => m.name === prediction.modelName);
      const weight = modelConfig?.weight || 1;
      weights[prediction.modelName] = weight;
      totalWeight += weight;
    });

    // Normalize weights to sum to 1
    Object.keys(weights).forEach(modelName => {
      weights[modelName] = weights[modelName] / totalWeight;
    });

    return weights;
  }

  /**
   * Calculate weights based on model confidence scores
   */
  private calculateConfidenceBasedWeights(predictions: ModelPrediction[]): EnsembleWeights {
    const weights: EnsembleWeights = {};
    let totalConfidence = 0;

    // Calculate confidence-based weights
    predictions.forEach(prediction => {
      const confidence = prediction.confidence;
      weights[prediction.modelName] = confidence;
      totalConfidence += confidence;
    });

    // Normalize weights
    if (totalConfidence > 0) {
      Object.keys(weights).forEach(modelName => {
        weights[modelName] = weights[modelName] / totalConfidence;
      });
    } else {
      // Equal weights if no confidence information
      const equalWeight = 1 / predictions.length;
      predictions.forEach(prediction => {
        weights[prediction.modelName] = equalWeight;
      });
    }

    return weights;
  }

  /**
   * Calculate weights based on historical model performance
   */
  private calculatePerformanceBasedWeights(predictions: ModelPrediction[]): EnsembleWeights {
    const weights: EnsembleWeights = {};
    let totalPerformance = 0;

    predictions.forEach(prediction => {
      const performanceHistory = this.modelPerformanceHistory.get(prediction.modelName) || [0.5];
      const avgPerformance = performanceHistory.reduce((sum, perf) => sum + perf, 0) / performanceHistory.length;
      
      weights[prediction.modelName] = avgPerformance;
      totalPerformance += avgPerformance;
    });

    // Normalize weights
    if (totalPerformance > 0) {
      Object.keys(weights).forEach(modelName => {
        weights[modelName] = weights[modelName] / totalPerformance;
      });
    } else {
      // Fallback to equal weights
      const equalWeight = 1 / predictions.length;
      predictions.forEach(prediction => {
        weights[prediction.modelName] = equalWeight;
      });
    }

    return weights;
  }

  /**
   * Calculate adaptive weights considering multiple factors
   */
  private calculateDynamicAdaptiveWeights(predictions: ModelPrediction[], dataset?: EnrichedDataset): EnsembleWeights {
    const weights: EnsembleWeights = {};
    const factors: Record<string, number> = {};

    predictions.forEach(prediction => {
      let score = 0;

      // Factor 1: Model confidence (40% weight)
      score += prediction.confidence * 0.4;

      // Factor 2: Historical performance (30% weight)
      const performanceHistory = this.modelPerformanceHistory.get(prediction.modelName) || [0.5];
      const avgPerformance = performanceHistory.reduce((sum, perf) => sum + perf, 0) / performanceHistory.length;
      score += avgPerformance * 0.3;

      // Factor 3: Data quality compatibility (20% weight)
      if (dataset) {
        const dataQualityScore = this.calculateDataQualityCompatibility(prediction.modelName, dataset);
        score += dataQualityScore * 0.2;
      } else {
        score += 0.5 * 0.2; // Default score
      }

      // Factor 4: Processing efficiency (10% weight)
      const efficiencyScore = Math.max(0, 1 - (prediction.processingTime / 30000)); // Normalize to 30s max
      score += efficiencyScore * 0.1;

      factors[prediction.modelName] = score;
    });

    // Normalize to create weights
    const totalScore = Object.values(factors).reduce((sum, score) => sum + score, 0);
    
    if (totalScore > 0) {
      Object.keys(factors).forEach(modelName => {
        weights[modelName] = factors[modelName] / totalScore;
      });
    } else {
      // Fallback to equal weights
      const equalWeight = 1 / predictions.length;
      predictions.forEach(prediction => {
        weights[prediction.modelName] = equalWeight;
      });
    }

    return weights;
  }

  /**
   * Calculate how well a model performs with given data quality
   */
  private calculateDataQualityCompatibility(modelName: string, dataset: EnrichedDataset): number {
    const dataQuality = dataset.dataQuality;
    
    // Different models have different data quality requirements
    switch (modelName.toLowerCase()) {
      case 'openai':
      case 'gpt-4o':
        // GPT models are more robust to data quality issues
        return 0.3 + (dataQuality.overall * 0.7);
      
      case 'huggingface':
      case 'prophet':
      case 'lstm':
        // Time-series models need higher data quality
        return dataQuality.overall;
      
      default:
        return dataQuality.overall;
    }
  }

  /**
   * Combine trajectories from multiple models using weighted ensemble
   */
  private combineTrajectories(predictions: ModelPrediction[], weights: EnsembleWeights): TrajectoryPoint[] {
    if (predictions.length === 0) return [];

    // Find the maximum trajectory length
    const maxLength = Math.max(...predictions.map(p => p.prediction.trajectories.length));
    const ensembleTrajectories: TrajectoryPoint[] = [];

    for (let i = 0; i < maxLength; i++) {
      const trajectoryPoint = this.combineTrajectoryPoint(predictions, weights, i);
      if (trajectoryPoint) {
        ensembleTrajectories.push(trajectoryPoint);
      }
    }

    return ensembleTrajectories;
  }

  /**
   * Combine a single trajectory point from multiple models
   */
  private combineTrajectoryPoint(
    predictions: ModelPrediction[], 
    weights: EnsembleWeights, 
    index: number
  ): TrajectoryPoint | null {
    const validPoints: { point: TrajectoryPoint; weight: number }[] = [];
    let totalWeight = 0;

    // Collect valid trajectory points at this index
    predictions.forEach(prediction => {
      if (index < prediction.prediction.trajectories.length) {
        const point = prediction.prediction.trajectories[index];
        const weight = weights[prediction.modelName] || 0;
        validPoints.push({ point, weight });
        totalWeight += weight;
      }
    });

    if (validPoints.length === 0 || totalWeight === 0) {
      return null;
    }

    // Use the date from the first available point
    const date = validPoints[0].point.date;

    // Combine metrics using weighted average
    const combinedMetrics: Record<string, number> = {};
    const allMetricKeys = new Set<string>();

    // Collect all metric keys
    validPoints.forEach(({ point }) => {
      Object.keys(point.metrics).forEach(key => allMetricKeys.add(key));
    });

    // Calculate weighted average for each metric
    allMetricKeys.forEach(metricKey => {
      let weightedSum = 0;
      let metricTotalWeight = 0;

      validPoints.forEach(({ point, weight }) => {
        if (point.metrics[metricKey] !== undefined) {
          weightedSum += point.metrics[metricKey] * weight;
          metricTotalWeight += weight;
        }
      });

      if (metricTotalWeight > 0) {
        combinedMetrics[metricKey] = weightedSum / metricTotalWeight;
      }
    });

    // Calculate weighted average confidence
    const weightedConfidenceSum = validPoints.reduce(
      (sum, { point, weight }) => sum + (point.confidence * weight), 
      0
    );
    const combinedConfidence = weightedConfidenceSum / totalWeight;

    return {
      date,
      metrics: combinedMetrics,
      confidence: combinedConfidence
    };
  }

  /**
   * Combine confidence intervals from multiple models
   */
  private combineConfidenceIntervals(
    predictions: ModelPrediction[], 
    weights: EnsembleWeights
  ): ConfidenceInterval[] {
    if (predictions.length === 0) return [];

    const maxLength = Math.max(...predictions.map(p => p.prediction.confidence_intervals.length));
    const ensembleIntervals: ConfidenceInterval[] = [];

    for (let i = 0; i < maxLength; i++) {
      const interval = this.combineConfidenceInterval(predictions, weights, i);
      if (interval) {
        ensembleIntervals.push(interval);
      }
    }

    return ensembleIntervals;
  }

  /**
   * Combine a single confidence interval from multiple models
   */
  private combineConfidenceInterval(
    predictions: ModelPrediction[], 
    weights: EnsembleWeights, 
    index: number
  ): ConfidenceInterval | null {
    const validIntervals: { interval: ConfidenceInterval; weight: number }[] = [];
    let totalWeight = 0;

    predictions.forEach(prediction => {
      if (index < prediction.prediction.confidence_intervals.length) {
        const interval = prediction.prediction.confidence_intervals[index];
        const weight = weights[prediction.modelName] || 0;
        validIntervals.push({ interval, weight });
        totalWeight += weight;
      }
    });

    if (validIntervals.length === 0 || totalWeight === 0) {
      return null;
    }

    // Calculate weighted average bounds
    const weightedLowerSum = validIntervals.reduce(
      (sum, { interval, weight }) => sum + (interval.lower * weight), 
      0
    );
    const weightedUpperSum = validIntervals.reduce(
      (sum, { interval, weight }) => sum + (interval.upper * weight), 
      0
    );
    const weightedConfidenceSum = validIntervals.reduce(
      (sum, { interval, weight }) => sum + (interval.confidence_level * weight), 
      0
    );

    return {
      lower: weightedLowerSum / totalWeight,
      upper: weightedUpperSum / totalWeight,
      confidence_level: weightedConfidenceSum / totalWeight
    };
  }

  /**
   * Aggregate feature importance from multiple models
   */
  private aggregateFeatureImportance(
    predictions: ModelPrediction[], 
    weights: EnsembleWeights
  ): FeatureImportance[] {
    const featureMap = new Map<string, { importance: number; category: string; totalWeight: number }>();

    // Aggregate feature importance across models
    predictions.forEach(prediction => {
      const weight = weights[prediction.modelName] || 0;
      
      prediction.prediction.feature_importance.forEach(feature => {
        const key = feature.feature;
        const existing = featureMap.get(key);
        
        if (existing) {
          existing.importance += feature.importance * weight;
          existing.totalWeight += weight;
        } else {
          featureMap.set(key, {
            importance: feature.importance * weight,
            category: feature.category,
            totalWeight: weight
          });
        }
      });
    });

    // Convert to array and normalize
    const aggregatedFeatures: FeatureImportance[] = [];
    featureMap.forEach((data, featureName) => {
      if (data.totalWeight > 0) {
        aggregatedFeatures.push({
          feature: featureName,
          importance: data.importance / data.totalWeight,
          category: data.category as 'campaign' | 'market' | 'temporal' | 'external'
        });
      }
    });

    // Sort by importance and normalize to sum to 1
    aggregatedFeatures.sort((a, b) => b.importance - a.importance);
    
    const totalImportance = aggregatedFeatures.reduce((sum, f) => sum + f.importance, 0);
    if (totalImportance > 0) {
      aggregatedFeatures.forEach(feature => {
        feature.importance = feature.importance / totalImportance;
      });
    }

    return aggregatedFeatures;
  }

  /**
   * Calculate ensemble metadata
   */
  private calculateEnsembleMetadata(
    predictions: ModelPrediction[], 
    weights: EnsembleWeights
  ): ModelMetadata {
    const totalProcessingTime = predictions.reduce((sum, p) => sum + p.processingTime, 0);
    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
    
    // Calculate consensus score (how much models agree)
    const consensusScore = this.calculateConsensusScore(predictions);
    
    // Calculate diversity score (how different the models are)
    const diversityScore = this.calculateDiversityScore(predictions);

    return {
      model_name: 'Ensemble',
      model_version: '1.0.0',
      confidence_score: avgConfidence,
      processing_time: totalProcessingTime,
      data_quality: predictions[0]?.prediction.model_metadata.data_quality || {
        completeness: 0.8,
        accuracy: 0.8,
        freshness: 0.8,
        consistency: 0.8,
        overall: 0.8
      },
      feature_count: Math.max(...predictions.map(p => p.prediction.model_metadata.feature_count)),
      prediction_horizon: Math.max(...predictions.map(p => p.prediction.model_metadata.prediction_horizon))
    };
  }

  /**
   * Calculate how much the models agree with each other
   */
  private calculateConsensusScore(predictions: ModelPrediction[]): number {
    if (predictions.length < 2) return 1.0;

    let totalAgreement = 0;
    let comparisonCount = 0;

    // Compare each pair of models
    for (let i = 0; i < predictions.length; i++) {
      for (let j = i + 1; j < predictions.length; j++) {
        const agreement = this.calculateModelAgreement(
          predictions[i].prediction.trajectories,
          predictions[j].prediction.trajectories
        );
        totalAgreement += agreement;
        comparisonCount++;
      }
    }

    return comparisonCount > 0 ? totalAgreement / comparisonCount : 0.5;
  }

  /**
   * Calculate agreement between two trajectory sets
   */
  private calculateModelAgreement(trajectories1: TrajectoryPoint[], trajectories2: TrajectoryPoint[]): number {
    const minLength = Math.min(trajectories1.length, trajectories2.length);
    if (minLength === 0) return 0;

    let totalAgreement = 0;
    let validComparisons = 0;

    for (let i = 0; i < minLength; i++) {
      const t1 = trajectories1[i];
      const t2 = trajectories2[i];

      // Compare common metrics
      const commonMetrics = Object.keys(t1.metrics).filter(key => key in t2.metrics);
      
      commonMetrics.forEach(metric => {
        const val1 = t1.metrics[metric];
        const val2 = t2.metrics[metric];
        
        if (val1 > 0 && val2 > 0) {
          // Calculate relative difference
          const relativeDiff = Math.abs(val1 - val2) / Math.max(val1, val2);
          const agreement = Math.max(0, 1 - relativeDiff);
          totalAgreement += agreement;
          validComparisons++;
        }
      });
    }

    return validComparisons > 0 ? totalAgreement / validComparisons : 0.5;
  }

  /**
   * Calculate diversity score (higher is better for ensemble robustness)
   */
  private calculateDiversityScore(predictions: ModelPrediction[]): number {
    if (predictions.length < 2) return 0;

    // Diversity is the inverse of consensus - we want models to be different
    const consensusScore = this.calculateConsensusScore(predictions);
    return Math.max(0, 1 - consensusScore);
  }

  /**
   * Update model performance history for future weight calculations
   */
  public updateModelPerformance(modelName: string, actualAccuracy: number): void {
    const history = this.modelPerformanceHistory.get(modelName) || [];
    history.push(actualAccuracy);
    
    // Keep only last 10 performance scores
    if (history.length > 10) {
      history.shift();
    }
    
    this.modelPerformanceHistory.set(modelName, history);
  }

  /**
   * Get ensemble metrics for monitoring and debugging
   */
  public getEnsembleMetrics(predictions: ModelPrediction[], weights: EnsembleWeights): EnsembleMetrics {
    return {
      totalModels: predictions.length,
      activeModels: Object.keys(weights).length,
      averageConfidence: predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length,
      weightDistribution: weights,
      consensusScore: this.calculateConsensusScore(predictions),
      diversityScore: this.calculateDiversityScore(predictions)
    };
  }

  /**
   * Reset model performance history
   */
  public resetPerformanceHistory(): void {
    this.modelPerformanceHistory.clear();
  }
}