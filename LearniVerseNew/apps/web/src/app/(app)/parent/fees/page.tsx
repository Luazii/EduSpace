"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useState } from "react";
import { format } from "date-fns";
import { CreditCard, CheckCircle2, Clock, AlertTriangle, Receipt } from "lucide-react";

const STATUS_CFG = {
  issued: { label: "Due", color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  partially_paid: { label: "Partial", color: "bg-sky-50 text-sky-700 border-sky-200", icon: CreditCard },
  paid: { label: "Paid", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  overdue: { label: "Overdue", color: "bg-rose-50 text-rose-700 border-rose-200", icon: AlertTriangle },
  draft: { label: "Draft", color: "bg-slate-50 text-slate-500 border-slate-200", icon: Clock },
};

export default function ParentFeesPage() {
  const invoices = useQuery(api.fees.listParentInvoices);
  const initCheckout = useAction(api.fees.initializeFeeCheckout);
  const [paying, setPaying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async (invoiceId: Id<"feeInvoices">) => {
    setPaying(invoiceId);
    setError(null);
    try {
      const { authorizationUrl } = await initCheckout({
        invoiceId,
        origin: window.location.origin,
      });
      window.location.href = authorizationUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment initialization failed.");
      setPaying(null);
    }
  };

  if (invoices === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
      </div>
    );
  }

  const outstanding = invoices.filter((i) => i.balance > 0);
  const totalOutstanding = outstanding.reduce((s, i) => s + i.balance, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.amountPaid, 0);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-14 sm:px-10">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-600">Finance</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">School Fees</h1>
        <p className="mt-2 text-sm text-slate-500">View and pay your child's school fee invoices.</p>
      </header>

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Total paid" value={`R ${totalPaid.toLocaleString()}`} color="emerald" icon={CheckCircle2} />
        <SummaryCard label="Outstanding" value={`R ${totalOutstanding.toLocaleString()}`} color={totalOutstanding > 0 ? "amber" : "emerald"} icon={CreditCard} />
        <SummaryCard label="Invoices" value={invoices.length} color="sky" icon={Receipt} />
      </div>

      {invoices.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-16 text-center">
          <Receipt className="mb-4 h-12 w-12 text-slate-300" />
          <h3 className="font-bold text-slate-600">No invoices yet</h3>
          <p className="mt-1 text-sm text-slate-400">Fee invoices will appear here once issued by the school.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => {
            const cfg = STATUS_CFG[invoice.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.issued;
            const StatusIcon = cfg.icon;
            return (
              <div key={invoice._id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4 p-6">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-black text-slate-950">{invoice.invoiceNumber}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${cfg.color}`}>
                        <StatusIcon className="h-3 w-3" /> {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {invoice.student?.fullName ?? invoice.student?.email ?? "Student"}
                      {invoice.academicYear ? ` · ${invoice.academicYear}` : ""}
                      {invoice.dueDate ? ` · Due ${format(new Date(invoice.dueDate), "d MMM yyyy")}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-slate-950">R {invoice.totalAmount.toLocaleString()}</p>
                    {invoice.balance > 0 && (
                      <p className="text-xs font-bold text-rose-600">R {invoice.balance.toLocaleString()} outstanding</p>
                    )}
                  </div>
                </div>

                {/* Line items */}
                <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                  <div className="space-y-1">
                    {(invoice.lineItems as { label: string; amount: number }[]).map((item, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-slate-600">{item.label}</span>
                        <span className="font-bold text-slate-900">R {item.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    {invoice.amountPaid > 0 && (
                      <div className="flex justify-between border-t border-slate-200 pt-1 text-xs">
                        <span className="font-bold text-emerald-700">Amount paid</span>
                        <span className="font-bold text-emerald-700">− R {invoice.amountPaid.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {invoice.balance > 0 && invoice.status !== "paid" && (
                  <div className="border-t border-slate-100 px-6 py-4 flex justify-end">
                    <button
                      onClick={() => handlePay(invoice._id)}
                      disabled={paying === invoice._id}
                      className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white transition hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <CreditCard className="h-4 w-4" />
                      {paying === invoice._id ? "Redirecting…" : `Pay R ${invoice.balance.toLocaleString()}`}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

function SummaryCard({ label, value, color, icon: Icon }: { label: string; value: string | number; color: string; icon: React.ElementType }) {
  const p = { emerald: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", sky: "bg-sky-50 text-sky-600" }[color] ?? "";
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${p}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}
