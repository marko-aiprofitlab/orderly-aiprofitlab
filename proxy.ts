import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Next.js 16 middleware — u v16 se fajl zove `proxy.ts`, NE `middleware.ts`
 * (Zlatno pravilo #2). Clerk `clerkMiddleware()` vraća handler koji ovde
 * default-eksportujemo; Next.js 16 prihvata default export funkcije.
 *
 * Javne rute (Zlatno pravilo #8): webhook i `/tv` MORAJU proći bez `401`,
 * inače WooCommerce/Thinkific ne mogu da upišu porudžbine, a TV zid ne radi.
 * Sign-in/sign-up moraju biti javni da bi login uopšte bio dostupan.
 */
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/tv(.*)",
  "/api/webhook/woo/(.*)",
  "/api/webhook/thinkific/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Preskoči Next interne fajlove i statiku, osim ako su u search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Uvek pokreni na API/trpc rutama.
    "/(api|trpc)(.*)",
  ],
};
