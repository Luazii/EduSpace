import type { Metadata } from "next";
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";

import { ConvexClientProvider } from "@/components/convex-client-provider";
import { UserBootstrapper } from "@/components/user-bootstrapper";
import { NotificationsHub } from "@/components/notifications-hub";
import { RoleSwitch } from "@/components/role-switch";
import { Navbar } from "@/components/navbar";
import { MobileNav } from "@/components/mobile-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduSpace",
  description: "Next.js, Convex, and Clerk academic platform for EduSpace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-[linear-gradient(180deg,#f6fbff_0%,#eef2ff_45%,#ffffff_100%)] text-slate-950" suppressHydrationWarning>
        <ClerkProvider>
          <ConvexClientProvider>
            <UserBootstrapper />
            <div className="relative flex min-h-full flex-col">
              <div className="absolute top-0 -z-10 h-105 w-full bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_35%),radial-gradient(circle_at_top_right,rgba(124,77,255,0.18),transparent_32%)]" />
              <header className="relative border-b border-black/5 bg-white/70 backdrop-blur-xl">
                <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
                  <Link href="/" className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                      ES
                    </div>
                    <div className="flex flex-col">
                      <span className="text-base font-black tracking-tighter text-slate-950">EDUSPACE</span>
                      <span className="text-[10px] font-bold tracking-widest text-[#7c4dff]">VIRTUAL CAMPUS</span>
                    </div>
                  </Link>

                  <Navbar />

                  <div className="flex items-center gap-4">
                    <RoleSwitch />
                    <NotificationsHub />
                    <UserButton />
                  </div>
                </div>
              </header>

              <div className="flex flex-1 flex-col pb-24 md:pb-0">
                {children}
              </div>
              <MobileNav />

              <footer className="border-t border-black/5 bg-white py-12">
                <div className="mx-auto max-w-6xl px-6 text-center sm:px-10">
                  <p className="text-sm font-medium text-slate-400">
                    &copy; {new Date().getFullYear()} EduSpace. Empowering future leaders through hybrid excellence.
                  </p>
                </div>
              </footer>
            </div>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
