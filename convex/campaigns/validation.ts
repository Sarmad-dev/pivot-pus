import { v } from "convex/values";

/**
 * Validation functions for campaign data integrity
 */

// Campaign status validation
export const validateCampaignStatus = (status: string): boolean => {
  const validStatuses = ["draft", "active", "paused", "completed"];
  return validStatuses.includes(status);
};

// Date validation - ensure end date is after start date
export const validateCampaignDates = (startDate: number, endDate: number): boolean => {
  return endDate > startDate;
};

// Budget validation - ensure budget is positive
export const validateBudget = (budget: number): boolean => {
  return budget > 0;
};

// Budget allocation validation - ensure channel budgets don't exceed total budget
export const validateBudgetAllocation = (
  totalBudget: number,
  channelAllocations: Record<string, number>
): { isValid: boolean; totalAllocated: number; error?: string } => {
  const totalAllocated = Object.values(channelAllocations).reduce((sum, amount) => sum + amount, 0);
  
  if (totalAllocated > totalBudget) {
    return {
      isValid: false,
      totalAllocated,
      error: `Total channel allocation (${totalAllocated}) exceeds campaign budget (${totalBudget})`
    };
  }
  
  // Check for negative allocations
  const hasNegativeAllocation = Object.values(channelAllocations).some(amount => amount < 0);
  if (hasNegativeAllocation) {
    return {
      isValid: false,
      totalAllocated,
      error: "Channel budget allocations cannot be negative"
    };
  }
  
  return { isValid: true, totalAllocated };
};

// Audience validation
export const validateAudience = (audience: any): boolean => {
  if (!audience.id || !audience.name) return false;
  
  const { demographics } = audience;
  if (!demographics) return false;
  
  // Validate age range
  if (demographics.ageRange && Array.isArray(demographics.ageRange)) {
    const [minAge, maxAge] = demographics.ageRange;
    if (minAge < 0 || maxAge < 0 || minAge > maxAge || maxAge > 120) {
      return false;
    }
  }
  
  return true;
};

// KPI validation
export const validateKPI = (kpi: any): boolean => {
  const validKPITypes = ["reach", "engagement", "conversions", "brand_awareness", "roi", "ctr", "cpc", "cpm"];
  const validTimeframes = ["daily", "weekly", "monthly", "campaign"];
  
  if (!validKPITypes.includes(kpi.type)) return false;
  if (!validTimeframes.includes(kpi.timeframe)) return false;
  if (kpi.target <= 0) return false;
  if (kpi.weight < 0 || kpi.weight > 100) return false; // Weight is 0-100, not 0-1
  
  return true;
};

// Team member validation
export const validateTeamMember = (teamMember: any): boolean => {
  const validRoles = ["owner", "editor", "viewer"];
  
  if (!teamMember.userId) return false;
  if (!validRoles.includes(teamMember.role)) return false;
  if (!teamMember.assignedAt || teamMember.assignedAt <= 0) return false;
  
  return true;
};

// Channel validation
export const validateChannel = (channel: any): boolean => {
  const validChannelTypes = [
    "facebook", "instagram", "twitter", "linkedin", 
    "email", "content", "pr", "google_ads", "youtube"
  ];
  
  if (!validChannelTypes.includes(channel.type)) return false;
  if (typeof channel.enabled !== "boolean") return false;
  if (channel.budget < 0) return false;
  
  return true;
};

// Custom metric validation
export const validateCustomMetric = (metric: any): boolean => {
  if (!metric.name || !metric.description || !metric.unit) return false;
  if (metric.target <= 0) return false;
  
  return true;
};

