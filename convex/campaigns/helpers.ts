/**
 * Helper functions for campaign data operations
 */

// Generate a unique audience ID
export const generateAudienceId = (): string => {
  return `audience_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Calculate campaign duration in days
export const calculateCampaignDuration = (startDate: number, endDate: number): number => {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((endDate - startDate) / millisecondsPerDay);
};

// Calculate total KPI weight
export const calculateTotalKPIWeight = (kpis: Array<{ weight: number }>): number => {
  return kpis.reduce((total, kpi) => total + kpi.weight, 0);
};

// Normalize KPI weights to sum to 1.0
export const normalizeKPIWeights = (kpis: Array<{ weight: number }>): Array<{ weight: number }> => {
  const totalWeight = calculateTotalKPIWeight(kpis);
  if (totalWeight === 0) return kpis;
  
  return kpis.map(kpi => ({
    ...kpi,
    weight: kpi.weight / totalWeight
  }));
};

// Get campaign status display name
export const getCampaignStatusDisplay = (status: string): string => {
  const statusMap: Record<string, string> = {
    draft: "Draft",
    active: "Active",
    paused: "Paused",
    completed: "Completed"
  };
  return statusMap[status] || status;
};

// Get campaign priority display name
export const getCampaignPriorityDisplay = (priority: string): string => {
  const priorityMap: Record<string, string> = {
    low: "Low",
    medium: "Medium",
    high: "High"
  };
  return priorityMap[priority] || priority;
};

// Calculate estimated audience reach
export const calculateEstimatedReach = (audiences: Array<{ estimatedSize?: number }>): number => {
  return audiences.reduce((total, audience) => {
    return total + (audience.estimatedSize || 0);
  }, 0);
};

// Get channel type display name
export const getChannelTypeDisplay = (type: string): string => {
  const channelMap: Record<string, string> = {
    facebook: "Facebook",
    instagram: "Instagram", 
    twitter: "Twitter/X",
    linkedin: "LinkedIn",
    email: "Email Marketing",
    content: "Content Marketing",
    pr: "Public Relations",
    google_ads: "Google Ads",
    youtube: "YouTube"
  };
  return channelMap[type] || type;
};

// Format currency amount
export const formatCurrency = (amount: number, currency: string = "USD"): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Calculate draft expiry date (30 days from creation)
export const calculateDraftExpiry = (createdAt: number): number => {
  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
  return createdAt + thirtyDaysInMs;
};

// Check if draft is expired
export const isDraftExpired = (expiresAt: number): boolean => {
  return Date.now() > expiresAt;
};

// Get team member role display name
export const getTeamMemberRoleDisplay = (role: string): string => {
  const roleMap: Record<string, string> = {
    owner: "Owner",
    editor: "Editor", 
    viewer: "Viewer"
  };
  return roleMap[role] || role;
};

// Check if user has permission to edit campaign
export const canEditCampaign = (
  userId: string,
  campaign: {
    createdBy: string;
    teamMembers: Array<{ userId: string; role: string }>;
  }
): boolean => {
  // Creator can always edit
  if (campaign.createdBy === userId) return true;
  
  // Check team member permissions
  const teamMember = campaign.teamMembers.find(member => member.userId === userId);
  return teamMember?.role === "owner" || teamMember?.role === "editor";
};

// Check if user has permission to view campaign
export const canViewCampaign = (
  userId: string,
  campaign: {
    createdBy: string;
    teamMembers: Array<{ userId: string; role: string }>;
    clients: Array<{ userId: string }>;
  }
): boolean => {
  // Creator can always view
  if (campaign.createdBy === userId) return true;
  
  // Check team member permissions
  const teamMember = campaign.teamMembers.find(member => member.userId === userId);
  if (teamMember) return true;
  
  // Check client permissions
  const client = campaign.clients.find(client => client.userId === userId);
  return !!client;
};

// Create default campaign data structure
export const createDefaultCampaignData = (
  organizationId: string,
  createdBy: string
): Partial<any> => {
  const now = Date.now();
  
  return {
    name: "",
    description: "",
    status: "draft" as const,
    startDate: now,
    endDate: now + (30 * 24 * 60 * 60 * 1000), // 30 days from now
    createdAt: now,
    updatedAt: now,
    budget: 0,
    currency: "USD",
    budgetAllocation: {
      channels: {}
    },
    category: "mixed" as const,
    priority: "medium" as const,
    audiences: [],
    channels: [],
    kpis: [],
    customMetrics: [],
    organizationId,
    createdBy,
    teamMembers: [{
      userId: createdBy,
      role: "owner" as const,
      assignedAt: now
    }],
    clients: []
  };
};

// Create default draft data structure
export const createDefaultDraftData = (
  name: string,
  organizationId: string,
  createdBy: string
): any => {
  const now = Date.now();
  
  return {
    name,
    data: createDefaultCampaignData(organizationId, createdBy),
    step: 1,
    createdBy,
    organizationId,
    createdAt: now,
    updatedAt: now,
    expiresAt: calculateDraftExpiry(now)
  };
};

// Check if user can manage team members
export const canManageTeamMembers = (
  userId: string,
  campaign: {
    createdBy: string;
    teamMembers: Array<{ userId: string; role: string }>;
  }
): boolean => {
  // Creator can always manage team
  if (campaign.createdBy === userId) return true;
  
  // Only owners can manage team members
  const teamMember = campaign.teamMembers.find(member => member.userId === userId);
  return teamMember?.role === "owner";
};

// Check if user can manage clients
export const canManageClients = (
  userId: string,
  campaign: {
    createdBy: string;
    teamMembers: Array<{ userId: string; role: string }>;
  }
): boolean => {
  // Creator can always manage clients
  if (campaign.createdBy === userId) return true;
  
  // Owners and editors can manage clients
  const teamMember = campaign.teamMembers.find(member => member.userId === userId);
  return teamMember?.role === "owner" || teamMember?.role === "editor";
};

// Get user's effective role in campaign
export const getUserCampaignRole = (
  userId: string,
  campaign: {
    createdBy: string;
    teamMembers: Array<{ userId: string; role: string }>;
    clients: Array<{ userId: string }>;
  }
): "creator" | "owner" | "editor" | "viewer" | "client" | null => {
  // Check if user is the creator
  if (campaign.createdBy === userId) return "creator";
  
  // Check if user is a team member
  const teamMember = campaign.teamMembers.find(member => member.userId === userId);
  if (teamMember) return teamMember.role as "owner" | "editor" | "viewer";
  
  // Check if user is a client
  const isClient = campaign.clients.some(client => client.userId === userId);
  if (isClient) return "client";
  
  return null;
};

// Validate team member assignment
export const validateTeamMemberAssignment = (
  userId: string,
  role: string,
  campaign: {
    createdBy: string;
    teamMembers: Array<{ userId: string; role: string }>;
    clients: Array<{ userId: string }>;
  }
): { isValid: boolean; error?: string } => {
  // Cannot assign creator as team member
  if (userId === campaign.createdBy) {
    return { isValid: false, error: "Campaign creator is automatically an owner" };
  }
  
  // Check if user is already a team member
  const existingMember = campaign.teamMembers.find(member => member.userId === userId);
  if (existingMember) {
    return { isValid: false, error: "User is already a team member" };
  }
  
  // Check if user is already a client
  const isClient = campaign.clients.some(client => client.userId === userId);
  if (isClient) {
    return { isValid: false, error: "User is already assigned as a client" };
  }
  
  // Validate role
  const validRoles = ["owner", "editor", "viewer"];
  if (!validRoles.includes(role)) {
    return { isValid: false, error: "Invalid role specified" };
  }
  
  return { isValid: true };
};

// Validate client assignment
export const validateClientAssignment = (
  userId: string,
  campaign: {
    createdBy: string;
    teamMembers: Array<{ userId: string; role: string }>;
    clients: Array<{ userId: string }>;
  }
): { isValid: boolean; error?: string } => {
  // Cannot assign creator as client
  if (userId === campaign.createdBy) {
    return { isValid: false, error: "Campaign creator cannot be assigned as client" };
  }
  
  // Check if user is already a team member
  const isTeamMember = campaign.teamMembers.find(member => member.userId === userId);
  if (isTeamMember) {
    return { isValid: false, error: "User is already a team member" };
  }
  
  // Check if user is already a client
  const existingClient = campaign.clients.find(client => client.userId === userId);
  if (existingClient) {
    return { isValid: false, error: "User is already assigned as a client" };
  }
  
  return { isValid: true };
};