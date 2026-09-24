import {
  LayoutDashboard,
  Radio,
  ListChecks,
  BarChart3,
  LineChart,
  Wallet,
  Bell,
  Settings,
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
  { id: "terminal", label: "Terminal", icon: LayoutDashboard, href: "#terminal" },
  { id: "live-signals", label: "Live Signals", icon: Radio, href: "#live-signals", badge: "LIVE" },
  { id: "watchlist", label: "Watchlist", icon: ListChecks, href: "#watchlist" },
  { id: "signals", label: "Signals Log", icon: BarChart3, href: "#signals" },
  { id: "analytics", label: "Analytics", icon: LineChart, href: "#analytics" },
  { id: "portfolio", label: "Portfolio", icon: Wallet, href: "#portfolio" },
  { id: "alerts", label: "Alerts", icon: Bell, href: "#alerts" },
  { id: "settings", label: "Settings", icon: Settings, href: "#settings" },
];
