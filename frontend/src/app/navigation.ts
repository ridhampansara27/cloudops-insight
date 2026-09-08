// Import icons used by production-ready navigation entries.
import {
  Boxes,
  Cloud,
  DollarSign,
  Gauge,
  LayoutDashboard,
  Lightbulb,
  ShieldAlert,
  WalletCards,
} from "lucide-react";

// Define one sidebar destination.
export interface NavigationItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

// Define one sidebar section.
export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

// Expose only implemented CloudOps v1 functionality.
export const navigationGroups: NavigationGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Cloud",
    items: [
      {
        label: "AWS Accounts",
        href: "/cloud/accounts",
        icon: Cloud,
      },
      {
        label: "Resources",
        href: "/cloud/resources",
        icon: Boxes,
      },
    ],
  },
  {
    label: "Monitoring",
    items: [
      {
        label: "Incidents",
        href: "/monitoring/incidents",
        icon: ShieldAlert,
      },
    ],
  },
  {
    label: "FinOps",
    items: [
      {
        label: "Cost Overview",
        href: "/costs",
        icon: DollarSign,
      },
      {
        label: "Cost Explorer",
        href: "/costs/explorer",
        icon: Gauge,
      },
      {
        label: "Budgets",
        href: "/costs/budgets",
        icon: WalletCards,
      },
      {
        label: "Recommendations",
        href: "/costs/recommendations",
        icon: Lightbulb,
      },
    ],
  },
];
