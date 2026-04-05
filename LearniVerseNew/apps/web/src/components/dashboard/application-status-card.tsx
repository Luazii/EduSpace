"use client";

import { CheckCircle2, Clock, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

type ApplicationStatusCardProps = {
  application: {
    status: string;
    paymentStatus: string;
    qualification?: { name: string } | null;
    faculty?: { name: string } | null;
    notes?: string;
  };
};

export function ApplicationStatusCard({ application }: ApplicationStatusCardProps) {
  const isPending = application.status === "submitted";
  const isRejected = application.status === "rejected";
  const isUnpaid = application.paymentStatus !== "paid";

  return (
    <div className="rounded-4xl border border-slate-200 bg-white p-10 shadow-sm">
      <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-6">
          <div className={`mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
            isRejected ? "bg-rose-50 text-rose-600" : 
            isPending ? "bg-sky-50 text-sky-600" : "bg-emerald-50 text-emerald-600"
          }`}>
            {isRejected ? <AlertCircle className="h-7 w-7" /> : 
             isPending ? <Clock className="h-7 w-7" /> : <CheckCircle2 className="h-7 w-7" />}
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
              Admissions Status: {application.status}
            </p>
            <h3 className="text-2xl font-black text-slate-950">
              {isRejected ? "Application Requires Action" : 
               isUnpaid ? "Awaiting Institutional Fees" : "Institutional Review in Progress"}
            </h3>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed max-w-xl">
              {isRejected ? `Feedback from Registrar: "${application.notes || "Please contact the admissions office for more details."}"` :
               isUnpaid ? "Your application has been received, but the administrative fee is still outstanding. Please settle this to trigger the formal review." :
               "The Office of the Registrar is currently reviewing your academic documentation. You will be notified once a decision has been finalized."}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
          {isUnpaid && !isRejected && (
            <Link
              href="/apply"
              className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-8 py-4 text-sm font-bold text-white shadow-xl shadow-slate-950/20 hover:bg-slate-800 transition"
            >
              Settlement Portal
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          {isRejected && (
            <Link
              href="/apply"
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#7c4dff] px-8 py-4 text-sm font-bold text-white shadow-xl shadow-[#7c4dff]/20 hover:bg-[#6c3bed] transition"
            >
              Re-submit Application
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      <div className="mt-10 grid gap-6 border-t border-slate-100 pt-10 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Target Qualification</p>
          <p className="text-sm font-bold text-slate-900">{application.qualification?.name || "Evaluating..."}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Institutional Faculty</p>
          <p className="text-sm font-bold text-slate-900">{application.faculty?.name || "Evaluating..."}</p>
        </div>
      </div>
    </div>
  );
}
