"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { isNavActive, NAV_ITEMS } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname() ?? "";
  const settingsActive = isNavActive(pathname, "/settings");

  return (
    <aside
      aria-label="Основная навигация"
      className={cn(
        "hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:flex-col",
        "border-sidebar-border bg-sidebar text-sidebar-foreground border-r",
      )}
    >
      <div className="px-6 py-6">
        <span className="text-base font-semibold tracking-tight">BeatYourself</span>
      </div>
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-sidebar-border border-t px-3 py-3">
        <Link
          href="/settings"
          aria-current={settingsActive ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            settingsActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          )}
        >
          <Settings className="size-4" aria-hidden="true" />
          <span>Настройки</span>
        </Link>
      </div>
    </aside>
  );
}
