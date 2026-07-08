import {
  LayoutDashboard,
  BarChart3,
  Users,
  Repeat,
  TrendingUp,
  Settings,
  Store,
  Volume2,
  Tv,
  type LucideIcon,
} from "lucide-react";

/**
 * Jedan izvor istine za navigaciju — koristi se i u desktop sidebar-u
 * (`sidebar.tsx`) i u mobilnom Sheet-u (`header.tsx`). Ne duplirati rute.
 */
export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Otvara u novom tabu (npr. TV zid — full-screen javna ruta van layout-a). */
  external?: boolean;
};

export type NavGroup = {
  /** Opcioni naslov grupe (npr. „Podešavanja"). */
  title?: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Analitika", href: "/analytics", icon: BarChart3 },
      { label: "Kupci", href: "/customers", icon: Users },
      { label: "Pretplate", href: "/subscriptions", icon: Repeat },
      { label: "Profit", href: "/profit", icon: TrendingUp },
    ],
  },
  {
    title: "Podešavanja",
    items: [
      { label: "Opšte", href: "/settings/general", icon: Settings },
      { label: "Sajtovi", href: "/settings/sites", icon: Store },
      { label: "Zvuk", href: "/settings/sound", icon: Volume2 },
    ],
  },
  {
    items: [{ label: "TV prikaz", href: "/tv", icon: Tv, external: true }],
  },
];

/**
 * Da li je nav stavka aktivna za dati pathname. `/dashboard` traži tačan
 * match (da se ne pali za sve `/dashboard/[siteId]`); ostale rute koriste
 * prefiks match zbog ugnježdenih ruta (npr. `/customers/[id]`).
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
