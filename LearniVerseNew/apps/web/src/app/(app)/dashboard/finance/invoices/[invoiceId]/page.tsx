"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { api } from "../../../../../../../convex/_generated/api";

export default function StudentInvoicePrintPage() {
  const params = useParams<{ invoiceId: string }>();
  const invoices = useQuery(api.fees.listMineInvoices) ?? [];
  const invoice = invoices.find((entry) => entry._id === params.invoiceId);

  if (!invoice) {
    return <main className="mx-auto max-w-4xl px-6 py-14 text-sm text-slate-500">Invoice not found.</main>;
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <section className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">School invoice</p>
            <h1 className="mt-3 text-4xl font-black text-slate-950">{invoice.invoiceNumber}</h1>
            <p className="mt-2 text-sm text-slate-500">{invoice.structure?.name ?? "Fee structure"}</p>
          </div>
          <button onClick={() => window.print()} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">Print</button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 text-sm text-slate-600">
          <p>Academic year: <span className="font-bold text-slate-900">{invoice.academicYear}</span></p>
          <p>Due date: <span className="font-bold text-slate-900">{invoice.dueDate ? format(invoice.dueDate, "dd MMM yyyy") : "Not set"}</span></p>
          <p>Class: <span className="font-bold text-slate-900">{invoice.class?.name ?? invoice.structure?.gradeName ?? "General"}</span></p>
          <p>Status: <span className="font-bold text-slate-900">{invoice.status.replace("_", " ")}</span></p>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item) => (
                <tr key={item.label} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-700">{item.label}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-950">R{item.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr>
                <td className="px-4 py-3 font-bold text-slate-950">Balance</td>
                <td className="px-4 py-3 text-right font-black text-slate-950">R{invoice.balance.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </main>
  );
}
