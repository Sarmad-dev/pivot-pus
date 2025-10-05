"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

export function SecurityTab() {
  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: PasswordFormData) => {
    try {
      // TODO: Implement password change with Convex auth
      console.log("Password change:", data);
      toast.success("Password updated successfully");
      form.reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update password"
      );
    }
  };

  const handleSetup2FA = () => {
    // TODO: Implement 2FA setup
    toast.info("2FA setup coming soon");
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-foreground">Password & Authentication</CardTitle>
          <CardDescription className="text-muted-foreground">
            Manage your login credentials and security settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password" className="text-foreground">
                Current Password
              </Label>
              <Input
                id="current-password"
                type="password"
                placeholder="••••••••"
                {...form.register("currentPassword")}
                className="bg-surface/50 border-border/50 focus:border-primary"
              />
              {form.formState.errors.currentPassword && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-foreground">
                New Password
              </Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                {...form.register("newPassword")}
                className="bg-surface/50 border-border/50 focus:border-primary"
              />
              {form.formState.errors.newPassword && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.newPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-foreground">
                Confirm New Password
              </Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                {...form.register("confirmPassword")}
                className="bg-surface/50 border-border/50 focus:border-primary"
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full btn-hero"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-foreground">Two-Factor Authentication</CardTitle>
          <CardDescription className="text-muted-foreground">
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 glass-strong rounded-lg">
            <div>
              <div className="font-medium text-foreground">Authenticator App</div>
              <div className="text-sm text-muted-foreground">
                Use an authenticator app for 2FA
              </div>
            </div>
            <Badge variant="secondary" className="bg-muted/20 text-muted-foreground">
              Not enabled
            </Badge>
          </div>

          <div className="flex items-center justify-between p-4 glass-strong rounded-lg">
            <div>
              <div className="font-medium text-foreground">SMS Authentication</div>
              <div className="text-sm text-muted-foreground">
                Receive codes via text message
              </div>
            </div>
            <Badge variant="secondary" className="bg-muted/20 text-muted-foreground">
              Not enabled
            </Badge>
          </div>

          <Button
            variant="outline"
            className="w-full btn-ghost"
            onClick={handleSetup2FA}
          >
            Set Up 2FA
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
