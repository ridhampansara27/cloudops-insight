// Import icons used in the application navigation.
import {
  Activity,
  BellRing,
  Boxes,
  Cloud,
  DollarSign,
  Gauge,
  LayoutDashboard,
  Lightbulb,
  Settings,
  ShieldAlert,
  Tags,
  WalletCards,
} from "lucide-react";

// Define one navigation item.
export interface NavigationItem {
  // Display the item name.
  label: string;

  // Define the item destination.
  href: string;

  // Associate the item with a Lucide icon.
  icon: typeof LayoutDashboard;
}

// Define one named navigation group.
export interface NavigationGroup {
  // Display the group heading.
  label: string;

  // Store all links in the group.
  items: NavigationItem[];
}

// Export the complete sidebar navigation.
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
        label: "Cloud Accounts",
        href: "/cloud/accounts",
        icon: Cloud,
      },
      {
        label: "Resources",
        href: "/cloud/resources",
        icon: Boxes,
      },
      {
        label: "Tags & Ownership",
        href: "/cloud/tags",
        icon: Tags,
      },
    ],
  },
  {
    label: "Monitoring",
    items: [
      {
        label: "Health",
        href: "/monitoring/health",
        icon: Activity,
      },
      {
        label: "Incidents",
        href: "/monitoring/incidents",
        icon: ShieldAlert,
      },
      {
        label: "Alerts",
        href: "/monitoring/alerts",
        icon: BellRing,
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
  {
    label: "Administration",
    items: [
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
];