"use client";

import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Check, X, Clock, Building } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export function UserInvitations() {
  const invitations = useQuery(api.users.getUserInvitations);
  const acceptInvitation = useMutation(api.users.acceptOrganizationInvitation);

  const handleAcceptInvitation = async (
    invitationId: string,
    orgName: string
  ) => {
    try {
      await acceptInvitation({ invitationId: invitationId as any });
      toast.success(`Welcome to ${orgName}!`, {
        description: "You've successfully joined the organization.",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to accept invitation"
      );
    }
  };

  if (invitations === undefined) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Organization Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No pending invitations</p>
            <p className="text-sm">
              You'll see organization invitations here when you receive them.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Organization Invitations ({invitations.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {invitations.map((invitation) => {
          const isExpiringSoon =
            invitation.expiresAt - Date.now() < 24 * 60 * 60 * 1000; // 24 hours

          return (
            <div
              key={invitation._id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={invitation.organization.image} />
                    <AvatarFallback>
                      <Building className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                    <Mail className="h-3 w-3 text-white" />
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">
                      {invitation.organization.name}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {invitation.role}
                    </Badge>
                    {isExpiringSoon && (
                      <Badge variant="destructive" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Expires Soon
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Invited by {invitation.invitedByUser.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Invited{" "}
                    {formatDistanceToNow(new Date(invitation.invitedAt), {
                      addSuffix: true,
                    })}
                    {" • "}
                    Expires{" "}
                    {formatDistanceToNow(new Date(invitation.expiresAt), {
                      addSuffix: true,
                    })}
                  </p>
                  {invitation.message && (
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      <p className="italic">"{invitation.message}"</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    handleAcceptInvitation(
                      invitation._id,
                      invitation.organization.name
                    )
                  }
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accept
                </Button>
                <Button size="sm" variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  Decline
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
