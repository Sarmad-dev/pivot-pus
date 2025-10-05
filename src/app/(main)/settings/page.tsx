"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserInvitations } from "@/components/users/user-invitations";
import { OrganizationMembers } from "@/components/users/organization-members";
import { useOrganization } from "@/contexts/organization-context";
import { Settings, Users, Mail } from "lucide-react";

export default function SettingsPage() {
  const { currentOrganization } = useOrganization();

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">No organization selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                <Settings className="h-8 w-8" />
                Organization Settings
              </h1>
              <p className="text-muted-foreground">
                Manage your organization members and invitations
              </p>
            </div>

            <Tabs defaultValue="members" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="members" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Members
                </TabsTrigger>
                <TabsTrigger value="invitations" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Invitations
                </TabsTrigger>
              </TabsList>

              <TabsContent value="members" className="space-y-6">
                <OrganizationMembers organizationId={currentOrganization._id} />
              </TabsContent>

              <TabsContent value="invitations" className="space-y-6">
                <UserInvitations />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
