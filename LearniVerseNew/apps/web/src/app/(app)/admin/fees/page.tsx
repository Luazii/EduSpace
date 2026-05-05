import { FeeManager } from "@/components/admin/fee-manager";

export default function AdminFeesPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
      <div className="grid w-full gap-6">
        <section className="rounded-[1.75rem] border border-black/10 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Finance office</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Fees, invoices, and receipts</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">Manage fee structures, generate learner invoices, track balances, and issue receipts.</p>
        </section>
        <FeeManager />
      </div>
    </main>
  );
}
