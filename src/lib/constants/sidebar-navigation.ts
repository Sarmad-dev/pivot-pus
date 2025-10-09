import { SidebarNavigationArray } from "../types";
import {
  DashboardIcon,
  CampaignIcon,
  CollaborationIcon,
  AdminIcon,
  ClientViewIcon,
  NotificationsIcon,
  PricingIcon,
  ProfileIcon,
} from "../../components/icons";

export const SidebarNavigation: SidebarNavigationArray = [
  {
    title: "Dashboard",
    route: "/dashboard",
    icon: DashboardIcon,
  },
  {
    title: "Campaigns",
    route: "/campaigns",
    icon: CampaignIcon,
  },
  {
    title: "Collaboration",
    route: "/collaboration",
    icon: CollaborationIcon,
  },
  {
    title: "Client View",
    route: "/client-view",
    icon: ClientViewIcon,
  },
  {
    title: "Admin Panel",
    route: "/admin-panel",
    icon: AdminIcon,
  },
  {
    title: "Notifications",
    route: "/notifications",
    icon: NotificationsIcon,
  },
  {
    title: "Pricing",
    route: "/pricing",
    icon: PricingIcon,
  },
  {
    title: "Profile",
    route: "/profile",
    icon: ProfileIcon,
  },
  {
    title: "Settings",
    route: "/settings",
    icon: AdminIcon,
  },
];
