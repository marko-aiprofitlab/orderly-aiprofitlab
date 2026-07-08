"use client"

import { Toaster as Sonner } from "sonner"

/**
 * Toast notifikacije (Korak 1.1). Projekat koristi class-based dark mode
 * (`.dark` na <html>), bez `next-themes` — zato temu ne prosleđujemo dinamički,
 * već stilizujemo preko CSS varijabli mapiranih na naše dizajn tokene, pa toast
 * prati light/dark automatski.
 */
function Toaster({ ...props }: React.ComponentProps<typeof Sonner>) {
  return (
    <Sonner
      className="toaster group"
      position="bottom-right"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
