"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import { CheckoutButton } from "../payments/checkout-button";
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronRight, 
  Plus,
  CreditCard
} from "lucide-react";
import { format } from "date-fns";

export function ParentEnrollmentList() {
  const applications = useQuery(api.enrollments.listMine) ?? [];

  if (applications.length === 0) {
    return (
      <div className="rounded-4xl border border-dashed border-slate-200 bg-white p-12 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 text-slate-400">
          <FileText className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-950">No Applications Yet</h3>
        <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">
          Start your child's enrollment process by creating your first application.
        </p>
        <Link 
          href="/apply?new=true"
          className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-8 py-4 text-sm font-bold text-white shadow-xl shadow-slate-950/20 hover:bg-slate-800 transition"
        >
          <Plus className="h-4 w-4" />
          Start New Application
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-950">My Applications</h2>
          <p className="text-sm text-slate-500">Track and manage your children's enrollment status.</p>
        </div>
        <Link 
          href="/apply?new=true"
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
        >
          <Plus className="h-3.5 w-3.5" />
          New Application
        </Link>
      </div>

      <div className="grid gap-4">
        {applications.map((app) => {
          const isDraft = app.status === "draft";
          const canPay = (app.status === "approved" || app.status === "pre_approved") && app.paymentStatus !== "paid";
          const isPaid = app.paymentStatus === "paid";
          
          return (
            <div 
              key={app._id}
              className="group relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-200 hover:shadow-md"
            >
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className={`mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    app.status === "approved" ? "bg-emerald-50 text-emerald-600" :
                    app.status === "pre_approved" ? "bg-amber-50 text-amber-600" :
                    app.status === "rejected" ? "bg-rose-50 text-rose-600" :
                    app.status === "submitted" ? "bg-sky-50 text-sky-600" :
                    "bg-slate-50 text-slate-400"
                  }`}>
                    {app.status === "approved" ? <CheckCircle2 className="h-6 w-6" /> :
                     app.status === "rejected" ? <AlertCircle className="h-6 w-6" /> :
                     <Clock className="h-6 w-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-950">
                        {app.studentFirstName ? `${app.studentFirstName} ${app.studentLastName}` : app.studentEmail}
                      </h3>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                        app.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                        app.status === "pre_approved" ? "bg-amber-100 text-amber-700" :
                        app.status === "rejected" ? "bg-rose-100 text-rose-700" :
                        app.status === "submitted" ? "bg-sky-100 text-sky-700" :
                        "bg-slate-100 text-slate-500"
                      }`}>
                        {app.status.replace("_", " ")}
                      </span>
                      {isPaid && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-600">
                          Paid
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {app.gradeLabel || "High School Selection"} · Applied {format(app.createdAt, "dd MMM yyyy")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {canPay ? (
                    <div className="flex items-center gap-4">
                       <p className="hidden lg:block text-right">
                        <span className="block text-[10px] font-black tracking-widest text-amber-500 uppercase">Action Required</span>
                        <span className="text-xs font-bold text-slate-900">Settle Registration Fee</span>
                      </p>
                      <CheckoutButton applicationId={app._id} />
                    </div>
                  ) : (
                    <Link 
                      href={isDraft ? "/apply" : `/apply/submitted/${app._id}`}
                      className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                    >
                      {isDraft ? "Continue Draft" : "View Details"}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-4xl bg-slate-950 p-8 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <CreditCard className="h-6 w-6 text-sky-400" />
          </div>
          <div>
            <h4 className="font-bold">Billing Support</h4>
            <p className="text-sm text-white/50">Need help with payments or tax invoices?</p>
          </div>
          <Link 
            href="/dashboard/finance"
            className="ml-auto rounded-xl bg-white/10 px-5 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition"
          >
            Visit Finance Hub
          </Link>
        </div>
      </div>
    </div>
  );
}
