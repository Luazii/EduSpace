"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { 
  ArrowLeft, 
  CreditCard, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  Search,
  Download
} from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { AdminPaymentList } from "@/components/payments/admin-payment-list";

export default function AdminPaymentsPage() {
  const stats = useQuery(api.payments.getFinancialSnapshot);

  const statCards = [
    { 
      label: "Gross Revenue", 
      value: `R ${(stats?.totalRevenue ?? 0).toLocaleString()}`, 
      sub: "Total successful payments",
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    },
    { 
      label: "Pending Funds", 
      value: `R ${(stats?.pendingFunds ?? 0).toLocaleString()}`, 
      sub: "Awaiting Paystack verify",
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50"
    },
    { 
      label: "Success Rate", 
      value: `${stats?.successRate ?? 0}%`, 
      sub: `${stats?.transactionCount ?? 0} total attempts`,
      icon: CheckCircle2,
      color: "text-sky-600",
      bg: "bg-sky-50"
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-14 sm:px-10">
      <header className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div>
          <Link 
            href="/admin"
            className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin Center
          </Link>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">
            Institutional Finance
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
            Payment Oversight
          </h1>
          <p className="mt-4 text-slate-500 max-w-2xl">
            Monitor all financial interactions across the platform, including enrollment fees and historical refund logs.
          </p>
        </div>

        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button className="flex items-center gap-2 rounded-2xl bg-slate-950 px-8 py-4 text-sm font-bold text-white shadow-xl shadow-slate-950/20 hover:bg-slate-800 transition">
            <BarChart3 className="h-4 w-4" />
            Full Report
          </button>
        </div>
      </header>

      {/* Financial Pulse */}
      <div className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card, i) => (
          <div key={i} className="group rounded-4xl border border-slate-200 bg-white p-8 shadow-sm transition hover:border-slate-300">
            <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl ${card.bg} ${card.color}`}>
              <card.icon className="h-6 w-6" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{card.label}</p>
            <p className="text-3xl font-black text-slate-950 tracking-tight">{card.value}</p>
            <p className="mt-2 text-xs font-medium text-slate-500">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-950">Audit Trail</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search reference or student..." 
              className="rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10 transition"
            />
          </div>
        </div>
        
        {/* We'll refine AdminPaymentList as well for standardizing on rounded-4xl */}
        <AdminPaymentList />
      </div>
    </main>
  );
}
