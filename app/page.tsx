import { redirect } from "next/navigation";

/**
 * Korenska ruta preusmerava na dashboard. Neprijavljen korisnik → Clerk ga
 * (preko proxy.ts `auth.protect()`) šalje na `/sign-in`; prijavljen → `/dashboard`.
 */
export default function RootPage() {
  redirect("/dashboard");
}
