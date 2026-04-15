"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Bell, Megaphone, AlertCircle, Info, ChevronRight } from "lucide-react";
import { format } from "date-fns";

function importanceBadge(importance: string) {
  if (importance === "high") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-rose-600 border border-rose-100">
        <AlertCircle className="h-2.5 w-2.5" /> Urgent
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-sky-600 border border-sky-100">
      <Info className="h-2.5 w-2.5" /> Notice
    </span>
  );
}

export default function AnnouncementsPage() {
  const currentUser = useQuery(api.users.current);
  const announcements = useQuery(
    api.parentServices.listAnnouncements,
    currentUser ? { role: currentUser.role } : "skip",
  );

  if (announcements === undefined || currentUser === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-950 border-t-transparent" />
      </div>
    );
  }

  const urgent = announcements.filter((a) => a.importance === "high");
  const normal = announcements.filter((a) => a.importance !== "high");

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-14 sm:px-10">
      {/* Header */}
      <header className="mb-12">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-[#7c4dff]">
          School Communications
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
          Announcements
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-500">
          Stay up to date with school notices, events, and important updates
          from administration.
        </p>
      </header>

      {announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-4xl border border-dashed border-slate-200 bg-white py-24 text-center">
          <Megaphone className="mb-4 h-12 w-12 text-slate-200" />
          <h3 className="font-bold text-slate-950">No Announcements Yet</h3>
          <p className="mt-2 text-sm text-slate-500">
            Check back later for school notices and updates.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Urgent / High Importance */}
          {urgent.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-rose-600">
                <AlertCircle className="h-4 w-4" />
                Urgent Notices
              </h2>
              <div className="space-y-4">
                {urgent.map((ann) => (
                  <article
                    key={ann._id}
                    className="relative overflow-hidden rounded-3xl border border-rose-100 bg-rose-50/40 p-7 shadow-sm"
                  >
                    <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-rose-200/20" />
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-3">
                          {importanceBadge(ann.importance)}
                          {ann.targetGradeName && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-100">
                              {ann.targetGradeName}
                            </span>
                          )}
                          <span className="text-[11px] font-medium text-slate-400">
                            {ann.senderName ? `${ann.senderName} · ` : ""}
                            {format(ann.createdAt, "MMMM d, yyyy")}
                          </span>
                        </div>
                        <h3 className="text-xl font-black text-slate-950">
                          {ann.title}
                        </h3>
                        <p className="mt-3 text-sm leading-relaxed text-slate-600">
                          {ann.body}
                        </p>
                      </div>
                      <Bell className="mt-1 h-5 w-5 shrink-0 text-rose-400" />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Regular Notices */}
          {normal.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-slate-400">
                <Bell className="h-4 w-4" />
                General Notices
              </h2>
              <div className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                {normal.map((ann, idx) => (
                  <article key={ann._id} className="group p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-3">
                          {importanceBadge(ann.importance)}
                          {ann.targetGradeName && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-100">
                              {ann.targetGradeName}
                            </span>
                          )}
                          <span className="text-[11px] font-medium text-slate-400">
                            {ann.senderName ? `${ann.senderName} · ` : ""}
                            {format(ann.createdAt, "MMMM d, yyyy")}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-950 group-hover:text-[#7c4dff] transition-colors">
                          {ann.title}
                        </h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                          {ann.body}
                        </p>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 group-hover:text-[#7c4dff] transition-colors" />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
