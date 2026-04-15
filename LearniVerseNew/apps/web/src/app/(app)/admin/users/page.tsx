"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useState } from "react";
import { format } from "date-fns";
import { 
  Users, 
  Shield, 
  GraduationCap, 
  Briefcase, 
  Search, 
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  X,
  Save,
  User as UserIcon,
  BookOpen
} from "lucide-react";
import Link from "next/link";

export default function UserManagementPage() {
  const users = useQuery(api.users.list);
  const teacherProfiles = useQuery(api.teachers.list) ?? [];
  const updateRole = useMutation(api.users.updateRole);
  const upsertTeacherProfile = useMutation(api.teachers.upsertProfile);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingTeacherId, setEditingTeacherId] = useState<Id<"users"> | null>(null);
  
  // Teacher profile edit state
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [teacherQuals, setTeacherQuals] = useState("");

  const filteredUsers = users?.filter((user) => 
    user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRoleChange = async (userId: Id<"users">, newRole: "admin" | "teacher" | "student" | "warehouse_admin") => {
    setUpdatingId(userId);
    try {
      await updateRole({ userId, role: newRole });
    } catch (error) {
      console.error("Failed to update role:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  const openTeacherEdit = (user: any) => {
    const profile = teacherProfiles.find(p => p.userId === user._id);
    setEditingTeacherId(user._id);
    setEmployeeNumber(profile?.employeeNumber || "");
    setTeacherQuals(profile?.qualificationText || "");
  };

  const saveTeacherProfile = async () => {
    if (!editingTeacherId) return;
    await upsertTeacherProfile({
      userId: editingTeacherId,
      employeeNumber: employeeNumber.trim() || undefined,
      qualificationText: teacherQuals.trim() || undefined,
    });
    setEditingTeacherId(null);
  };

  if (users === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-950 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-14 sm:px-10">
      <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Link 
            href="/admin"
            className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin Center
          </Link>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">
            School Registry
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
            Directory Management
          </h1>
          <p className="mt-4 text-slate-500 max-w-2xl text-sm leading-relaxed">
            Monitor all school members, assign roles, and manage teaching staff profiles.
          </p>
        </div>

        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10"
          />
        </div>
      </header>

      {/* User Table */}
      <section className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="px-8 py-5 text-xs font-black uppercase tracking-wider text-slate-500">Member</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-wider text-slate-500">Role</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-wider text-slate-500 text-right">Profile Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers?.map((user) => (
                <tr key={user._id} className="group transition hover:bg-slate-50/30">
                  <td className="whitespace-nowrap px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
                        {user.fullName?.[0] || user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-950">{user.fullName || "Anonymous Member"}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-8 py-6">
                    <select
                      value={user.role}
                      disabled={updatingId === user._id}
                      onChange={(e) => handleRoleChange(user._id, e.target.value as any)}
                      className={`rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold transition focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10 ${
                        updatingId === user._id ? "opacity-50" : ""
                      }`}
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="parent">Parent</option>
                      <option value="admin">Admin</option>
                      <option value="warehouse_admin">Logistics</option>
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-8 py-6">
                    {user.isActive ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700 uppercase">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-600 uppercase">
                        <AlertCircle className="h-3 w-3" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-8 py-6 text-right">
                    {user.role === "teacher" && (
                      <button 
                        onClick={() => openTeacherEdit(user)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:border-sky-200 hover:text-sky-600 transition"
                      >
                        <Briefcase className="h-3 w-3" />
                        Formal Profile
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Teacher Profile Edit Modal */}
      {editingTeacherId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm px-6">
          <div className="w-full max-w-lg rounded-4xl border border-slate-200 bg-white p-8 shadow-2xl">
            <header className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7c4dff] mb-2">Staff Profile Management</p>
                <h3 className="text-xl font-black text-slate-950">Teaching Credentials</h3>
              </div>
              <button 
                onClick={() => setEditingTeacherId(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="grid gap-6">
              <label className="grid gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                Staff Employee Number
                <input 
                  value={employeeNumber}
                  onChange={(e) => setEmployeeNumber(e.target.value)}
                  placeholder="EMP-99-01"
                  className="rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                />
              </label>

              <label className="grid gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                Staff Qualifications
                <textarea 
                  value={teacherQuals}
                  onChange={(e) => setTeacherQuals(e.target.value)}
                  placeholder="B.Ed Mathematics, 5 years teaching experience..."
                  rows={4}
                  className="rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                />
              </label>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setEditingTeacherId(null)}
                  className="flex-1 rounded-2xl border border-slate-200 py-4 text-xs font-black uppercase tracking-widest text-slate-500 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveTeacherProfile}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 text-xs font-black uppercase tracking-widest text-white transition hover:bg-slate-800"
                >
                  <Save className="h-4 w-4" />
                  Save Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
