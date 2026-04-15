"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useState } from "react";
import {
  Bell,
  Calendar,
  Plus,
  Users,
  X,
  CheckCircle2,
  AlertCircle,
  Megaphone,
  Clock,
  ArrowLeft,
  ClipboardList
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function AdminCommunicationsPage() {
  const users = useQuery(api.users.list) ?? [];
  const announcements = useQuery(api.parentServices.listAnnouncements, { role: "all" }) ?? [];
  const meetings = useQuery(api.meetings.listMyMeetings) ?? [];
  
  const createAnnouncement = useMutation(api.parentServices.createAnnouncement);
  const scheduleMeeting = useMutation(api.meetings.schedule);
  const recordOutcome = useMutation(api.meetings.recordOutcome);

  const [showAnnModal, setShowAnnModal] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [annRole, setAnnRole] = useState<"all" | "parent" | "student" | "teacher">("all");

  const [showMeetModal, setShowMeetModal] = useState(false);
  const [meetTitle, setMeetTitle] = useState("");
  const [meetDescription, setMeetDescription] = useState("");
  const [meetPartIds, setMeetPartIds] = useState<Id<"users">[]>([]);
  const [meetStart, setMeetStart] = useState("");
  const [meetEnd, setMeetEnd] = useState("");

  const [outcomeModalId, setOutcomeModalId] = useState<Id<"meetings"> | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState("");

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAnnouncement({
      title: annTitle,
      body: annBody,
      targetRole: annRole,
      importance: "normal",
    });
    setShowAnnModal(false);
    setAnnTitle("");
    setAnnBody("");
  };

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    await scheduleMeeting({
      title: meetTitle,
      description: meetDescription || undefined,
      participantIds: meetPartIds,
      startTime: new Date(meetStart).getTime(),
      endTime: new Date(meetEnd).getTime(),
    });
    setShowMeetModal(false);
    setMeetTitle("");
    setMeetDescription("");
    setMeetPartIds([]);
    setMeetStart("");
    setMeetEnd("");
  };

  const handleRecordOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcomeModalId) return;
    await recordOutcome({ meetingId: outcomeModalId, notes: outcomeNotes });
    setOutcomeModalId(null);
    setOutcomeNotes("");
  };

  if (users === undefined) return <div className="h-screen animate-pulse bg-slate-50" />;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-14 sm:px-10">
      <header className="mb-12">
        <Link 
          href="/admin" 
          className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin Center
        </Link>
        <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-700">
          School Engagement
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
          Notices & Communication
        </h1>
        <p className="mt-4 text-slate-500 max-w-2xl text-sm leading-relaxed">
          Broadcast official school notices and coordinate formal parent-teacher engagements from a unified operations center.
        </p>
      </header>

      <div className="grid gap-12 lg:grid-cols-2">
        {/* Announcements Registry */}
        <section className="space-y-8">
          <header className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-950 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-rose-500" />
              Announcement Board
            </h2>
            <button 
              onClick={() => setShowAnnModal(true)}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Broadcast Notice
            </button>
          </header>

          <div className="space-y-6">
            {announcements.map((ann) => (
              <div key={ann._id} className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase text-slate-600">
                    To: {ann.targetRole}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{format(ann.createdAt, "PPP")}</span>
                </div>
                <h4 className="text-lg font-bold text-slate-950 mb-2">{ann.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed italic">"{ann.body}"</p>
              </div>
            ))}
          </div>
        </section>

        {/* Meeting Registry */}
        <section className="space-y-8">
           <header className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-950 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-sky-600" />
              Conferences & Meetings
            </h2>
            <button 
              onClick={() => setShowMeetModal(true)}
              className="flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Schedule Engagement
            </button>
          </header>

          <div className="space-y-6">
            {meetings.length === 0 && (
              <div className="rounded-4xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-400 italic">
                No meetings scheduled yet.
              </div>
            )}
            {meetings.map((meet) => (
              <div key={meet._id} className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-slate-950">{meet.title}</h4>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                    meet.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                    meet.status === "confirmed" ? "bg-sky-50 text-sky-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {meet.status}
                  </span>
                </div>
                {meet.description && (
                  <p className="text-xs text-slate-500 italic mb-4">{meet.description}</p>
                )}
                <div className="flex items-center gap-6 text-xs font-bold text-slate-500 mb-6">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {format(meet.startTime, "PPP p")}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {meet.participantIds.length} Participants
                  </div>
                </div>
                {meet.status === "confirmed" && (
                  <button
                    onClick={() => { setOutcomeModalId(meet._id); setOutcomeNotes(""); }}
                    className="flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-700 transition hover:bg-slate-50"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Record Outcome
                  </button>
                )}
                {meet.status === "completed" && meet.outcomeNotes && (
                  <div className="rounded-2xl bg-emerald-50 p-4 mt-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-1">Outcome Recorded</p>
                    <p className="text-xs text-emerald-800 italic">"{meet.outcomeNotes}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Meeting Schedule Modal */}
      {showMeetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm p-6">
          <div className="w-full max-w-xl rounded-4xl border border-slate-200 bg-white p-10 shadow-2xl">
            <header className="mb-10 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-950">Schedule Engagement</h3>
                <p className="mt-2 text-sm text-slate-500">Set up a formal meeting with parents, teachers, or staff.</p>
              </div>
              <button
                onClick={() => setShowMeetModal(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <form onSubmit={handleScheduleMeeting} className="grid gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Meeting Title</label>
                <input
                  required
                  value={meetTitle}
                  onChange={(e) => setMeetTitle(e.target.value)}
                  placeholder="e.g., Grade 10 Parent-Teacher Conference"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Description (Optional)</label>
                <input
                  value={meetDescription}
                  onChange={(e) => setMeetDescription(e.target.value)}
                  placeholder="e.g., Discuss mid-term performance"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Participants ({meetPartIds.length} selected)
                </label>
                <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/50 p-3 space-y-1">
                  {users.map((u) => (
                    <label key={u._id} className="flex items-center gap-3 cursor-pointer rounded-xl p-2 hover:bg-white transition">
                      <input
                        type="checkbox"
                        checked={meetPartIds.includes(u._id)}
                        onChange={(e) => {
                          if (e.target.checked) setMeetPartIds([...meetPartIds, u._id]);
                          else setMeetPartIds(meetPartIds.filter((id) => id !== u._id));
                        }}
                        className="h-4 w-4 rounded"
                      />
                      <span className="text-sm font-bold text-slate-700">{u.fullName}</span>
                      <span className="text-xs text-slate-400 capitalize ml-auto">({u.role})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">Start</label>
                  <input
                    required
                    type="datetime-local"
                    value={meetStart}
                    onChange={(e) => setMeetStart(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-4 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">End</label>
                  <input
                    required
                    type="datetime-local"
                    value={meetEnd}
                    onChange={(e) => setMeetEnd(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-4 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={meetPartIds.length === 0}
                className="h-16 w-full rounded-3xl bg-slate-950 text-sm font-black uppercase tracking-widest text-white transition hover:bg-slate-800 disabled:opacity-40"
              >
                Schedule Meeting
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Record Outcome Modal */}
      {outcomeModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm p-6">
          <div className="w-full max-w-md rounded-4xl border border-slate-200 bg-white p-10 shadow-2xl">
            <header className="mb-8 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-950">Record Outcome</h3>
                <p className="mt-2 text-sm text-slate-500">Summarise the decisions and discussion from this meeting.</p>
              </div>
              <button
                onClick={() => setOutcomeModalId(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <form onSubmit={handleRecordOutcome} className="grid gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Meeting Notes & Decisions</label>
                <textarea
                  required
                  rows={5}
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  placeholder="e.g., Parents acknowledged results. Student to attend extra lessons on Mondays."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                />
              </div>
              <button
                type="submit"
                className="h-16 w-full rounded-3xl bg-slate-950 text-sm font-black uppercase tracking-widest text-white transition hover:bg-slate-800"
              >
                Save Outcome
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      {showAnnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm p-6">
          <div className="w-full max-w-xl rounded-4xl border border-slate-200 bg-white p-10 shadow-2xl">
            <header className="mb-10 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-950">Broadcast Announcement</h3>
                <p className="mt-2 text-sm text-slate-500">Messages will be visible on the dashboards of selected roles.</p>
              </div>
              <button 
                onClick={() => setShowAnnModal(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <form onSubmit={handleCreateAnnouncement} className="grid gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Destination Audience</label>
                <select 
                  value={annRole}
                  onChange={(e) => setAnnRole(e.target.value as any)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                >
                  <option value="all">Everyone</option>
                  <option value="parent">Parents Only</option>
                  <option value="student">Students Only</option>
                  <option value="teacher">Teachers Only</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Notice Title</label>
                <input 
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="e.g., Parent-Teacher Association Meeting"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Message Content</label>
                <textarea 
                  required
                  value={annBody}
                  onChange={(e) => setAnnBody(e.target.value)}
                  placeholder="Type your official announcement here..."
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                />
              </div>

              <button className="h-16 w-full rounded-3xl bg-slate-950 text-sm font-black uppercase tracking-widest text-white transition hover:bg-slate-800">
                Publish Announcement
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
