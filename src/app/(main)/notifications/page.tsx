"use client"
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Notifications = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");

  const mockNotifications = [
    {
      id: 1,
      type: "performance",
      title: "Q4 Campaign Performance Alert",
      message:
        "Q4 Product Launch campaign is performing 15% above predicted trajectory. Consider increasing budget allocation.",
      time: "2 minutes ago",
      read: false,
      priority: "high",
      campaign: "Q4 Product Launch",
    },
    {
      id: 2,
      type: "ai-insight",
      title: "AI Pivot Recommendation",
      message:
        "Our AI suggests shifting 20% of social media budget to paid search for the Holiday Campaign based on competitor analysis.",
      time: "1 hour ago",
      read: false,
      priority: "medium",
      campaign: "Holiday Campaign",
    },
    {
      id: 3,
      type: "collaboration",
      title: "Team Collaboration Update",
      message:
        "Marcus Rodriguez has added new annotations to the Brand Awareness campaign dashboard.",
      time: "3 hours ago",
      read: true,
      priority: "low",
      campaign: "Brand Awareness",
    },
    {
      id: 4,
      type: "system",
      title: "Weekly Report Generated",
      message:
        "Your weekly performance report for all active campaigns is now available for download.",
      time: "1 day ago",
      read: true,
      priority: "low",
      campaign: null,
    },
    {
      id: 5,
      type: "performance",
      title: "Performance Dip Detected",
      message:
        "Lead Generation campaign showing 8% decline in conversion rate. Immediate attention recommended.",
      time: "2 days ago",
      read: false,
      priority: "high",
      campaign: "Lead Generation",
    },
    {
      id: 6,
      type: "competitor",
      title: "Competitor Activity Alert",
      message:
        "TechCorp has launched a similar campaign targeting your primary keywords. Monitor impact on Brand Awareness metrics.",
      time: "3 days ago",
      read: true,
      priority: "medium",
      campaign: "Brand Awareness",
    },
  ];

  const mockAlerts = [
    {
      id: 1,
      name: "Performance Threshold Alert",
      description: "Notify when campaign performance drops below 70%",
      active: true,
      campaigns: ["All Campaigns"],
      frequency: "Immediate",
    },
    {
      id: 2,
      name: "Budget Utilization Alert",
      description: "Alert when 80% of campaign budget is spent",
      active: true,
      campaigns: ["Q4 Product Launch", "Holiday Campaign"],
      frequency: "Daily",
    },
    {
      id: 3,
      name: "Competitor Activity Monitor",
      description: "Monitor competitor campaigns in your industry",
      active: false,
      campaigns: ["Brand Awareness"],
      frequency: "Weekly",
    },
  ];

  const filteredNotifications = mockNotifications.filter((notification) => {
    const matchesSearch =
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      selectedFilter === "all" ||
      (selectedFilter === "unread" && !notification.read) ||
      selectedFilter === notification.type;
    return matchesSearch && matchesFilter;
  });

  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "performance":
        return "📈";
      case "ai-insight":
        return "🤖";
      case "collaboration":
        return "👥";
      case "system":
        return "⚙️";
      case "competitor":
        return "🕵️";
      default:
        return "🔔";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-destructive/20 text-destructive";
      case "medium":
        return "bg-warning/20 text-warning";
      case "low":
        return "bg-muted/20 text-muted-foreground";
      default:
        return "bg-muted/20 text-muted-foreground";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Notifications Center
                </h1>
                <p className="text-muted-foreground">
                  Stay updated with real-time alerts, AI insights, and team
                  activities
                </p>
              </div>
              <Badge variant="secondary" className="bg-warning/20 text-warning">
                🔔 {unreadCount} Unread
              </Badge>
            </div>

          <Tabs defaultValue="notifications" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="notifications">
                Notifications ({unreadCount})
              </TabsTrigger>
              <TabsTrigger value="alerts">Alert Settings</TabsTrigger>
            </TabsList>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              {/* Filters and Search */}
              <Card className="glass">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4 items-center">
                    <Input
                      placeholder="Search notifications..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-sm bg-surface/50 border-border/50 focus:border-primary"
                    />
                    <Select
                      value={selectedFilter}
                      onValueChange={setSelectedFilter}
                    >
                      <SelectTrigger className="w-48 bg-surface/50 border-border/50">
                        <SelectValue placeholder="Filter notifications" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Notifications</SelectItem>
                        <SelectItem value="unread">Unread Only</SelectItem>
                        <SelectItem value="performance">Performance</SelectItem>
                        <SelectItem value="ai-insight">AI Insights</SelectItem>
                        <SelectItem value="collaboration">
                          Collaboration
                        </SelectItem>
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="competitor">Competitor</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex space-x-2 ml-auto">
                      <Button variant="outline" className="btn-ghost text-sm">
                        Mark All Read
                      </Button>
                      <Button variant="outline" className="btn-ghost text-sm">
                        Clear All
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notifications List */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-foreground">
                    Recent Notifications
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Stay informed about your campaigns and platform activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredNotifications.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4">🔔</div>
                        <h3 className="text-lg font-medium text-foreground mb-2">
                          No notifications found
                        </h3>
                        <p className="text-muted-foreground">
                          Try adjusting your search or filter criteria
                        </p>
                      </div>
                    ) : (
                      filteredNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 rounded-lg glass-strong hover-lift transition-all ${
                            !notification.read
                              ? "border-l-4 border-l-primary"
                              : ""
                          }`}
                        >
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-lg">
                                {getNotificationIcon(notification.type)}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <h3
                                    className={`font-medium ${
                                      !notification.read
                                        ? "text-foreground"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {notification.title}
                                  </h3>
                                  {!notification.read && (
                                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge
                                    variant="secondary"
                                    className={getPriorityColor(
                                      notification.priority
                                    )}
                                  >
                                    {notification.priority}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {notification.time}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                                {notification.message}
                              </p>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  {notification.campaign && (
                                    <Badge
                                      variant="outline"
                                      className="border-border/50 text-xs"
                                    >
                                      {notification.campaign}
                                    </Badge>
                                  )}
                                  <Badge
                                    variant="outline"
                                    className="border-border/50 text-xs"
                                  >
                                    {notification.type}
                                  </Badge>
                                </div>
                                <div className="flex space-x-2">
                                  {!notification.read && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="btn-minimal text-xs"
                                    >
                                      Mark Read
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="btn-minimal text-xs"
                                  >
                                    View Details
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="btn-minimal text-xs text-destructive"
                                  >
                                    Dismiss
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Alert Settings Tab */}
            <TabsContent value="alerts" className="space-y-6">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-foreground">
                    Alert Configuration
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Customize when and how you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {mockAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="p-4 glass-strong rounded-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-medium text-foreground">
                                {alert.name}
                              </h3>
                              <Badge
                                variant={alert.active ? "default" : "secondary"}
                              >
                                {alert.active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {alert.description}
                            </p>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <div className="flex items-center space-x-1">
                                <span className="text-muted-foreground">
                                  Campaigns:
                                </span>
                                <span className="text-foreground">
                                  {alert.campaigns.join(", ")}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className="text-muted-foreground">
                                  Frequency:
                                </span>
                                <span className="text-foreground">
                                  {alert.frequency}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="btn-minimal"
                            >
                              Edit
                            </Button>
                            <Button
                              variant={alert.active ? "destructive" : "default"}
                              size="sm"
                              className={alert.active ? "" : "btn-hero"}
                            >
                              {alert.active ? "Disable" : "Enable"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-foreground">
                    Create New Alert
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Set up custom notifications for your specific needs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Alert Type
                        </label>
                        <Select>
                          <SelectTrigger className="bg-surface/50 border-border/50">
                            <SelectValue placeholder="Select alert type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="performance">
                              Performance Threshold
                            </SelectItem>
                            <SelectItem value="budget">
                              Budget Utilization
                            </SelectItem>
                            <SelectItem value="competitor">
                              Competitor Activity
                            </SelectItem>
                            <SelectItem value="schedule">
                              Scheduled Reports
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Campaign Selection
                        </label>
                        <Select>
                          <SelectTrigger className="bg-surface/50 border-border/50">
                            <SelectValue placeholder="Select campaigns" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Campaigns</SelectItem>
                            <SelectItem value="q4-launch">
                              Q4 Product Launch
                            </SelectItem>
                            <SelectItem value="holiday">
                              Holiday Campaign
                            </SelectItem>
                            <SelectItem value="brand-awareness">
                              Brand Awareness
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Notification Frequency
                        </label>
                        <Select>
                          <SelectTrigger className="bg-surface/50 border-border/50">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immediate">Immediate</SelectItem>
                            <SelectItem value="hourly">Hourly</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Threshold Value
                        </label>
                        <Input
                          placeholder="e.g., 70% or $5000"
                          className="bg-surface/50 border-border/50 focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-6">
                    <Button className="btn-hero">Create Alert</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
