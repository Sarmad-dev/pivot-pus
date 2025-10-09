"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Brain, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Eye,
  MoreHorizontal
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Id } from "@/../convex/_generated/dataModel";

interface SimulationHistoryProps {
  campaignId: Id<"campaigns">;
  limit?: number;
  showHeader?: boolean;
  compact?: boolean;
}

export function SimulationHistory({ 
  campaignId, 
  limit = 10, 
  showHeader = true,
  compact = false 
}: SimulationHistoryProps) {
  const [showAll, setShowAll] = useState(false);
  
  const simulations = useQuery(
    api.simulations.getSimulationsByCampaign,
    { campaignId, limit: showAll ? undefined : limit }
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "processing":
        return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "queued":
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: "default",
      processing: "secondary",
      failed: "destructive",
      queued: "outline",
      cancelled: "secondary",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {status}
      </Badge>
    );
  };

  const getScenarioIcon = (scenarios: string[]) => {
    if (scenarios.includes("optimistic")) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    }
    if (scenarios.includes("pessimistic")) {
      return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    }
    return <Brain className="h-4 w-4 text-blue-600" />;
  };

  if (!simulations || simulations.length === 0) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Simulation History
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No simulations yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate your first AI simulation to see predictive insights
            </p>
            <Link href={`/campaigns/${campaignId}/simulate`}>
              <Button>
                <Brain className="h-4 w-4 mr-2" />
                Create Simulation
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {simulations.slice(0, limit).map((simulation: any) => (
          <div key={simulation._id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              {getStatusIcon(simulation.status)}
              <div>
                <div className="font-medium text-sm">
                  {simulation.config.scenarios.join(", ")} scenario
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(simulation.createdAt), { addSuffix: true })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(simulation.status)}
              {simulation.status === "completed" && (
                <Link href={`/campaigns/${campaignId}?tab=simulations&simulation=${simulation._id}`}>
                  <Button size="sm" variant="ghost">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ))}
        
        {simulations.length > limit && !showAll && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowAll(true)}
            className="w-full"
          >
            Show {simulations.length - limit} more
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Simulation History
            </CardTitle>
            <Link href={`/campaigns/${campaignId}/simulate`}>
              <Button size="sm">
                <Brain className="h-4 w-4 mr-2" />
                New Simulation
              </Button>
            </Link>
          </div>
        </CardHeader>
      )}
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Scenarios</TableHead>
              <TableHead>Metrics</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {simulations.map((simulation: any) => (
              <TableRow key={simulation._id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(simulation.status)}
                    {getStatusBadge(simulation.status)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getScenarioIcon(simulation.config.scenarios)}
                    <span className="capitalize">
                      {simulation.config.scenarios.join(", ")}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {simulation.config.metrics.slice(0, 2).map((metric: any, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {metric.type.toUpperCase()}
                      </Badge>
                    ))}
                    {simulation.config.metrics.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{simulation.config.metrics.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {formatDistanceToNow(new Date(simulation.createdAt), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  {Math.ceil(
                    (simulation.config.timeframe.endDate - simulation.config.timeframe.startDate) / 
                    (1000 * 60 * 60 * 24)
                  )} days
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {simulation.status === "completed" && (
                      <Link href={`/campaigns/${campaignId}?tab=simulations&simulation=${simulation._id}`}>
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                    <Button size="sm" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {simulations.length > limit && !showAll && (
          <div className="mt-4 text-center">
            <Button 
              variant="outline" 
              onClick={() => setShowAll(true)}
            >
              Show {simulations.length - limit} more simulations
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}