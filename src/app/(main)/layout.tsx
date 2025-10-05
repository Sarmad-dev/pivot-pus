"use client";

import LeftSidebar from "@/components/navigation/sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import Link from "next/link";
import React, { ReactNode } from "react";
import OrganizationCheck from "@/components/organizations/organization-check";
import OrganizationSwitcher from "@/components/organizations/organization-switcher";
import { UserMenu } from "@/components/navigation/user-menu";

const MainLayout = ({ children }: { children: ReactNode }) => {

  return (
    <OrganizationCheck>
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <LeftSidebar />
          <SidebarInset>
            {/* Top Header */}
            <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <OrganizationSwitcher />
                <Link href="/notifications">
                  <Button variant="ghost" size="sm" className="relative">
                    <Bell className="h-4 w-4" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    <span className="sr-only">Notifications</span>
                  </Button>
                </Link>
                <UserMenu />
              </div>
            </header>
            
            {/* Main Content */}
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </OrganizationCheck>
  );
};

export default MainLayout;
