import { ComponentType } from "react";

export interface SidebarNavigationType {
  title: string;
  route: string;
  icon: ComponentType<{ className?: string }>;
}

export type SidebarNavigationArray = SidebarNavigationType[];
