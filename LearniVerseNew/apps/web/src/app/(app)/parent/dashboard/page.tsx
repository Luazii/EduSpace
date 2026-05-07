"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { 
  Users, 
  GraduationCap, 
  TrendingUp, 
  MessageSquare, 
  Bell,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Clock
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function ParentDashboard() {
  const currentUser = useQuery(api.users.current);
  const links = useQuery(api.parentServices.listLinkedStudents, { 
    parentId: currentUser?._id as any 
  });
  const announcements = useQuery(api.parentServices.listAnnouncements, { role: "parent" });
  const meetings = useQuery(api.meetings.listMyMeetings) ?? [];
  const confirmMeeting = useMutation(api.meetings.confirmAttendance);

  if (links === undefined || announcements === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-950 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-14 sm:px-10">
      <header className="mb-12">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-[#7c4dff]">
          Parent Advocacy Hub
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
          Academic Oversight
        </h1>
        <p className="mt-4 text-slate-500 max-w-2xl text-sm leading-relaxed">
          Monitor your children&apos;s progress, communicate with teachers, and oversee 
          institutional announcements from your dedicated portal.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Linked Students List */}
        <div className="lg:col-span-2 space-y-8">
          <section className="grid gap-6">
            <h2 className="text-xl font-bold text-slate-950 flex items-center gap-2">
              <Users className="h-5 w-5 text-sky-600" />
              My Students
            </h2>
            
            {links.length === 0 ? (
              <div className="rounded-4xl border border-dashed border-slate-200 bg-white p-16 text-center">
                <Users className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                <h3 className="font-bold text-slate-950">No Students Linked</h3>
                <p className="mt-2 text-sm text-slate-500">Contact the school administration to link your children to your account.</p>
              </div>
            ) : (
              links.map((link) => (
                <StudentCard key={link._id} link={link} />
              ))
            )}
          </section>

          {/* Quick Stats/Summary */}
          <section className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-4xl bg-slate-950 p-8 text-white">
              <TrendingUp className="h-8 w-8 text-sky-400 mb-6" />
              <h4 className="text-2xl font-bold">Performance</h4>
              <p className="mt-2 text-sm text-white/60 leading-relaxed">
                Aggregated views of all current course results and teacher feedback.
              </p>
            </div>
            <div className="rounded-4xl border border-slate-200 bg-white p-8">
              <BookOpen className="h-8 w-8 text-[#7c4dff] mb-6" />
              <h4 className="text-2xl font-bold">Curriculum</h4>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                Review assigned learning materials and upcoming academic deadlines.
              </p>
            </div>
          </section>
        </div>

        {/* Sidebar Announcements */}
        <aside className="space-y-8">
          <section className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-lg font-bold text-slate-950 flex items-center gap-2 mb-6">
              <Bell className="h-5 w-5 text-rose-500" />
              School Notices
            </h3>
            <div className="space-y-6">
              {announcements.map((ann) => (
                <div key={ann._id} className="group cursor-default">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      ann.importance === "high" ? "text-rose-600" : "text-slate-400"
                    }`}>
                      {ann.importance} Priority
                    </span>
                    <span className="text-[10px] text-slate-400">{format(ann.createdAt, "MMM d")}</span>
                  </div>
                  <h4 className="font-bold text-slate-950 transition group-hover:text-sky-600">{ann.title}</h4>
                  <p className="mt-2 text-xs text-slate-500 leading-relaxed line-clamp-2">{ann.body}</p>
                </div>
              ))}
              {announcements.length === 0 && (
                <p className="text-sm text-slate-400 italic">No recent announcements.</p>
              )}
            </div>
          </section>

          <section className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
             <h3 className="text-lg font-bold text-slate-950 flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-sky-600" />
              Engagement & Meetings
            </h3>
            <div className="space-y-4">
              {meetings.map((meet) => (
                <div key={meet._id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-slate-950">{meet.title}</h4>
                    <span className="text-[10px] font-bold text-slate-400">{format(meet.startTime, "MMM d")}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(meet.startTime, "p")}
                    </div>
                    <div className="flex items-center gap-1 uppercase tracking-widest text-[#7c4dff]">
                      {meet.status}
                    </div>
                  </div>
                  {meet.status === "scheduled" && (
                    <button 
                      onClick={() => confirmMeeting({ meetingId: meet._id })}
                      className="w-full rounded-xl bg-slate-950 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-emerald-600"
                    >
                      Confirm Attendance
                    </button>
                  )}
                  {meet.status === "confirmed" && (
                    <div className="flex items-center justify-center gap-2 py-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 rounded-xl border border-emerald-100">
                      <CheckCircle2 className="h-3 w-3" />
                      Invitation Confirmed
                    </div>
                  )}
                </div>
              ))}
              {meetings.length === 0 && (
                 <p className="text-sm text-slate-400 italic">No scheduled meetings.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function StudentCard({ link }: { link: any }) {
  return (
    <div className="rounded-4xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <Link 
        href={`/parent/students/${link.student?._id}`}
        className="group flex flex-col p-8 transition hover:bg-slate-50"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-xl font-black text-white">
              {link.student?.fullName?.[0] || "?"}
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-950 group-hover:text-[#7c4dff] transition">{link.student?.fullName}</h3>
              <p className="text-sm font-medium text-slate-500">{link.relationship || "Student"}</p>
            </div>
          </div>
          <div className="text-right">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700 uppercase">
              <CheckCircle2 className="h-3 w-3" /> Enrolled
            </span>
            <p className="mt-2 text-xs font-bold text-slate-400">View Performance Report</p>
            <Link href="/parent/fees" onClick={(e) => e.stopPropagation()} className="mt-1 text-xs font-bold text-indigo-600 hover:underline">School Fees →</Link>
          </div>
        </div>
      </Link>
      
      {/* Behaviour Panel */}
      <div className="border-t border-slate-100 bg-slate-50/50 p-6">
        <BehaviourWidget studentId={link.student?._id} />
      </div>
    </div>
  );
}

function BehaviourWidget({ studentId }: { studentId: string }) {
  const [expanded, setExpanded] = import("react").then(m => m.useState(false)).catch(() => [false, () => {}]) as any;
  const summary = useQuery(api.behaviour.summaryForStudent, { studentUserId: studentId as any });
  const records = useQuery(api.behaviour.listForStudent, { studentUserId: studentId as any, limit: 20 });

  if (!summary || !records) return <div className="text-xs text-slate-400">Loading behaviour data...</div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-950">Behaviour & Conduct</h4>
          <p className="text-xs text-slate-500 mt-1">
            Merits: <span className="font-bold text-emerald-600">{summary.merits}</span> | 
            Demerits: <span className="font-bold text-rose-600">{summary.demerits}</span> | 
            Net: <span className="font-black text-slate-900">{summary.netPoints > 0 ? "+" : ""}{summary.netPoints}</span>
          </p>
        </div>
        <button 
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-bold text-[#7c4dff] hover:underline"
        >
          {expanded ? "Hide Records" : "View History"}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 pt-4 border-t border-slate-200">
          {records.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No behaviour records found.</p>
          ) : (
            records.map((record) => (
              <div key={record._id} className="flex justify-between items-start gap-4 text-sm">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                      record.type === "merit" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                    }`}>
                      {record.type}
                    </span>
                    <span className="font-bold text-slate-950">{record.category}</span>
                  </div>
                  <p className="text-xs text-slate-600">{record.description}</p>
                </div>
                <div className="text-right shrink-0">
                   <span className={`font-black ${record.type === "merit" ? "text-emerald-600" : "text-rose-600"}`}>
                     {record.points > 0 ? "+" : ""}{record.points}
                   </span>
                   <p className="text-[10px] text-slate-400 mt-1">{new Date(record.occurredAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

