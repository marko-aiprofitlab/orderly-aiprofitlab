import { currentUser } from "@clerk/nextjs/server";

/**
 * Dashboard — trenutno placeholder unutar novog skeleta (Korak 0.8).
 * Pun sadržaj (KPI, live feed, tabela) dolazi u Fazi 1.
 */
export default async function DashboardPage() {
  const user = await currentUser();
  const greetingName =
    user?.firstName ?? user?.username ?? user?.emailAddresses[0]?.emailAddress;

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold tracking-tight">
        Dobrodošao{greetingName ? `, ${greetingName}` : ""}
      </h1>
      <p className="text-muted-foreground text-sm">
        Dashboard — uskoro. KPI-jevi, live feed i tabela dolaze u Fazi 1.
      </p>
    </div>
  );
}
