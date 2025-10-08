"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useOrganization } from "@/contexts/organization-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Filter, MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { CampaignStats } from "../../../components/campaigns/campaign-stats";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { CampaignActionsMenu } from "@/components/campaigns/campaign-actions-menu";
import { CampaignStatus, CampaignCategory } from "@/types/campaign";
import { Id } from "../../../../convex/_generated/dataModel";

const CampaignsPage = () => {
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<CampaignCategory | "all">("all");
  const [sortBy, setSortBy] = useState<"name" | "created" | "updated" | "budget">("updated");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Fetch campaigns
  const campaigns = useQuery(
    api.campaigns.queries.getCampaignsByOrganization,
    currentOrganization ? { organizationId: currentOrganization._id } : "skip"
  );

  const campaignStats = useQuery(
    api.campaigns.queries.getCampaignStats,
    currentOrganization ? { organizationId: currentOrganization._id } : "skip"
  );

  // Mutations
  const updateCampaignStatus = useMutation(api.campaigns.mutations.updateCampaignStatus);
  const deleteCampaign = useMutation(api.campaigns.mutations.deleteCampaign);

  // Filter and sort campaigns
  const filteredAndSortedCampaigns = useMemo(() => {
    if (!campaigns) return [];

    let filtered = campaigns;

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (campaign) =>
          campaign.name.toLowerCase().includes(searchLower) ||
          campaign.description.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((campaign) => campaign.status === statusFilter);
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((campaign) => campaign.category === categoryFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "created":
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case "updated":
          aValue = a.updatedAt;
          bValue = b.updatedAt;
          break;
        case "budget":
          aValue = a.budget;
          bValue = b.budget;
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [campaigns, searchTerm, statusFilter, categoryFilter, sortBy, sortOrder]);

  const handleStatusChange = async (campaignId: Id<"campaigns">, newStatus: CampaignStatus) => {
    try {
      await updateCampaignStatus({ campaignId, status: newStatus });
      toast.success("Campaign status updated successfully");
    } catch (error) {
      toast.error("Failed to update campaign status");
      console.error("Error updating campaign status:", error);
    }
  };

  const handleDeleteCampaign = async (campaignId: Id<"campaigns">, campaignName: string) => {
    if (!confirm(`Are you sure you want to delete "${campaignName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteCampaign({ campaignId });
      toast.success("Campaign deleted successfully");
    } catch (error) {
      toast.error("Failed to delete campaign");
      console.error("Error deleting campaign:", error);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Organization Selected</h2>
          <p className="text-muted-foreground mb-4">
            Please select an organization to view campaigns.
          </p>
          <Button onClick={() => window.location.reload()}>Refresh Page</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Campaigns</h1>
                <p className="text-muted-foreground">
                  Manage and track your marketing campaigns
                </p>
              </div>
              <Link href="/campaign/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </Link>
            </div>

            {/* Campaign Stats */}
            {campaignStats && (
              <CampaignStats stats={campaignStats} className="mb-8" />
            )}

            {/* Filters and Search */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters & Search
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search campaigns..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as CampaignStatus | "all")}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as CampaignCategory | "all")}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="pr">PR</SelectItem>
                      <SelectItem value="content">Content</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                    const [field, order] = value.split("-");
                    setSortBy(field as typeof sortBy);
                    setSortOrder(order as typeof sortOrder);
                  }}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="updated-desc">Recently Updated</SelectItem>
                      <SelectItem value="updated-asc">Oldest Updated</SelectItem>
                      <SelectItem value="created-desc">Recently Created</SelectItem>
                      <SelectItem value="created-asc">Oldest Created</SelectItem>
                      <SelectItem value="name-asc">Name A-Z</SelectItem>
                      <SelectItem value="name-desc">Name Z-A</SelectItem>
                      <SelectItem value="budget-desc">Budget High-Low</SelectItem>
                      <SelectItem value="budget-asc">Budget Low-High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Campaigns Table */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Campaigns ({filteredAndSortedCampaigns.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredAndSortedCampaigns.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      {campaigns?.length === 0 
                        ? "No campaigns found. Create your first campaign to get started."
                        : "No campaigns match your current filters."
                      }
                    </p>
                    {campaigns?.length === 0 && (
                      <Link href="/campaign/create">
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Campaign
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Budget</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>Updated</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAndSortedCampaigns.map((campaign) => (
                          <TableRow key={campaign._id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{campaign.name}</div>
                                <div className="text-sm text-muted-foreground truncate max-w-xs">
                                  {campaign.description}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <CampaignStatusBadge status={campaign.status} />
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {campaign.category}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatCurrency(campaign.budget, campaign.currency)}
                            </TableCell>
                            <TableCell>
                              {new Date(campaign.startDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {formatDistanceToNow(new Date(campaign.updatedAt), { addSuffix: true })}
                            </TableCell>
                            <TableCell className="text-right">
                              <CampaignActionsMenu
                                campaign={campaign}
                                onStatusChange={handleStatusChange}
                                onDelete={handleDeleteCampaign}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignsPage;