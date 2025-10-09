import { api } from "./_generated/api";
import type { FunctionReference } from "convex/server";

// Export specific simulation functions for convenience
export const simulations: {
  create: FunctionReference<"mutation">;
  updateStatus: FunctionReference<"mutation">;
  complete: FunctionReference<"mutation">;
  delete: FunctionReference<"mutation">;
  cancel: FunctionReference<"mutation">;
  cleanup: FunctionReference<"mutation">;
  get: FunctionReference<"query">;
  list: FunctionReference<"query">;
  getResults: FunctionReference<"query">;
  getCampaignHistory: FunctionReference<"query">;
  getOrgAnalytics: FunctionReference<"query">;
  search: FunctionReference<"query">;
} = {
  create: api.simulations.createSimulation,
  updateStatus: api.simulations.updateSimulationStatus,
  complete: api.simulations.completeSimulation,
  delete: api.simulations.deleteSimulation,
  cancel: api.simulations.cancelSimulation,
  cleanup: api.simulations.cleanupExpiredData,
  get: api.simulations.getSimulation,
  list: api.simulations.listSimulations,
  getResults: api.simulations.getSimulationResults,
  getCampaignHistory: api.simulations.getCampaignSimulationHistory,
  getOrgAnalytics: api.simulations.getOrganizationSimulationAnalytics,
  search: api.simulations.searchSimulations,
};

// Export external data source functions for convenience
export const externalDataSources: {
  storeAPIKey: FunctionReference<"mutation">;
  getAPIKey: FunctionReference<"query">;
  test: FunctionReference<"mutation">;
  list: FunctionReference<"query">;
  updateConfig: FunctionReference<"mutation">;
  delete: FunctionReference<"mutation">;
  getHealth: FunctionReference<"query">;
} = {
  storeAPIKey: api.externalDataSources.storeAPIKey,
  getAPIKey: api.externalDataSources.getAPIKey,
  test: api.externalDataSources.testDataSourceConnection,
  list: api.externalDataSources.listDataSources,
  updateConfig: api.externalDataSources.updateDataSourceConfig,
  delete: api.externalDataSources.deleteDataSource,
  getHealth: api.externalDataSources.getDataSourceHealth,
};
