/**
 * Caching and Performance Optimization Module
 *
 * This module provides caching and async processing capabilities for the
 * AI Trajectory Simulation Engine to improve performance and handle
 * long-running operations efficiently.
 */

export { SimulationCache } from "./SimulationCache";
export { AsyncProcessingQueue } from "./AsyncProcessingQueue";

export type { CacheMetrics, CacheConfig } from "./SimulationCache";

export type {
  QueueConfig,
  QueueMetrics,
  JobProgress,
  PriorityConfig,
} from "./AsyncProcessingQueue";

// Re-export relevant types from simulation types
export type {
  SimulationRequest,
  SimulationResult,
  SimulationStatus,
  ProcessingQueue,
  SimulationContext,
  CacheKey,
} from "../../../types/simulation";
