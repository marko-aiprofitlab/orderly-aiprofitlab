import { SignUp } from "@clerk/nextjs";

/** Catch-all sign-up (analogno sign-in). `/sign-up(.*)` je javna ruta u proxy.ts. */
export default function SignUpPage() {
  return <SignUp />;
}
