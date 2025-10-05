"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Edit,
  Calendar,
  DollarSign,
  Users,
  Target,
  BarChart3,
  Globe,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type CampaignBasics,
  type AudienceChannels,
  type KPIsMetrics,
  type TeamAccess,
  completeCampaignSchema,
} from "@/lib/validations/campaign";

// Combined form data type
type CampaignFormData = {
  basics?: CampaignBasics;
  audienceChannels?: AudienceChannels;
  kpisMetrics?: KPIsMetrics;
  teamAccess?: TeamAccess;
};

interface CampaignPreviewProps {
  data: CampaignFormData;
  onEdit: (step: number) => void;
  onBack: () => void;
  onCreate: () => Promise<void>;
  isCreating?: boolean;
  className?: string;
}

export function CampaignPreview({
  data,
  onEdit,
  onBack,
  onCreate,
  isCreating = false,
  className,
}: CampaignPreviewProps) {
  // Validate the complete campaign data
  const validation = completeCampaignSchema.safeParse(data);
  const isValid = validation.success;
  const validationErrors = validation.success ? [] : validation.error.issues;

  // Helper functions for formatting
  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(dateObj);
  };

  const formatDateRange = (startDate: Date | string, endDate: Date | string) => {
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    return `${start} - ${end}`;
  };

  const calculateDuration = (startDate: Date | string, endDate: Date | string) => {
    const startDateObj = startDate instanceof Date ? startDate : new Date(startDate);
    const endDateObj = endDate instanceof Date ? endDate : new Date(endDate);
    const diffTime = Math.abs(endDateObj.getTime() - startDateObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "1 day";
    if (diffDays < 30) return `${diffDays} days`;
    if (diffDays < 365) {
      const months = Math.round(diffDays / 30);
      return months === 1 ? "1 month" : `${months} months`;
    }
    const years = Math.round(diffDays / 365);
    return years === 1 ? "1 year" : `${years} years`;
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      pr: "Public Relations",
      content: "Content Marketing",
      social: "Social Media",
      paid: "Paid Advertising",
      mixed: "Mixed Campaign",
    };
    return labels[category as keyof typeof labels] || category;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getChannelIcon = (channelType: string) => {
    // Return appropriate icons for different channel types
    return <Globe className="h-4 w-4" />;
  };

  const getKPIIcon = (kpiType: string) => {
    switch (kpiType) {
      case "reach":
        return <Users className="h-4 w-4" />;
      case "engagement":
        return <Target className="h-4 w-4" />;
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "editor":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "viewer":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <TooltipProvider>
      <div className={cn("max-w-4xl mx-auto space-y-6", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Campaign Preview</h1>
            <p className="text-muted-foreground">
              Review your campaign configuration before creating
            </p>
          </div>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Wizard
          </Button>
        </div>

        {/* Validation Status */}
        {!isValid && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-red-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Validation Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {validationErrors.map((error, index) => (
                  <div key={index} className="text-sm text-red-700">
                    <strong>{error.path.join(" → ")}:</strong> {error.message}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Campaign Basics */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle>Campaign Basics</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => onEdit(1)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.basics ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{data.basics.name}</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {data.basics.description}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(data.basics.priority)}>
                        {data.basics.priority.toUpperCase()} PRIORITY
                      </Badge>
                      <Badge variant="outline">
                        {getCategoryLabel(data.basics.category)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <DollarSign className="h-4 w-4" />
                      Budget
                    </div>
                    <p className="text-2xl font-bold">
                      {formatCurrency(data.basics.budget, data.basics.currency)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Calendar className="h-4 w-4" />
                      Duration
                    </div>
                    <p className="text-lg font-semibold">
                      {calculateDuration(data.basics.startDate, data.basics.endDate)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateRange(data.basics.startDate, data.basics.endDate)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <BarChart3 className="h-4 w-4" />
                      Daily Budget
                    </div>
                    <p className="text-lg font-semibold">
                      {formatCurrency(
                        data.basics.budget /
                          Math.ceil(
                            ((data.basics.endDate instanceof Date ? data.basics.endDate : new Date(data.basics.endDate)).getTime() - 
                             (data.basics.startDate instanceof Date ? data.basics.startDate : new Date(data.basics.startDate)).getTime()) /
                              (1000 * 60 * 60 * 24)
                          ),
                        data.basics.currency
                      )}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Campaign basics not configured</p>
                <Button variant="outline" onClick={() => onEdit(1)} className="mt-2">
                  Configure Basics
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audience & Channels */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Audience & Channels</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => onEdit(2)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {data.audienceChannels ? (
              <>
                {/* Audience Segments */}
                <div>
                  <h4 className="font-semibold mb-3">Target Audiences</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.audienceChannels.audiences.map((audience, index) => (
                      <div key={audience.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium">{audience.name}</h5>
                          {audience.estimatedSize && (
                            <Badge variant="secondary">
                              {audience.estimatedSize.toLocaleString()} people
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>
                            Age: {audience.demographics.ageRange[0]}-{audience.demographics.ageRange[1]}
                          </p>
                          <p>Gender: {audience.demographics.gender}</p>
                          <p>Locations: {audience.demographics.location.join(", ")}</p>
                          {audience.demographics.interests.length > 0 && (
                            <p>
                              Interests: {audience.demographics.interests.slice(0, 3).join(", ")}
                              {audience.demographics.interests.length > 3 && "..."}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Marketing Channels */}
                <div>
                  <h4 className="font-semibold mb-3">Marketing Channels</h4>
                  <div className="space-y-3">
                    {data.audienceChannels.channels
                      .filter((channel) => channel.enabled)
                      .map((channel, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            {getChannelIcon(channel.type)}
                            <div>
                              <p className="font-medium capitalize">{channel.type.replace("_", " ")}</p>
                              <p className="text-sm text-muted-foreground">
                                Budget: {formatCurrency(channel.budget, data.basics?.currency)}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">Active</Badge>
                        </div>
                      ))}
                  </div>

                  {/* Budget Allocation Summary */}
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <h5 className="font-medium mb-2">Budget Allocation</h5>
                    <div className="space-y-2">
                      {Object.entries(data.audienceChannels.budgetAllocation).map(([channel, amount]) => (
                        <div key={channel} className="flex justify-between text-sm">
                          <span className="capitalize">{channel.replace("_", " ")}</span>
                          <span className="font-medium">
                            {formatCurrency(amount, data.basics?.currency)}
                          </span>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Total Allocated</span>
                        <span>
                          {formatCurrency(
                            Object.values(data.audienceChannels.budgetAllocation).reduce(
                              (sum, amount) => sum + amount,
                              0
                            ),
                            data.basics?.currency
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Audience and channels not configured</p>
                <Button variant="outline" onClick={() => onEdit(2)} className="mt-2">
                  Configure Audience & Channels
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KPIs & Metrics */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle>KPIs & Metrics</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => onEdit(3)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {data.kpisMetrics ? (
              <>
                {/* Primary KPIs */}
                <div>
                  <h4 className="font-semibold mb-3">Primary KPIs</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.kpisMetrics.primaryKPIs.map((kpi, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          {getKPIIcon(kpi.type)}
                          <h5 className="font-medium capitalize">{kpi.type.replace("_", " ")}</h5>
                          <Badge variant="secondary">{kpi.weight}% weight</Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="font-medium">Target:</span> {kpi.target.toLocaleString()}
                          </p>
                          <p>
                            <span className="font-medium">Timeframe:</span> {kpi.timeframe}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* KPI Weight Summary */}
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Total KPI Weight</span>
                      <span className="font-medium">
                        {data.kpisMetrics.primaryKPIs.reduce((sum, kpi) => sum + kpi.weight, 0)}%
                      </span>
                    </div>
                    <Progress
                      value={data.kpisMetrics.primaryKPIs.reduce((sum, kpi) => sum + kpi.weight, 0)}
                      className="h-2"
                    />
                  </div>
                </div>

                {/* Custom Metrics */}
                {data.kpisMetrics.customMetrics.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-3">Custom Metrics</h4>
                      <div className="space-y-3">
                        {data.kpisMetrics.customMetrics.map((metric, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium">{metric.name}</h5>
                              <Badge variant="outline">
                                Target: {metric.target} {metric.unit}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{metric.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Tracking Settings */}
                {data.kpisMetrics.trackingSettings && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-3">Tracking Settings</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">
                            Analytics {data.kpisMetrics.trackingSettings.enableAnalytics ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">
                            {data.kpisMetrics.trackingSettings.reportingFrequency} Reports
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-purple-600" />
                          <span className="text-sm">
                            Auto-reporting {data.kpisMetrics.trackingSettings.autoReporting ? "On" : "Off"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>KPIs and metrics not configured</p>
                <Button variant="outline" onClick={() => onEdit(3)} className="mt-2">
                  Configure KPIs & Metrics
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team & Access */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Team & Access</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => onEdit(4)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {data.teamAccess ? (
              <>
                {/* Team Members */}
                <div>
                  <h4 className="font-semibold mb-3">Team Members</h4>
                  <div className="space-y-2">
                    {data.teamAccess.teamMembers.map((member, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">User {member.userId}</p>
                            <p className="text-sm text-muted-foreground">
                              Notifications: {member.notifications ? "Enabled" : "Disabled"}
                            </p>
                          </div>
                        </div>
                        <Badge className={getRoleColor(member.role)}>
                          {member.role.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Clients */}
                {data.teamAccess.clients.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-3">Clients</h4>
                      <div className="space-y-2">
                        {data.teamAccess.clients.map((client, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <Users className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium">Client {client.userId}</p>
                                <p className="text-sm text-muted-foreground">View-only access</p>
                              </div>
                            </div>
                            <Badge variant="outline">CLIENT</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Permissions */}
                {data.teamAccess.permissions && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-3">Permissions</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">
                            Client editing {data.teamAccess.permissions.allowClientEdit ? "Allowed" : "Restricted"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">
                            Approval {data.teamAccess.permissions.requireApproval ? "Required" : "Not Required"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Team and access not configured</p>
                <Button variant="outline" onClick={() => onEdit(4)} className="mt-2">
                  Configure Team & Access
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Campaign Action */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Ready to Create Campaign?</h3>
                <p className="text-muted-foreground">
                  {isValid
                    ? "All sections are configured and validated. You can now create your campaign."
                    : "Please fix the validation issues above before creating the campaign."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {isValid && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">Ready</span>
                  </div>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="lg"
                      disabled={!isValid || isCreating}
                      className="min-w-[140px]"
                    >
                      {isCreating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <Rocket className="h-4 w-4 mr-2" />
                          Create Campaign
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Create Campaign</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to create this campaign? Once created, the campaign will be
                        active and ready for execution. You can still edit it later if needed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onCreate} disabled={isCreating}>
                        {isCreating ? "Creating..." : "Create Campaign"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}