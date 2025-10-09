# AI Trajectory Simulation - Convex Functions

This document describes the Convex functions implemented for the AI Trajectory Simulation Engine.

## Overview

The simulation management system consists of two main modules:

1. **Simulation Management** (`convex/simulations.ts`) - CRUD operations and queries for simulations
2. **External Data Sources** (`convex/externalDataSources.ts`) - API key management and data source configuration

## Simulation Management Functions

### Mutations

#### `createSimulation`
Creates a new simulation with validation and queuing.

**Arguments:**
- `campaignId`: ID of the campaign to simulate
- `config`: Simulation configuration including timeframe, metrics, scenarios
- `priority`: Optional priority for queue processing

**Validation:**
- User access to campaign organization
- Timeframe between 5-30 days
- Metric weights sum to 1.0
- Valid scenario types

#### `updateSimulationStatus`
Updates the status of a simulation (queued → processing → completed/failed).

**Arguments:**
- `simulationId`: ID of the simulation
- `status`: New status
- `error`: Optional error message for failed simulations

#### `completeSimulation`
Marks a simulation as completed and stores results.

**Arguments:**
- `simulationId`: ID of the simulation
- `results`: Simulation results including trajectories, scenarios, risks, recommendations
- `modelMetadata`: Optional metadata about AI models used

#### `deleteSimulation`
Deletes a simulation and associated cache entries.

**Arguments:**
- `simulationId`: ID of the simulation to delete

**Access Control:**
- Only simulation creator, organization owners, or admins can delete

#### `cancelSimulation`
Cancels a queued or processing simulation.

**Arguments:**
- `simulationId`: ID of the simulation to cancel

#### `cleanupExpiredData`
Removes old completed simulations (>30 days) and expired cache entries.

### Queries

#### `getSimulation`
Retrieves a single simulation by ID with campaign information.

**Arguments:**
- `simulationId`: ID of the simulation

**Returns:**
- Simulation data with embedded campaign details

#### `listSimulations`
Lists simulations with filtering and pagination.

**Arguments:**
- `organizationId`: Optional organization filter
- `campaignId`: Optional campaign filter
- `status`: Optional status filter
- `createdBy`: Optional creator filter
- `limit`: Maximum results (default 50, max 100)
- `offset`: Pagination offset

**Returns:**
- Array of simulations with campaign and creator information
- Total count and pagination metadata

#### `getSimulationResults`
Gets simulation results with real-time progress tracking.

**Arguments:**
- `simulationId`: ID of the simulation

**Returns:**
- Simulation results with progress information for processing simulations

#### `getCampaignSimulationHistory`
Gets simulation history and analytics for a specific campaign.

**Arguments:**
- `campaignId`: ID of the campaign
- `limit`: Maximum results (default 20)

**Returns:**
- Array of simulations for the campaign
- Analytics including success rates and processing times

#### `getOrganizationSimulationAnalytics`
Comprehensive analytics for an organization's simulation usage.

**Arguments:**
- `organizationId`: ID of the organization
- `timeframe`: Optional date range filter

**Returns:**
- Usage statistics, performance metrics, trends, and top users

#### `searchSimulations`
Search simulations by campaign name or description.

**Arguments:**
- `organizationId`: ID of the organization
- `searchTerm`: Search query
- `limit`: Maximum results (default 20)

**Returns:**
- Matching simulations sorted by relevance

## External Data Sources Functions

### Mutations

#### `storeAPIKey`
Stores or updates an encrypted API key for external data sources.

**Arguments:**
- `organizationId`: ID of the organization
- `source`: Data source name (semrush, google_trends, twitter_api, etc.)
- `apiKey`: API key to encrypt and store
- `additionalConfig`: Optional configuration overrides

**Supported Sources:**
- SEMrush
- Google Trends
- Twitter API
- Facebook Marketing API
- LinkedIn Marketing API

#### `testDataSourceConnection`
Tests connectivity to an external data source.

**Arguments:**
- `organizationId`: ID of the organization
- `source`: Data source to test

**Returns:**
- Success status, message, and test details

#### `updateDataSourceConfig`
Updates data source configuration without changing the API key.

**Arguments:**
- `dataSourceId`: ID of the data source
- `enabled`: Enable/disable the source
- `rateLimit`: Rate limiting configuration
- `endpoint`: API endpoint URL

#### `deleteDataSource`
Deletes a data source and associated cache entries.

**Arguments:**
- `dataSourceId`: ID of the data source to delete

### Queries

#### `getAPIKey`
Retrieves and decrypts an API key (admin only).

**Arguments:**
- `organizationId`: ID of the organization
- `source`: Data source name

**Returns:**
- Decrypted API key and configuration

#### `listDataSources`
Lists all configured data sources for an organization.

**Arguments:**
- `organizationId`: ID of the organization

**Returns:**
- Array of data sources (without API keys for security)

#### `getDataSourceHealth`
Monitors health status of all data sources.

**Arguments:**
- `organizationId`: ID of the organization

**Returns:**
- Overall health status and individual source health metrics

## Security Features

### API Key Encryption
- All API keys are encrypted using AES-256-GCM
- Encryption key stored in environment variables
- Keys are only decrypted when needed for API calls

### Access Control
- Organization-based access control
- Role-based permissions (owner, admin, member, viewer)
- Users can only access simulations from their organizations
- Only admins and owners can manage API keys

### Data Privacy
- API keys are never returned in list queries
- Simulation data is isolated by organization
- Audit trails for all simulation activities

## Performance Optimizations

### Caching
- Simulation results cached based on input parameters
- Market data cached with configurable expiration
- Cache cleanup for expired entries

### Async Processing
- Simulations queued for background processing
- Priority-based queue management
- Progress tracking for long-running simulations

### Pagination
- All list queries support pagination
- Maximum limits to prevent large data transfers
- Efficient indexing for common query patterns

## Error Handling

### Validation
- Comprehensive input validation
- Business rule enforcement
- Type safety with Convex validators

### Graceful Degradation
- Fallback mechanisms for API failures
- Retry logic with exponential backoff
- Clear error messages for debugging

## Usage Examples

### Creating a Simulation
```typescript
const simulationId = await ctx.runMutation(api.simulations.createSimulation, {
  campaignId: "campaign123",
  config: {
    timeframe: {
      startDate: Date.now(),
      endDate: Date.now() + (14 * 24 * 60 * 60 * 1000), // 14 days
      granularity: "daily"
    },
    metrics: [
      { type: "ctr", weight: 0.4, benchmarkSource: "industry" },
      { type: "impressions", weight: 0.6 }
    ],
    scenarios: ["optimistic", "realistic", "pessimistic"],
    externalDataSources: ["semrush", "google_trends"]
  }
});
```

### Storing an API Key
```typescript
await ctx.runMutation(api.externalDataSources.storeAPIKey, {
  organizationId: "org123",
  source: "semrush",
  apiKey: "your-api-key-here"
});
```

### Getting Simulation Results
```typescript
const results = await ctx.runQuery(api.simulations.getSimulationResults, {
  simulationId: "sim123"
});

if (results.status === "completed") {
  console.log("Trajectories:", results.results.trajectories);
  console.log("Risks:", results.results.risks);
  console.log("Recommendations:", results.results.recommendations);
}
```

## Requirements Fulfilled

This implementation fulfills the following requirements:

- **7.1**: Simulation CRUD operations with proper access control
- **7.2**: Real-time simulation data retrieval and analytics
- **7.4**: Secure API key storage and external data source management
- **7.5**: Data cleanup and audit trails
- **6.5**: Data source health monitoring and validation