"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useState } from "react";
import { 
  Users, 
  Plus, 
  Link as LinkIcon, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Search,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";

export default function ParentLinkerPage() {
  const users = useQuery(api.users.list) ?? [];
  const links = useQuery(api.parentServices.listAllLinks) ?? []; // Need to implement listAllLinks
  const createLink = useMutation(api.parentServices.linkStudent);
  
  const parents = users.filter(u => u.role === "parent");
  const students = users.filter(u => u.role === "student");

  const [selectedParentId, setSelectedParentId] = useState<Id<"users"> | "">("");
  const [selectedStudentId, setSelectedStudentId] = useState<Id<"users"> | "">("");
  const [relationship, setRelationship] = useState("");
  const [isLinking, setIsLinking] = useState(false);

  const handleLink = async () => {
    if (!selectedParentId || !selectedStudentId) return;
    setIsLinking(true);
    try {
      await createLink({
        parentId: selectedParentId as Id<"users">,
        studentId: selectedStudentId as Id<"users">,
        relationship: relationship.trim() || undefined,
      });
      setSelectedParentId("");
      setSelectedStudentId("");
      setRelationship("");
    } finally {
      setIsLinking(false);
    }
  };

  if (users === undefined) return <div className="animate-pulse h-screen bg-slate-50" />;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-14 sm:px-10">
      <header className="mb-10 lg:mb-16">
        <Link 
          href="/admin" 
          className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin Center
        </Link>
        <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">
          Institutional Security
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
          Parental Access Management
        </h1>
        <p className="mt-4 text-slate-500 max-w-2xl text-sm leading-relaxed">
          Establish secure links between Parent accounts and Student records to enable academic oversight.
        </p>
      </header>

      <div className="grid gap-12 lg:grid-cols-2">
        {/* Linking Form */}
        <section className="rounded-4xl border border-slate-200 bg-white p-10 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950 mb-8 flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-[#7c4dff]" />
            Establish New Connection
          </h2>
          <div className="grid gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Parent Member</label>
              <select 
                value={selectedParentId}
                onChange={(e) => setSelectedParentId(e.target.value as any)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
              >
                <option value="">Select a Parent...</option>
                {parents.map(p => (
                  <option key={p._id} value={p._id}>{p.fullName || p.email}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Student Member</label>
              <select 
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value as any)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
              >
                <option value="">Select a Student...</option>
                {students.map(s => (
                  <option key={s._id} value={s._id}>{s.fullName || s.email}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Relationship</label>
              <input 
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="e.g., Mother, Father, Guardian"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
              />
            </div>

            <button 
              onClick={handleLink}
              disabled={!selectedParentId || !selectedStudentId || isLinking}
              className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-slate-950 py-5 text-sm font-bold text-white shadow-xl shadow-slate-950/20 transition hover:bg-slate-800 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Activate Link
            </button>
          </div>
        </section>

        {/* Existing Links Table */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-slate-950 flex items-center gap-2">
            <Users className="h-5 w-5 text-sky-600" />
            Platform Connections
          </h2>
          <div className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Parent</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Student</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {links.map((link) => (
                  <tr key={link._id} className="group transition hover:bg-slate-50/30">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-950">{link.parentName}</div>
                      <div className="text-[10px] text-slate-500">{link.parentEmail}</div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="text-sm font-bold text-slate-950">{link.studentName}</div>
                       <div className="text-[10px] font-black text-sky-600 uppercase tracking-tighter">{link.relationship}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="rounded-xl p-2 text-slate-300 hover:text-rose-500 transition">
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {links.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-sm text-slate-400 italic">
                      No active parental links found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
