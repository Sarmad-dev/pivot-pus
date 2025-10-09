/**
 * AI Trajectory Simulation Validation Schemas
 *
 * Comprehensive validation utilities for simulation requests, data quality,
 * and model outputs
 */

import {
  SimulationRequest,
  SimulationMetric,
  CampaignDataset,
  MarketDataset,
  EnrichedDataset,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  DataQualityScore,
  TrajectoryPoint,
  PredictionOutput,
  ScenarioConfig,
} from "../../types/simulation";
import { DataValidationError, InsufficientDataError } from "./errors";

// ============================================================================
// Validation Schema Definitions
// ============================================================================

export interface ValidationSchema<T> {
  validate(data: T): ValidationResult;
  validateField(fieldName: string, value: any): ValidationError | null;
  getRequiredFields(): string[];
}

// ============================================================================
// Simulation Request Validation
// ============================================================================

export class SimulationRequestValidator
  implements ValidationSchema<SimulationRequest>
{
  private readonly REQUIRED_FIELDS = ["campaignId", "timeframe", "metrics"];

  private readonly MAX_TIMEFRAME_DAYS = 90;
  private readonly MIN_TIMEFRAME_DAYS = 5;
  private readonly MAX_METRICS = 10;

  validate(request: SimulationRequest): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check required fields
    for (const field of this.REQUIRED_FIELDS) {
      if (!request[field as keyof SimulationRequest]) {
        errors.push({
          field,
          message: `${field} is required`,
          code: "REQUIRED_FIELD_MISSING",
          severity: "error",
        });
      }
    }

    // Validate timeframe
    if (request.timeframe) {
      const timeframeValidation = this.validateTimeframe(request.timeframe);
      errors.push(...timeframeValidation.errors);
      warnings.push(...timeframeValidation.warnings);
    }

    // Validate metrics
    if (request.metrics) {
      const metricsValidation = this.validateMetrics(request.metrics);
      errors.push(...metricsValidation.errors);
      warnings.push(...metricsValidation.warnings);
    }

    // Validate scenarios
    if (request.scenarios) {
      const scenariosValidation = this.validateScenarios(request.scenarios);
      errors.push(...scenariosValidation.errors);
      warnings.push(...scenariosValidation.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score: this.calculateValidationScore(errors, warnings),
    };
  }

  validateField(fieldName: string, value: any): ValidationError | null {
    switch (fieldName) {
      case "campaignId":
        return this.validateCampaignId(value);
      case "timeframe":
        return this.validateTimeframeField(value);
      case "metrics":
        return this.validateMetricsField(value);
      default:
        return null;
    }
  }

  getRequiredFields(): string[] {
    return [...this.REQUIRED_FIELDS];
  }

  private validateTimeframe(timeframe: any): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!timeframe.startDate || !timeframe.endDate) {
      errors.push({
        field: "timeframe",
        message: "Start date and end date are required",
        code: "INVALID_TIMEFRAME",
        severity: "error",
      });
      return { errors, warnings };
    }

    const startDate = new Date(timeframe.startDate);
    const endDate = new Date(timeframe.endDate);
    const diffDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (startDate >= endDate) {
      errors.push({
        field: "timeframe",
        message: "End date must be after start date",
        code: "INVALID_DATE_RANGE",
        severity: "error",
      });
    }

    if (diffDays < this.MIN_TIMEFRAME_DAYS) {
      errors.push({
        field: "timeframe",
        message: `Timeframe must be at least ${this.MIN_TIMEFRAME_DAYS} days`,
        code: "TIMEFRAME_TOO_SHORT",
        severity: "error",
      });
    }

    if (diffDays > this.MAX_TIMEFRAME_DAYS) {
      warnings.push({
        field: "timeframe",
        message: `Timeframe longer than ${this.MAX_TIMEFRAME_DAYS} days may reduce accuracy`,
        suggestion: "Consider shorter timeframes for better predictions",
      });
    }

    if (startDate < new Date()) {
      warnings.push({
        field: "timeframe",
        message: "Start date is in the past",
        suggestion: "Use current or future dates for predictions",
      });
    }

    return { errors, warnings };
  }

  private validateMetrics(metrics: SimulationMetric[]): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (metrics.length === 0) {
      errors.push({
        field: "metrics",
        message: "At least one metric is required",
        code: "NO_METRICS",
        severity: "error",
      });
      return { errors, warnings };
    }

    if (metrics.length > this.MAX_METRICS) {
      warnings.push({
        field: "metrics",
        message: `More than ${this.MAX_METRICS} metrics may impact performance`,
        suggestion: "Consider focusing on key metrics",
      });
    }

    const totalWeight = metrics.reduce((sum, metric) => sum + metric.weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      warnings.push({
        field: "metrics",
        message: "Metric weights should sum to 1.0",
        suggestion: "Adjust weights to total 100%",
      });
    }

    const validMetricTypes = [
      "ctr",
      "impressions",
      "engagement",
      "reach",
      "conversions",
      "cpc",
      "cpm",
    ];
    metrics.forEach((metric, index) => {
      if (!validMetricTypes.includes(metric.type)) {
        errors.push({
          field: `metrics[${index}].type`,
          message: `Invalid metric type: ${metric.type}`,
          code: "INVALID_METRIC_TYPE",
          severity: "error",
        });
      }

      if (metric.weight < 0 || metric.weight > 1) {
        errors.push({
          field: `metrics[${index}].weight`,
          message: "Metric weight must be between 0 and 1",
          code: "INVALID_WEIGHT",
          severity: "error",
        });
      }
    });

    return { errors, warnings };
  }

  private validateScenarios(scenarios: ScenarioConfig[]): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const validScenarioTypes = [
      "optimistic",
      "realistic",
      "pessimistic",
      "custom",
    ];
    scenarios.forEach((scenario, index) => {
      if (!validScenarioTypes.includes(scenario.type)) {
        errors.push({
          field: `scenarios[${index}].type`,
          message: `Invalid scenario type: ${scenario.type}`,
          code: "INVALID_SCENARIO_TYPE",
          severity: "error",
        });
      }

      if (
        scenario.percentile !== undefined &&
        (scenario.percentile < 0 || scenario.percentile > 100)
      ) {
        errors.push({
          field: `scenarios[${index}].percentile`,
          message: "Percentile must be between 0 and 100",
          code: "INVALID_PERCENTILE",
          severity: "error",
        });
      }
    });

    return { errors, warnings };
  }

  private validateCampaignId(value: any): ValidationError | null {
    if (!value || typeof value !== "string") {
      return {
        field: "campaignId",
        message: "Campaign ID must be a valid string",
        code: "INVALID_CAMPAIGN_ID",
        severity: "error",
      };
    }
    return null;
  }

  private validateTimeframeField(value: any): ValidationError | null {
    if (!value || typeof value !== "object") {
      return {
        field: "timeframe",
        message: "Timeframe must be an object with startDate and endDate",
        code: "INVALID_TIMEFRAME_OBJECT",
        severity: "error",
      };
    }
    return null;
  }

  private validateMetricsField(value: any): ValidationError | null {
    if (!Array.isArray(value)) {
      return {
        field: "metrics",
        message: "Metrics must be an array",
        code: "INVALID_METRICS_TYPE",
        severity: "error",
      };
    }
    return null;
  }

  private calculateValidationScore(
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): number {
    const errorPenalty = errors.length * 0.3;
    const warningPenalty = warnings.length * 0.1;
    return Math.max(0, 1 - errorPenalty - warningPenalty);
  }
}

