/**
 * Enhanced Import Manager with better error handling, retry mechanisms,
 * partial import support, and progress tracking with cancellation
 */

import { Id } from "../../../convex/_generated/dataModel";
import { PlatformType } from "@/lib/api/types";
import {
  PlatformAPIError,
  AuthenticationError,
  RateLimitError,
  NetworkError,
} from "@/lib/api/errors";
import { withRetry, RetryManager } from "@/lib/api/retry";

export interface ImportProgress {
  total: number;
  completed: number;
  failed: number;
  currentItem?: string;
  status: "idle" | "running" | "paused" | "cancelled" | "completed" | "failed";
  errors: ImportError[];
  warnings: ImportWarning[];
}

export interface ImportError {
  id: string;
  name: string;
  error: string;
  retryable: boolean;
  timestamp: number;
}

export interface ImportWarning {
  id: string;
  name: string;
  message: string;
  timestamp: number;
}

export interface ImportResult {
  success: boolean;
  importedIds: Id<"campaigns">[];
  failedItems: ImportError[];
  warnings: ImportWarning[];
  cancelled: boolean;
}

export interface ImportOptions {
  retryFailedItems?: boolean;
  maxRetries?: number;
  batchSize?: number;
  delayBetweenBatches?: number;
  onProgress?: (progress: ImportProgress) => void;
  onError?: (error: ImportError) => void;
  onWarning?: (warning: ImportWarning) => void;
}

export interface ImportItem {
  id: string;
  name: string;
  data: any;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export class ImportManager {
  private progress: ImportProgress;
  private cancelled = false;
  private retryManager: RetryManager;
  private options: Required<ImportOptions>;

  constructor(options: ImportOptions = {}) {
    this.progress = {
      total: 0,
      completed: 0,
      failed: 0,
      status: "idle",
      errors: [],
      warnings: [],
    };

    this.retryManager = new RetryManager({
      maxRetries: options.maxRetries || 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
    });

    this.options = {
      retryFailedItems: options.retryFailedItems ?? true,
      maxRetries: options.maxRetries ?? 3,
      batchSize: options.batchSize ?? 5,
      delayBetweenBatches: options.delayBetweenBatches ?? 1000,
      onProgress: options.onProgress ?? (() => {}),
      onError: options.onError ?? (() => {}),
      onWarning: options.onWarning ?? (() => {}),
    };
  }

  /**
   * Cancel the import process
   */
  cancel(): void {
    this.cancelled = true;
    this.progress.status = "cancelled";
    this.notifyProgress();
  }

  /**
   * Check if import is cancelled
   */
  isCancelled(): boolean {
    return this.cancelled;
  }

  /**
   * Get current progress
   */
  getProgress(): ImportProgress {
    return { ...this.progress };
  }

  /**
   * Import campaigns with enhanced error handling and progress tracking
   */
  async importCampaigns(
    items: ImportItem[],
    importFunction: (
      data: any,
      organizationId: Id<"organizations">
    ) => Promise<Id<"campaigns">>,
    organizationId: Id<"organizations">
  ): Promise<ImportResult> {
    this.progress = {
      total: items.length,
      completed: 0,
      failed: 0,
      status: "running",
      errors: [],
      warnings: [],
    };
    this.cancelled = false;

    const importedIds: Id<"campaigns">[] = [];
    const failedItems: ImportError[] = [];
    const warnings: ImportWarning[] = [];

    // Validate items first and collect warnings
    const validItems = items.filter((item) => {
      if (!item.validation.isValid) {
        const error: ImportError = {
          id: item.id,
          name: item.name,
          error: `Validation failed: ${item.validation.errors.join(", ")}`,
          retryable: false,
          timestamp: Date.now(),
        };
        failedItems.push(error);
        this.progress.failed++;
        this.options.onError(error);
        return false;
      }

      // Collect warnings
      if (item.validation.warnings.length > 0) {
        const warning: ImportWarning = {
          id: item.id,
          name: item.name,
          message: item.validation.warnings.join(", "),
          timestamp: Date.now(),
        };
        warnings.push(warning);
        this.options.onWarning(warning);
      }

      return true;
    });

    this.notifyProgress();

    // Process items in batches
    const batches = this.createBatches(validItems, this.options.batchSize);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      if (this.cancelled) {
        break;
      }

      const batch = batches[batchIndex];

      // Process batch items in parallel
      const batchPromises = batch.map((item) =>
        this.importSingleItem(item, importFunction, organizationId)
      );

      const batchResults = await Promise.allSettled(batchPromises);

      // Process batch results
      for (let i = 0; i < batchResults.length; i++) {
        const result = batchResults[i];
        const item = batch[i];

        if (
          result.status === "fulfilled" &&
          result.value.success &&
          result.value.campaignId
        ) {
          importedIds.push(result.value.campaignId);
          this.progress.completed++;
        } else {
          const error: ImportError = {
            id: item.id,
            name: item.name,
            error:
              result.status === "rejected"
                ? result.reason?.message || "Unknown error"
                : result.value.error || "Unknown error",
            retryable:
              result.status === "rejected"
                ? this.isRetryableError(result.reason)
                : result.value.retryable || false,
            timestamp: Date.now(),
          };
          failedItems.push(error);
          this.progress.failed++;
          this.options.onError(error);
        }

        this.notifyProgress();
      }

      // Add delay between batches (except for the last batch)
      if (batchIndex < batches.length - 1 && !this.cancelled) {
        await this.sleep(this.options.delayBetweenBatches);
      }
    }

    // Retry failed items if enabled and not cancelled
    if (this.options.retryFailedItems && !this.cancelled) {
      const retryableItems = failedItems
        .filter((error) => error.retryable)
        .map((error) => items.find((item) => item.id === error.id))
        .filter(Boolean) as ImportItem[];

      if (retryableItems.length > 0) {
        const retryResult = await this.retryFailedItems(
          retryableItems,
          importFunction,
          organizationId
        );

        // Update results with retry outcomes
        importedIds.push(...retryResult.importedIds);

        // Remove successfully retried items from failed list
        retryResult.importedIds.forEach((campaignId) => {
          const retryItem = retryableItems.find((item) => {
            // Find the item that corresponds to this campaign ID
            // Since we don't have a direct mapping, we'll match by removing from failed items
            return true; // We'll handle this differently below
          });

          // Remove the first retryable error since we successfully imported one
          const retryableErrorIndex = failedItems.findIndex(
            (error) => error.retryable
          );
          if (retryableErrorIndex >= 0) {
            failedItems.splice(retryableErrorIndex, 1);
            this.progress.failed--;
            this.progress.completed++;
          }
        });

        // Add new failures from retry
        failedItems.push(...retryResult.failedItems);
      }
    }

    this.progress.status = this.cancelled ? "cancelled" : "completed";
    this.notifyProgress();

    return {
      success: !this.cancelled && failedItems.length === 0,
      importedIds,
      failedItems,
      warnings,
      cancelled: this.cancelled,
    };
  }

