"use client";

import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";

export function PaymentList() {
  const payments = useQuery(api.payments.listMine);

  if (payments === undefined) {
    return (
      <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 px-6 py-8 text-sm text-slate-500 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        Loading payments...
      </div>
    );
  }

  return (
    <section className="grid gap-6">
      {payments.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center text-sm leading-7 text-slate-500 shadow-sm">
          <p>No payment records found in your account.</p>
        </div>
      ) : (
        payments.map((payment) => (
          <article
            key={payment._id}
            className="group relative flex flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/80 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.04)] transition-all hover:border-slate-300 hover:shadow-[0_22px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Ref:
                  </span>
                  <p className="text-sm font-mono font-medium text-slate-900">
                    {payment.reference}
                  </p>
                </div>
                <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                  {payment.application?.qualification?.name ?? "Enrollment Fee"}
                </h3>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] ${
                    payment.status === "success"
                      ? "bg-emerald-100 text-emerald-800"
                      : payment.status === "failed"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {payment.status}
                </span>
                <p className="text-2xl font-bold tracking-tight text-slate-950">
                  {payment.currency} {payment.amount.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between border-t border-slate-100 pt-6 text-sm text-slate-500">
              <div className="flex items-center gap-4">
                {payment.paidAt ? (
                  <div className="flex items-center gap-1.5">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{new Date(payment.paidAt).toLocaleDateString()}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Created {new Date(payment.createdAt).toLocaleDateString()}</span>
                  </div>
                )}
                {payment.channel && (
                  <div className="flex items-center gap-1.5">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span className="capitalize">{payment.channel}</span>
                  </div>
                )}
              </div>
              {payment.gatewayResponse && (
                <p className="text-xs italic text-slate-400">
                  "{payment.gatewayResponse}"
                </p>
              )}
            </div>
          </article>
        ))
      )}
    </section>
  );
}
