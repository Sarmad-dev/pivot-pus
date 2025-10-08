"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import {
  Plus,
  Trash2,
  Users,
  Target,
  DollarSign,
  MapPin,
  Heart,
  User,
  AlertTriangle,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import {
  type AudienceChannels,
  validateBudgetAllocation,
} from "@/lib/validations/campaign";

// Channel configuration with display information
const CHANNEL_OPTIONS = [
  {
    type: "facebook" as const,
    name: "Facebook",
    description: "Facebook advertising and organic posts",
    icon: "📘",
    category: "social",
    minBudget: 5,
  },
  {
    type: "instagram" as const,
    name: "Instagram",
    description: "Instagram posts, stories, and ads",
    icon: "📷",
    category: "social",
    minBudget: 5,
  },
  {
    type: "twitter" as const,
    name: "Twitter/X",
    description: "Twitter posts and promoted tweets",
    icon: "🐦",
    category: "social",
    minBudget: 10,
  },
  {
    type: "linkedin" as const,
    name: "LinkedIn",
    description: "Professional networking and B2B advertising",
    icon: "💼",
    category: "social",
    minBudget: 10,
  },
  {
    type: "google_ads" as const,
    name: "Google Ads",
    description: "Search and display advertising",
    icon: "🔍",
    category: "paid",
    minBudget: 20,
  },
  {
    type: "youtube" as const,
    name: "YouTube",
    description: "Video advertising and content",
    icon: "📺",
    category: "paid",
    minBudget: 15,
  },
  {
    type: "email" as const,
    name: "Email Marketing",
    description: "Email campaigns and newsletters",
    icon: "📧",
    category: "owned",
    minBudget: 0,
  },
  {
    type: "content" as const,
    name: "Content Marketing",
    description: "Blog posts, articles, and SEO content",
    icon: "📝",
    category: "owned",
    minBudget: 0,
  },
  {
    type: "pr" as const,
    name: "Public Relations",
    description: "Media outreach and press coverage",
    icon: "📰",
    category: "earned",
    minBudget: 0,
  },
] as const;

// Common interests for audience targeting
const INTEREST_SUGGESTIONS = [
  "Technology",
  "Fashion",
  "Travel",
  "Food & Dining",
  "Fitness & Health",
  "Business & Finance",
  "Entertainment",
  "Sports",
  "Education",
  "Art & Design",
  "Music",
  "Gaming",
  "Automotive",
  "Real Estate",
  "Parenting",
  "Pets",
  "Home & Garden",
  "Beauty & Cosmetics",
  "Books & Literature",
  "Photography",
];

// Common locations for targeting
const LOCATION_SUGGESTIONS = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Germany",
  "France",
  "Japan",
  "Brazil",
  "India",
  "Mexico",
  "Spain",
  "Italy",
  "Netherlands",
  "Sweden",
  "Norway",
  "Denmark",
  "Switzerland",
];

interface AudienceChannelsStepProps {
  className?: string;
}

// Helper function to check step completion
export const isAudienceChannelsStepComplete = (
  data: AudienceChannels
): boolean => {
  return !!(
    data.audiences &&
    data.audiences.length > 0 &&
    data.channels &&
    data.channels.some((channel) => channel.enabled) &&
    data.audiences.every(
      (audience) =>
        audience.name &&
        audience.name.trim().length > 0 &&
        audience.demographics.location &&
        audience.demographics.location.length > 0
    )
  );
};

