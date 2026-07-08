"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Bell, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SidebarNav } from "@/components/dashboard/sidebar";

/**
 * Gornja traka. Na mobilnom (`md:hidden`) hamburger otvara Sheet sa istom
 * navigacijom kao sidebar. Desna dugmad (zvuk, notifikacije) su vizuelni
 * placeholderi — puna logika dolazi u Fazi 1 (1.11 zvuk).
 */
export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2">
        {/* Mobilni hamburger + Sheet sa navigacijom */}
        <Sheet open={open} onOpenChange={setOpen}>
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-label="Otvori navigaciju"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </Button>
          <SheetContent side="left" className="w-[260px] sm:max-w-[260px]">
            <SheetHeader>
              <SheetTitle>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="text-lg font-bold tracking-tight"
                >
                  Orderly
                </Link>
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-1 flex-col overflow-y-auto px-2 pb-4">
              <SidebarNav onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        <span className="text-sm font-medium md:hidden">Orderly</span>
      </div>

      {/* Placeholder akcije — bez logike u 0.8 */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Zvuk (uskoro)"
          disabled
        >
          <Volume2 />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Notifikacije (uskoro)"
          disabled
        >
          <Bell />
        </Button>
      </div>
    </header>
  );
}
