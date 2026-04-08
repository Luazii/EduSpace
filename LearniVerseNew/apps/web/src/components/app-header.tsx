"use client";

import Link from "next/link";
import { UserButton, SignOutButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated } from "convex/react";
import { Navbar } from "./navbar";
import { MobileNav } from "./mobile-nav";
import { RoleSwitch } from "./role-switch";
import { NotificationsHub } from "./notifications-hub";

export function AppHeader() {
  return (
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

      {/* Mobile Nav Row */}
      <div className="mt-3">
        <MobileNav />
      </div>
    </header>
  );
}
