"use client";

/**
 * Provider slot za dashboard. Za sad passthrough — u Fazi 1 ovde se montiraju
 * (na nivou `(dashboard)/layout.tsx`, vidi CLAUDE.md):
 *
 *   <RealtimeOrdersProvider>   // jedan WebSocket kanal za ceo dashboard
 *     <SoundProvider>          // zvučne notifikacije za nove porudžbine
 *       {children}
 *     </SoundProvider>
 *   </RealtimeOrdersProvider>
 *
 * Držimo wrapper od početka da kasnije obmotavanje ne traži refactor layout-a.
 */
export function DashboardProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
