"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Brain, 
  ChevronDown, 
  Zap, 
  TrendingUp, 
  AlertTriangle,
  Clock
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "@/../convex/_generated/dataModel";

interface Campaign {
  _id: Id<"campaigns">;
  name: string;
  status: string;
  category: string;
  budget: number;
  currency: string;
}

interface SimulationTriggerProps {
  campaign: Campaign;
  variant?: "button" | "dropdown-item" | "card";
  size?: "sm" | "default" | "lg";
  showQuickActions?: boolean;
}

export function SimulationTrigger({ 
  campaign, 
  variant = "button", 
  size = "default",
  showQuickActions = false 
}: SimulationTriggerProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Check if campaign has recent simulations
  const recentSimulations = useQuery(
    api.simulations.getRecentSimulationsByCampaign,
    { campaignId: campaign._id, limit: 3 }
  );

  // Quick simulation mutation for basic scenarios
  const createQuickSimulation = useMutation(api.simulations.createSimulation);

  const handleQuickSimulation = async (scenarioType: "optimistic" | "realistic" | "pessimistic") => {
    try {
      const simulationId = await createQuickSimulation({
        campaignId: campaign._id,
        config: {
          timeframe: {
            startDate: Date.now(),
            endDate: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
            granularity: "daily" as const,
          },
          metrics: [
            { type: "ctr", weight: 0.3, benchmarkSource: "industry" },
            { type: "impressions", weight: 0.3, benchmarkSource: "industry" },
            { type: "engagement", weight: 0.4, benchmarkSource: "industry" },
          ],
          scenarios: [scenarioType],
          externalDataSources: [],
        },
      });

      toast.success(`${scenarioType.charAt(0).toUpperCase() + scenarioType.slice(1)} simulation started`);
      router.push(`/campaigns/${campaign._id}?tab=simulations&simulation=${simulationId}`);
    } catch (error) {
      toast.error("Failed to start simulation");
      console.error("Quick simulation error:", error);
    }
  };

  const handleFullSimulation = () => {
    router.push(`/campaigns/${campaign._id}/simulate`);
  };

  const handleViewSimulations = () => {
    router.push(`/campaigns/${campaign._id}?tab=simulations`);
  };

  // Render as dropdown menu item
  if (variant === "dropdown-item") {
    return (
      <DropdownMenuItem onClick={handleFullSimulation}>
        <Brain className="h-4 w-4 mr-2" />
        Generate AI Simulation
      </DropdownMenuItem>
    );
  }

  // Render as card
  if (variant === "card") {
    return (
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h3 className="font-medium">AI Simulation</h3>
          </div>
          {recentSimulations && recentSimulations.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {recentSimulations.length} recent
            </Badge>
          )}
        </div>
        
        <p className="text-sm text-muted-foreground">
          Generate predictive performance trajectories using AI models
        </p>
        
        <div className="flex gap-2">
          <Button onClick={handleFullSimulation} size="sm">
            <Brain className="h-4 w-4 mr-2" />
            New Simulation
          </Button>
          
          {recentSimulations && recentSimulations.length > 0 && (
            <Button onClick={handleViewSimulations} variant="outline" size="sm">
              View History
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Default button variant
  return (
    <div className="flex items-center gap-2">
      {showQuickActions ? (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size={size}>
              <Brain className="h-4 w-4 mr-2" />
              AI Simulation
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Generate AI Simulation</DialogTitle>
              <DialogDescription>
                Choose a simulation type for {campaign.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3">
              <Button 
                onClick={() => handleQuickSimulation("optimistic")} 
                variant="outline" 
                className="w-full justify-start"
              >
                <TrendingUp className="h-4 w-4 mr-3 text-green-600" />
                <div className="text-left">
                  <div className="font-medium">Optimistic Scenario</div>
                  <div className="text-xs text-muted-foreground">Best-case performance (75th percentile)</div>
                </div>
              </Button>
              
              <Button 
                onClick={() => handleQuickSimulation("realistic")} 
                variant="outline" 
                className="w-full justify-start"
              >
                <Zap className="h-4 w-4 mr-3 text-blue-600" />
                <div className="text-left">
                  <div className="font-medium">Realistic Scenario</div>
                  <div className="text-xs text-muted-foreground">Most likely performance (50th percentile)</div>
                </div>
              </Button>
              
              <Button 
                onClick={() => handleQuickSimulation("pessimistic")} 
                variant="outline" 
                className="w-full justify-start"
              >
                <AlertTriangle className="h-4 w-4 mr-3 text-orange-600" />
                <div className="text-left">
                  <div className="font-medium">Pessimistic Scenario</div>
                  <div className="text-xs text-muted-foreground">Worst-case performance (25th percentile)</div>
                </div>
              </Button>
              
              <div className="border-t pt-3">
                <Button onClick={handleFullSimulation} className="w-full">
                  <Brain className="h-4 w-4 mr-2" />
                  Custom Simulation
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size={size}>
              <Brain className="h-4 w-4 mr-2" />
              AI Simulation
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => handleQuickSimulation("realistic")}>
              <Zap className="h-4 w-4 mr-2" />
              Quick Simulation
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleFullSimulation}>
              <Brain className="h-4 w-4 mr-2" />
              Custom Simulation
            </DropdownMenuItem>
            {recentSimulations && recentSimulations.length > 0 && (
              <DropdownMenuItem onClick={handleViewSimulations}>
                <Clock className="h-4 w-4 mr-2" />
                View History ({recentSimulations.length})
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}