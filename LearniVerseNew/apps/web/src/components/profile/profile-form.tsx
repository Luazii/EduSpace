"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useEffect } from "react";
import { User, Tag, Check, RefreshCw, AlertCircle } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function ProfileForm() {
  const user = useQuery(api.users.current);
  const updateProfile = useMutation(api.users.updateProfile);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  
  const [isPending, setIsPending] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
      setUsername(user.username ?? "");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setStatus("idle");
    setMessage("");

    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
      });
      setStatus("success");
      setMessage("Profile updated successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 3000);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage("Failed to update profile. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-8">
      <div className="rounded-4xl border border-black/5 bg-white/50 p-8 backdrop-blur-xl shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                First Name
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="lastName" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Last Name
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter last name"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="username" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Username Handle
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Tag className="h-4 w-4" />
              </div>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="choose_a_handle"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition"
              />
            </div>
            <p className="text-[10px] text-slate-400 ml-1 font-medium">This will be your unique identifier on the platform.</p>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xl shadow-slate-950/10"
            >
              {isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>Save Profile Changes</>
              )}
            </button>
          </div>

          {status !== "idle" && (
            <div className={cn(
              "flex items-center gap-3 rounded-2xl p-4 text-sm font-bold animate-in fade-in slide-in-from-top-2",
              status === "success" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
            )}>
              {status === "success" ? (
                <Check className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {message}
            </div>
          )}
        </form>
      </div>

      <div className="rounded-4xl border border-slate-100 bg-slate-50/50 p-8">
        <h3 className="font-bold text-slate-900 text-sm mb-2">Account Identification</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Your primary identity is linked to <span className="font-bold text-slate-700">{user.email}</span>. 
          Role-based permissions and academic records are tied to this identifier and cannot be changed manually.
        </p>
      </div>
    </div>
  );
}
