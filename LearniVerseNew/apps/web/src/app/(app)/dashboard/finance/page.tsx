"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { format } from "date-fns";
import { CreditCard, FileText, Receipt, Clock, CheckCircle2, Download } from "lucide-react";

export default function FinancePage() {
  const invoices = useQuery(api.fees.listMineInvoices) ?? [];
  const receipts = useQuery(api.fees.listMineReceipts) ?? [];

  const totalPaid = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
  const pending = invoices.reduce((sum, invoice) => sum + invoice.balance, 0);
  const nextInvoice = invoices
    .filter((invoice) => invoice.dueDate)
    .sort((a, b) => (a.dueDate ?? Number.MAX_SAFE_INTEGER) - (b.dueDate ?? Number.MAX_SAFE_INTEGER))[0] ?? null;

  const stats = [
    { label: "Total Paid", value: `R${totalPaid.toLocaleString()}`, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Outstanding", value: `R${pending.toLocaleString()}`, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Next Invoice", value: nextInvoice?.dueDate ? format(nextInvoice.dueDate, "dd MMM") : "None", icon: FileText, color: "text-sky-600", bg: "bg-sky-50" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-14 sm:px-10">
      <header className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#7c4dff]">
            Managed Tuition
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
            Billing & Invoices
          </h1>
          <p className="mt-4 text-slate-500 max-w-2xl">
            Review your school fee invoices, receipt history, and current balances.
          </p>
        </div>

        <Link href="/payments" className="flex items-center gap-3 rounded-2xl bg-slate-950 px-8 py-4 text-sm font-bold text-white transition hover:bg-slate-800 shadow-xl shadow-slate-950/10">
          <CreditCard className="h-5 w-5" />
          Open payment center
        </Link>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-10">
        {stats.map((stat, i) => (
          <div key={i} className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
        <div className="rounded-4xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <header className="border-b border-slate-50 px-8 py-6 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-950">Invoices</h3>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/50">
                  <th className="px-8 py-4">Invoice</th>
                  <th className="px-8 py-4">Class</th>
                  <th className="px-8 py-4">Due</th>
                  <th className="px-8 py-4 text-right">Balance</th>
                  <th className="px-8 py-4 text-right">Status</th>
                  <th className="px-8 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((invoice) => (
                  <tr key={invoice._id} className="transition hover:bg-slate-50/50">
                    <td className="px-8 py-6 font-mono text-sm text-slate-500">{invoice.invoiceNumber}</td>
                    <td className="px-8 py-6 font-bold text-slate-900">{invoice.class?.name ?? invoice.structure?.gradeName ?? "General"}</td>
                    <td className="px-8 py-6 text-sm text-slate-500">{invoice.dueDate ? format(invoice.dueDate, "dd MMM yyyy") : "Not set"}</td>
                    <td className="px-8 py-6 text-right font-black text-slate-950">R{invoice.balance.toLocaleString()}</td>
                    <td className="px-8 py-6 text-right">
                      <span className="inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-tighter bg-slate-100 text-slate-700">
                        {invoice.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <Link href={`/dashboard/finance/invoices/${invoice._id}`} className="rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:bg-white hover:text-sky-600 hover:border-sky-300 inline-flex">
                        <Download className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
          <header className="mb-6 flex items-center gap-3">
            <Receipt className="h-5 w-5 text-emerald-600" />
            <div>
              <h3 className="text-xl font-bold text-slate-950">Receipts</h3>
              <p className="text-sm text-slate-500">Printable proof of payments</p>
            </div>
          </header>
          <div className="grid gap-4">
            {receipts.length === 0 ? (
              <p className="text-sm text-slate-500">No receipts yet.</p>
            ) : (
              receipts.map((receipt) => (
                <div key={receipt._id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-4">
                  <div>
                    <p className="font-bold text-slate-950">{receipt.receiptNumber}</p>
                    <p className="text-xs text-slate-400">{format(receipt.receivedAt, "dd MMM yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-black text-emerald-700">R{receipt.amount.toLocaleString()}</p>
                    <Link href={`/dashboard/finance/receipts/${receipt._id}`} className="rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:text-sky-600 hover:border-sky-300 inline-flex">
                      <Download className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
