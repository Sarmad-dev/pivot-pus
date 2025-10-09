/**
 * Hugging Face Model Integration for Time-Series Forecasting
 *
 * This module implements integration with Hugging Face models for
 * time-series forecasting including Prophet and LSTM models.
 */

import {
  EnrichedDataset,
  PredictionOutput,
  TrajectoryPoint,
  ConfidenceInterval,
  FeatureImportance,
  ModelMetadata,
  ModelError,
  PerformanceMetric,
} from "../../../types/simulation";
import { SimulationError } from "../errors";

export interface HuggingFaceConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  models: {
    prophet: string;
    lstm: string;
    sentiment: string;
  };
}

export interface TimeSeriesData {
  ds: string; // Date string in YYYY-MM-DD format
  y: number; // Target value
  [key: string]: string | number; // Additional features
}

export interface ProphetForecast {
  ds: string;
  yhat: number;
  yhat_lower: number;
  yhat_upper: number;
  trend: number;
  seasonal: number;
  confidence: number;
}

export interface LSTMPrediction {
  timestamp: string;
  prediction: number;
  confidence: number;
  features: Record<string, number>;
}

export interface SentimentAnalysis {
  label: string;
  score: number;
  confidence: number;
}

export interface HuggingFaceResponse {
  forecasts: ProphetForecast[];
  lstm_predictions: LSTMPrediction[];
  sentiment_scores: SentimentAnalysis[];
  model_metadata: {
    prophet_version: string;
    lstm_version: string;
    processing_time: number;
    data_points: number;
  };
}

export class HuggingFacePredictor {
  private config: HuggingFaceConfig;

