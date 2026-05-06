"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import {
  Settings,
  UserPlus,
  Users,
  BarChart3,
  BookOpen,
  Landmark,
  Award,
  CreditCard,
  ArrowRight,
  TrendingUp,
  Activity,
  History,
  CheckCircle2,
  Clock,
  Bell,
  Trophy,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { format } from "date-fns";

export default function AdminPage() {
  const stats = useQuery(api.admin.getDashboardStats);
  const activity = useQuery(api.admin.getRecentActivity, { limit: 5 });

  const menuItems = [
    {
      href: "/admin/enrollments",
      title: "Admissions Center",
      body: "Review incoming applications and approve students.",
      icon: UserPlus,
      color: "bg-emerald-50 text-emerald-600"
    },
    {
      href: "/admin/users",
      title: "Directory",
      body: "Manage student, parent, and staff profiles.",
      icon: Users,
      color: "bg-sky-50 text-sky-600"
    },
    {
      href: "/admin/courses",
      title: "Subject Catalog",
      body: "Manage the list of subjects available for enrollment.",
      icon: BookOpen,
      color: "bg-indigo-50 text-indigo-600"
    },
    {
      href: "/admin/classes",
      title: "Class Register",
      body: "Create classes, manage capacity, and assign learners.",
      icon: Users,
      color: "bg-cyan-50 text-cyan-600"
    },
    {
      href: "/admin/fees",
      title: "Fee Office",
      body: "Create invoices, track balances, and issue receipts.",
      icon: CreditCard,
      color: "bg-emerald-50 text-emerald-600"
    },
    {
      href: "/admin/faculties",
      title: "Grades & Levels",
      body: "Manage school grades and academic levels.",
      icon: Landmark,
      color: "bg-violet-50 text-violet-600"
    },
    {
      href: "/admin/reports",
      title: "Results & Analytics",
      body: "School-wide tracking of academic performance.",
      icon: BarChart3,
      color: "bg-rose-50 text-rose-600"
    },
    {
      href: "/admin/performance",
      title: "Student Insights",
      body: "View top performers and at-risk students across all subjects.",
      icon: Award,
      color: "bg-indigo-50 text-indigo-600"
    },
    {
      href: "/admin/sports",
      title: "Sports Management",
      body: "Create and manage sports activities available for students.",
      icon: Trophy,
      color: "bg-emerald-50 text-emerald-600"
    },
    {
      href: "/admin/communications",
      title: "Notice Board",
      body: "Send announcements and manage communications.",
      icon: Bell,
      color: "bg-amber-50 text-amber-600"
    }
  ];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-10 sm:px-10">
      <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b border-slate-100 pb-10">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">Office of the Registrar</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">v2.1.0-next</span>
          </div>
          <h1 className="text-5xl font-black tracking-tight text-slate-950">
            School Administration
          </h1>
          <p className="mt-4 text-slate-500 max-w-2xl text-sm font-medium leading-relaxed">
            Central oversight of EduSpace school operations. Manage grade structures, 
            monitor enrollment finance, and process student applications.
          </p>
        </div>

        <div className="flex gap-4">
          <Link 
            href="/admin/users"
            className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-black uppercase tracking-widest text-slate-950 transition hover:bg-slate-50"
          >
            <Users className="h-4 w-4" /> staff directory
          </Link>
          <button className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl shadow-slate-950/20 transition hover:bg-slate-800">
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Stats Bento Grid */}
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
        <StatCard 
          title="Total Enrollment" 
          value={stats?.studentCount ?? "..."} 
          trend="+12% this month"
          icon={Users}
          color="text-emerald-600"
        />
        <StatCard 
          title="Teaching Staff" 
          value={stats?.teacherCount ?? "..."} 
          trend="Fully Verified"
          icon={ShieldCheck}
          color="text-sky-600"
        />
        <StatCard 
          title="Tuition & Finance" 
          value={stats ? `R ${(stats.totalRevenue / 100).toLocaleString()}` : "..."} 
          trend="Live Verification"
          icon={TrendingUp}
          color="text-indigo-600"
        />
        <StatCard 
          title="Curriculum Overview" 
          value={stats?.courseCount ?? "..."} 
          trend={`${stats?.facultyCount ?? 0} Grades`}
          icon={BookOpen}
          color="text-violet-600"
        />
      </section>

      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        {/* Management Hubs */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-3 text-xl font-black text-slate-950">
              <Activity className="h-5 w-5 text-sky-600" />
              School Portals
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center justify-between rounded-3xl border border-slate-100 bg-white p-6 transition hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/20"
              >
                <div className="flex items-center gap-5">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${item.color} transition group-hover:scale-105`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-950">{item.title}</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-400">{item.body}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-200 transition group-hover:translate-x-1 group-hover:text-slate-950" />
              </Link>
            ))}
          </div>
        </section>

        {/* Activity Feed */}
        <aside className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-3 text-xl font-black text-slate-950">
              <History className="h-5 w-5 text-indigo-600" />
              Registrar Logs
            </h2>
          </div>
          <div className="rounded-4xl border border-slate-100 bg-slate-50/50 p-6 space-y-6">
            {!activity ? (
              <div className="flex justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
              </div>
            ) : activity.applications.length === 0 ? (
              <div className="py-10 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                No recent activity
              </div>
            ) : (
              <div className="space-y-6">
                {activity.applications.map((app) => (
                  <div key={app._id} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
                      <UserPlus className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-950 leading-tight">
                        {app.studentName} applied for enrollment
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <Clock className="h-3 w-3" />
                        {format(app.updatedAt, "HH:mm")} · {app.facultyName}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button className="w-full rounded-2xl border border-slate-200 bg-white py-4 text-[10px] font-black uppercase tracking-widest text-slate-950 transition hover:bg-slate-50">
              View Audit Log
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}

function StatCard({ title, value, trend, icon: Icon, color }: any) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-xl hover:shadow-slate-200/20">
      <div className="flex items-center justify-between mb-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{title}</p>
        <h3 className="mt-2 text-3xl font-black text-slate-950">{value}</h3>
        <p className="mt-2 text-[10px] font-bold text-emerald-600 flex items-center gap-1">
          <TrendingUp className="h-3 w-3" /> {trend}
        </p>
      </div>
    </div>
  );
}

function ShieldCheck(props: any) {
  return (
    <CheckCircle2 {...props} />
  );
}
