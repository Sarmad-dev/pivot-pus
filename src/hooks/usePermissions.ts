"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export function useCampaignPermissions(campaignId: Id<"campaigns">) {
  const permissions = useQuery(
    api.campaigns.queries.getUserCampaignPermissions,
    {
      campaignId,
    }
  );

  return {
    canView: permissions?.canView || false,
    canEdit: permissions?.canEdit || false,
    canDelete: permissions?.canDelete || false,
    canManageTeam: permissions?.canManageTeam || false,
    canManageClients: permissions?.canManageClients || false,
    canPublish: permissions?.canPublish || false,
    role: permissions?.role || null,
    isCreator: permissions?.isCreator || false,
    isLoading: permissions === undefined,
  };
}

export function useOrganizationPermissions(
  organizationId: Id<"organizations">
) {
  // This would need to be implemented in the organizations queries
  // For now, return basic permissions based on user's organization membership
  const organizations = useQuery(api.organizations.getUserOrganizations);

  const userOrg = organizations?.find((org) => org._id === organizationId);
  const membership = userOrg?.membership;

  if (!membership) {
    return {
      canCreateCampaigns: false,
      canManageTeam: false,
      canViewAnalytics: false,
      canManageBilling: false,
      role: null,
      isLoading: organizations === undefined,
    };
  }

  return {
    canCreateCampaigns: membership.permissions?.canCreateCampaigns || false,
    canManageTeam: membership.permissions?.canManageTeam || false,
    canViewAnalytics: membership.permissions?.canViewAnalytics || false,
    canManageBilling: membership.permissions?.canManageBilling || false,
    role: membership.role,
    isLoading: organizations === undefined,
  };
}
