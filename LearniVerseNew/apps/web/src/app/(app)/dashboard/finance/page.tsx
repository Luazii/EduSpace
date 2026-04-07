"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { 
  CreditCard, 
  Download, 
  FileText, 
  TrendingUp, 
  Receipt,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  Printer
} from "lucide-react";
import { format } from "date-fns";

export default function FinancePage() {
  // Assuming a generic query for student payments (we'll need to create this or mock it)
  const payments = useQuery(api.payments.listMine) || [];

  const stats = [
    { label: "Total Paid", value: "R12,450", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Pending", value: "R3,200", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Next Invoice", value: "15 Apr", icon: Calendar, color: "text-sky-600", bg: "bg-sky-50" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-14 sm:px-10">
      <header className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <nav className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500">
            <span className="cursor-pointer hover:text-slate-900">Dashboard</span>
            <span>/</span>
            <span className="text-slate-900">Finance</span>
          </nav>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#7c4dff]">
            Managed Tuition
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
            Billing & Invoices
          </h1>
          <p className="mt-4 text-slate-500 max-w-2xl">
            Track your course enrollments, download official tax invoices, and manage your study payment history.
          </p>
        </div>

        <button className="flex items-center gap-3 rounded-2xl bg-slate-950 px-8 py-4 text-sm font-bold text-white transition hover:bg-slate-800 shadow-xl shadow-slate-950/10">
          <CreditCard className="h-5 w-5" />
          Make a Payment
        </button>
      </header>

      {/* Financial Health Overview */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-10">
        {stats.map((stat, i) => (
          <div key={i} className="group rounded-4xl border border-slate-200 bg-white p-8 shadow-sm transition hover:border-slate-300">
            <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
        {/* Invoice List */}
        <div className="rounded-4xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <header className="border-b border-slate-50 px-8 py-6 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-950">Recent Transactions</h3>
            <button className="text-xs font-bold text-sky-600 hover:underline">View All History</button>
          </header>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/50">
                  <th className="px-8 py-4">Invoice ID</th>
                  <th className="px-8 py-4">Description</th>
                  <th className="px-8 py-4">Date</th>
                  <th className="px-8 py-4 text-right">Amount</th>
                  <th className="px-8 py-4 text-right">Status</th>
                  <th className="px-8 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { id: "INV-2024-001", desc: "Advanced Web Development Enrollment", date: "2024-03-24", amount: "R5,400.00", status: "Paid" },
                  { id: "INV-2024-003", desc: "System Design Certificate", date: "2024-02-15", amount: "R7,050.00", status: "Paid" },
                  { id: "INV-2024-012", desc: "Online School Resource Fee", date: "2024-04-01", amount: "R3,200.00", status: "Pending" },
                ].map((row, i) => (
                  <tr key={i} className="group transition hover:bg-slate-50/50">
                    <td className="whitespace-nowrap px-8 py-6 font-mono text-sm text-slate-500">{row.id}</td>
                    <td className="px-8 py-6 font-bold text-slate-900">{row.desc}</td>
                    <td className="whitespace-nowrap px-8 py-6 text-sm text-slate-500">{format(new Date(row.date), "dd MMM yyyy")}</td>
                    <td className="whitespace-nowrap px-8 py-6 text-right font-black text-slate-950">{row.amount}</td>
                    <td className="whitespace-nowrap px-8 py-6 text-right">
                      <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-tighter ${row.status === "Paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:bg-white hover:text-sky-600 hover:border-sky-300">
                        <Download className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Methods & Support */}
        <div className="space-y-6">
          <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
            <h4 className="text-lg font-bold text-slate-950 mb-6">Payment Methods</h4>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100">
                  <CreditCard className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Visa ending in 4242</p>
                  <p className="text-xs text-slate-400">Expires 12/26</p>
                </div>
              </div>
              <button className="text-xs font-bold text-sky-600">Edit</button>
            </div>
            <button className="mt-4 w-full rounded-2xl border-2 border-dashed border-slate-200 py-4 text-xs font-bold text-slate-400 transition hover:border-sky-300 hover:text-sky-600">
              + Add New Method
            </button>
          </div>

          <div className="rounded-4xl bg-slate-950 p-8 text-white shadow-xl shadow-slate-950/10">
            <ShieldCheck className="h-10 w-10 text-sky-400 mb-6" />
            <h4 className="text-lg font-bold mb-2">Secure Transactions</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              All EduSpace payments are processed through encrypted channels. Official receipts are tax-compliant for educational deductions.
            </p>
            <button className="mt-8 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-sky-400 hover:text-sky-300">
              Billing Support <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Calendar({ className }: { className?: string }) {
  return <Clock className={className} />; // Fallback icon if Lucide version differs
}

function ArrowRight({ className }: { className?: string }) {
  return <TrendingUp className={className} />; // Fallback
}
