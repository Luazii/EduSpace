"use client";

import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";

export function AdminPaymentList() {
  const payments = useQuery(api.payments.listForAdmin);

  if (payments === undefined) {
    return (
      <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 px-6 py-8 text-sm text-slate-500 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        Loading payments...
      </div>
    );
  }

  return (
    <section className="grid gap-4">
      {payments.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/70 px-6 py-8 text-sm leading-7 text-slate-500">
          No payment records yet.
        </div>
      ) : (
        payments.map((payment) => (
          <article
            key={payment._id}
            className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {payment.student?.fullName ?? payment.student?.email}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {payment.reference} · {payment.currency} {payment.amount.toFixed(2)}
                </p>
              </div>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                {payment.status}
              </span>
            </div>
            <div className="mt-3 grid gap-1 text-sm text-slate-600">
              <p>Application status: {payment.application?.status ?? "unknown"}</p>
              {payment.channel ? <p>Channel: {payment.channel}</p> : null}
              {payment.gatewayResponse ? <p>Gateway: {payment.gatewayResponse}</p> : null}
            </div>
          </article>
        ))
      )}
    </section>
  );
}
