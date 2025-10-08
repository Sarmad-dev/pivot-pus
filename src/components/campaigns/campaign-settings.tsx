"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Save,
  AlertTriangle,
  Calendar,
  DollarSign,
  Bell,
  Shield,
  Trash2,
  Download,
  Upload,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Campaign, CampaignPermissions } from "@/types/campaign";

interface CampaignSettingsProps {
  campaign: Campaign;
  permissions?: CampaignPermissions;
}

export const CampaignSettings = ({
  campaign,
  permissions,
}: CampaignSettingsProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: campaign.name,
    description: campaign.description,
    startDate: new Date(campaign.startDate).toISOString().split("T")[0],
    endDate: new Date(campaign.endDate).toISOString().split("T")[0],
    budget: campaign.budget,
    currency: campaign.currency,
    category: campaign.category,
    priority: campaign.priority,
  });

  // Mock notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailUpdates: true,
    statusChanges: true,
    teamChanges: false,
    weeklyReports: true,
    performanceAlerts: true,
  });

  const handleSave = () => {
    // In real implementation, this would call the update mutation
    toast.success("Campaign settings updated successfully");
    setIsEditing(false);
  };

  const handleExport = () => {
    // Mock export functionality
    toast.success("Campaign data exported successfully");
  };

  const handleDelete = () => {
    // This would be handled by the parent component
    toast.success("Campaign deletion initiated");
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  const canEdit = permissions?.canEdit ?? true;
  const canDelete = permissions?.canDelete ?? true;

  return (
    <div className="space-y-6">
      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Basic Settings
            </CardTitle>
            {canEdit && (
              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
              >
                {isEditing ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                ) : (
                  "Edit Settings"
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value as "pr" | "content" | "social" | "paid" | "mixed" })
                  }
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pr">PR</SelectItem>
                    <SelectItem value="content">Content</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority: value as "low" | "medium" | "high" })
                  }
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="budget">Budget</Label>
                <div className="flex gap-2">
                  <Input
                    id="budget"
                    type="number"
                    value={formData.budget}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        budget: Number(e.target.value),
                      })
                    }
                    disabled={!isEditing}
                  />
                  <Select
                    value={formData.currency}
                    onValueChange={(value) =>
                      setFormData({ ...formData, currency: value })
                    }
                    disabled={!isEditing}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              disabled={!isEditing}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Updates</p>
                <p className="text-sm text-muted-foreground">
                  Receive email notifications for campaign updates
                </p>
              </div>
              <Switch
                checked={notificationSettings.emailUpdates}
                onCheckedChange={(checked) =>
                  setNotificationSettings({
                    ...notificationSettings,
                    emailUpdates: checked,
                  })
                }
                disabled={!canEdit}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Status Changes</p>
                <p className="text-sm text-muted-foreground">
                  Get notified when campaign status changes
                </p>
              </div>
              <Switch
                checked={notificationSettings.statusChanges}
                onCheckedChange={(checked) =>
                  setNotificationSettings({
                    ...notificationSettings,
                    statusChanges: checked,
                  })
                }
                disabled={!canEdit}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Team Changes</p>
                <p className="text-sm text-muted-foreground">
                  Notifications when team members are added or removed
                </p>
              </div>
              <Switch
                checked={notificationSettings.teamChanges}
                onCheckedChange={(checked) =>
                  setNotificationSettings({
                    ...notificationSettings,
                    teamChanges: checked,
                  })
                }
                disabled={!canEdit}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Weekly Reports</p>
                <p className="text-sm text-muted-foreground">
                  Receive weekly performance summaries
                </p>
              </div>
              <Switch
                checked={notificationSettings.weeklyReports}
                onCheckedChange={(checked) =>
                  setNotificationSettings({
                    ...notificationSettings,
                    weeklyReports: checked,
                  })
                }
                disabled={!canEdit}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Performance Alerts</p>
                <p className="text-sm text-muted-foreground">
                  Alerts when KPIs are significantly over or under target
                </p>
              </div>
              <Switch
                checked={notificationSettings.performanceAlerts}
                onCheckedChange={(checked) =>
                  setNotificationSettings({
                    ...notificationSettings,
                    performanceAlerts: checked,
                  })
                }
                disabled={!canEdit}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Campaign Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Campaign ID:</span>
                <span className="font-mono text-sm">{campaign._id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className="capitalize">
                  {campaign.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated:</span>
                <span>{new Date(campaign.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Budget:</span>
                <span>
                  {formatCurrency(campaign.budget, campaign.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration:</span>
                <span>
                  {Math.ceil(
                    (campaign.endDate - campaign.startDate) /
                      (1000 * 60 * 60 * 24)
                  )}{" "}
                  days
                </span>
              </div>
              {campaign.importSource && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Imported from:
                    </span>
                    <Badge variant="secondary" className="capitalize">
                      {campaign.importSource.platform}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">External ID:</span>
                    <span className="font-mono text-sm">
                      {campaign.importSource.externalId}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Export Campaign Data</p>
                <p className="text-sm text-muted-foreground">
                  Download all campaign data as JSON or CSV
                </p>
              </div>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            {canDelete && campaign.status !== "active" && (
              <>
                <Separator />
                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                  <div>
                    <p className="font-medium text-red-900">Delete Campaign</p>
                    <p className="text-sm text-red-700">
                      Permanently delete this campaign and all associated data
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{campaign.name}"?
                          This action cannot be undone. All campaign data,
                          including metrics and team assignments, will be
                          permanently removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete Campaign
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            )}

            {campaign.status === "active" && (
              <div className="flex items-center gap-2 p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  Active campaigns cannot be deleted. Please pause or complete
                  the campaign first.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
