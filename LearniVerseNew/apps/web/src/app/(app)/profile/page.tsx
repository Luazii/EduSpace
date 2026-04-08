"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

import { ProfileForm } from "@/components/profile/profile-form";
import { UserCircle, ShieldCheck, Mail } from "lucide-react";

export default function ProfilePage() {
  const user = useQuery(api.users.current);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
      <div className="grid w-full gap-10">

        
        <div className="grid gap-10 lg:grid-cols-[1fr_350px]">
          <div className="space-y-10">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#7c4dff]">
                Account Management
              </p>
              <h2 className="text-4xl font-black tracking-tight text-slate-950">
                Personal Identification Profile
              </h2>
              <p className="text-slate-500 max-w-xl text-sm font-medium leading-relaxed">
                Update your academic identity and platform handle. These details will be visible to 
                faculty and peers throughout the campus ecosystem.
              </p>
            </div>
            
            <ProfileForm />
          </div>

          {/* Institutional Context Sidebar */}
          <aside className="space-y-8">
            <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <ShieldCheck className="h-5 w-5 text-sky-600" />
                <h3 className="font-bold text-sm uppercase tracking-widest text-slate-950">Security</h3>
              </div>
              <div className="space-y-6">
                 <div className="flex items-start gap-4">
                  <div className="mt-1 rounded-lg bg-slate-100 p-2 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 leading-tight">Verified Email</h4>
                    <p className="mt-1 text-xs text-slate-500">{user?.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="mt-1 rounded-lg bg-slate-100 p-2 text-slate-400">
                    <UserCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 leading-tight">Academic Role</h4>
                    <p className="mt-1 text-xs text-slate-500 capitalize">{user?.role}</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
