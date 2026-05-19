import { Droplet, Home, Scale, Target, User, type LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { label: "Главная", href: "/dashboard", icon: Home },
  { label: "Челленджи", href: "/challenges", icon: Target },
  { label: "Вода", href: "/water", icon: Droplet },
  { label: "Вес", href: "/weight", icon: Scale },
  { label: "Профиль", href: "/profile", icon: User },
];

export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}
