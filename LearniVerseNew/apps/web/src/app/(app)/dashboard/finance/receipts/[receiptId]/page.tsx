"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { api } from "../../../../../../../convex/_generated/api";

export default function StudentReceiptPrintPage() {
  const params = useParams<{ receiptId: string }>();
  const receipts = useQuery(api.fees.listMineReceipts) ?? [];
  const receipt = receipts.find((entry) => entry._id === params.receiptId);

  if (!receipt) {
    return <main className="mx-auto max-w-4xl px-6 py-14 text-sm text-slate-500">Receipt not found.</main>;
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <section className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Official receipt</p>
            <h1 className="mt-3 text-4xl font-black text-slate-950">{receipt.receiptNumber}</h1>
            <p className="mt-2 text-sm text-slate-500">Invoice {receipt.invoice?.invoiceNumber ?? "-"}</p>
          </div>
          <button onClick={() => window.print()} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">Print</button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 text-sm text-slate-600">
          <p>Amount paid: <span className="font-bold text-slate-900">R{receipt.amount.toLocaleString()}</span></p>
          <p>Payment method: <span className="font-bold text-slate-900 uppercase">{receipt.paymentMethod}</span></p>
          <p>Date received: <span className="font-bold text-slate-900">{format(receipt.receivedAt, "dd MMM yyyy HH:mm")}</span></p>
          <p>Reference: <span className="font-bold text-slate-900">{receipt.reference ?? "N/A"}</span></p>
        </div>
      </section>
    </main>
  );
}
