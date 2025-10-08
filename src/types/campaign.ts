import { Id } from "@/../convex/_generated/dataModel";

export interface Campaign {
  _id: Id<"campaigns">;
  name: string;
  description: string;
  status: "draft" | "active" | "paused" | "completed";
  startDate: number;
  endDate: number;
  budget: number;
  currency: string;
  category: "pr" | "content" | "social" | "paid" | "mixed";
  priority: "low" | "medium" | "high";
  audiences: Array<{
    id: string;
    name: string;
    demographics: {
      ageRange: number[];
      gender: string;
      location: string[];
      interests: string[];
    };
    estimatedSize?: number;
  }>;
  channels: Array<{
    type: string;
    enabled: boolean;
    budget: number;
    settings: any;
  }>;
  kpis: Array<{
    type: string;
    target: number;
    timeframe: string;
    weight: number;
  }>;
  customMetrics: Array<{
    name: string;
    description: string;
    target: number;
    unit: string;
  }>;
  budgetAllocation: {
    channels: Record<string, number>;
  };
  teamMembers: Array<{
    userId: Id<"users">;
    role: "owner" | "editor" | "viewer";
    assignedAt: number;
    notifications?: boolean;
  }>;
  clients: Array<{
    userId: Id<"users">;
    assignedAt: number;
  }>;
  organizationId: Id<"organizations">;
  createdBy: Id<"users">;
  createdAt: number;
  updatedAt: number;
  importSource?: {
    platform: string;
    externalId: string;
    importedAt: number;
    lastSyncAt?: number;
  };
}

export interface CampaignPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageTeam: boolean;
  canManageClients: boolean;
  canPublish: boolean;
  role: string | null;
  isCreator: boolean;
}

export interface CampaignStats {
  total: number;
  draft: number;
  active: number;
  paused: number;
  completed: number;
  totalBudget: number;
  averageBudget: number;
}

export type CampaignStatus = "draft" | "active" | "paused" | "completed";
export type CampaignCategory = "pr" | "content" | "social" | "paid" | "mixed";
export type CampaignPriority = "low" | "medium" | "high";