"use client";

import { Link, usePathname } from "@/i18n/navigation";
import {
  LayoutDashboard,
  Users,
  GitBranch,
  Settings,
  Dumbbell,
  BarChart3,
  ClipboardList,
  UserCog,
  FileText,
} from "lucide-react";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const ADMIN_ROLES = ["SUPER_ADMIN", "MANAGER"];

interface NavItem {
  labelKey: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { labelKey: "dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { labelKey: "members", href: "/app/members", icon: Users },
  { labelKey: "employees", href: "/app/employees", icon: UserCog, adminOnly: true },
  { labelKey: "analytics", href: "/app/analytics", icon: BarChart3, adminOnly: true },
  { labelKey: "auditLogs", href: "/app/audit-logs", icon: FileText, adminOnly: true },
  { labelKey: "branches", href: "/app/branches", icon: GitBranch, adminOnly: true },
  { labelKey: "managePlans", href: "/app/settings/plans", icon: ClipboardList, adminOnly: true },
  { labelKey: "settings", href: "/app/settings", icon: Settings, adminOnly: true },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { role } = useWorkspace();
  const t = useTranslations("nav");
  const isAdmin = role ? ADMIN_ROLES.includes(role) : false;

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <aside
      className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-border md:bg-card"
      data-testid="app-sidebar"
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <Dumbbell className="size-5 text-primary" strokeWidth={1.5} />
        <span className="text-lg font-bold tracking-tight text-foreground">Vajra</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 p-3">
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/app/settings"
              ? pathname === "/app/settings"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="size-4" strokeWidth={1.5} />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
