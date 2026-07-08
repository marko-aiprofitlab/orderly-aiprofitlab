import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";

/**
 * Privremeni placeholder zaštićene stranice — služi za verifikaciju da login
 * radi i da sign-out (UserButton) postoji. Pun dashboard sa sidebar-om,
 * KPI-jevima i live feed-om dolazi u kasnijim koracima (Faza 1).
 */
export default async function DashboardPage() {
  const user = await currentUser();
  const greetingName =
    user?.firstName ?? user?.username ?? user?.emailAddresses[0]?.emailAddress;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">
          Dobrodošao{greetingName ? `, ${greetingName}` : ""}
        </h1>
        <UserButton />
      </div>
      <p className="text-muted-foreground text-sm">
        Dashboard — uskoro. (Korak 0.6: auth radi ✓)
      </p>
    </main>
  );
}
