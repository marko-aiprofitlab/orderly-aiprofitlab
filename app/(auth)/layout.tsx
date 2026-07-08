/**
 * Layout za auth rute (sign-in / sign-up) — centrira Clerk formu na ekranu.
 * Javno dostupno (vidi public rute u proxy.ts).
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      {children}
    </main>
  );
}
