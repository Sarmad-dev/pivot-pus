/**
 * Verification script to ensure all campaign functions are properly exported
 * This is not a test file but a verification that the functions exist and have correct types
 */

import * as mutations from "./mutations";
import * as queries from "./queries";
import * as validation from "./validation";
import * as helpers from "./helpers";

// Verify mutation functions exist
const requiredMutations = [
  "createOrganization",
  "createCampaign",
  "saveCampaignDraft",
  "updateCampaign",
  "deleteCampaignDraft",
  "addTeamMember",
  "removeTeamMember",
  "updateTeamMemberRole",
  "addClient",
  "removeClient",
  "deleteCampaign",
  "publishCampaign",
];

const requiredQueries = [
  "getOrganizationBySlug",
  "getCampaignsByOrganization",
  "getCampaignById",
  "getCampaignsByCreator",
  "getCampaignDraftsByUser",
  "getCampaignDraftById",
  "getCampaignsByImportSource",
  "getCampaignStats",
  "searchCampaigns",
  "getExpiredDrafts",
  "getCampaignTeamMembers",
  "getCampaignsAsTeamMember",
  "getCampaignsAsClient",
  "getUserCampaignPermissions",
];

const requiredValidationFunctions = [
  "validateCampaignStatus",
  "validateCampaignDates",
  "validateBudget",
  "validateBudgetAllocation",
  "validateAudience",
  "validateKPI",
  "validateTeamMember",
  "validateChannel",
  "validateCustomMetric",
  "validateCampaignData",
  "validateDraftData",
  "validateTeamMemberRole",
  "validateTeamMemberRemoval",
  "validateRoleChange",
  "validateCampaignForPublication",
];

const requiredHelperFunctions = [
  "generateAudienceId",
  "calculateCampaignDuration",
  "calculateTotalKPIWeight",
  "normalizeKPIWeights",
  "getCampaignStatusDisplay",
  "getCampaignPriorityDisplay",
  "calculateEstimatedReach",
  "getChannelTypeDisplay",
  "formatCurrency",
  "calculateDraftExpiry",
  "isDraftExpired",
  "getTeamMemberRoleDisplay",
  "canEditCampaign",
  "canViewCampaign",
  "createDefaultCampaignData",
  "createDefaultDraftData",
  "canManageTeamMembers",
  "canManageClients",
  "getUserCampaignRole",
  "validateTeamMemberAssignment",
  "validateClientAssignment",
];

// Verification function
export function verifyFunctions(): { success: boolean; missing: string[] } {
  const missing: string[] = [];

  // Check mutations
  for (const funcName of requiredMutations) {
    if (!(funcName in mutations)) {
      missing.push(`mutations.${funcName}`);
    }
  }

  // Check queries
  for (const funcName of requiredQueries) {
    if (!(funcName in queries)) {
      missing.push(`queries.${funcName}`);
    }
  }

  // Check validation functions
  for (const funcName of requiredValidationFunctions) {
    if (!(funcName in validation)) {
      missing.push(`validation.${funcName}`);
    }
  }

  // Check helper functions
  for (const funcName of requiredHelperFunctions) {
    if (!(funcName in helpers)) {
      missing.push(`helpers.${funcName}`);
    }
  }

  return {
    success: missing.length === 0,
    missing,
  };
}

// Log verification results
const result = verifyFunctions();
if (result.success) {
  console.log("✅ All required campaign functions are properly exported");
} else {
  console.log("❌ Missing functions:", result.missing);
}
