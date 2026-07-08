import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Orderly",
  description: "Real-time order command center za sve prodajne kanale.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="sr" className={`${geistMono.variable} h-full`}>
        {/* Zlatno pravilo #11: geist.className na <body>, ne geist.variable. */}
        <body className={`${geist.className} min-h-full antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