  /**
   * Import a single item with enhanced error handling
   */
  private async importSingleItem(
    item: ImportItem,
    importFunction: (
      data: any,
      organizationId: Id<"organizations">
    ) => Promise<Id<"campaigns">>,
    organizationId: Id<"organizations">
  ): Promise<{
    success: boolean;
    campaignId?: Id<"campaigns">;
    error?: string;
    retryable?: boolean;
  }> {
    this.progress.currentItem = item.name;
    this.notifyProgress();

    try {
      const campaignId = await this.retryManager.execute(async () => {
        if (this.cancelled) {
          throw new Error("Import cancelled");
        }
        return await importFunction(item.data, organizationId);
      });

      return { success: true, campaignId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const retryable = this.isRetryableError(error);

      return {
        success: false,
        error: errorMessage,
        retryable: retryable,
      };
    }
  }

  /**
   * Retry failed items with exponential backoff
   */
  private async retryFailedItems(
    items: ImportItem[],
    importFunction: (
      data: any,
      organizationId: Id<"organizations">
    ) => Promise<Id<"campaigns">>,
    organizationId: Id<"organizations">
  ): Promise<{ importedIds: Id<"campaigns">[]; failedItems: ImportError[] }> {
    const importedIds: Id<"campaigns">[] = [];
    const failedItems: ImportError[] = [];

    for (const item of items) {
      if (this.cancelled) {
        break;
      }

      try {
        // Use exponential backoff for retries
        const campaignId = await withRetry(
          async () => {
            if (this.cancelled) {
              throw new Error("Import cancelled");
            }
            return await importFunction(item.data, organizationId);
          },
          { maxRetries: this.options.maxRetries }
        );

        importedIds.push(campaignId);
      } catch (error) {
        const failedItem: ImportError = {
          id: item.id,
          name: item.name,
          error: error instanceof Error ? error.message : "Retry failed",
          retryable: false, // Don't retry again
          timestamp: Date.now(),
        };
        failedItems.push(failedItem);
        this.options.onError(failedItem);
      }
    }

    return { importedIds, failedItems };
  }

  /**
   * Create batches from items array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (error instanceof PlatformAPIError) {
      return error.retryable;
    }

    if (error instanceof NetworkError || error instanceof RateLimitError) {
      return true;
    }

    if (error instanceof AuthenticationError) {
      return false;
    }

    // Check for common retryable error patterns
    const errorMessage = error?.message?.toLowerCase() || "";
    const retryablePatterns = [
      "timeout",
      "network",
      "connection",
      "rate limit",
      "too many requests",
      "service unavailable",
      "internal server error",
      "bad gateway",
      "gateway timeout",
    ];

    return retryablePatterns.some((pattern) => errorMessage.includes(pattern));
  }

  /**
   * Notify progress listeners
   */
  private notifyProgress(): void {
    this.progress.errors = [...this.progress.errors];
    this.progress.warnings = [...this.progress.warnings];
    this.options.onProgress(this.progress);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
