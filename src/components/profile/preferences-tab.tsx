"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export function PreferencesTab() {
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    weeklyReports: true,
    marketingEmails: false,
    aiInsights: true,
    performanceAlerts: true,
  });

  const handlePreferenceToggle = (preference: string) => {
    setPreferences((prev) => ({
      ...prev,
      [preference]: !prev[preference as keyof typeof prev],
    }));
  };

  const handleSave = () => {
    // TODO: Save preferences to database
    toast.success("Preferences saved successfully");
  };

  const handleReset = () => {
    setPreferences({
      emailNotifications: true,
      pushNotifications: false,
      weeklyReports: true,
      marketingEmails: false,
      aiInsights: true,
      performanceAlerts: true,
    });
    toast.info("Preferences reset to defaults");
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-foreground">Notification Preferences</CardTitle>
        <CardDescription className="text-muted-foreground">
          Control how and when you receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-notifications" className="text-foreground">
                Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive campaign updates and alerts via email
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={preferences.emailNotifications}
              onCheckedChange={() => handlePreferenceToggle("emailNotifications")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="push-notifications" className="text-foreground">
                Push Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Real-time browser notifications for urgent alerts
              </p>
            </div>
            <Switch
              id="push-notifications"
              checked={preferences.pushNotifications}
              onCheckedChange={() => handlePreferenceToggle("pushNotifications")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="weekly-reports" className="text-foreground">
                Weekly Reports
              </Label>
              <p className="text-sm text-muted-foreground">
                Automated weekly performance summaries
              </p>
            </div>
            <Switch
              id="weekly-reports"
              checked={preferences.weeklyReports}
              onCheckedChange={() => handlePreferenceToggle("weeklyReports")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="ai-insights" className="text-foreground">
                AI Insights
              </Label>
              <p className="text-sm text-muted-foreground">
                Proactive AI recommendations and insights
              </p>
            </div>
            <Switch
              id="ai-insights"
              checked={preferences.aiInsights}
              onCheckedChange={() => handlePreferenceToggle("aiInsights")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="performance-alerts" className="text-foreground">
                Performance Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Notifications for significant performance changes
              </p>
            </div>
            <Switch
              id="performance-alerts"
              checked={preferences.performanceAlerts}
              onCheckedChange={() => handlePreferenceToggle("performanceAlerts")}
            />
          </div>
        </div>

        <Separator />

        <div className="flex space-x-4">
          <Button className="btn-hero" onClick={handleSave}>
            Save Preferences
          </Button>
          <Button variant="outline" className="btn-ghost" onClick={handleReset}>
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
