"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Mail, Shield, Eye, Settings } from "lucide-react";
import { toast } from "sonner";

interface InviteUserDialogProps {
  organizationId: Id<"organizations">;
  trigger?: React.ReactNode;
  onInviteSent?: () => void;
}

const ROLE_OPTIONS = [
  {
    value: "admin" as const,
    label: "Admin",
    description: "Can manage team, create campaigns, and view analytics",
    icon: Settings,
    color: "text-blue-600",
  },
  {
    value: "member" as const,
    label: "Member",
    description: "Can create campaigns and view analytics",
    icon: Shield,
    color: "text-green-600",
  },
  {
    value: "viewer" as const,
    label: "Viewer",
    description: "Can only view campaigns and analytics",
    icon: Eye,
    color: "text-gray-600",
  },
];

export function InviteUserDialog({
  organizationId,
  trigger,
  onInviteSent,
}: InviteUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    role: "member" as const,
    message: "",
  });

  const inviteUser = useMutation(api.users.inviteUserToOrganization);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      await inviteUser({
        organizationId,
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        message: formData.message.trim() || undefined,
      });

      toast.success("Invitation sent!", {
        description: `An invitation has been sent to ${formData.email}`,
      });

      // Reset form
      setFormData({
        email: "",
        role: "member",
        message: "",
      });

      setOpen(false);
      onInviteSent?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send invitation"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const selectedRole = ROLE_OPTIONS.find((role) => role.value === formData.role);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite User to Organization
          </DialogTitle>
          <DialogDescription>
            Send an invitation to join your organization. They'll receive an
            email with instructions to accept the invitation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="user@example.com"
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select
              value={formData.role}
              onValueChange={(value: any) =>
                setFormData((prev) => ({ ...prev, role: value }))
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((role) => {
                  const IconComponent = role.icon;
                  return (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex items-center gap-2">
                        <IconComponent
                          className={`h-4 w-4 ${role.color}`}
                        />
                        <div>
                          <div className="font-medium">{role.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {role.description}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {selectedRole && (
              <div className="p-3 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <selectedRole.icon
                    className={`h-4 w-4 ${selectedRole.color}`}
                  />
                  <span className="font-medium">{selectedRole.label}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedRole.description}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, message: e.target.value }))
              }
              placeholder="Add a personal message to the invitation..."
              disabled={isLoading}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}