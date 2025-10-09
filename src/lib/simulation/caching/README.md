# Caching and Performance Optimization Module

This module provides caching and async processing capabilities for the AI Trajectory Simulation Engine to improve performance and handle long-running operations efficiently.

## Components

### SimulationCache

Handles intelligent caching of expensive AI operations to reduce API costs and improve response times.

**Features:**
- Cache key generation based on simulation parameters (excludes user-specific data for cross-user caching)
- Configurable TTL (Time To Live) and cache size limits
- Cache hit/miss tracking and performance metrics
- Smart caching decisions based on simulation complexity
- Cache invalidation for campaigns
- Automatic cleanup of expired entries

**Usage:**
```typescript
import { SimulationCache } from './SimulationCache';

const cache = new SimulationCache(convex, {
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  maxCacheSize: 10000,
  enableMetrics: true
});

// Check cache before running simulation
const cachedResult = await cache.getCachedResult(request);
if (cachedResult) {
  return cachedResult;
}

// Store result after simulation
await cache.setCachedResult(request, result);
```

### AsyncProcessingQueue

Manages background processing of long-running simulations with priority queuing based on subscription tiers.

**Features:**
- Priority-based queuing (free, pro, enterprise tiers)
- Progress tracking and status updates
- Retry logic with exponential backoff
- Concurrent job processing with configurable limits
- Queue metrics and monitoring
- Job cancellation support

**Usage:**
```typescript
import { AsyncProcessingQueue } from './AsyncProcessingQueue';

const queue = new AsyncProcessingQueue(convex, {
  maxConcurrentJobs: 5,
  maxRetries: 3,
  jobTimeoutMs: 30 * 60 * 1000 // 30 minutes
});

// Queue a simulation
const simulationId = await queue.queueSimulation(
  request, 
  organizationId, 
  userId, 
  'pro' // subscription tier
);

// Check progress
const progress = await queue.getJobProgress(simulationId);
```

### CacheManager

Provides a unified interface that orchestrates both caching and async processing.

**Features:**
- Intelligent decision making between sync/async processing
- Automatic cache checking before queuing
- Performance metrics aggregation
- Maintenance operations (cleanup, invalidation)

**Usage:**
```typescript
import { CacheManager } from './CacheManager';

const cacheManager = new CacheManager(convex, {
  enableSmartCaching: true,
  cacheThreshold: 50
});

// Process simulation with intelligent caching/queuing
const result = await cacheManager.processSimulation(
  request,
  organizationId,
  userId,
  'pro'
);

// Get performance metrics
const metrics = cacheManager.getPerformanceMetrics();
```

## Database Schema

The module extends the Convex schema with:

### simulationCache table
- `cacheKey`: Hash of simulation parameters
- `campaignId`: Associated campaign
- `results`: Cached simulation results
- `expiresAt`: Cache expiration timestamp
- `createdAt`: Cache creation timestamp

### simulations table (extended)
- `queueMetadata`: Queue processing information
  - `priority`: Processing priority
  - `estimatedDuration`: Expected processing time
  - `subscriptionTier`: User's subscription level
  - `queuedAt`: Queue entry timestamp
  - `startedAt`: Processing start timestamp
  - `retryCount`: Number of retry attempts

## Configuration

### Cache Configuration
```typescript
interface CacheConfig {
  defaultTTL: number; // Time to live in milliseconds
  maxCacheSize: number; // Maximum cached items
  enableMetrics: boolean; // Track performance metrics
  compressionEnabled: boolean; // Compress cached data
}
```

### Queue Configuration
```typescript
interface QueueConfig {
  maxConcurrentJobs: number; // Max parallel processing
  defaultPriority: number; // Default job priority
  maxRetries: number; // Max retry attempts
  retryDelayMs: number; // Delay between retries
  progressUpdateIntervalMs: number; // Progress update frequency
  jobTimeoutMs: number; // Job timeout duration
}
```

## Performance Considerations

### Caching Strategy
- Cache keys exclude user-specific data to enable cross-user sharing
- Smart caching based on simulation complexity (scenarios, external data, timeframe)
- Automatic cleanup of expired entries
- Compression support for large results

### Queue Management
- Priority-based processing by subscription tier
- Configurable concurrency limits
- Retry logic with exponential backoff
- Progress tracking and status updates

### Monitoring
- Cache hit/miss ratios
- Average processing times
- Queue size and wait times
- Error rates and retry statistics

## Implementation Notes

**Current Status:** 
The implementation includes placeholder API calls that would be replaced with actual Convex function calls once the API is generated. The core logic and interfaces are complete and ready for integration.

**Next Steps:**
1. Generate Convex API to enable actual database operations
2. Integrate with the simulation engine for real processing
3. Add comprehensive error handling and logging
4. Implement monitoring dashboards
5. Add performance optimization based on usage patterns

## Requirements Satisfied

This implementation satisfies the following requirements:

- **8.3**: Caching for expensive AI operations with intelligent cache management
- **8.5**: Performance optimization through async processing and caching
- **8.2**: Background job processing for complex simulations
- **8.4**: Progress tracking and status updates for queued simulations
- **8.1**: Efficient simulation processing within time limits