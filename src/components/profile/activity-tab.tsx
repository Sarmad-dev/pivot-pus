"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// TODO: Replace with real activity data from database
const mockActivityLog = [
  {
    action: "Created Q4 Campaign",
    timestamp: "2 hours ago",
    type: "campaign",
  },
  {
    action: "Updated team permissions",
    timestamp: "1 day ago",
    type: "admin",
  },
  {
    action: "Generated performance report",
    timestamp: "2 days ago",
    type: "report",
  },
  {
    action: "Collaborated on Brand Awareness campaign",
    timestamp: "3 days ago",
    type: "collaboration",
  },
  {
    action: "Updated profile settings",
    timestamp: "1 week ago",
    type: "profile",
  },
];

export function ActivityTab() {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-foreground">Recent Activity</CardTitle>
        <CardDescription className="text-muted-foreground">
          Your recent actions and platform interactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockActivityLog.map((activity, index) => (
            <div
              key={index}
              className="flex items-center space-x-4 p-4 glass-strong rounded-lg"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ${
                  activity.type === "campaign"
                    ? "bg-primary/20 text-primary"
                    : activity.type === "admin"
                    ? "bg-warning/20 text-warning"
                    : activity.type === "report"
                    ? "bg-success/20 text-success"
                    : activity.type === "collaboration"
                    ? "bg-accent/20 text-accent"
                    : "bg-surface text-foreground"
                }`}
              >
                {activity.type === "campaign"
                  ? "🚀"
                  : activity.type === "admin"
                  ? "⚙️"
                  : activity.type === "report"
                  ? "📊"
                  : activity.type === "collaboration"
                  ? "👥"
                  : "👤"}
              </div>
              <div className="flex-1">
                <div className="font-medium text-foreground">
                  {activity.action}
                </div>
                <div className="text-sm text-muted-foreground">
                  {activity.timestamp}
                </div>
              </div>
              <Badge variant="outline" className="border-border/50 text-xs">
                {activity.type}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
