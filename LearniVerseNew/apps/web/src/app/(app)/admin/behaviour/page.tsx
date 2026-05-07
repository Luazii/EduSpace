"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { ShieldCheck, ShieldAlert, Trash2, Search } from "lucide-react";
import { useState } from "react";

export default function AdminBehaviourPage() {
  const records = useQuery(api.behaviour.listRecent, { limit: 100 });
  const deleteRecord = useMutation(api.behaviour.deleteRecord);
  const [searchTerm, setSearchTerm] = useState("");

  if (records === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-950 border-t-transparent" />
      </div>
    );
  }

  const filteredRecords = records.filter(
    (r) =>
      r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-14 sm:px-10">
      <header className="mb-10 border-b border-slate-100 pb-10">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-[#7c4dff]">
          School Administration
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
          Behaviour Records
        </h1>
        <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-slate-500">
          Track and manage all merits and demerits awarded across the school.
        </p>
      </header>

      <div className="mb-8 flex items-center gap-4">
        <div className="flex max-w-md flex-1 items-center gap-3 rounded-full border border-slate-200 bg-white px-4 shadow-sm transition-shadow focus-within:border-[#7c4dff] focus-within:ring-4 focus-within:ring-[#7c4dff]/10">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent py-3 text-sm font-medium outline-none"
          />
        </div>
      </div>

      <div className="rounded-4xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-6 py-4 font-bold">Student</th>
                <th className="px-6 py-4 font-bold">Type</th>
                <th className="px-6 py-4 font-bold">Category</th>
                <th className="px-6 py-4 font-bold">Points</th>
                <th className="px-6 py-4 font-bold">Date</th>
                <th className="px-6 py-4 font-bold">Awarded By</th>
                <th className="px-6 py-4 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 italic">
                    No behaviour records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record._id} className="transition hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-950">
                      {record.studentName}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest border shadow-sm ${
                        record.type === "merit" 
                          ? "border-emerald-200 text-emerald-700" 
                          : "border-rose-200 text-rose-700"
                      }`}>
                        {record.type === "merit" ? (
                          <ShieldCheck className="h-3 w-3" />
                        ) : (
                          <ShieldAlert className="h-3 w-3" />
                        )}
                        {record.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{record.category}</p>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{record.description}</p>
                    </td>
                    <td className="px-6 py-4 font-black">
                      <span className={record.points > 0 ? "text-emerald-600" : "text-rose-600"}>
                        {record.points > 0 ? "+" : ""}{record.points}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {new Date(record.occurredAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {record.awarderName}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this record?")) {
                            deleteRecord({ id: record._id });
                          }
                        }}
                        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
