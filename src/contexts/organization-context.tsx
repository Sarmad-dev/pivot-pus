"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface Organization {
  _id: Id<"organizations">;
  name: string;
  slug: string;
  createdAt: number;
  settings: {
    defaultCurrency: string;
    timezone: string;
  };
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  setCurrentOrganization: (org: Organization) => void;
  isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const organizations = useQuery(api.organizations.getUserOrganizations);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);

  useEffect(() => {
    if (organizations && organizations.length > 0 && !currentOrganization) {
      // Set the first organization as default if none is selected
      setCurrentOrganization(organizations[0]);
    }
  }, [organizations, currentOrganization]);

  const value = {
    currentOrganization,
    organizations: organizations || [],
    setCurrentOrganization,
    isLoading: organizations === undefined,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}