// Validation function for wizard integration
export const validateAudienceChannelsStep = (
  data: AudienceChannels,
  campaignBudget: number
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validate budget allocation
  const budgetValidation = validateBudgetAllocation(
    campaignBudget,
    data.budgetAllocation
  );
  if (!budgetValidation.isValid) {
    errors.push(budgetValidation.error || "Budget allocation error");
  }

  // Validate audiences
  if (!data.audiences || data.audiences.length === 0) {
    errors.push("At least one audience segment is required");
  }

  data.audiences?.forEach((audience, index) => {
    if (!audience.name || audience.name.trim().length === 0) {
      errors.push(`Audience ${index + 1}: Name is required`);
    }
    if (
      !audience.demographics.location ||
      audience.demographics.location.length === 0
    ) {
      errors.push(`Audience ${index + 1}: At least one location is required`);
    }
  });

  // Validate channels
  const enabledChannels =
    data.channels?.filter((channel) => channel.enabled) || [];
  if (enabledChannels.length === 0) {
    errors.push("At least one channel must be enabled");
  }

  enabledChannels.forEach((channel, index) => {
    const channelInfo = CHANNEL_OPTIONS.find((c) => c.type === channel.type);
    if (channelInfo && channel.budget < channelInfo.minBudget) {
      errors.push(
        `${channelInfo.name}: Minimum budget of $${channelInfo.minBudget} required`
      );
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export function AudienceChannelsStep({ className }: AudienceChannelsStepProps) {
  const form = useFormContext<{
    audienceChannels: AudienceChannels;
    basics?: { budget: number };
  }>();
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Get campaign budget from basics step
  const campaignBudget = form.watch("basics")?.budget || 0;

  // Field arrays for dynamic forms
  const {
    fields: audienceFields,
    append: appendAudience,
    remove: removeAudience,
  } = useFieldArray({
    control: form.control,
    name: "audienceChannels.audiences",
  });

  const {
    fields: channelFields,
    append: appendChannel,
    remove: removeChannel,
  } = useFieldArray({
    control: form.control,
    name: "audienceChannels.channels",
  });

  // Watch for budget allocation changes
  const budgetAllocation = useMemo(
    () => form.watch("audienceChannels.budgetAllocation") || {},
    [form]
  );
  const channels = form.watch("audienceChannels.channels") || [];

  // Validate budget allocation whenever it changes
  useEffect(() => {
    const errors: Record<string, string> = {};

    if (campaignBudget > 0) {
      const validation = validateBudgetAllocation(
        campaignBudget,
        budgetAllocation
      );
      setBudgetError(validation.isValid ? null : validation.error || null);

      // Additional validation for enabled channels
      const enabledChannels = channels.filter((channel) => channel.enabled);
      if (enabledChannels.length === 0) {
        errors.channels = "At least one channel must be enabled";
      }

      // Validate minimum budgets for paid channels
      enabledChannels.forEach((channel, index) => {
        const channelInfo = CHANNEL_OPTIONS.find(
          (c) => c.type === channel.type
        );
        if (channelInfo && channel.budget < channelInfo.minBudget) {
          errors[`channel_${index}`] =
            `${channelInfo.name} requires minimum budget of $${channelInfo.minBudget}`;
        }
      });
    }

    // Validate audience segments
    const audiences = form.watch("audienceChannels.audiences") || [];
    if (audiences.length === 0) {
      errors.audiences = "At least one audience segment is required";
    }

    audiences.forEach((audience, index) => {
      if (!audience.name || audience.name.trim().length === 0) {
        errors[`audience_${index}_name`] = "Audience name is required";
      }
      if (
        !audience.demographics.location ||
        audience.demographics.location.length === 0
      ) {
        errors[`audience_${index}_location`] =
          "At least one location is required";
      }
    });

    setValidationErrors(errors);
  }, [campaignBudget, budgetAllocation, channels, form]);

  // Initialize with default audience and channels if empty
  useEffect(() => {
    if (audienceFields.length === 0) {
      appendAudience({
        id: `audience-${Date.now()}`,
        name: "Primary Audience",
        demographics: {
          ageRange: [25, 45] as [number, number],
          gender: "all" as const,
          location: ["United States"],
          interests: [],
        },
        estimatedSize: undefined,
      });
    }

    if (channelFields.length === 0) {
      // Add some default channels
      const defaultChannels = ["facebook", "instagram", "email"];
      defaultChannels.forEach((channelType) => {
        const channelInfo = CHANNEL_OPTIONS.find((c) => c.type === channelType);
        if (channelInfo) {
          appendChannel({
            type: channelType as
              | "facebook"
              | "instagram"
              | "twitter"
              | "linkedin"
              | "email"
              | "content"
              | "pr"
              | "google_ads"
              | "youtube",
            enabled: false,
            budget: 0,
            settings: {},
          });
        }
      });
    }
  }, [
    audienceFields.length,
    channelFields.length,
    appendAudience,
    appendChannel,
  ]);

  // Handle channel enable/disable
  const handleChannelToggle = (index: number, enabled: boolean) => {
    form.setValue(`audienceChannels.channels.${index}.enabled`, enabled);

    const channelType = channels[index]?.type;
    if (channelType) {
      if (enabled) {
        // Set minimum budget when enabling
        const channelInfo = CHANNEL_OPTIONS.find((c) => c.type === channelType);
        const minBudget = channelInfo?.minBudget || 0;
        form.setValue(`audienceChannels.channels.${index}.budget`, minBudget);
        form.setValue(
          `audienceChannels.budgetAllocation.${channelType}`,
          minBudget
        );
      } else {
        // Clear budget when disabling
        form.setValue(`audienceChannels.channels.${index}.budget`, 0);
        form.setValue(`audienceChannels.budgetAllocation.${channelType}`, 0);
      }
    }
  };

  // Handle budget allocation changes
  const handleBudgetChange = (channelType: string, budget: number) => {
    // Update both channel budget and allocation
    const channelIndex = channels.findIndex((c) => c.type === channelType);
    if (channelIndex >= 0) {
      form.setValue(`audienceChannels.channels.${channelIndex}.budget`, budget);
    }
    form.setValue(`audienceChannels.budgetAllocation.${channelType}`, budget);
  };

  // Calculate total allocated budget
  const totalAllocated = Object.values(budgetAllocation).reduce(
    (sum, amount) => sum + (Number(amount) || 0),
    0
  );
  const remainingBudget = campaignBudget - totalAllocated;

  // Add new audience segment
  const addAudienceSegment = () => {
    appendAudience({
      id: `audience-${Date.now()}`,
      name: `Audience ${audienceFields.length + 1}`,
      demographics: {
        ageRange: [25, 45] as [number, number],
        gender: "all" as const,
        location: ["United States"],
        interests: [],
      },
      estimatedSize: undefined,
    });
  };

  // Add new channel
  const addChannel = (channelType: string) => {
    const channelInfo = CHANNEL_OPTIONS.find((c) => c.type === channelType);
    if (channelInfo && !channels.find((c) => c.type === channelType)) {
      appendChannel({
        type: channelType as
          | "facebook"
          | "instagram"
          | "twitter"
          | "linkedin"
          | "email"
          | "content"
          | "pr"
          | "google_ads"
          | "youtube",
        enabled: false,
        budget: 0,
        settings: {},
      });
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Step Completion Status */}
      {isAudienceChannelsStepComplete(
        form.watch("audienceChannels") || {
          audiences: [],
          channels: [],
          budgetAllocation: {},
        }
      ) && (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertDescription>
            Step 2 is complete! You can proceed to the next step or continue
            making changes.
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Summary */}
      {(budgetError || Object.keys(validationErrors).length > 0) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Please fix the following issues:</p>
              {budgetError && <div>• {budgetError}</div>}
              {Object.entries(validationErrors).map(([key, error]) => (
                <div key={key}>• {error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Budget Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Budget Allocation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">
                ${campaignBudget.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Total Budget</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                ${totalAllocated.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Allocated</p>
            </div>
            <div>
              <p
                className={cn(
                  "text-2xl font-bold",
                  remainingBudget < 0 ? "text-red-600" : "text-blue-600"
                )}
              >
                ${remainingBudget.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Remaining</p>
            </div>
          </div>

          {budgetError && (
            <Alert className="mt-4" variant="destructive">
              <AlertDescription>{budgetError}</AlertDescription>
            </Alert>
          )}

          {Object.keys(validationErrors).length > 0 && (
            <Alert className="mt-4" variant="destructive">
              <AlertDescription>
                <div className="space-y-1">
                  {Object.entries(validationErrors).map(([key, error]) => (
                    <div key={key}>• {error}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Audience Segments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Audience Segments
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addAudienceSegment}
              disabled={audienceFields.length >= 10}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Segment
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {audienceFields.map((field, index) => (
            <AudienceSegmentForm
              key={field.id}
              index={index}
              onRemove={() => removeAudience(index)}
              canRemove={audienceFields.length > 1}
              validationErrors={validationErrors}
            />
          ))}
        </CardContent>
      </Card>

      {/* Marketing Channels */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Marketing Channels
            </CardTitle>
            <Select onValueChange={addChannel}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Add Channel" />
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_OPTIONS.filter(
                  (option) => !channels.find((c) => c.type === option.type)
                ).map((option) => (
                  <SelectItem key={option.type} value={option.type}>
                    <div className="flex items-center gap-2">
                      <span>{option.icon}</span>
                      <span>{option.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {channelFields.map((field, index) => (
            <ChannelConfigForm
              key={field.id}
              index={index}
              onRemove={() => removeChannel(index)}
              onToggle={(enabled) => handleChannelToggle(index, enabled)}
              onBudgetChange={(budget) => {
                const channelType = channels[index]?.type;
                if (channelType) {
                  handleBudgetChange(channelType, budget);
                }
              }}
              canRemove={channelFields.length > 1}
              validationErrors={validationErrors}
              campaignBudget={campaignBudget}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// Audience Segment Form Component
interface AudienceSegmentFormProps {
  index: number;
  onRemove: () => void;
  canRemove: boolean;
  validationErrors?: Record<string, string>;
}

function AudienceSegmentForm({
  index,
  onRemove,
  canRemove,
  validationErrors = {},
}: AudienceSegmentFormProps) {
  const form = useFormContext();
  const [interestInput, setInterestInput] = useState("");
  const [locationInput, setLocationInput] = useState("");

  const interests =
    form.watch(`audienceChannels.audiences.${index}.demographics.interests`) ||
    [];
  const locations =
    form.watch(`audienceChannels.audiences.${index}.demographics.location`) ||
    [];
  const ageRange = form.watch(
    `audienceChannels.audiences.${index}.demographics.ageRange`
  ) || [25, 45];

  const addInterest = (interest: string) => {
    if (interest && !interests.includes(interest)) {
      form.setValue(
        `audienceChannels.audiences.${index}.demographics.interests`,
        [...interests, interest]
      );
      setInterestInput("");
    }
  };

  const removeInterest = (interest: string) => {
    form.setValue(
      `audienceChannels.audiences.${index}.demographics.interests`,
      interests.filter((i: string) => i !== interest)
    );
  };

  const addLocation = (location: string) => {
    if (location && !locations.includes(location)) {
      form.setValue(
        `audienceChannels.audiences.${index}.demographics.location`,
        [...locations, location]
      );
      setLocationInput("");
    }
  };

  const removeLocation = (location: string) => {
    form.setValue(
      `audienceChannels.audiences.${index}.demographics.location`,
      locations.filter((l: string) => l !== location)
    );
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <FormField
            control={form.control}
            name={`audienceChannels.audiences.${index}.name`}
            render={({ field }) => (
              <FormItem className="flex-1 mr-4">
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Audience segment name"
                    className={cn(
                      "text-lg font-medium",
                      validationErrors[`audience_${index}_name`] &&
                        "border-red-500"
                    )}
                  />
                </FormControl>
                <FormMessage />
                {validationErrors[`audience_${index}_name`] && (
                  <p className="text-sm text-red-600">
                    {validationErrors[`audience_${index}_name`]}
                  </p>
                )}
              </FormItem>
            )}
          />
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Age Range */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Age Range: {ageRange[0]} - {ageRange[1]} years
          </Label>
          <Slider
            value={ageRange}
            onValueChange={(value) =>
              form.setValue(
                `audienceChannels.audiences.${index}.demographics.ageRange`,
                value as [number, number]
              )
            }
            min={13}
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        {/* Gender */}
        <FormField
          control={form.control}
          name={`audienceChannels.audiences.${index}.demographics.gender`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender targeting" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Locations */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Locations
          </Label>
          <div className="flex gap-2">
            <Input
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder="Add location..."
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLocation(locationInput);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => addLocation(locationInput)}
              disabled={!locationInput}
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {LOCATION_SUGGESTIONS.slice(0, 6).map((location) => (
              <Button
                key={location}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addLocation(location)}
                disabled={locations.includes(location)}
                className="text-xs"
              >
                + {location}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {locations.map((location: string) => (
              <Badge
                key={location}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => removeLocation(location)}
              >
                {location} ×
              </Badge>
            ))}
          </div>
        </div>

        {/* Interests */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Interests
          </Label>
          <div className="flex gap-2">
            <Input
              value={interestInput}
              onChange={(e) => setInterestInput(e.target.value)}
              placeholder="Add interest..."
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addInterest(interestInput);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => addInterest(interestInput)}
              disabled={!interestInput}
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {INTEREST_SUGGESTIONS.slice(0, 8).map((interest) => (
              <Button
                key={interest}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addInterest(interest)}
                disabled={interests.includes(interest)}
                className="text-xs"
              >
                + {interest}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {interests.map((interest: string) => (
              <Badge
                key={interest}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => removeInterest(interest)}
              >
                {interest} ×
              </Badge>
            ))}
          </div>
        </div>

        {/* Estimated Size */}
        <FormField
          control={form.control}
          name={`audienceChannels.audiences.${index}.estimatedSize`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estimated Audience Size (optional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  placeholder="e.g., 50000"
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}

// Channel Configuration Form Component
interface ChannelConfigFormProps {
  index: number;
  onRemove: () => void;
  onToggle: (enabled: boolean) => void;
  onBudgetChange: (budget: number) => void;
  canRemove: boolean;
  validationErrors?: Record<string, string>;
  campaignBudget?: number;
}

function ChannelConfigForm({
  index,
  onRemove,
  onToggle,
  onBudgetChange,
  canRemove,
  validationErrors = {},
  campaignBudget = 0,
}: ChannelConfigFormProps) {
  const form = useFormContext();

  const channel = form.watch(`audienceChannels.channels.${index}`);
  const channelInfo = CHANNEL_OPTIONS.find((c) => c.type === channel?.type);

  if (!channelInfo) return null;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{channelInfo.icon}</span>
            <div>
              <h4 className="font-medium">{channelInfo.name}</h4>
              <p className="text-sm text-muted-foreground">
                {channelInfo.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FormField
              control={form.control}
              name={`audienceChannels.channels.${index}.enabled`}
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        onToggle(checked);
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {canRemove && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {channel?.enabled && (
          <div className="space-y-4 pt-4 border-t">
            <FormField
              control={form.control}
              name={`audienceChannels.channels.${index}.budget`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget Allocation</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">$</span>
                      <Input
                        {...field}
                        type="number"
                        min={channelInfo.minBudget}
                        placeholder={`Min: $${channelInfo.minBudget}`}
                        onChange={(e) => {
                          const value = Number(e.target.value) || 0;
                          field.onChange(value);
                          onBudgetChange(value);
                        }}
                      />
                    </div>
                  </FormControl>
                  {channelInfo.minBudget > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Minimum budget: ${channelInfo.minBudget}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <Badge variant="outline" className="text-xs">
              {channelInfo.category}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
