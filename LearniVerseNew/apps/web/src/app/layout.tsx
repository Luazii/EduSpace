import type { Metadata } from "next";
import { ClerkProvider, UserButton, SignOutButton } from "@clerk/nextjs";
import Link from "next/link";

import { Authenticated, Unauthenticated } from "convex/react";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { UserBootstrapper } from "@/components/user-bootstrapper";
import { NotificationsHub } from "@/components/notifications-hub";
import { RoleSwitch } from "@/components/role-switch";
import { Navbar } from "@/components/navbar";
import { MobileNav } from "@/components/mobile-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduSpace",
  description: "A modern online high school delivering world-class CAPS education.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-background font-body text-on-surface" suppressHydrationWarning>
        <ClerkProvider>
          <ConvexClientProvider>
            <UserBootstrapper />
            <div className="relative flex min-h-full flex-col">

              {/* Header */}
              <header className="sticky top-6 z-50 w-full px-6 sm:px-10">
                <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-black/5 bg-white/60 p-2 pl-6 pr-2 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-xl">
                  
                  {/* Logo */}
                  <Link href="/" className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl deep-sea-gradient text-xs font-bold text-on-primary shadow-sm">
                      ES
                    </div>
                    <div className="hidden flex-col sm:flex">
                      <span className="font-headline text-sm font-extrabold tracking-tighter text-primary">
                        EDUSPACE
                      </span>
                      <span className="text-[9px] font-bold tracking-widest text-secondary">
                        HIGH SCHOOL
                      </span>
                    </div>
                  </Link>

                  {/* Desktop Nav */}
                  <Navbar />

                  {/* Auth Controls */}
                  <div className="flex items-center gap-2">
                    <div className="hidden items-center gap-2 md:flex">
                      <RoleSwitch />
                      <NotificationsHub />
                    </div>
                    
                    <div className="ml-2 flex items-center gap-3">
                      <Authenticated>
                        <div className="flex items-center gap-4">
                          <SignOutButton>
                            <button className="hidden text-[10px] font-bold uppercase tracking-widest text-slate-500 transition hover:text-slate-950 sm:block">
                              Log Out
                            </button>
                          </SignOutButton>
                          <UserButton />
                        </div>
                      </Authenticated>
                      <Unauthenticated>
                        <Link 
                          href="/sign-in"
                          className="rounded-full bg-slate-950 px-5 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                        >
                          Log In
                        </Link>
                      </Unauthenticated>
                    </div>
                  </div>
                </div>

                {/* Mobile Nav Row - now tucked inside the header area if needed, or remains below */}
                <div className="mt-3">
                  <MobileNav />
                </div>
              </header>

              {/* Page Content */}
              <div className="flex flex-1 flex-col">
                {children}
              </div>

              {/* Footer */}
              <footer className="bg-surface-container-low rounded-t-3xl mt-20">
                <div className="mx-auto max-w-7xl px-6 sm:px-10 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 font-body text-sm">
                  <div className="col-span-2 md:col-span-1 space-y-4">
                    <div className="font-headline text-xl font-extrabold text-primary">EduSpace</div>
                    <p className="text-on-surface-variant leading-relaxed">
                      Empowering the next generation of leaders through flexible, high-quality digital education.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h5 className="font-bold text-on-surface">Programs</h5>
                    <ul className="space-y-2">
                      <li><Link href="/courses" className="text-on-surface-variant hover:text-secondary transition-colors">All Subjects</Link></li>
                      <li><Link href="/apply" className="text-on-surface-variant hover:text-secondary transition-colors">Enrol Now</Link></li>
                      <li><Link href="/courses" className="text-on-surface-variant hover:text-secondary transition-colors">Grade Overview</Link></li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h5 className="font-bold text-on-surface">Platform</h5>
                    <ul className="space-y-2">
                      <li><Link href="/dashboard" className="text-on-surface-variant hover:text-secondary transition-colors">Dashboard</Link></li>
                      <li><Link href="/profile" className="text-on-surface-variant hover:text-secondary transition-colors">My Profile</Link></li>
                      <li><Link href="/bookings/teachers" className="text-on-surface-variant hover:text-secondary transition-colors">Book a Teacher</Link></li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h5 className="font-bold text-on-surface">Support</h5>
                    <ul className="space-y-2">
                      <li><span className="text-on-surface-variant">Help Centre</span></li>
                      <li><span className="text-on-surface-variant">Contact Us</span></li>
                      <li><span className="text-on-surface-variant">Privacy Policy</span></li>
                    </ul>
                  </div>
                </div>

                <div className="mx-auto max-w-7xl px-6 sm:px-10 py-6 border-t border-outline-variant/30 flex flex-col md:flex-row justify-between items-center gap-4 text-on-surface-variant text-xs">
                  <p>&copy; {new Date().getFullYear()} EduSpace High School. All rights reserved.</p>
                  <p className="font-medium text-outline">Empowering future leaders through hybrid excellence.</p>
                </div>
              </footer>

            </div>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
