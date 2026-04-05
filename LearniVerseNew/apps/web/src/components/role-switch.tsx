"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { 
  ShieldCheck, 
  UserRound, 
  GraduationCap, 
  ChevronDown,
  RefreshCw
} from "lucide-react";
import { useState } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function RoleSwitch() {
  const user = useQuery(api.users.current);
  const switchRole = useMutation(api.users.switchRole);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  if (!user || !user.availableRoles || user.availableRoles.length <= 1) {
    return null;
  }

  const handleSwitch = async (role: string) => {
    if (role === user.role) return;
    setIsPending(true);
    try {
      await switchRole({ role });
      setIsOpen(false);
      // Reload to ensure all role-based layout logic clears/refreshes
      window.location.reload();
    } finally {
      setIsPending(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin": return <ShieldCheck className="h-4 w-4" />;
      case "teacher": return <GraduationCap className="h-4 w-4" />;
      case "parent": return <UserRound className="h-4 w-4" />;
      default: return <UserRound className="h-4 w-4" />;
    }
  };

  const activeRoleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={cn(
          "flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black transition hover:bg-slate-50 disabled:opacity-50 shadow-sm shadow-slate-100",
          isOpen && "border-slate-900 bg-slate-50 ring-4 ring-slate-900/5"
        )}
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-900 text-white">
          {getRoleIcon(user.role)}
        </div>
        <span className="hidden sm:inline font-bold text-slate-700">{activeRoleLabel}</span>
        {isPending ? (
          <RefreshCw className="h-3 w-3 animate-spin text-slate-400" />
        ) : (
          <ChevronDown className={cn("h-3 w-3 text-slate-400 transition", isOpen && "rotate-180")} />
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-56 overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl animate-in fade-in zoom-in-95">
             <div className="px-3 py-2">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available Views</p>
             </div>
             <div className="space-y-1">
               {user.availableRoles.map((role: string) => (
                 <button
                   key={role}
                   onClick={() => handleSwitch(role)}
                   className={cn(
                     "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold transition",
                     user.role === role 
                       ? "bg-slate-950 text-white" 
                       : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                   )}
                 >
                   <div className="flex items-center gap-3">
                     {getRoleIcon(role)}
                     <span className="capitalize">{role}</span>
                   </div>
                   {user.role === role && <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                 </button>
               ))}
             </div>
          </div>
        </>
      )}
    </div>
  );
}
