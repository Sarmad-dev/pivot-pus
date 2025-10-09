/**
 * CacheManager - Orchestrates caching and async processing
 * 
 * This class provides a unified interface for managing both caching
 * and async processing of simulations, integrating SimulationCache
 * and AsyncProcessingQueue.
 */

import { ConvexHttpClient } from "convex/browser";
import { Id } from "../../../../convex/_generated/dataModel";
import { 
  SimulationRequest, 
  SimulationResult,
  SimulationContext 
} from "../../../types/simulation";
import { SimulationCache, CacheConfig } from './SimulationCache';
import { AsyncProcessingQueue, QueueConfig } from './AsyncProcessingQueue';

export interface CacheManagerConfig {
  cache?: Partial<CacheConfig>;
  queue?: Partial<QueueConfig>;
  enableSmartCaching?: boolean;
  cacheThreshold?: number; // Minimum cache value to enable caching
}

export class CacheManager {
  private cache: SimulationCache;
  private queue: AsyncProcessingQueue;
  private config: CacheManagerConfig;

  constructor(convex: ConvexHttpClient, config?: CacheManagerConfig) {
    this.config = {
      enableSmartCaching: true,
      cacheThreshold: 50,
      ...config
    };

    this.cache = new SimulationCache(convex, this.config.cache);
    this.queue = new AsyncProcessingQueue(convex, this.config.queue);
  }

  /**
   * Process a simulation request with intelligent caching and queuing
   */
  async processSimulation(
    request: SimulationRequest,
    organizationId: Id<"organizations">,
    userId: Id<"users">,
    subscriptionTier: 'free' | 'pro' | 'enterprise' = 'free',
    forceAsync: boolean = false
  ): Promise<{ simulationId: string; cached: boolean; queued: boolean }> {
    
    // Check cache first if smart caching is enabled
    if (this.config.enableSmartCaching) {
      const cachedResult = await this.cache.getCachedResult(request);
      if (cachedResult) {
        return {
          simulationId: cachedResult.id,
          cached: true,
          queued: false
        };
      }
    }

    // Determine if this should be processed asynchronously
    const shouldQueue = forceAsync || this.shouldProcessAsync(request, subscriptionTier);

    if (shouldQueue) {
      // Queue for async processing
      const simulationId = await this.queue.queueSimulation(
        request,
        organizationId,
        userId,
        subscriptionTier
      );

      return {
        simulationId,
        cached: false,
        queued: true
      };
    } else {
      // Process synchronously (this would integrate with the actual simulation engine)
      throw new Error('Synchronous processing not implemented in this example');
    }
  }

  /**
   * Get simulation status with progress information
   */
  async getSimulationStatus(simulationId: string): Promise<{
    status: string;
    progress?: number;
    estimatedTimeRemaining?: number;
    cached: boolean;
  }> {
    // Check if this is a queued job
    const jobProgress = await this.queue.getJobProgress(simulationId);
    
    if (jobProgress) {
      return {
        status: jobProgress.status,
        progress: jobProgress.progress,
        estimatedTimeRemaining: jobProgress.estimatedTimeRemaining,
        cached: false
      };
    }

    // If not in queue, it might be a cached result
    return {
      status: 'unknown',
      cached: false
    };
  }

  /**
   * Cancel a simulation
   */
  async cancelSimulation(simulationId: string, userId: Id<"users">): Promise<boolean> {
    return await this.queue.cancelSimulation(simulationId, userId);
  }

  /**
   * Get cache and queue metrics
   */
  getPerformanceMetrics(): {
    cache: any;
    queue: any;
  } {
    return {
      cache: this.cache.getMetrics(),
      queue: this.queue.getMetrics()
    };
  }

  /**
   * Invalidate cache for a campaign
   */
  async invalidateCampaignCache(campaignId: Id<"campaigns">): Promise<void> {
    await this.cache.invalidateCampaignCache(campaignId);
  }

  /**
   * Cleanup expired cache entries and old jobs
   */
  async performMaintenance(): Promise<{
    expiredCacheEntries: number;
    oldJobsCleanedUp: number;
  }> {
    const expiredCacheEntries = await this.cache.cleanupExpiredEntries();
    
    // Note: oldJobsCleanedUp would require implementing the cleanup in the queue
    const oldJobsCleanedUp = 0;

    return {
      expiredCacheEntries,
      oldJobsCleanedUp
    };
  }

  /**
   * Get queue status for an organization
   */
  async getOrganizationQueueStatus(organizationId: Id<"organizations">): Promise<{
    queuedJobs: number;
    processingJobs: number;
    estimatedWaitTime: number;
  }> {
    return await this.queue.getQueueStatus(organizationId);
  }

  /**
   * Determine if a simulation should be processed asynchronously
   */
  private shouldProcessAsync(
    request: SimulationRequest, 
    subscriptionTier: 'free' | 'pro' | 'enterprise'
  ): boolean {
    // Always queue for free tier to manage resource usage
    if (subscriptionTier === 'free') {
      return true;
    }

    // Check if the simulation is complex enough to warrant async processing
    const cacheValue = this.cache.estimateCacheValue(request);
    
    // If cache value is high, it's likely a complex simulation
    if (cacheValue > this.config.cacheThreshold!) {
      return true;
    }

    // Check specific complexity factors
    const complexityFactors = [
      request.scenarios.length > 2,
      request.externalDataSources.length > 1,
      request.metrics.length > 5,
      this.getTimeframeDays(request) > 14
    ];

    const complexityScore = complexityFactors.filter(Boolean).length;
    
    // Queue if 2 or more complexity factors are present
    return complexityScore >= 2;
  }

  /**
   * Get timeframe in days
   */
  private getTimeframeDays(request: SimulationRequest): number {
    return Math.ceil(
      (request.timeframe.endDate.getTime() - request.timeframe.startDate.getTime()) 
      / (1000 * 60 * 60 * 24)
    );
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CacheManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.cache) {
      this.cache.updateConfig(newConfig.cache);
    }
  }

  /**
   * Shutdown the cache manager
   */
  shutdown(): void {
    this.queue.stopProcessing();
  }
}

export default CacheManager;