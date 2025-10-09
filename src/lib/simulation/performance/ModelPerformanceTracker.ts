/**
 * Model Performance Tracker
 * 
 * This module implements comprehensive tracking and monitoring of AI model
 * prediction accuracy, including actual vs predicted comparisons, confidence
 * calibration, and performance degradation detection.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export interface PredictionComparison {
  date: Date;
  metric: string;
  predictedValue: number;
  actualValue?: number;
  confidence: number;
  error?: number;
  percentageError?: number;
}

export interface AccuracyMetrics {
  mape: number; // Mean Absolute Percentage Error
  rmse: number; // Root Mean Square Error
  mae: number;  // Mean Absolute Error
  r2Score: number; // R-squared score
  confidenceCalibration: number; // How well calibrated confidence scores are
}

export interface PerformanceAlert {
  type: 'accuracy_degradation' | 'confidence_miscalibration' | 'prediction_bias' | 'data_drift';
  severity: 'low' | 'medium' | 'high';
  message: string;
  triggeredAt: Date;
  acknowledged: boolean;
  metadata?: Record<string, any>;
}

export interface ModelPerformanceReport {
  simulationId: string;
  campaignId: string;
  modelName: string;
  modelVersion: string;
  predictions: PredictionComparison[];
  accuracyMetrics?: AccuracyMetrics;
  performanceStatus: 'excellent' | 'good' | 'degraded' | 'poor';
  alerts: PerformanceAlert[];
  evaluatedAt: Date;
  recommendations: string[];
}

export interface ActualPerformanceData {
  campaignId: string;
  date: Date;
  metrics: Record<string, number>;
  source: 'platform_api' | 'manual_entry' | 'imported';
}

export class ModelPerformanceTracker {
  private convex: ConvexHttpClient;

  constructor(convexUrl: string) {
    this.convex = new ConvexHttpClient(convexUrl);
  }

  /**
   * Compare predictions with actual performance data when available
   */
  async comparePredictionsWithActuals(
    simulationId: string,
    actualData: ActualPerformanceData[]
  ): Promise<PredictionComparison[]> {
    try {
      // Fetch simulation predictions from Convex
      const simulation = await this.convex.query(api.simulations.get, { id: simulationId as Id<"simulations"> });
      
      if (!simulation?.results?.trajectories) {
        throw new Error(`No prediction data found for simulation ${simulationId}`);
      }

      const comparisons: PredictionComparison[] = [];

      // Match predictions with actual data by date and metric
      for (const trajectory of simulation.results.trajectories) {
        const predictionDate = new Date(trajectory.date);
        const actualDataPoint = actualData.find(actual => 
          actual.date.toDateString() === predictionDate.toDateString() &&
          actual.campaignId === simulation.campaignId
        );

        if (actualDataPoint) {
          // Compare each metric
          Object.entries(trajectory.metrics).forEach(([metric, predictedValue]) => {
            const actualValue = actualDataPoint.metrics[metric];
            
            if (actualValue !== undefined) {
              const error = Math.abs(actualValue - predictedValue);
              const percentageError = actualValue !== 0 ? (error / Math.abs(actualValue)) * 100 : 0;

              comparisons.push({
                date: predictionDate,
                metric,
                predictedValue,
                actualValue,
                confidence: trajectory.confidence,
                error,
                percentageError
              });
            }
          });
        }
      }

      // Store comparison results in Convex
      await this.convex.mutation(api.simulations.storePerformanceComparison, {
        simulationId: simulationId as Id<"simulations">,
        comparisons: comparisons.map(c => ({
          date: c.date.getTime(),
          metric: c.metric,
          predictedValue: c.predictedValue,
          actualValue: c.actualValue!,
          confidence: c.confidence,
          error: c.error!,
          percentageError: c.percentageError!
        }))
      });

      return comparisons;
    } catch (error) {
      console.error('Error comparing predictions with actuals:', error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive accuracy metrics for model performance
   */
  calculateAccuracyMetrics(comparisons: PredictionComparison[]): AccuracyMetrics {
    if (comparisons.length === 0) {
      throw new Error('No comparison data available for accuracy calculation');
    }

    const validComparisons = comparisons.filter(c => c.actualValue !== undefined && c.error !== undefined);
    
    if (validComparisons.length === 0) {
      throw new Error('No valid comparison data with actual values');
    }

    // Mean Absolute Percentage Error (MAPE)
    const mape = validComparisons.reduce((sum, c) => sum + c.percentageError!, 0) / validComparisons.length;

    // Root Mean Square Error (RMSE)
    const squaredErrors = validComparisons.map(c => Math.pow(c.error!, 2));
    const rmse = Math.sqrt(squaredErrors.reduce((sum, se) => sum + se, 0) / squaredErrors.length);

    // Mean Absolute Error (MAE)
    const mae = validComparisons.reduce((sum, c) => sum + c.error!, 0) / validComparisons.length;

    // R-squared score
    const actualValues = validComparisons.map(c => c.actualValue!);
    const predictedValues = validComparisons.map(c => c.predictedValue);
    const actualMean = actualValues.reduce((sum, val) => sum + val, 0) / actualValues.length;
    
    const totalSumSquares = actualValues.reduce((sum, val) => sum + Math.pow(val - actualMean, 2), 0);
    const residualSumSquares = validComparisons.reduce((sum, c) => sum + Math.pow(c.actualValue! - c.predictedValue, 2), 0);
    const r2Score = totalSumSquares !== 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;

    // Confidence calibration - measure how well confidence scores match actual accuracy
    const confidenceCalibration = this.calculateConfidenceCalibration(validComparisons);

    return {
      mape,
      rmse,
      mae,
      r2Score,
      confidenceCalibration
    };
  }

  /**
   * Calculate confidence calibration score
   */
  private calculateConfidenceCalibration(comparisons: PredictionComparison[]): number {
    // Group predictions by confidence bins
    const confidenceBins = new Map<number, { correct: number; total: number }>();
    
    comparisons.forEach(c => {
      const confidenceBin = Math.floor(c.confidence * 10) / 10; // Round to nearest 0.1
      const isAccurate = c.percentageError! < 10; // Consider <10% error as accurate
      
      if (!confidenceBins.has(confidenceBin)) {
        confidenceBins.set(confidenceBin, { correct: 0, total: 0 });
      }
      
      const bin = confidenceBins.get(confidenceBin)!;
      bin.total++;
      if (isAccurate) bin.correct++;
    });

    // Calculate calibration error
    let calibrationError = 0;
    let totalPredictions = 0;

    confidenceBins.forEach((bin, confidence) => {
      const accuracy = bin.correct / bin.total;
      calibrationError += bin.total * Math.abs(confidence - accuracy);
      totalPredictions += bin.total;
    });

    return totalPredictions > 0 ? 1 - (calibrationError / totalPredictions) : 0;
  }

  /**
   * Detect performance degradation and generate alerts
   */
  async detectPerformanceDegradation(
    simulationId: string,
    currentMetrics: AccuracyMetrics,
    historicalBaseline?: AccuracyMetrics
  ): Promise<PerformanceAlert[]> {
    const alerts: PerformanceAlert[] = [];

    try {
      // Get historical performance if not provided
      if (!historicalBaseline) {
        historicalBaseline = await this.getHistoricalBaseline(simulationId);
      }

      // Check for accuracy degradation
      if (historicalBaseline && currentMetrics.mape > historicalBaseline.mape * 1.2) {
        alerts.push({
          type: 'accuracy_degradation',
          severity: currentMetrics.mape > historicalBaseline.mape * 1.5 ? 'high' : 'medium',
          message: `Model accuracy has degraded. MAPE increased from ${historicalBaseline.mape.toFixed(2)}% to ${currentMetrics.mape.toFixed(2)}%`,
          triggeredAt: new Date(),
          acknowledged: false,
          metadata: {
            previousMAPE: historicalBaseline.mape,
            currentMAPE: currentMetrics.mape,
            degradationPercentage: ((currentMetrics.mape - historicalBaseline.mape) / historicalBaseline.mape) * 100
          }
        });
      }

      // Check for confidence miscalibration
      if (currentMetrics.confidenceCalibration < 0.7) {
        alerts.push({
          type: 'confidence_miscalibration',
          severity: currentMetrics.confidenceCalibration < 0.5 ? 'high' : 'medium',
          message: `Model confidence scores are poorly calibrated. Calibration score: ${currentMetrics.confidenceCalibration.toFixed(2)}`,
          triggeredAt: new Date(),
          acknowledged: false,
          metadata: {
            calibrationScore: currentMetrics.confidenceCalibration
          }
        });
      }

      // Check for prediction bias (R² score too low)
      if (currentMetrics.r2Score < 0.6) {
        alerts.push({
          type: 'prediction_bias',
          severity: currentMetrics.r2Score < 0.3 ? 'high' : 'medium',
          message: `Model shows poor predictive power. R² score: ${currentMetrics.r2Score.toFixed(2)}`,
          triggeredAt: new Date(),
          acknowledged: false,
          metadata: {
            r2Score: currentMetrics.r2Score
          }
        });
      }

      // Store alerts in Convex
      if (alerts.length > 0) {
        await this.convex.mutation(api.simulations.storePerformanceAlerts, {
          simulationId: simulationId as Id<"simulations">,
          alerts: alerts.map(alert => ({
            type: alert.type,
            severity: alert.severity,
            message: alert.message,
            triggeredAt: alert.triggeredAt.getTime(),
            acknowledged: alert.acknowledged,
            metadata: alert.metadata || {}
          }))
        });
      }

      return alerts;
    } catch (error) {
      console.error('Error detecting performance degradation:', error);
      return [];
    }
  }

  /**
   * Get historical baseline metrics for comparison
   */
  private async getHistoricalBaseline(simulationId: string): Promise<AccuracyMetrics | undefined> {
    try {
      const historicalData = await this.convex.query(api.simulations.getHistoricalPerformanceMetrics, {
        simulationId: simulationId as Id<"simulations">,
        lookbackDays: 30
      });

      if (!historicalData || historicalData.length === 0) {
        return undefined;
      }

      // Calculate average metrics from historical data
      const avgMetrics = historicalData.reduce((acc, data) => ({
        mape: acc.mape + data.mape,
        rmse: acc.rmse + data.rmse,
        mae: acc.mae + data.mae,
        r2Score: acc.r2Score + data.r2Score,
        confidenceCalibration: acc.confidenceCalibration + data.confidenceCalibration
      }), { mape: 0, rmse: 0, mae: 0, r2Score: 0, confidenceCalibration: 0 });

      const count = historicalData.length;
      return {
        mape: avgMetrics.mape / count,
        rmse: avgMetrics.rmse / count,
        mae: avgMetrics.mae / count,
        r2Score: avgMetrics.r2Score / count,
        confidenceCalibration: avgMetrics.confidenceCalibration / count
      };
    } catch (error) {
      console.error('Error fetching historical baseline:', error);
      return undefined;
    }
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(
    simulationId: string,
    actualData: ActualPerformanceData[]
  ): Promise<ModelPerformanceReport> {
    try {
      const simulation = await this.convex.query(api.simulations.get, { id: simulationId as Id<"simulations"> });
      
      if (!simulation) {
        throw new Error(`Simulation ${simulationId} not found`);
      }

      // Compare predictions with actuals
      const comparisons = await this.comparePredictionsWithActuals(simulationId, actualData);
      
      // Calculate accuracy metrics
      let accuracyMetrics: AccuracyMetrics | undefined;
      let performanceStatus: 'excellent' | 'good' | 'degraded' | 'poor' = 'poor';
      
      if (comparisons.length > 0) {
        accuracyMetrics = this.calculateAccuracyMetrics(comparisons);
        
        // Determine performance status based on MAPE
        if (accuracyMetrics.mape < 5) performanceStatus = 'excellent';
        else if (accuracyMetrics.mape < 15) performanceStatus = 'good';
        else if (accuracyMetrics.mape < 30) performanceStatus = 'degraded';
        else performanceStatus = 'poor';
      }

      // Detect performance issues
      const alerts = accuracyMetrics 
        ? await this.detectPerformanceDegradation(simulationId, accuracyMetrics)
        : [];

      // Generate recommendations
      const recommendations = this.generateRecommendations(accuracyMetrics, alerts);

      const report: ModelPerformanceReport = {
        simulationId,
        campaignId: simulation.campaignId,
        modelName: simulation.modelMetadata?.primaryModel || 'unknown',
        modelVersion: simulation.modelMetadata?.modelVersions?.primary || 'unknown',
        predictions: comparisons,
        accuracyMetrics,
        performanceStatus,
        alerts,
        evaluatedAt: new Date(),
        recommendations
      };

      // Store report in Convex
      await this.convex.mutation(api.simulations.storePerformanceReport, {
        simulationId: simulationId as Id<"simulations">,
        report: {
          ...report,
          evaluatedAt: report.evaluatedAt.getTime(),
          predictions: report.predictions.map(p => ({
            date: p.date.getTime(),
            metric: p.metric,
            predictedValue: p.predictedValue,
            actualValue: p.actualValue || 0,
            confidence: p.confidence,
            error: p.error || 0,
            percentageError: p.percentageError || 0
          })),
          alerts: report.alerts.map(a => ({
            type: a.type,
            severity: a.severity,
            message: a.message,
            triggeredAt: a.triggeredAt.getTime(),
            acknowledged: a.acknowledged,
            metadata: a.metadata || {}
          }))
        }
      });

      return report;
    } catch (error) {
      console.error('Error generating performance report:', error);
      throw error;
    }
  }

  /**
   * Generate recommendations based on performance metrics and alerts
   */
  private generateRecommendations(
    metrics?: AccuracyMetrics,
    alerts: PerformanceAlert[] = []
  ): string[] {
    const recommendations: string[] = [];

    if (!metrics) {
      recommendations.push('Collect more actual performance data to enable accuracy assessment');
      return recommendations;
    }

    // MAPE-based recommendations
    if (metrics.mape > 20) {
      recommendations.push('Consider retraining the model with more recent data');
      recommendations.push('Review input features for data quality issues');
    } else if (metrics.mape > 10) {
      recommendations.push('Monitor model performance closely for further degradation');
    }

    // Confidence calibration recommendations
    if (metrics.confidenceCalibration < 0.7) {
      recommendations.push('Recalibrate confidence scores using Platt scaling or isotonic regression');
      recommendations.push('Consider ensemble methods to improve confidence estimation');
    }

    // R² score recommendations
    if (metrics.r2Score < 0.6) {
      recommendations.push('Investigate feature engineering opportunities');
      recommendations.push('Consider more complex model architectures');
    }

    // Alert-specific recommendations
    alerts.forEach(alert => {
      switch (alert.type) {
        case 'accuracy_degradation':
          recommendations.push('Implement automated model retraining pipeline');
          break;
        case 'confidence_miscalibration':
          recommendations.push('Review confidence score calculation methodology');
          break;
        case 'prediction_bias':
          recommendations.push('Analyze prediction residuals for systematic bias patterns');
          break;
        case 'data_drift':
          recommendations.push('Update training data to reflect current market conditions');
          break;
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Get performance trends over time
   */
  async getPerformanceTrends(
    campaignId: string,
    days: number = 30
  ): Promise<Array<{ date: Date; metrics: AccuracyMetrics }>> {
    try {
      const trends = await this.convex.query(api.simulations.getPerformanceTrends, {
        campaignId: campaignId as Id<"campaigns">,
        days
      });

      return trends.map(trend => ({
        date: new Date(trend.date),
        metrics: trend.metrics
      }));
    } catch (error) {
      console.error('Error fetching performance trends:', error);
      return [];
    }
  }

  /**
   * Acknowledge performance alert
   */
  async acknowledgeAlert(simulationId: string, alertIndex: number): Promise<void> {
    try {
      await this.convex.mutation(api.simulations.acknowledgePerformanceAlert, {
        simulationId: simulationId as Id<"simulations">,
        alertIndex
      });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      throw error;
    }
  }
}