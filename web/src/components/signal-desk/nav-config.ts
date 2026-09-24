import {
  LayoutDashboard,
  GitCompareArrows,
  Grid3X3,
  Search,
  Radio,
  ListChecks,
  LineChart,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "terminal", label: "Single Ticker", icon: LayoutDashboard, href: "#terminal" },
  { id: "comparison", label: "Comparison", icon: GitCompareArrows, href: "#comparison", badge: "FR-13" },
  { id: "heatmap", label: "Heatmap Matrix", icon: Grid3X3, href: "#heatmap" },
  { id: "vector-lab", label: "Vector Search", icon: Search, href: "#vector-lab" },
  { id: "watchlist", label: "Watchlist", icon: ListChecks, href: "#watchlist" },
  { id: "analytics", label: "Analytics", icon: LineChart, href: "#analytics" },
];