  constructor(config: HuggingFaceConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || "https://api-inference.huggingface.co",
      timeout: config.timeout || 30000,
      models: config.models || {
        prophet: "facebook/prophet",
        lstm: "huggingface/time-series-transformer",
        sentiment: "cardiffnlp/twitter-roberta-base-sentiment-latest",
      },
    };
  }

  /**
   * Generate performance trajectories using Hugging Face models
   */
  async predict(dataset: EnrichedDataset): Promise<PredictionOutput> {
    const startTime = Date.now();

    try {
      // Validate input dataset
      this.validateDataset(dataset);

      // Prepare time series data for Prophet
      const timeSeriesData = this.prepareTimeSeriesData(dataset);

      // Prepare creative data for sentiment analysis
      const creativeData = this.prepareCreativeData(dataset);

      // Run Prophet forecasting
      const prophetForecasts = await this.runProphetForecasting(timeSeriesData);

      // Run LSTM predictions
      const lstmPredictions = await this.runLSTMForecasting(timeSeriesData);

      // Run sentiment analysis on creative content
      const sentimentAnalysis = await this.runSentimentAnalysis(creativeData);

      // Combine model outputs
      const trajectories = this.combineModelOutputs(
        prophetForecasts,
        lstmPredictions,
        dataset
      );
      const confidenceIntervals = this.calculateConfidenceIntervals(
        prophetForecasts,
        lstmPredictions
      );
      const featureImportance = this.calculateFeatureImportance(
        dataset,
        sentimentAnalysis
      );

      const processingTime = Date.now() - startTime;

      return {
        trajectories,
        confidence_intervals: confidenceIntervals,
        feature_importance: featureImportance,
        model_metadata: {
          model_name: "HuggingFace-Ensemble",
          model_version: "1.0.0",
          confidence_score: this.calculateOverallConfidence(
            prophetForecasts,
            lstmPredictions
          ),
          processing_time: processingTime,
          data_quality: dataset.dataQuality,
          feature_count: Object.keys(timeSeriesData[0] || {}).length,
          prediction_horizon: Math.ceil(
            (dataset.campaign.endDate.getTime() -
              dataset.campaign.startDate.getTime()) /
              (1000 * 60 * 60 * 24)
          ),
        },
      };
    } catch (error) {
      throw new SimulationError(
        `HuggingFace prediction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "api_error",
        "HUGGINGFACE_PREDICTION_ERROR",
        true,
        {
          dataset: dataset.campaign?.id || "unknown",
          processingTime: Date.now() - startTime,
        }
      );
    }
  }

  /**
   * Validate the input dataset for completeness and quality
   */
  private validateDataset(dataset: EnrichedDataset): void {
    if (!dataset.campaign) {
      throw new SimulationError(
        "Campaign data is required",
        "validation_error",
        "VALIDATION_ERROR"
      );
    }

    if (
      !dataset.historicalPerformance ||
      dataset.historicalPerformance.length === 0
    ) {
      throw new SimulationError(
        "Historical performance data is required for time-series forecasting",
        "validation_error",
        "VALIDATION_ERROR"
      );
    }

    if (dataset.dataQuality.overall < 0.5) {
      throw new SimulationError(
        "Data quality too low for reliable predictions",
        "validation_error",
        "VALIDATION_ERROR"
      );
    }
  }

  /**
   * Prepare time series data in Prophet format
   */
  private prepareTimeSeriesData(dataset: EnrichedDataset): TimeSeriesData[] {
    const timeSeriesData: TimeSeriesData[] = [];

    // Group historical performance by date and metric
    const performanceByDate = new Map<string, Record<string, number>>();

    dataset.historicalPerformance.forEach((metric) => {
      const dateKey = metric.date.toISOString().split("T")[0];
      if (!performanceByDate.has(dateKey)) {
        performanceByDate.set(dateKey, {});
      }
      performanceByDate.get(dateKey)![metric.metric] = metric.value;
    });

    // Convert to Prophet format
    performanceByDate.forEach((metrics, date) => {
      // Use CTR as primary target variable, fallback to impressions or first available metric
      const primaryMetric =
        metrics.ctr || metrics.impressions || Object.values(metrics)[0] || 0;

      const dataPoint: TimeSeriesData = {
        ds: date,
        y: primaryMetric,
        // Add additional features
        budget: dataset.budgetAllocation.allocated.total || 0,
        audience_size: dataset.audienceInsights.totalSize,
        channel_count: dataset.campaign.channels.length,
        creative_count: dataset.creativeAssets.length,
      };

      // Add market volatility if available
      if (dataset.marketData?.marketVolatility) {
        dataPoint.market_volatility =
          dataset.marketData.marketVolatility.overall;
      }

      // Add seasonal factors
      const dayOfWeek = new Date(date).getDay();
      const month = new Date(date).getMonth();
      dataPoint.day_of_week = dayOfWeek;
      dataPoint.month = month;

      timeSeriesData.push(dataPoint);
    });

    // Sort by date
    return timeSeriesData.sort(
      (a, b) => new Date(a.ds).getTime() - new Date(b.ds).getTime()
    );
  }

  /**
   * Prepare creative content data for sentiment analysis
   */
  private prepareCreativeData(dataset: EnrichedDataset): string[] {
    return dataset.creativeAssets
      .filter((asset) => asset.type === "text" || asset.content)
      .map((asset) => asset.content)
      .filter((content) => content && content.length > 0);
  }

  /**
   * Run Prophet forecasting via Hugging Face API
   */
  private async runProphetForecasting(
    timeSeriesData: TimeSeriesData[]
  ): Promise<ProphetForecast[]> {
    try {
      const response = await this.callHuggingFaceAPI("prophet", {
        data: timeSeriesData,
        periods: 30, // Forecast 30 days ahead
        freq: "D", // Daily frequency
        include_history: false,
      });

      return this.parseProphetResponse(response);
    } catch (error) {
      throw new SimulationError(
        `Prophet forecasting failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "api_error",
        "PROPHET_API_ERROR",
        true,
        { dataPoints: timeSeriesData.length }
      );
    }
  }

  /**
   * Run LSTM forecasting via Hugging Face API
   */
  private async runLSTMForecasting(
    timeSeriesData: TimeSeriesData[]
  ): Promise<LSTMPrediction[]> {
    try {
      // Prepare LSTM input format
      const lstmInput = {
        inputs: timeSeriesData.map((point) => [
          point.y,
          point.budget || 0,
          point.audience_size || 0,
          point.channel_count || 0,
          point.creative_count || 0,
          point.market_volatility || 0,
          point.day_of_week || 0,
          point.month || 0,
        ]),
        parameters: {
          prediction_length: 30,
          context_length: Math.min(timeSeriesData.length, 64),
        },
      };

      const response = await this.callHuggingFaceAPI("lstm", lstmInput);
      return this.parseLSTMResponse(response, timeSeriesData);
    } catch (error) {
      throw new SimulationError(
        `LSTM forecasting failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "api_error",
        "LSTM_API_ERROR",
        true,
        { dataPoints: timeSeriesData.length }
      );
    }
  }

  /**
   * Run sentiment analysis on creative content
   */
  private async runSentimentAnalysis(
    creativeData: string[]
  ): Promise<SentimentAnalysis[]> {
    if (creativeData.length === 0) {
      return [];
    }

    try {
      const response = await this.callHuggingFaceAPI("sentiment", {
        inputs: creativeData,
      });

      return this.parseSentimentResponse(response);
    } catch (error) {
      // Sentiment analysis is optional, don't fail the entire prediction
      console.warn("Sentiment analysis failed:", error);
      return [];
    }
  }

  /**
   * Generic method to call Hugging Face API
   */
  private async callHuggingFaceAPI(
    modelType: keyof HuggingFaceConfig["models"],
    payload: any
  ): Promise<any> {
    const modelName = this.config.models[modelType];
    const url = `${this.config.baseUrl}/models/${modelName}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout");
      }

      throw error;
    }
  }

  /**
   * Parse Prophet API response
   */
  private parseProphetResponse(response: any): ProphetForecast[] {
    if (!response || !Array.isArray(response)) {
      throw new Error("Invalid Prophet response format");
    }

    return response.map((forecast: any, index: number) => ({
      ds:
        forecast.ds ||
        new Date(Date.now() + index * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      yhat: forecast.yhat || forecast.prediction || 0,
      yhat_lower: forecast.yhat_lower || forecast.lower || forecast.yhat * 0.8,
      yhat_upper: forecast.yhat_upper || forecast.upper || forecast.yhat * 1.2,
      trend: forecast.trend || forecast.yhat || 0,
      seasonal: forecast.seasonal || 0,
      confidence: forecast.confidence || 0.8,
    }));
  }

  /**
   * Parse LSTM API response
   */
  private parseLSTMResponse(
    response: any,
    originalData: TimeSeriesData[]
  ): LSTMPrediction[] {
    if (!response) {
      throw new Error("Invalid LSTM response format");
    }

    const predictions = response.prediction || response.predictions || response;

    if (!Array.isArray(predictions)) {
      throw new Error("LSTM response must contain predictions array");
    }

    const lastDate =
      originalData.length > 0
        ? new Date(originalData[originalData.length - 1].ds)
        : new Date();

    return predictions.map((prediction: any, index: number) => {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + index + 1);

      return {
        timestamp: forecastDate.toISOString().split("T")[0],
        prediction:
          typeof prediction === "number" ? prediction : prediction.value || 0,
        confidence: prediction.confidence || 0.7,
        features: prediction.features || {},
      };
    });
  }

  /**
   * Parse sentiment analysis response
   */
  private parseSentimentResponse(response: any): SentimentAnalysis[] {
    if (!Array.isArray(response)) {
      return [];
    }

    return response.map((result: any) => ({
      label: result.label || "NEUTRAL",
      score: result.score || 0.5,
      confidence: result.confidence || result.score || 0.5,
    }));
  }

  /**
   * Combine Prophet and LSTM outputs into trajectory points
   */
  private combineModelOutputs(
    prophetForecasts: ProphetForecast[],
    lstmPredictions: LSTMPrediction[],
    dataset: EnrichedDataset
  ): TrajectoryPoint[] {
    const trajectories: TrajectoryPoint[] = [];
    const maxLength = Math.max(prophetForecasts.length, lstmPredictions.length);

    for (let i = 0; i < maxLength; i++) {
      const prophet = prophetForecasts[i];
      const lstm = lstmPredictions[i];

      // Use the date from whichever model has data
      const dateStr = prophet?.ds || lstm?.timestamp;
      if (!dateStr) continue;

      const date = new Date(dateStr);

      // Ensemble the predictions with weighted average
      const prophetWeight = 0.6; // Prophet typically better for trend and seasonality
      const lstmWeight = 0.4; // LSTM better for complex patterns

      const prophetValue = prophet?.yhat || 0;
      const lstmValue = lstm?.prediction || 0;

      const ensembleValue =
        prophetValue * prophetWeight + lstmValue * lstmWeight;

      // Calculate confidence as weighted average of model confidences
      const prophetConfidence = prophet?.confidence || 0.5;
      const lstmConfidence = lstm?.confidence || 0.5;
      const ensembleConfidence =
        prophetConfidence * prophetWeight + lstmConfidence * lstmWeight;

      trajectories.push({
        date,
        metrics: {
          ctr: ensembleValue,
          impressions:
            ensembleValue * (dataset.audienceInsights.totalSize || 1000),
          engagement: ensembleValue * 0.8, // Estimate engagement as 80% of CTR
          reach:
            ensembleValue * (dataset.audienceInsights.totalSize || 1000) * 0.6,
        },
        confidence: ensembleConfidence,
      });
    }

    return trajectories;
  }

  /**
   * Calculate confidence intervals from model outputs
   */
  private calculateConfidenceIntervals(
    prophetForecasts: ProphetForecast[],
    lstmPredictions: LSTMPrediction[]
  ): ConfidenceInterval[] {
    const intervals: ConfidenceInterval[] = [];
    const maxLength = Math.max(prophetForecasts.length, lstmPredictions.length);

    for (let i = 0; i < maxLength; i++) {
      const prophet = prophetForecasts[i];
      const lstm = lstmPredictions[i];

      if (prophet) {
        // Use Prophet's built-in confidence intervals
        intervals.push({
          lower: prophet.yhat_lower,
          upper: prophet.yhat_upper,
          confidence_level: 0.8, // Prophet typically uses 80% confidence intervals
        });
      } else if (lstm) {
        // Estimate confidence intervals for LSTM based on confidence score
        const prediction = lstm.prediction;
        const confidence = lstm.confidence;
        const margin = prediction * (1 - confidence) * 0.5;

        intervals.push({
          lower: prediction - margin,
          upper: prediction + margin,
          confidence_level: confidence,
        });
      }
    }

    return intervals;
  }

  /**
   * Calculate feature importance based on model inputs and sentiment analysis
   */
  private calculateFeatureImportance(
    dataset: EnrichedDataset,
    sentimentAnalysis: SentimentAnalysis[]
  ): FeatureImportance[] {
    const importance: FeatureImportance[] = [
      {
        feature: "historical_performance",
        importance: 0.35,
        category: "campaign",
      },
      {
        feature: "budget_allocation",
        importance: 0.25,
        category: "campaign",
      },
      {
        feature: "audience_size",
        importance: 0.15,
        category: "campaign",
      },
      {
        feature: "seasonality",
        importance: 0.1,
        category: "temporal",
      },
      {
        feature: "market_volatility",
        importance: dataset.marketData?.marketVolatility ? 0.08 : 0,
        category: "market",
      },
      {
        feature: "creative_sentiment",
        importance: sentimentAnalysis.length > 0 ? 0.07 : 0,
        category: "campaign",
      },
    ];

    // Normalize importance scores to sum to 1
    const totalImportance = importance.reduce(
      (sum, item) => sum + item.importance,
      0
    );
    return importance.map((item) => ({
      ...item,
      importance: item.importance / totalImportance,
    }));
  }

  /**
   * Calculate overall confidence score from model outputs
   */
  private calculateOverallConfidence(
    prophetForecasts: ProphetForecast[],
    lstmPredictions: LSTMPrediction[]
  ): number {
    const prophetConfidences = prophetForecasts.map((f) => f.confidence);
    const lstmConfidences = lstmPredictions.map((p) => p.confidence);

    const allConfidences = [...prophetConfidences, ...lstmConfidences];

    if (allConfidences.length === 0) {
      return 0.5; // Default confidence
    }

    const avgConfidence =
      allConfidences.reduce((sum, conf) => sum + conf, 0) /
      allConfidences.length;

    // Penalize confidence if we have very few data points
    const dataPointPenalty = Math.min(1, allConfidences.length / 10);

    return avgConfidence * dataPointPenalty;
  }
}
