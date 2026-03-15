"use client";

import { Link, usePathname } from "@/i18n/navigation";
import {
  LayoutDashboard,
  Users,
  Settings,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface TabItem {
  labelKey: string;
  href: string;
  icon: React.ElementType;
}

const TABS: TabItem[] = [
  { labelKey: "home", href: "/app/dashboard", icon: LayoutDashboard },
  { labelKey: "members", href: "/app/members", icon: Users },
  { labelKey: "settings", href: "/app/settings/plans", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-border bg-card md:hidden"
      data-testid="mobile-nav"
    >
      {TABS.map((tab) => {
        const isActive =
          pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground active:text-foreground"
            )}
          >
            <tab.icon className="size-5" strokeWidth={1.5} />
            {t(tab.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
