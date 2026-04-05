"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { format } from "date-fns";
import { 
  FileText, 
  Download, 
  Award, 
  Calendar, 
  BookOpen, 
  ShieldCheck, 
  Printer,
  ChevronRight
} from "lucide-react";

export default function AcademicRecordsPage() {
  const records = useQuery(api.progress.getAcademicRecord, {});

  if (records === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-14 sm:px-10">
      <header className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <nav className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500">
            <span className="cursor-pointer hover:text-slate-900">Dashboard</span>
            <span>/</span>
            <span className="text-slate-900">Academic History</span>
          </nav>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
            Official Repository
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
            Academic Records
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-500">
            Access your finalized course marks, certificates, and institutional transcripts.
          </p>
        </div>

        <button className="flex items-center gap-2 rounded-2xl bg-slate-950 px-8 py-4 text-sm font-bold text-white transition hover:bg-slate-800">
          <Download className="h-5 w-5" />
          Request Official Transcript
        </button>
      </header>

      <section className="grid gap-10">
        {records?.length > 0 ? (
          <div className="space-y-6">
            <h2 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-950">
              <Award className="h-6 w-6 text-sky-600" />
              Published Results
            </h2>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {records.map((record) => (
                <div 
                  key={record._id}
                  className="group relative overflow-hidden rounded-4xl border border-slate-200 bg-white p-8 shadow-[0_15px_40px_rgba(15,23,42,0.04)] transition hover:border-sky-200 hover:shadow-[0_20px_50px_rgba(15,23,42,0.06)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 mb-6 group-hover:bg-sky-600 group-hover:text-white transition">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  
                  <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                    {record.courseCode}
                  </div>
                  <h3 className="mb-6 text-xl font-bold leading-tight text-slate-950">
                    {record.courseName}
                  </h3>
                  
                  <div className="flex items-end justify-between border-t border-slate-100 pt-6">
                    <div>
                      <p className="text-xs font-semibold text-slate-400">Final Mark</p>
                      <p className="text-3xl font-black text-slate-950">
                        {record.mark?.toFixed(1) || "0.0"}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-400">Published</p>
                      <p className="text-sm font-bold text-slate-600">
                        {format(record.publishedAt || 0, "MMM yyyy")}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-8 flex gap-2">
                    <button className="flex-1 rounded-xl bg-slate-100 py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-200">
                      View Certificate
                    </button>
                    <button className="rounded-xl border border-slate-200 p-3 text-slate-400 transition hover:bg-slate-50 hover:text-slate-900">
                      <Printer className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-4xl bg-slate-50 p-24 text-center border-2 border-dashed border-slate-200">
            <ShieldCheck className="h-20 w-20 text-slate-300 mb-6" />
            <h3 className="text-2xl font-bold text-slate-900">No Finalized Records</h3>
            <p className="mt-3 text-lg text-slate-500 max-w-lg text-balance">
              Your formal academic results will appear here as soon as they are published by your teachers.
            </p>
          </div>
        )}

        <div className="rounded-4xl border border-sky-100 bg-sky-50/50 p-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
              <FileText className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <h4 className="text-xl font-bold text-slate-950 underline decoration-sky-300 decoration-wavy">Academic Integrity Notice</h4>
              <p className="mt-2 text-slate-600 leading-relaxed max-w-3xl">
                All records displayed in this hub are digitally verified and signed. Any official 
                transcripts requested will include the institutional seal and can be used for 
                external verification by universities or employers.
              </p>
            </div>
            <button className="whitespace-nowrap rounded-2xl bg-sky-600 px-8 py-4 text-sm font-black text-white transition hover:bg-sky-700">
              Download Full Transcript
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