// ============================================================================
// Data Quality Validation
// ============================================================================

export class DataQualityValidator {
  private readonly COMPLETENESS_THRESHOLD = 0.7;
  private readonly FRESHNESS_THRESHOLD_DAYS = 30;

  validateDataset(dataset: EnrichedDataset): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate campaign data completeness
    const campaignValidation = this.validateCampaignData(dataset.campaign);
    errors.push(...campaignValidation.errors);
    warnings.push(...campaignValidation.warnings);

    // Validate historical performance data
    const performanceValidation = this.validatePerformanceData(
      dataset.historicalPerformance
    );
    errors.push(...performanceValidation.errors);
    warnings.push(...performanceValidation.warnings);

    // Validate market data quality
    if (dataset.marketData) {
      const marketValidation = this.validateMarketData(dataset.marketData);
      errors.push(...marketValidation.errors);
      warnings.push(...marketValidation.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score: this.calculateDataQualityScore(dataset),
    };
  }

  calculateDataQualityScore(dataset: EnrichedDataset): number {
    const completeness = this.calculateCompleteness(dataset);
    const accuracy = this.calculateAccuracy(dataset);
    const freshness = this.calculateFreshness(dataset);
    const consistency = this.calculateConsistency(dataset);

    return (completeness + accuracy + freshness + consistency) / 4;
  }

  private validateCampaignData(campaign: any): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const requiredFields = ["id", "name", "budget", "startDate", "endDate"];
    for (const field of requiredFields) {
      if (!campaign[field]) {
        errors.push({
          field: `campaign.${field}`,
          message: `Campaign ${field} is required`,
          code: "MISSING_CAMPAIGN_FIELD",
          severity: "error",
        });
      }
    }

