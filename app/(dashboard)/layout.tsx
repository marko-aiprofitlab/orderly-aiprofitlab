import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { DashboardProviders } from "@/components/dashboard/providers";
import { Toaster } from "@/components/ui/sonner";

/**
 * Zajednički layout zaštićenih dashboard ekrana (Korak 0.8):
 * sidebar (220px) levo + header (sticky) iznad skrolabilnog `<main>`.
 * Sve obmotano u `DashboardProviders` (slot za Realtime/Sound iz Faze 1).
 */
export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <DashboardProviders>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
      <Toaster />
    </DashboardProviders>
  );
}
