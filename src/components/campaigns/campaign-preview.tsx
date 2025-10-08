"use client";

import React, { memo } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Target, FileText } from "lucide-react";
import { format } from "date-fns";

export interface CampaignPreviewProps {
  data?: any;
  onEdit?: (step: number) => void;
  onBack?: () => void;
  onCreate?: () => void;
}

export const CampaignPreview = memo(function CampaignPreview({
  data,
}: CampaignPreviewProps = {}) {
  const { getValues } = useFormContext();
  const formData = data || getValues();

  const { basics, audienceChannels, kpisMetrics, teamAccess } = formData;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Campaign Preview</h2>
        <p className="text-muted-foreground">
          Review your campaign settings before creating
        </p>
      </div>

      {/* Campaign Basics */}
      {basics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Campaign Basics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{basics.name}</h3>
              <p className="text-muted-foreground">{basics.description}</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium">Category</p>
                <Badge variant="secondary">{basics.category}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium">Priority</p>
                <Badge variant={basics.priority === 'high' ? 'destructive' : basics.priority === 'medium' ? 'default' : 'secondary'}>
                  {basics.priority}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium">Budget</p>
                <p className="font-mono">{basics.currency} {basics.budget?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Duration</p>
                <p className="text-sm">
                  {basics.startDate && format(new Date(basics.startDate), "MMM d")} - {basics.endDate && format(new Date(basics.endDate), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audience & Channels */}
      {audienceChannels && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Audience & Channels
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {audienceChannels.audiences?.length > 0 && (
              <div>
                <p className="font-medium mb-2">Target Audiences</p>
                <div className="flex flex-wrap gap-2">
                  {audienceChannels.audiences.map((audience: any, index: number) => (
                    <Badge key={index} variant="outline">
                      {audience.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {audienceChannels.channels?.length > 0 && (
              <div>
                <p className="font-medium mb-2">Marketing Channels</p>
                <div className="flex flex-wrap gap-2">
                  {audienceChannels.channels.map((channel: any, index: number) => (
                    <Badge key={index} variant="secondary">
                      {channel.type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* KPIs & Metrics */}
      {kpisMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              KPIs & Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {kpisMetrics.primaryKPIs?.length > 0 && (
              <div>
                <p className="font-medium mb-2">Primary KPIs</p>
                <div className="space-y-2">
                  {kpisMetrics.primaryKPIs.map((kpi: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="capitalize">{kpi.type}</span>
                      <span className="font-mono">{kpi.target}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {kpisMetrics.customMetrics?.length > 0 && (
              <div>
                <p className="font-medium mb-2">Custom Metrics</p>
                <div className="space-y-2">
                  {kpisMetrics.customMetrics.map((metric: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span>{metric.name}</span>
                      <span className="font-mono">{metric.target} {metric.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Team & Access */}
      {teamAccess && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team & Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {teamAccess.teamMembers?.length > 0 && (
              <div>
                <p className="font-medium mb-2">Team Members</p>
                <div className="space-y-2">
                  {teamAccess.teamMembers.map((member: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span>{member.name || member.userId}</span>
                      <Badge variant="outline">{member.role}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {teamAccess.clients?.length > 0 && (
              <div>
                <p className="font-medium mb-2">Clients</p>
                <div className="space-y-2">
                  {teamAccess.clients.map((client: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span>{client.name || client.userId}</span>
                      <Badge variant="secondary">Viewer</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
});