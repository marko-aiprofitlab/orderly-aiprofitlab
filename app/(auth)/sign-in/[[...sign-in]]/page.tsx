import { SignIn } from "@clerk/nextjs";

/**
 * Zlatno pravilo #17: sign-in MORA biti catch-all `[[...sign-in]]`,
 * inače Clerk baca grešku. `/sign-in(.*)` je javna ruta u proxy.ts.
 */
export default function SignInPage() {
  return <SignIn />;
}
