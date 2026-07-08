"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { NAV_GROUPS, isNavItemActive } from "@/components/dashboard/nav-items";

/**
 * Deljena navigacija — renderuje se u desktop sidebar-u i u mobilnom Sheet-u
 * (header.tsx). `onNavigate` zatvara Sheet posle klika na mobilnom.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV_GROUPS.map((group, groupIndex) => (
        <div key={group.title ?? groupIndex} className="flex flex-col gap-1">
          {groupIndex > 0 && <Separator className="my-2" />}
          {group.title && (
            <p className="px-3 pt-1 pb-0.5 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
              {group.title}
            </p>
          )}
          {group.items.map((item) => {
            const active = isNavItemActive(item.href, pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                {...(item.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium",
                  "transition-[background-color,color] duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
                  active
                    ? "bg-sidebar-accent text-brand"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/**
 * Desktop sidebar (220px). Skriven ispod `md` — na mobilnom se ista
 * navigacija otvara kroz Sheet u header-u.
 */
export function Sidebar() {
  return (
    <aside className="hidden w-[220px] shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 items-center px-4">
        <Link href="/dashboard" className="text-lg font-bold tracking-tight">
          Orderly
        </Link>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto px-2 pb-2">
        <SidebarNav />
      </div>
      <Separator />
      <div className="flex items-center gap-2 p-3">
        <UserButton />
        <span className="text-xs text-muted-foreground">Nalog</span>
      </div>
    </aside>
  );
}