// Comprehensive campaign validation
export const validateCampaignData = (campaignData: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Basic validation
  if (!campaignData.name || campaignData.name.trim().length === 0) {
    errors.push("Campaign name is required");
  }
  
  if (!campaignData.description || campaignData.description.trim().length === 0) {
    errors.push("Campaign description is required");
  }
  
  if (!validateCampaignStatus(campaignData.status)) {
    errors.push("Invalid campaign status");
  }
  
  // Date validation
  if (!validateCampaignDates(campaignData.startDate, campaignData.endDate)) {
    errors.push("End date must be after start date");
  }
  
  // Budget validation
  if (!validateBudget(campaignData.budget)) {
    errors.push("Budget must be positive");
  }
  
  // Budget allocation validation
  if (campaignData.budgetAllocation?.channels) {
    const budgetValidation = validateBudgetAllocation(
      campaignData.budget,
      campaignData.budgetAllocation.channels
    );
    if (!budgetValidation.isValid) {
      errors.push(budgetValidation.error!);
    }
  }
  
  // Audience validation
  if (campaignData.audiences && Array.isArray(campaignData.audiences)) {
    campaignData.audiences.forEach((audience: any, index: number) => {
      if (!validateAudience(audience)) {
        errors.push(`Invalid audience data at index ${index}`);
      }
    });
  }
  
  // Channel validation
  if (campaignData.channels && Array.isArray(campaignData.channels)) {
    campaignData.channels.forEach((channel: any, index: number) => {
      if (!validateChannel(channel)) {
        errors.push(`Invalid channel data at index ${index}`);
      }
    });
  }
  
  // KPI validation
  if (campaignData.kpis && Array.isArray(campaignData.kpis)) {
    campaignData.kpis.forEach((kpi: any, index: number) => {
      if (!validateKPI(kpi)) {
        errors.push(`Invalid KPI data at index ${index}`);
      }
    });
  }
  
  // Custom metrics validation
  if (campaignData.customMetrics && Array.isArray(campaignData.customMetrics)) {
    campaignData.customMetrics.forEach((metric: any, index: number) => {
      if (!validateCustomMetric(metric)) {
        errors.push(`Invalid custom metric data at index ${index}`);
      }
    });
  }
  
  // Team members validation
  if (campaignData.teamMembers && Array.isArray(campaignData.teamMembers)) {
    campaignData.teamMembers.forEach((member: any, index: number) => {
      if (!validateTeamMember(member)) {
        errors.push(`Invalid team member data at index ${index}`);
      }
    });
  }
  
  // Ensure at least one owner exists
  if (campaignData.teamMembers && Array.isArray(campaignData.teamMembers)) {
    const hasOwner = campaignData.teamMembers.some((member: any) => member.role === "owner");
    if (!hasOwner) {
      errors.push("Campaign must have at least one owner");
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Draft validation
export const validateDraftData = (draftData: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!draftData.name || draftData.name.trim().length === 0) {
    errors.push("Draft name is required");
  }
  
  if (typeof draftData.step !== "number" || draftData.step < 1 || draftData.step > 5) {
    errors.push("Invalid wizard step");
  }
  
  if (!draftData.createdBy) {
    errors.push("Draft must have a creator");
  }
  
  if (!draftData.organizationId) {
    errors.push("Draft must belong to an organization");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Team member role validation
export const validateTeamMemberRole = (role: string): boolean => {
  const validRoles = ["owner", "editor", "viewer"];
  return validRoles.includes(role);
};

// Validate team member removal
export const validateTeamMemberRemoval = (
  userIdToRemove: string,
  campaign: {
    createdBy: string;
    teamMembers: Array<{ userId: string; role: string }>;
  }
): { isValid: boolean; error?: string } => {
  // Cannot remove campaign creator
  if (userIdToRemove === campaign.createdBy) {
    return { isValid: false, error: "Cannot remove campaign creator" };
  }
  
  // Find the member to remove
  const memberToRemove = campaign.teamMembers.find(member => member.userId === userIdToRemove);
  if (!memberToRemove) {
    return { isValid: false, error: "User is not a team member" };
  }
  
  // If removing an owner, ensure at least one owner remains
  if (memberToRemove.role === "owner") {
    const remainingOwners = campaign.teamMembers.filter(member => 
      member.role === "owner" && member.userId !== userIdToRemove
    );
    
    if (remainingOwners.length === 0) {
      return { isValid: false, error: "Cannot remove the last owner from campaign" };
    }
  }
  
  return { isValid: true };
};

// Validate role change
export const validateRoleChange = (
  userId: string,
  newRole: string,
  campaign: {
    createdBy: string;
    teamMembers: Array<{ userId: string; role: string }>;
  }
): { isValid: boolean; error?: string } => {
  // Cannot change role of campaign creator
  if (userId === campaign.createdBy) {
    return { isValid: false, error: "Cannot change role of campaign creator" };
  }
  
  // Validate new role
  if (!validateTeamMemberRole(newRole)) {
    return { isValid: false, error: "Invalid role specified" };
  }
  
  // Find current member
  const currentMember = campaign.teamMembers.find(member => member.userId === userId);
  if (!currentMember) {
    return { isValid: false, error: "User is not a team member" };
  }
  
  // If changing from owner to non-owner, ensure at least one owner remains
  if (currentMember.role === "owner" && newRole !== "owner") {
    const remainingOwners = campaign.teamMembers.filter(member => 
      member.role === "owner" && member.userId !== userId
    );
    
    if (remainingOwners.length === 0) {
      return { isValid: false, error: "Cannot remove the last owner from campaign" };
    }
  }
  
  return { isValid: true };
};

// Validate campaign publication readiness
export const validateCampaignForPublication = (campaign: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Basic validation first
  const basicValidation = validateCampaignData(campaign);
  if (!basicValidation.isValid) {
    errors.push(...basicValidation.errors);
  }
  
  // Additional publication requirements
  if (!campaign.name || campaign.name.trim().length === 0) {
    errors.push("Campaign must have a name");
  }
  
  if (!campaign.description || campaign.description.trim().length === 0) {
    errors.push("Campaign must have a description");
  }
  
  if (campaign.budget <= 0) {
    errors.push("Campaign must have a positive budget");
  }
  
  if (!campaign.audiences || campaign.audiences.length === 0) {
    errors.push("Campaign must have at least one audience");
  }
  
  if (!campaign.channels || campaign.channels.length === 0) {
    errors.push("Campaign must have at least one channel");
  }
  
  if ((!campaign.kpis || campaign.kpis.length === 0) && 
      (!campaign.customMetrics || campaign.customMetrics.length === 0)) {
    errors.push("Campaign must have at least one KPI or custom metric");
  }
  
  // Validate dates are in the future for new campaigns
  const now = Date.now();
  if (campaign.startDate <= now) {
    errors.push("Campaign start date must be in the future");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};