    if (campaign.budget && campaign.budget <= 0) {
      errors.push({
        field: "campaign.budget",
        message: "Campaign budget must be positive",
        code: "INVALID_BUDGET",
        severity: "error",
      });
    }

    if (campaign.channels && campaign.channels.length === 0) {
      warnings.push({
        field: "campaign.channels",
        message: "No channels configured",
        suggestion: "Add at least one channel for better predictions",
      });
    }

    return { errors, warnings };
  }

  private validatePerformanceData(performance: any[]): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!performance || performance.length === 0) {
      warnings.push({
        field: "historicalPerformance",
        message: "No historical performance data available",
        suggestion: "Historical data improves prediction accuracy",
      });
      return { errors, warnings };
    }

    if (performance.length < 7) {
      warnings.push({
        field: "historicalPerformance",
        message: "Limited historical data (less than 7 data points)",
        suggestion: "More historical data improves accuracy",
      });
    }

    // Check for data gaps
    const dates = performance.map((p) => new Date(p.date)).sort();
    for (let i = 1; i < dates.length; i++) {
      const daysDiff =
        (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 7) {
        warnings.push({
          field: "historicalPerformance",
          message: "Gaps detected in historical data",
          suggestion: "Fill data gaps for better trend analysis",
        });
        break;
      }
    }

    return { errors, warnings };
  }

  private validateMarketData(marketData: MarketDataset): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (
      !marketData.industryBenchmarks ||
      marketData.industryBenchmarks.length === 0
    ) {
      warnings.push({
        field: "marketData.industryBenchmarks",
        message: "No industry benchmarks available",
        suggestion: "Benchmarks help contextualize predictions",
      });
    }

    if (
      !marketData.competitorActivity ||
      marketData.competitorActivity.length === 0
    ) {
      warnings.push({
        field: "marketData.competitorActivity",
        message: "No competitor data available",
        suggestion: "Competitor insights improve risk detection",
      });
    }

    return { errors, warnings };
  }

  private calculateCompleteness(dataset: EnrichedDataset): number {
    const requiredFields = [
      "campaign.id",
      "campaign.name",
      "campaign.budget",
      "historicalPerformance",
      "audienceInsights",
    ];

    let completedFields = 0;
    for (const field of requiredFields) {
      const value = this.getNestedValue(dataset, field);
      if (value !== undefined && value !== null && value !== "") {
        completedFields++;
      }
    }

    return completedFields / requiredFields.length;
  }

  private calculateAccuracy(dataset: EnrichedDataset): number {
    // Simplified accuracy calculation based on data consistency
    let accuracyScore = 1.0;

    // Check for negative values in performance metrics
    if (dataset.historicalPerformance) {
      const negativeValues = dataset.historicalPerformance.filter(
        (p) => p.value < 0
      );
      if (negativeValues.length > 0) {
        accuracyScore -= 0.2;
      }
    }

    // Check for unrealistic budget values
    if (dataset.campaign.budget && dataset.campaign.budget > 10000000) {
      accuracyScore -= 0.1;
    }

    return Math.max(0, accuracyScore);
  }

  private calculateFreshness(dataset: EnrichedDataset): number {
    if (
      !dataset.historicalPerformance ||
      dataset.historicalPerformance.length === 0
    ) {
      return 0.5; // Neutral score for no data
    }

    const latestDate = Math.max(
      ...dataset.historicalPerformance.map((p) => new Date(p.date).getTime())
    );
    const daysSinceLatest = (Date.now() - latestDate) / (1000 * 60 * 60 * 24);

    if (daysSinceLatest <= 1) return 1.0;
    if (daysSinceLatest <= 7) return 0.9;
    if (daysSinceLatest <= 30) return 0.7;
    if (daysSinceLatest <= 90) return 0.5;
    return 0.3;
  }

  private calculateConsistency(dataset: EnrichedDataset): number {
    // Check for consistent data patterns
    let consistencyScore = 1.0;

    // Check budget allocation consistency
    if (dataset.budgetAllocation) {
      const totalAllocated = Object.values(
        dataset.budgetAllocation.allocated
      ).reduce((sum, val) => sum + val, 0);
      if (
        Math.abs(totalAllocated - dataset.campaign.budget) >
        dataset.campaign.budget * 0.1
      ) {
        consistencyScore -= 0.2;
      }
    }

    return Math.max(0, consistencyScore);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }
}

// ============================================================================
// Model Output Validation
// ============================================================================

export class ModelOutputValidator {
  validatePredictionOutput(output: PredictionOutput): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate trajectories
    if (!output.trajectories || output.trajectories.length === 0) {
      errors.push({
        field: "trajectories",
        message: "Prediction output must contain trajectories",
        code: "MISSING_TRAJECTORIES",
        severity: "error",
      });
    } else {
      const trajectoryValidation = this.validateTrajectories(
        output.trajectories
      );
      errors.push(...trajectoryValidation.errors);
      warnings.push(...trajectoryValidation.warnings);
    }

