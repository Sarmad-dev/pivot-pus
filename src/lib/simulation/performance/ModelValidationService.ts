/**
 * Model Validation Service
 *
 * This module implements comprehensive model validation and improvement capabilities,
 * including A/B testing framework, feedback collection, and model retraining triggers.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export interface ModelConfig {
  name: string;
  version: string;
  config: Record<string, any>;
  description?: string;
}

export interface ABTestConfig {
  testName: string;
  description: string;
  modelA: ModelConfig;
  modelB: ModelConfig;
  trafficSplit: number; // 0.5 = 50/50 split
  testDuration: number; // Duration in days
  successMetrics: Array<{
    metric: string;
    weight: number;
    target?: number;
  }>;
}

export interface ABTestResult {
  testId: string;
  status: "draft" | "running" | "completed" | "stopped";
  modelAPerformance: Record<string, number>;
  modelBPerformance: Record<string, number>;
  statisticalSignificance: number;
  winner?: string;
  confidence: number;
  startedAt?: Date;
  completedAt?: Date;
}

export interface UserFeedback {
  simulationId: string;
  feedbackType:
    | "accuracy_rating"
    | "usefulness_rating"
    | "prediction_correction"
    | "general_feedback";
  rating?: number; // 1-5 scale
  feedback: {
    originalPrediction?: any;
    correctedValue?: any;
    comments?: string;
    tags?: string[];
  };
  metricType?: string;
  timeframe?: {
    start: Date;
    end: Date;
  };
}

export interface ModelRetrainingTrigger {
  type:
    | "performance_degradation"
    | "feedback_threshold"
    | "data_drift"
    | "scheduled";
  threshold: number;
  condition: string;
  action: "retrain" | "alert" | "switch_model";
  enabled: boolean;
}

export interface ModelValidationReport {
  modelName: string;
  modelVersion: string;
  validationPeriod: {
    start: Date;
    end: Date;
  };
  performanceMetrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    userSatisfaction: number;
  };
  feedbackSummary: {
    totalFeedback: number;
    averageRating: number;
    commonIssues: string[];
    improvementSuggestions: string[];
  };
  abTestResults: ABTestResult[];
  retrainingRecommendations: string[];
  nextValidationDate: Date;
}

export class ModelValidationService {
  private convex: ConvexHttpClient;

  constructor(convexUrl: string) {
    this.convex = new ConvexHttpClient(convexUrl);
  }

  /**
   * Create and start an A/B test for comparing two models
   */
  async createABTest(
    organizationId: string,
    testConfig: ABTestConfig
  ): Promise<string> {
    try {
      // Validate test configuration
      this.validateABTestConfig(testConfig);

      const testId = await this.convex.mutation(api.simulations.createABTest, {
        organizationId: organizationId as Id<"organizations">,
        testName: testConfig.testName,
        description: testConfig.description,
        modelA: testConfig.modelA,
        modelB: testConfig.modelB,
        trafficSplit: testConfig.trafficSplit,
        testDuration: testConfig.testDuration,
        successMetrics: testConfig.successMetrics,
      });

      return testId;
    } catch (error) {
      console.error("Error creating A/B test:", error);
      throw error;
    }
  }

  /**
   * Start an A/B test
   */
  async startABTest(testId: string): Promise<void> {
    try {
      await this.convex.mutation(api.simulations.startABTest, {
        testId: testId as Id<"modelABTests">,
      });
    } catch (error) {
      console.error("Error starting A/B test:", error);
      throw error;
    }
  }

  /**
   * Stop an A/B test
   */
  async stopABTest(testId: string): Promise<void> {
    try {
      await this.convex.mutation(api.simulations.stopABTest, {
        testId: testId as Id<"modelABTests">,
      });
    } catch (error) {
      console.error("Error stopping A/B test:", error);
      throw error;
    }
  }

  /**
   * Get A/B test results
   */
  async getABTestResults(testId: string): Promise<ABTestResult | null> {
    try {
      const test = await this.convex.query(api.simulations.getABTest, {
        testId: testId as Id<"modelABTests">,
      });

      if (!test) {
        return null;
      }

      return {
        testId: test._id,
        status: test.status,
        modelAPerformance: test.results?.modelAPerformance || {},
        modelBPerformance: test.results?.modelBPerformance || {},
        statisticalSignificance: test.results?.statisticalSignificance || 0,
        winner: test.results?.winner,
        confidence: test.results?.confidence || 0,
        startedAt: test.startedAt ? new Date(test.startedAt) : undefined,
        completedAt: test.completedAt ? new Date(test.completedAt) : undefined,
      };
    } catch (error) {
      console.error("Error getting A/B test results:", error);
      throw error;
    }
  }

  /**
   * List all A/B tests for an organization
   */
  async listABTests(organizationId: string): Promise<ABTestResult[]> {
    try {
      const tests = await this.convex.query(api.simulations.listABTests, {
        organizationId: organizationId as Id<"organizations">,
      });

      return tests.map((test) => ({
        testId: test._id,
        status: test.status,
        modelAPerformance: test.results?.modelAPerformance || {},
        modelBPerformance: test.results?.modelBPerformance || {},
        statisticalSignificance: test.results?.statisticalSignificance || 0,
        winner: test.results?.winner,
        confidence: test.results?.confidence || 0,
        startedAt: test.startedAt ? new Date(test.startedAt) : undefined,
        completedAt: test.completedAt ? new Date(test.completedAt) : undefined,
      }));
    } catch (error) {
      console.error("Error listing A/B tests:", error);
      throw error;
    }
  }

  /**
   * Submit user feedback for a simulation
   */
  async submitFeedback(feedback: UserFeedback): Promise<void> {
    try {
      await this.convex.mutation(api.simulations.submitModelFeedback, {
        simulationId: feedback.simulationId as Id<"simulations">,
        feedbackType: feedback.feedbackType,
        rating: feedback.rating,
        feedback: feedback.feedback,
        metricType: feedback.metricType,
        timeframe: feedback.timeframe
          ? {
              start: feedback.timeframe.start.getTime(),
              end: feedback.timeframe.end.getTime(),
            }
          : undefined,
      });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      throw error;
    }
  }

  /**
   * Get feedback summary for a model
   */
  async getFeedbackSummary(
    modelName: string,
    modelVersion: string,
    organizationId: string,
    days: number = 30
  ): Promise<{
    totalFeedback: number;
    averageRating: number;
    feedbackByType: Record<string, number>;
    commonIssues: string[];
    recentFeedback: Array<{
      date: Date;
      rating?: number;
      comments?: string;
      type: string;
    }>;
  }> {
    try {
      const summary = await this.convex.query(
        api.simulations.getFeedbackSummary,
        {
          modelName,
          modelVersion,
          organizationId: organizationId as Id<"organizations">,
          days,
        }
      );

      return {
        totalFeedback: summary.totalFeedback,
        averageRating: summary.averageRating,
        feedbackByType: summary.feedbackByType,
        commonIssues: summary.commonIssues,
        recentFeedback: summary.recentFeedback.map((f) => ({
          date: new Date(f.date),
          rating: f.rating,
          comments: f.comments,
          type: f.type,
        })),
      };
    } catch (error) {
      console.error("Error getting feedback summary:", error);
      throw error;
    }
  }

  /**
   * Configure model retraining triggers
   */
  async configureRetrainingTriggers(
    organizationId: string,
    triggers: ModelRetrainingTrigger[]
  ): Promise<void> {
    try {
      await this.convex.mutation(api.simulations.configureRetrainingTriggers, {
        organizationId: organizationId as Id<"organizations">,
        triggers: triggers.map((trigger) => ({
          type: trigger.type,
          threshold: trigger.threshold,
          condition: trigger.condition,
          action: trigger.action,
          enabled: trigger.enabled,
        })),
      });
    } catch (error) {
      console.error("Error configuring retraining triggers:", error);
      throw error;
    }
  }

  /**
   * Check if retraining is needed based on configured triggers
   */
  async checkRetrainingTriggers(
    modelName: string,
    modelVersion: string,
    organizationId: string
  ): Promise<{
    retrainingNeeded: boolean;
    triggeredBy: string[];
    recommendations: string[];
  }> {
    try {
      const result = await this.convex.query(
        api.simulations.checkRetrainingTriggers,
        {
          modelName,
          modelVersion,
          organizationId: organizationId as Id<"organizations">,
        }
      );

      return result;
    } catch (error) {
      console.error("Error checking retraining triggers:", error);
      throw error;
    }
  }

  /**
   * Generate comprehensive model validation report
   */
  async generateValidationReport(
    modelName: string,
    modelVersion: string,
    organizationId: string,
    validationPeriod: { start: Date; end: Date }
  ): Promise<ModelValidationReport> {
    try {
      // Get performance metrics
      const performanceMetrics = await this.getModelPerformanceMetrics(
        modelName,
        modelVersion,
        organizationId,
        validationPeriod
      );

      // Get feedback summary
      const feedbackSummary = await this.getFeedbackSummary(
        modelName,
        modelVersion,
        organizationId,
        Math.ceil(
          (validationPeriod.end.getTime() - validationPeriod.start.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );

      // Get A/B test results
      const abTestResults = await this.getModelABTestResults(
        modelName,
        modelVersion,
        organizationId,
        validationPeriod
      );

      // Generate retraining recommendations
      const retrainingCheck = await this.checkRetrainingTriggers(
        modelName,
        modelVersion,
        organizationId
      );

      const report: ModelValidationReport = {
        modelName,
        modelVersion,
        validationPeriod,
        performanceMetrics: {
          accuracy: performanceMetrics.accuracy,
          precision: performanceMetrics.precision,
          recall: performanceMetrics.recall,
          f1Score: performanceMetrics.f1Score,
          userSatisfaction: feedbackSummary.averageRating / 5, // Convert to 0-1 scale
        },
        feedbackSummary: {
          totalFeedback: feedbackSummary.totalFeedback,
          averageRating: feedbackSummary.averageRating,
          commonIssues: feedbackSummary.commonIssues,
          improvementSuggestions:
            this.generateImprovementSuggestions(feedbackSummary),
        },
        abTestResults,
        retrainingRecommendations: retrainingCheck.recommendations,
        nextValidationDate: this.calculateNextValidationDate(
          {
            ...performanceMetrics,
            userSatisfaction: feedbackSummary.averageRating / 5,
          },
          feedbackSummary
        ),
      };

      // Store the validation report
      await this.convex.mutation(api.simulations.storeValidationReport, {
        organizationId: organizationId as Id<"organizations">,
        report: {
          ...report,
          validationPeriod: {
            start: report.validationPeriod.start.getTime(),
            end: report.validationPeriod.end.getTime(),
          },
          nextValidationDate: report.nextValidationDate.getTime(),
        },
      });

      return report;
    } catch (error) {
      console.error("Error generating validation report:", error);
      throw error;
    }
  }

  /**
   * Validate A/B test configuration
   */
  private validateABTestConfig(config: ABTestConfig): void {
    if (!config.testName || config.testName.trim().length === 0) {
      throw new Error("Test name is required");
    }

    if (!config.modelA.name || !config.modelB.name) {
      throw new Error("Both models must have names");
    }

    if (
      config.modelA.name === config.modelB.name &&
      config.modelA.version === config.modelB.version
    ) {
      throw new Error("Models A and B must be different");
    }

    if (config.trafficSplit < 0.1 || config.trafficSplit > 0.9) {
      throw new Error("Traffic split must be between 0.1 and 0.9");
    }

    if (config.testDuration < 1 || config.testDuration > 90) {
      throw new Error("Test duration must be between 1 and 90 days");
    }

    if (config.successMetrics.length === 0) {
      throw new Error("At least one success metric is required");
    }

    const totalWeight = config.successMetrics.reduce(
      (sum, metric) => sum + metric.weight,
      0
    );
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      throw new Error("Success metric weights must sum to 1.0");
    }
  }

  /**
   * Get model performance metrics for validation
   */
  private async getModelPerformanceMetrics(
    modelName: string,
    modelVersion: string,
    organizationId: string,
    validationPeriod: { start: Date; end: Date }
  ): Promise<{
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  }> {
    try {
      const metrics = await this.convex.query(
        api.simulations.getModelPerformanceMetrics,
        {
          modelName,
          modelVersion,
          organizationId: organizationId as Id<"organizations">,
          startDate: validationPeriod.start.getTime(),
          endDate: validationPeriod.end.getTime(),
        }
      );

      return (
        metrics || {
          accuracy: 0,
          precision: 0,
          recall: 0,
          f1Score: 0,
        }
      );
    } catch (error) {
      console.error("Error getting model performance metrics:", error);
      return {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
      };
    }
  }

  /**
   * Get A/B test results for a specific model
   */
  private async getModelABTestResults(
    modelName: string,
    modelVersion: string,
    organizationId: string,
    validationPeriod: { start: Date; end: Date }
  ): Promise<ABTestResult[]> {
    try {
      const tests = await this.convex.query(
        api.simulations.getModelABTestResults,
        {
          modelName,
          modelVersion,
          organizationId: organizationId as Id<"organizations">,
          startDate: validationPeriod.start.getTime(),
          endDate: validationPeriod.end.getTime(),
        }
      );

      return tests.map((test) => ({
        testId: test._id,
        status: test.status,
        modelAPerformance: test.results?.modelAPerformance || {},
        modelBPerformance: test.results?.modelBPerformance || {},
        statisticalSignificance: test.results?.statisticalSignificance || 0,
        winner: test.results?.winner,
        confidence: test.results?.confidence || 0,
        startedAt: test.startedAt ? new Date(test.startedAt) : undefined,
        completedAt: test.completedAt ? new Date(test.completedAt) : undefined,
      }));
    } catch (error) {
      console.error("Error getting model A/B test results:", error);
      return [];
    }
  }

  /**
   * Generate improvement suggestions based on feedback
   */
  private generateImprovementSuggestions(feedbackSummary: {
    totalFeedback: number;
    averageRating: number;
    feedbackByType: Record<string, number>;
    commonIssues: string[];
  }): string[] {
    const suggestions: string[] = [];

    // Rating-based suggestions
    if (feedbackSummary.averageRating < 3.0) {
      suggestions.push(
        "Consider major model architecture changes due to low user satisfaction"
      );
    } else if (feedbackSummary.averageRating < 4.0) {
      suggestions.push(
        "Focus on incremental improvements to boost user satisfaction"
      );
    }

    // Feedback type analysis
    if (
      feedbackSummary.feedbackByType["accuracy_rating"] >
      feedbackSummary.totalFeedback * 0.3
    ) {
      suggestions.push(
        "Prioritize accuracy improvements through better training data or model tuning"
      );
    }

    if (
      feedbackSummary.feedbackByType["prediction_correction"] >
      feedbackSummary.totalFeedback * 0.2
    ) {
      suggestions.push(
        "Implement active learning to incorporate user corrections into model training"
      );
    }

    // Common issues analysis
    if (feedbackSummary.commonIssues.includes("overconfident predictions")) {
      suggestions.push(
        "Implement confidence calibration techniques to improve prediction reliability"
      );
    }

    if (
      feedbackSummary.commonIssues.includes("poor performance on edge cases")
    ) {
      suggestions.push(
        "Augment training data with more diverse edge case scenarios"
      );
    }

    if (suggestions.length === 0) {
      suggestions.push(
        "Continue monitoring model performance and collecting user feedback"
      );
    }

    return suggestions;
  }

  /**
   * Calculate next validation date based on performance
   */
  private calculateNextValidationDate(
    performanceMetrics: {
      accuracy: number;
      precision: number;
      recall: number;
      f1Score: number;
      userSatisfaction: number;
    },
    feedbackSummary: { totalFeedback: number; averageRating: number }
  ): Date {
    const now = new Date();
    let daysUntilNext = 30; // Default 30 days

    // Adjust based on performance
    const avgPerformance =
      (performanceMetrics.accuracy +
        performanceMetrics.precision +
        performanceMetrics.recall +
        performanceMetrics.f1Score) /
      4;

    if (avgPerformance < 0.7 || performanceMetrics.userSatisfaction < 0.6) {
      daysUntilNext = 14; // More frequent validation for poor performance
    } else if (
      avgPerformance > 0.9 &&
      performanceMetrics.userSatisfaction > 0.8
    ) {
      daysUntilNext = 60; // Less frequent validation for excellent performance
    }

    // Adjust based on feedback volume
    if (feedbackSummary.totalFeedback > 100) {
      daysUntilNext = Math.max(daysUntilNext - 7, 7); // More frequent if lots of feedback
    }

    return new Date(now.getTime() + daysUntilNext * 24 * 60 * 60 * 1000);
  }

  /**
   * Process pending feedback for model improvement
   */
  async processPendingFeedback(organizationId: string): Promise<{
    processed: number;
    improvements: string[];
  }> {
    try {
      const result = await this.convex.mutation(
        api.simulations.processPendingFeedback,
        {
          organizationId: organizationId as Id<"organizations">,
        }
      );

      return result;
    } catch (error) {
      console.error("Error processing pending feedback:", error);
      throw error;
    }
  }

  /**
   * Get model validation history
   */
  async getValidationHistory(
    organizationId: string,
    modelName?: string,
    limit: number = 10
  ): Promise<
    Array<{
      date: Date;
      modelName: string;
      modelVersion: string;
      performanceStatus: string;
      userSatisfaction: number;
      recommendations: string[];
    }>
  > {
    try {
      const history = await this.convex.query(
        api.simulations.getValidationHistory,
        {
          organizationId: organizationId as Id<"organizations">,
          modelName,
          limit,
        }
      );

      return history.map((item) => ({
        date: new Date(item.date),
        modelName: item.modelName,
        modelVersion: item.modelVersion,
        performanceStatus: item.performanceStatus,
        userSatisfaction: item.userSatisfaction,
        recommendations: item.recommendations,
      }));
    } catch (error) {
      console.error("Error getting validation history:", error);
      return [];
    }
  }
}
