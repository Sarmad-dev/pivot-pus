/**
 * AsyncProcessingQueue - Handles background processing of long-running simulations
 * 
 * This class implements a priority queue system for managing simulation requests,
 * providing progress tracking, status updates, and subscription tier-based prioritization.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { 
  SimulationRequest, 
  SimulationResult, 
  SimulationStatus,
  ProcessingQueue,
  SimulationContext 
} from "../../../types/simulation";

export interface QueueConfig {
  maxConcurrentJobs: number;
  defaultPriority: number;
  maxRetries: number;
  retryDelayMs: number;
  progressUpdateIntervalMs: number;
  jobTimeoutMs: number;
}

export interface QueueMetrics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  currentQueueSize: number;
  activeJobs: number;
}

export interface JobProgress {
  simulationId: string;
  status: SimulationStatus;
  progress: number; // 0-100
  currentStep: string;
  estimatedTimeRemaining: number; // milliseconds
  startedAt: Date;
  lastUpdated: Date;
}

export interface PriorityConfig {
  tier: 'free' | 'pro' | 'enterprise';
  priority: number;
  maxConcurrentJobs: number;
  maxQueuedJobs: number;
}

export class AsyncProcessingQueue {
  private convex: ConvexHttpClient;
  private config: QueueConfig;
  private metrics: QueueMetrics;
  private activeJobs: Map<string, JobProgress>;
  private priorityConfigs: Map<string, PriorityConfig> = new Map();
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(convex: ConvexHttpClient, config?: Partial<QueueConfig>) {
    this.convex = convex;
    this.config = {
      maxConcurrentJobs: 5,
      defaultPriority: 50,
      maxRetries: 3,
      retryDelayMs: 5000,
      progressUpdateIntervalMs: 2000,
      jobTimeoutMs: 30 * 60 * 1000, // 30 minutes
      ...config
    };

    this.metrics = {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      averageProcessingTime: 0,
      currentQueueSize: 0,
      activeJobs: 0
    };

    this.activeJobs = new Map();
    this.setupPriorityConfigs();
    this.startProcessing();
  }

  /**
   * Setup priority configurations for different subscription tiers
   */
  private setupPriorityConfigs(): void {
    this.priorityConfigs = new Map([
      ['free', {
        tier: 'free',
        priority: 10,
        maxConcurrentJobs: 1,
        maxQueuedJobs: 3
      }],
      ['pro', {
        tier: 'pro',
        priority: 50,
        maxConcurrentJobs: 3,
        maxQueuedJobs: 10
      }],
      ['enterprise', {
        tier: 'enterprise',
        priority: 90,
        maxConcurrentJobs: 10,
        maxQueuedJobs: 50
      }]
    ]);
  }

  /**
   * Queue a simulation for background processing
   */
  async queueSimulation(
    request: SimulationRequest,
    organizationId: Id<"organizations">,
    userId: Id<"users">,
    subscriptionTier: 'free' | 'pro' | 'enterprise' = 'free'
  ): Promise<string> {
    try {
      // Get priority configuration for user's subscription tier
      const priorityConfig = this.priorityConfigs.get(subscriptionTier) || this.priorityConfigs.get('free')!;

      // Check queue limits for this tier
      const userQueuedJobs = await this.getUserQueuedJobsCount(organizationId);
      if (userQueuedJobs >= priorityConfig.maxQueuedJobs) {
        throw new Error(`Queue limit exceeded for ${subscriptionTier} tier. Maximum ${priorityConfig.maxQueuedJobs} queued jobs allowed.`);
      }

      // Estimate processing duration based on request complexity
      const estimatedDuration = this.estimateProcessingDuration(request);

      // Note: These would use the actual API once generated
      // Create simulation record
      // const simulationId = await this.convex.mutation(api.simulations.create, {
      //   campaignId: request.campaignId,
      //   organizationId,
      //   createdBy: userId,
      //   config: {
      //     timeframe: {
      //       startDate: request.timeframe.startDate.getTime(),
      //       endDate: request.timeframe.endDate.getTime(),
      //       granularity: request.timeframe.granularity
      //     },
      //     metrics: request.metrics,
      //     scenarios: request.scenarios.map(s => s.type),
      //     externalDataSources: request.externalDataSources.map(ds => ds.source)
      //   },
      //   status: 'queued' as const
      // });

      // Add to processing queue
      // await this.convex.mutation(api.processingQueue.enqueue, {
      //   simulationId,
      //   organizationId,
      //   userId,
      //   priority: priorityConfig.priority,
      //   estimatedDuration,
      //   subscriptionTier,
      //   queuedAt: Date.now()
      // });

      const simulationId = `sim_${Date.now()}`; // Placeholder

      this.metrics.totalJobs++;
      this.updateQueueMetrics();

      return simulationId;

    } catch (error) {
      console.error('Error queuing simulation:', error);
      throw error;
    }
  }

  /**
   * Get current job progress
   */
  async getJobProgress(simulationId: string): Promise<JobProgress | null> {
    // Check active jobs first
    if (this.activeJobs.has(simulationId)) {
      return this.activeJobs.get(simulationId)!;
    }

    // Check database for job status
    try {
      // Note: These would use the actual API once generated
      // const simulation = await this.convex.query(api.simulations.get, { 
      //   id: simulationId as Id<"simulations"> 
      // });
      // const queueEntry = await this.convex.query(api.processingQueue.getBySimulationId, {
      //   simulationId: simulationId as Id<"simulations">
      // });

      // Placeholder implementation - always return null for now
      return null;

    } catch (error) {
      console.error('Error getting job progress:', error);
      return null;
    }
  }

  /**
   * Cancel a queued or processing simulation
   */
  async cancelSimulation(simulationId: string, userId: Id<"users">): Promise<boolean> {
    try {
      // Note: These would use the actual API once generated
      // Check if user has permission to cancel this simulation
      // const simulation = await this.convex.query(api.simulations.get, { 
      //   id: simulationId as Id<"simulations"> 
      // });

      // if (!simulation || simulation.createdBy !== userId) {
      //   throw new Error('Permission denied or simulation not found');
      // }

      // if (simulation.status === 'completed') {
      //   throw new Error('Cannot cancel completed simulation');
      // }

      // Update simulation status
      // await this.convex.mutation(api.simulations.updateStatus, {
      //   id: simulationId as Id<"simulations">,
      //   status: 'cancelled' as const
      // });

      // Remove from queue
      // await this.convex.mutation(api.processingQueue.cancel, {
      //   simulationId: simulationId as Id<"simulations">
      // });

      console.log('Cancel simulation operation (placeholder)');

      // Remove from active jobs
      this.activeJobs.delete(simulationId);

      return true;

    } catch (error) {
      console.error('Error cancelling simulation:', error);
      return false;
    }
  }

  /**
   * Get queue status for an organization
   */
  async getQueueStatus(organizationId: Id<"organizations">): Promise<{
    queuedJobs: number;
    processingJobs: number;
    estimatedWaitTime: number;
    userPosition?: number;
  }> {
    try {
      // Note: This would use the actual API once generated
      // const queueStatus = await this.convex.query(api.processingQueue.getOrganizationStatus, {
      //   organizationId
      // });
      // return queueStatus;

      return {
        queuedJobs: 0,
        processingJobs: 0,
        estimatedWaitTime: 0
      }; // Placeholder

    } catch (error) {
      console.error('Error getting queue status:', error);
      return {
        queuedJobs: 0,
        processingJobs: 0,
        estimatedWaitTime: 0
      };
    }
  }

  /**
   * Get current queue metrics
   */
  getMetrics(): QueueMetrics {
    return { ...this.metrics };
  }

  /**
   * Start the background processing loop
   */
  private startProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(async () => {
      await this.processQueue();
    }, this.config.progressUpdateIntervalMs);
  }

  /**
   * Stop the background processing loop
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Process the next jobs in the queue
   */
  private async processQueue(): Promise<void> {
    try {
      // Check how many jobs we can start
      const availableSlots = this.config.maxConcurrentJobs - this.activeJobs.size;
      if (availableSlots <= 0) {
        return;
      }

      // Get next jobs to process
      // Note: This would use the actual API once generated
      // const nextJobs = await this.convex.query(api.processingQueue.getNextJobs, {
      //   limit: availableSlots
      // });
      const nextJobs: any[] = []; // Placeholder

      // Start processing each job
      for (const job of nextJobs) {
        this.startJobProcessing(job);
      }

      // Update metrics
      this.updateQueueMetrics();

    } catch (error) {
      console.error('Error processing queue:', error);
    }
  }

  /**
   * Start processing a specific job
   */
  private async startJobProcessing(job: any): Promise<void> {
    const simulationId = job.simulationId;

    try {
      // Mark job as processing
      // Note: These would use the actual API once generated
      // await this.convex.mutation(api.processingQueue.startProcessing, {
      //   id: job._id,
      //   startedAt: Date.now()
      // });

      // await this.convex.mutation(api.simulations.updateStatus, {
      //   id: simulationId,
      //   status: 'processing' as const
      // });

      console.log('Start processing operation (placeholder)');

      // Add to active jobs
      const jobProgress: JobProgress = {
        simulationId,
        status: 'processing',
        progress: 0,
        currentStep: 'Initializing simulation',
        estimatedTimeRemaining: job.estimatedDuration,
        startedAt: new Date(),
        lastUpdated: new Date()
      };

      this.activeJobs.set(simulationId, jobProgress);

      // Start the actual simulation processing
      this.processSimulation(simulationId, job);

    } catch (error) {
      console.error(`Error starting job processing for ${simulationId}:`, error);
      await this.handleJobFailure(simulationId, error);
    }
  }

  /**
   * Process a simulation (this would integrate with the actual simulation engine)
   */
  private async processSimulation(simulationId: string, job: any): Promise<void> {
    const jobProgress = this.activeJobs.get(simulationId);
    if (!jobProgress) return;

    try {
      // Simulate processing steps with progress updates
      const steps = [
        { name: 'Loading campaign data', duration: 2000, progress: 10 },
        { name: 'Fetching market data', duration: 3000, progress: 25 },
        { name: 'Running AI models', duration: 15000, progress: 70 },
        { name: 'Generating scenarios', duration: 5000, progress: 85 },
        { name: 'Calculating recommendations', duration: 3000, progress: 95 },
        { name: 'Finalizing results', duration: 2000, progress: 100 }
      ];

      for (const step of steps) {
        // Update progress
        jobProgress.currentStep = step.name;
        jobProgress.progress = step.progress;
        jobProgress.lastUpdated = new Date();
        jobProgress.estimatedTimeRemaining = Math.max(0, 
          jobProgress.estimatedTimeRemaining - step.duration
        );

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, step.duration));

        // Check if job was cancelled
        // Note: This would use the actual API once generated
        // const currentSimulation = await this.convex.query(api.simulations.get, { 
        //   id: simulationId as Id<"simulations"> 
        // });
        
        // if (currentSimulation?.status === 'cancelled') {
        //   this.activeJobs.delete(simulationId);
        //   return;
        // }
      }

      // Mark as completed
      await this.completeJob(simulationId, {
        // Mock result - in real implementation, this would come from the simulation engine
        trajectories: [],
        scenarios: [],
        risks: [],
        recommendations: [],
        modelMetadata: {
          primaryModel: 'mock',
          modelVersions: {},
          processingTime: Date.now() - jobProgress.startedAt.getTime(),
          dataQuality: {
            completeness: 0.95,
            accuracy: 0.90,
            freshness: 0.85
          }
        }
      });

    } catch (error) {
      console.error(`Error processing simulation ${simulationId}:`, error);
      await this.handleJobFailure(simulationId, error);
    }
  }

  /**
   * Complete a job successfully
   */
  private async completeJob(simulationId: string, result: any): Promise<void> {
    try {
      // Update simulation with results
      // Note: These would use the actual API once generated
      // await this.convex.mutation(api.simulations.complete, {
      //   id: simulationId as Id<"simulations">,
      //   results: result,
      //   completedAt: Date.now()
      // });

      // Remove from queue
      // await this.convex.mutation(api.processingQueue.complete, {
      //   simulationId: simulationId as Id<"simulations">
      // });

      console.log('Complete job operation (placeholder)');

      // Remove from active jobs
      this.activeJobs.delete(simulationId);

      // Update metrics
      this.metrics.completedJobs++;
      this.updateAverageProcessingTime(simulationId);

    } catch (error) {
      console.error(`Error completing job ${simulationId}:`, error);
    }
  }

  /**
   * Handle job failure
   */
  private async handleJobFailure(simulationId: string, error: any): Promise<void> {
    try {
      // Update simulation status
      // Note: These would use the actual API once generated
      // await this.convex.mutation(api.simulations.updateStatus, {
      //   id: simulationId as Id<"simulations">,
      //   status: 'failed' as const
      // });

      // Check if we should retry
      // const queueEntry = await this.convex.query(api.processingQueue.getBySimulationId, {
      //   simulationId: simulationId as Id<"simulations">
      // });

      // if (queueEntry && queueEntry.retryCount < this.config.maxRetries) {
      //   // Schedule retry
      //   setTimeout(async () => {
      //     await this.convex.mutation(api.processingQueue.retry, {
      //       id: queueEntry._id,
      //       retryCount: queueEntry.retryCount + 1,
      //       retryAt: Date.now() + this.config.retryDelayMs
      //     });
      //   }, this.config.retryDelayMs);
      // } else {
      //   // Mark as permanently failed
      //   await this.convex.mutation(api.processingQueue.fail, {
      //     simulationId: simulationId as Id<"simulations">,
      //     error: error.message || 'Unknown error'
      //   });
      // }

      console.log('Handle job failure operation (placeholder)');

      // Remove from active jobs
      this.activeJobs.delete(simulationId);

      // Update metrics
      this.metrics.failedJobs++;

    } catch (err) {
      console.error(`Error handling job failure for ${simulationId}:`, err);
    }
  }

  /**
   * Estimate processing duration based on request complexity
   */
  private estimateProcessingDuration(request: SimulationRequest): number {
    let baseDuration = 30000; // 30 seconds base

    // Add time for each scenario
    baseDuration += request.scenarios.length * 10000;

    // Add time for external data sources
    baseDuration += request.externalDataSources.length * 15000;

    // Add time based on timeframe
    const days = Math.ceil(
      (request.timeframe.endDate.getTime() - request.timeframe.startDate.getTime()) 
      / (1000 * 60 * 60 * 24)
    );
    baseDuration += Math.min(days * 1000, 60000);

    // Add time for each metric
    baseDuration += request.metrics.length * 2000;

    return baseDuration;
  }

  /**
   * Calculate progress based on status and elapsed time
   */
  private calculateProgress(status: SimulationStatus, startedAt?: number): number {
    switch (status) {
      case 'queued':
        return 0;
      case 'processing':
        if (!startedAt) return 5;
        const elapsed = Date.now() - startedAt;
        // Rough progress estimation based on elapsed time
        return Math.min(Math.floor((elapsed / 30000) * 100), 95);
      case 'completed':
        return 100;
      case 'failed':
      case 'cancelled':
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Get current step description based on status
   */
  private getCurrentStep(status: SimulationStatus): string {
    switch (status) {
      case 'queued':
        return 'Waiting in queue';
      case 'processing':
        return 'Processing simulation';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  /**
   * Estimate time remaining for a job
   */
  private estimateTimeRemaining(queueEntry: any): number {
    if (queueEntry.startedAt) {
      const elapsed = Date.now() - queueEntry.startedAt;
      return Math.max(0, queueEntry.estimatedDuration - elapsed);
    }
    return queueEntry.estimatedDuration;
  }

  /**
   * Get count of queued jobs for a user
   */
  private async getUserQueuedJobsCount(organizationId: Id<"organizations">): Promise<number> {
    try {
      // Note: This would use the actual API once generated
      // const count = await this.convex.query(api.processingQueue.getUserQueuedCount, {
      //   organizationId
      // });
      // return count;
      return 0; // Placeholder
    } catch (error) {
      console.error('Error getting user queued jobs count:', error);
      return 0;
    }
  }

  /**
   * Update queue metrics
   */
  private async updateQueueMetrics(): Promise<void> {
    try {
      // Note: This would use the actual API once generated
      // const queueSize = await this.convex.query(api.processingQueue.getQueueSize);
      // this.metrics.currentQueueSize = queueSize;
      this.metrics.currentQueueSize = 0; // Placeholder
      this.metrics.activeJobs = this.activeJobs.size;
    } catch (error) {
      console.error('Error updating queue metrics:', error);
    }
  }

  /**
   * Update average processing time
   */
  private updateAverageProcessingTime(simulationId: string): void {
    const jobProgress = this.activeJobs.get(simulationId);
    if (!jobProgress) return;

    const processingTime = Date.now() - jobProgress.startedAt.getTime();
    
    // Update using exponential moving average
    const alpha = 0.1;
    this.metrics.averageProcessingTime = 
      (alpha * processingTime) + ((1 - alpha) * this.metrics.averageProcessingTime);
  }
}

export default AsyncProcessingQueue;