    // Validate confidence intervals
    if (output.confidence_intervals) {
      const confidenceValidation = this.validateConfidenceIntervals(
        output.confidence_intervals
      );
      errors.push(...confidenceValidation.errors);
      warnings.push(...confidenceValidation.warnings);
    }

    // Validate model metadata
    if (output.model_metadata) {
      const metadataValidation = this.validateModelMetadata(
        output.model_metadata
      );
      errors.push(...metadataValidation.errors);
      warnings.push(...metadataValidation.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score: this.calculateOutputScore(output, errors, warnings),
    };
  }

  private validateTrajectories(trajectories: TrajectoryPoint[]): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    trajectories.forEach((point, index) => {
      if (!point.date) {
        errors.push({
          field: `trajectories[${index}].date`,
          message: "Trajectory point must have a date",
          code: "MISSING_DATE",
          severity: "error",
        });
      }

      if (!point.metrics || Object.keys(point.metrics).length === 0) {
        errors.push({
          field: `trajectories[${index}].metrics`,
          message: "Trajectory point must have metrics",
          code: "MISSING_METRICS",
          severity: "error",
        });
      }

      if (point.confidence < 0 || point.confidence > 1) {
        errors.push({
          field: `trajectories[${index}].confidence`,
          message: "Confidence must be between 0 and 1",
          code: "INVALID_CONFIDENCE",
          severity: "error",
        });
      }

      if (point.confidence < 0.5) {
        warnings.push({
          field: `trajectories[${index}].confidence`,
          message: "Low confidence prediction",
          suggestion: "Consider gathering more data",
        });
      }
    });

    return { errors, warnings };
  }

  private validateConfidenceIntervals(intervals: any[]): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    intervals.forEach((interval, index) => {
      if (interval.lower > interval.upper) {
        errors.push({
          field: `confidence_intervals[${index}]`,
          message: "Lower bound must be less than upper bound",
          code: "INVALID_INTERVAL",
          severity: "error",
        });
      }

      if (interval.confidence_level < 0 || interval.confidence_level > 1) {
        errors.push({
          field: `confidence_intervals[${index}].confidence_level`,
          message: "Confidence level must be between 0 and 1",
          code: "INVALID_CONFIDENCE_LEVEL",
          severity: "error",
        });
      }
    });

    return { errors, warnings };
  }

  private validateModelMetadata(metadata: any): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!metadata.model_name) {
      errors.push({
        field: "model_metadata.model_name",
        message: "Model name is required",
        code: "MISSING_MODEL_NAME",
        severity: "error",
      });
    }

    if (metadata.confidence_score < 0 || metadata.confidence_score > 1) {
      errors.push({
        field: "model_metadata.confidence_score",
        message: "Confidence score must be between 0 and 1",
        code: "INVALID_CONFIDENCE_SCORE",
        severity: "error",
      });
    }

    if (metadata.confidence_score < 0.7) {
      warnings.push({
        field: "model_metadata.confidence_score",
        message: "Low model confidence",
        suggestion: "Consider using additional data sources",
      });
    }

    return { errors, warnings };
  }

  private calculateOutputScore(
    output: PredictionOutput,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): number {
    let score = 1.0;

    // Penalize errors more heavily than warnings
    score -= errors.length * 0.3;
    score -= warnings.length * 0.1;

    // Bonus for high confidence
    if (output.model_metadata?.confidence_score) {
      score += (output.model_metadata.confidence_score - 0.5) * 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }
}

// ============================================================================
// Exported Validators
// ============================================================================

export const simulationRequestValidator = new SimulationRequestValidator();
export const dataQualityValidator = new DataQualityValidator();
export const modelOutputValidator = new ModelOutputValidator();

// Utility functions
export function validateSimulationRequest(
  request: SimulationRequest
): ValidationResult {
  return simulationRequestValidator.validate(request);
}

export function validateDataQuality(
  dataset: EnrichedDataset
): ValidationResult {
  return dataQualityValidator.validateDataset(dataset);
}

export function validateModelOutput(
  output: PredictionOutput
): ValidationResult {
  return modelOutputValidator.validatePredictionOutput(output);
}

export function throwIfInvalid(
  validationResult: ValidationResult,
  context: string = "Validation"
): void {
  if (!validationResult.valid) {
    const errorMessages = validationResult.errors.map(
      (e) => `${e.field}: ${e.message}`
    );
    throw new DataValidationError(
      `${context} failed: ${errorMessages.join(", ")}`,
      "multiple",
      validationResult
    );
  }
}
