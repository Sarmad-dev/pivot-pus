"use client";

import React, { useState, memo, useCallback, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { CalendarIcon, DollarSign, FileText, AlertCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FieldValidation, commonValidationRules } from "../field-validation";
import { useStepValidation } from "../../../hooks/use-campaign-validation";
import type { ValidationIssue } from "../validation-summary";
import { useOptimizedFormField } from "../../../hooks/use-performance";
import { useKeyboardNavigation } from "../../../hooks/use-keyboard-navigation";
import { cn } from "@/lib/utils";

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD ($)", symbol: "$" },
  { value: "EUR", label: "EUR (€)", symbol: "€" },
  { value: "GBP", label: "GBP (£)", symbol: "£" },
];

const CATEGORY_OPTIONS = [
  { value: "pr", label: "Public Relations" },
  { value: "content", label: "Content Marketing" },
  { value: "social", label: "Social Media" },
  { value: "paid", label: "Paid Advertising" },
  { value: "mixed", label: "Mixed Campaign" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low Priority" },
  { value: "medium", label: "Medium Priority" },
  { value: "high", label: "High Priority" },
];

// Memoized currency selector component
const CurrencySelector = memo(({ 
  value, 
  onChange, 
  disabled 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  disabled?: boolean; 
}) => (
  <Select onValueChange={onChange} value={value} disabled={disabled}>
    <FormControl>
      <SelectTrigger>
        <SelectValue placeholder="Select currency" />
      </SelectTrigger>
    </FormControl>
    <SelectContent>
      {CURRENCY_OPTIONS.map((currency) => (
        <SelectItem key={currency.value} value={currency.value}>
          {currency.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
));

CurrencySelector.displayName = "CurrencySelector";

// Memoized category selector component
const CategorySelector = memo(({ 
  value, 
  onChange, 
  disabled 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  disabled?: boolean; 
}) => (
  <Select onValueChange={onChange} value={value} disabled={disabled}>
    <FormControl>
      <SelectTrigger>
        <SelectValue placeholder="Select category" />
      </SelectTrigger>
    </FormControl>
    <SelectContent>
      {CATEGORY_OPTIONS.map((category) => (
        <SelectItem key={category.value} value={category.value}>
          {category.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
));

CategorySelector.displayName = "CategorySelector";

// Memoized priority selector component
const PrioritySelector = memo(({ 
  value, 
  onChange, 
  disabled 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  disabled?: boolean; 
}) => (
  <Select onValueChange={onChange} value={value} disabled={disabled}>
    <FormControl>
      <SelectTrigger>
        <SelectValue placeholder="Select priority" />
      </SelectTrigger>
    </FormControl>
    <SelectContent>
      {PRIORITY_OPTIONS.map((priority) => (
        <SelectItem key={priority.value} value={priority.value}>
          {priority.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
));

PrioritySelector.displayName = "PrioritySelector";

export const CampaignBasicsStep = memo(function CampaignBasicsStep() {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext();
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const watchedValues = watch("basics");
  
  // Memoize currency symbol calculation
  const currencySymbol = useMemo(() => {
    const selectedCurrency = watchedValues?.currency || "USD";
    return CURRENCY_OPTIONS.find((c) => c.value === selectedCurrency)?.symbol || "$";
  }, [watchedValues?.currency]);

  // Step validation status
  const stepValidation = useStepValidation(1);

  // Keyboard navigation for date pickers
  const { handleKeyDown: handleStartDateKeyDown } = useKeyboardNavigation({
    onEnter: () => setStartDateOpen(true),
    onEscape: () => setStartDateOpen(false),
  });

  const { handleKeyDown: handleEndDateKeyDown } = useKeyboardNavigation({
    onEnter: () => setEndDateOpen(true),
    onEscape: () => setEndDateOpen(false),
  });

  // Optimized date handlers
  const handleStartDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setStartDateOpen(false);
    }
  }, []);

  const handleEndDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setEndDateOpen(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Campaign Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Campaign Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={control}
            name="basics.name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Campaign Name *</FormLabel>
                <FormControl>
                  <FieldValidation
                    fieldName="basics.name"
                    rules={[
                      commonValidationRules.required("Campaign name"),
                      commonValidationRules.minLength(3, "Campaign name"),
                      commonValidationRules.maxLength(100, "Campaign name"),
                    ]}
                  >
                    <Input
                      placeholder="Enter campaign name"
                      {...field}
                      className={cn(
                        (errors.basics as any)?.name && "border-red-500 dark:border-red-400"
                      )}
                    />
                  </FieldValidation>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="basics.description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description *</FormLabel>
                <FormControl>
                  <FieldValidation
                    fieldName="basics.description"
                    rules={[
                      commonValidationRules.required("Description"),
                      commonValidationRules.minLength(10, "Description"),
                      commonValidationRules.maxLength(1000, "Description"),
                    ]}
                  >
                    <Textarea
                      placeholder="Describe your campaign objectives..."
                      className={cn(
                        "min-h-[100px]",
                        (errors.basics as any)?.description && "border-red-500 dark:border-red-400"
                      )}
                      {...field}
                    />
                  </FieldValidation>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={control}
              name="basics.category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <CategorySelector
                    value={field.value}
                    onChange={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="basics.priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority *</FormLabel>
                  <PrioritySelector
                    value={field.value}
                    onChange={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Campaign Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={control}
              name="basics.startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date *</FormLabel>
                  <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(new Date(field.value), "PPP")
                          ) : (
                            <span>Pick a start date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          field.value ? new Date(field.value) : undefined
                        }
                        onSelect={(date) => {
                          field.onChange(date);
                          handleStartDateSelect(date);
                        }}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="basics.endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date *</FormLabel>
                  <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(new Date(field.value), "PPP")
                          ) : (
                            <span>Pick an end date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          field.value ? new Date(field.value) : undefined
                        }
                        onSelect={(date) => {
                          field.onChange(date);
                          handleEndDateSelect(date);
                        }}
                        disabled={(date) => {
                          const startDate = watchedValues?.startDate;
                          return startDate
                            ? date <= new Date(startDate)
                            : date < new Date();
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Budget */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Budget Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={control}
              name="basics.currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency *</FormLabel>
                  <CurrencySelector
                    value={field.value}
                    onChange={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="basics.budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Budget *</FormLabel>
                  <FormControl>
                    <FieldValidation
                      fieldName="basics.budget"
                      rules={[
                        commonValidationRules.required("Budget"),
                        commonValidationRules.positiveNumber("Budget"),
                        {
                          name: "budgetRange",
                          severity: "warning",
                          validate: (value) => ({
                            isValid: !value || value <= 10000000,
                            message: value > 10000000 ? "Budget exceeds recommended maximum of $10,000,000" : undefined,
                            suggestion: value > 1000000 ? "Consider breaking large campaigns into smaller phases" : undefined,
                          }),
                        },
                      ]}
                    >
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground dark:text-muted-foreground">
                          {currencySymbol}
                        </span>
                        <Input
                          type="number"
                          placeholder="0.00"
                          className="pl-8"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                    </FieldValidation>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Step Validation Summary */}
      {stepValidation.issues.length > 0 && (
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50">
          <AlertTriangle className="h-4 w-4 text-blue-500 dark:text-blue-400" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium text-blue-800 dark:text-blue-200">
                Step 1 Validation Status: {stepValidation.isValid ? "Valid" : "Issues Found"}
              </p>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                {stepValidation.issues.filter((issue: ValidationIssue) => issue.severity === "error").length > 0 && (
                  <p>• {stepValidation.issues.filter((issue: ValidationIssue) => issue.severity === "error").length} error{stepValidation.issues.filter((issue: ValidationIssue) => issue.severity === "error").length !== 1 ? "s" : ""} must be fixed</p>
                )}
                {stepValidation.issues.filter((issue: ValidationIssue) => issue.severity === "warning").length > 0 && (
                  <p>• {stepValidation.issues.filter((issue: ValidationIssue) => issue.severity === "warning").length} warning{stepValidation.issues.filter((issue: ValidationIssue) => issue.severity === "warning").length !== 1 ? "s" : ""} to review</p>
                )}
                <p className="mt-1 text-blue-800 dark:text-blue-200">
                  {stepValidation.canProceed 
                    ? "✓ You can proceed to the next step" 
                    : "⚠ Please fix errors before proceeding"}
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
});
