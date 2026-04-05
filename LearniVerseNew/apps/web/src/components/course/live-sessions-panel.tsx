"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { 
  Video, 
  Calendar, 
  Clock, 
  ExternalLink, 
  Plus, 
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  X
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

type LiveSessionsPanelProps = {
  courseId: string;
};

export function LiveSessionsPanel({ courseId }: LiveSessionsPanelProps) {
  const typedCourseId = courseId as Id<"courses">;
  const sessions = useQuery(api.liveSessions.listByCourse, { courseId: typedCourseId });
  const currentUser = useQuery(api.users.current);
  const createSession = useMutation(api.liveSessions.create);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = currentUser?.role === "admin" || currentUser?.role === "teacher";

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createSession({
        courseId: typedCourseId,
        title,
        meetingUrl: url,
        startTime: new Date(startTime).getTime(),
        endTime: new Date(endTime).getTime(),
      });
      setShowAddModal(false);
      setTitle("");
      setUrl("");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessions === undefined) return <div className="animate-pulse h-40 bg-slate-50 rounded-4xl" />;

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">Virtual Classroom</h2>
          <p className="text-sm text-slate-500">Join live lectures and view upcoming scheduled classes.</p>
        </div>
        {canManage && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Schedule Class
          </button>
        )}
      </header>

      <div className="grid gap-6">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-4xl border border-dashed border-slate-200 bg-white p-20 text-center">
            <Video className="h-16 w-16 text-slate-200 mb-6" />
            <h3 className="text-lg font-bold text-slate-950">No Live Classes Scheduled</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-sm">
              Your teacher will schedule online class sessions here. Check back later for updates.
            </p>
          </div>
        ) : (
          sessions.map((session) => (
            <div 
              key={session._id}
              className={`group relative overflow-hidden rounded-4xl border p-8 transition backdrop-blur-xl ${
                session.isLive 
                ? "border-emerald-200 bg-emerald-50/30 ring-4 ring-emerald-500/5 shadow-xl shadow-emerald-500/10" 
                : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
                <div className="flex items-start gap-6">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                    session.isLive ? "bg-emerald-500 text-white animate-pulse" : "bg-slate-100 text-slate-400"
                  }`}>
                    <Video className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                       <h4 className="text-xl font-bold text-slate-950">{session.title}</h4>
                       {session.isLive && (
                         <span className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white ring-4 ring-emerald-500/10">
                           Live Now
                         </span>
                       )}
                    </div>
                    <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-slate-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {format(session.startTime, "PPPP")}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {format(session.startTime, "p")} - {format(session.endTime, "p")}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <a 
                    href={session.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold transition ${
                      session.isLive 
                      ? "bg-slate-950 text-white hover:bg-slate-800" 
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {session.isLive ? "Join Class Now" : "Details"}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Session Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm p-6">
          <div className="w-full max-w-xl rounded-4xl border border-slate-200 bg-white p-10 shadow-2xl">
            <header className="mb-10 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-950">Schedule Live Class</h3>
                <p className="mt-2 text-sm text-slate-500">Add a link to the virtual classroom for this course.</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <form onSubmit={handleAddSession} className="grid gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Session Title</label>
                <input 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Weekly Seminar: Advanced Logic"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Meeting URL (Zoom/Meet/Jitsi)</label>
                <input 
                  required
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">Start Time</label>
                  <input 
                    required
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">End Time</label>
                  <input 
                    required
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-2xl border border-slate-200 py-4 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-2xl bg-slate-950 py-4 text-sm font-bold text-white shadow-xl shadow-slate-950/20 transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {isSubmitting ? "Scheduling..." : "Schedule Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
