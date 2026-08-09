"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useState } from "react";
import Link from "next/link";
import {
  Trophy, Users, MapPin, Clock, User, Plus, CheckCircle2, XCircle,
  Shield, Calendar, ClipboardCheck, Target, Star, ChevronRight,
  CalendarDays, Dumbbell, Swords, BarChart3, FileText
} from "lucide-react";
import { format } from "date-fns";

type Tab = "teams" | "training" | "fixtures" | "attendance" | "venues" | "evaluations";

export default function CoachSportsPage() {
  const user = useQuery(api.users.current);
  const isCoachOrAdmin = user?.role === "coach" || user?.role === "admin";
  const teams = useQuery(api.coach.listMyTeams, isCoachOrAdmin ? {} : "skip");
  const sports = useQuery(api.sports.listAll);
  const venues = useQuery(api.sportsVenues.listVenues, isCoachOrAdmin ? {} : "skip");
  const venueBookings = useQuery(api.sportsVenues.listBookings, isCoachOrAdmin ? {} : "skip");

  const [tab, setTab] = useState<Tab>("teams");
  const [selectedTeamId, setSelectedTeamId] = useState<Id<"sportsTeams"> | null>(null);

  // Loading state — teams is only ever undefined-while-loading for coach/admin;
  // for everyone else it's intentionally skipped, so don't wait on it here.
  if (user === undefined || (isCoachOrAdmin && teams === undefined)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (!isCoachOrAdmin) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-14">
        <Shield className="h-16 w-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-black text-slate-950">Access Restricted</h2>
        <p className="mt-2 text-sm text-slate-500">This portal is only available to coaches and administrators.</p>
      </main>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "teams", label: "My Teams", icon: Users },
    { key: "training", label: "Training", icon: Dumbbell },
    { key: "fixtures", label: "Fixtures & Results", icon: Swords },
    { key: "attendance", label: "Attendance", icon: ClipboardCheck },
    { key: "venues", label: "Venue Booking", icon: MapPin },
    { key: "evaluations", label: "Evaluations", icon: Star },
  ];

  const selectedTeam = teams?.find((t) => t._id === selectedTeamId) ?? teams?.[0] ?? null;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-10 sm:px-10">
      <header className="mb-8 border-b border-slate-100 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">Coach Portal</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight text-slate-950">Sports Management</h1>
        <p className="mt-2 text-sm text-slate-500 max-w-2xl">
          Manage your teams, schedule training sessions, create match fixtures, track attendance, book venues, and evaluate athlete performance.
        </p>
      </header>

      {/* Team selector */}
      {teams && teams.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Team:</span>
          {teams.map((t) => (
            <button
              key={t._id}
              onClick={() => setSelectedTeamId(t._id)}
              className={`rounded-2xl border px-4 py-2 text-xs font-bold transition ${
                (selectedTeam?._id === t._id)
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {t.name} <span className="text-slate-400 ml-1">({t.sportName})</span>
            </button>
          ))}
        </div>
      )}

      {/* Tab navigation */}
      <div className="mb-8 flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              tab === key
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "teams" && <TeamsTab teams={teams ?? []} sports={sports ?? []} />}
      {tab === "training" && selectedTeam && <TrainingTab teamId={selectedTeam._id} teamName={selectedTeam.name} />}
      {tab === "fixtures" && selectedTeam && <FixturesTab teamId={selectedTeam._id} teamName={selectedTeam.name} />}
      {tab === "attendance" && selectedTeam && <AttendanceTab teamId={selectedTeam._id} teamName={selectedTeam.name} />}
      {tab === "venues" && <VenuesTab venues={venues ?? []} bookings={venueBookings ?? []} />}
      {tab === "evaluations" && selectedTeam && <EvaluationsTab teamId={selectedTeam._id} teamName={selectedTeam.name} sports={sports ?? []} />}

      {!selectedTeam && tab !== "teams" && tab !== "venues" && (
        <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-16 text-center">
          <Trophy className="mb-4 h-12 w-12 text-slate-300" />
          <h3 className="font-bold text-slate-600">No team selected</h3>
          <p className="mt-1 text-sm text-slate-400">Create or select a team above to get started.</p>
        </div>
      )}
    </main>
  );
}

/* ───────────────────────────── UC-01 & UC-02: Teams Tab ───────────────────────────── */

function TeamsTab({ teams, sports }: { teams: any[]; sports: any[] }) {
  const [showRoster, setShowRoster] = useState<Id<"sportsTeams"> | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
          <Users className="h-5 w-5 text-emerald-600" /> My Teams ({teams.length})
        </h2>
      </div>

      {teams.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-16 text-center">
          <Trophy className="mb-4 h-12 w-12 text-slate-300" />
          <p className="font-bold text-slate-500">No teams assigned yet.</p>
          <p className="mt-1 text-sm text-slate-400">Teams will appear here once an admin creates them and assigns you as coach.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <div key={team._id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-black text-slate-950 text-lg">{team.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">{team.sportName}</span>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50">
                  <Trophy className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                <Users className="h-3.5 w-3.5" />
                <span>{team.memberCount} athletes</span>
              </div>
              <button
                onClick={() => setShowRoster(showRoster === team._id ? null : team._id)}
                className="w-full rounded-2xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
              >
                {showRoster === team._id ? "Hide Roster" : "View Roster & Register Athletes"}
              </button>
              {showRoster === team._id && <TeamRosterPanel teamId={team._id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* UC-02: Register Athletes / View Roster */
function TeamRosterPanel({ teamId }: { teamId: Id<"sportsTeams"> }) {
  const roster = useQuery(api.coach.getTeamRoster, { teamId });
  const eligible = useQuery(api.coach.listEligibleLearners, { teamId });
  const assignMut = useMutation(api.coach.assignToTeam);
  const removeMut = useMutation(api.coach.removeMembership);
  const [assigning, setAssigning] = useState<string | null>(null);

  return (
    <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
      {/* Current roster */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Active Roster</h4>
        {roster === undefined ? (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent mx-auto" />
        ) : roster.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No athletes registered yet.</p>
        ) : (
          <div className="space-y-2">
            {roster.map((m) => (
              <div key={m._id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-2">
                <div>
                  <p className="text-xs font-bold text-slate-800">{m.studentName}</p>
                  {m.role && <span className="text-[10px] text-slate-400">{m.role}</span>}
                </div>
                <button
                  onClick={async () => { await removeMut({ membershipId: m._id }); }}
                  className="text-[10px] font-bold text-rose-500 hover:text-rose-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Eligible students to add */}
      {eligible && eligible.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Eligible Learners</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {eligible.map((s) => (
              <div key={s.studentUserId} className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-2">
                <p className="text-xs font-bold text-emerald-800">{s.firstName} {s.lastName}</p>
                <button
                  disabled={assigning === s.studentUserId}
                  onClick={async () => {
                    setAssigning(s.studentUserId);
                    await assignMut({ teamId, studentUserId: s.studentUserId as Id<"users"> });
                    setAssigning(null);
                  }}
                  className="rounded-xl bg-emerald-600 px-3 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {assigning === s.studentUserId ? "Adding…" : "Add to Team"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── UC-03: Training Sessions ───────────────────────────── */

function TrainingTab({ teamId, teamName }: { teamId: Id<"sportsTeams">; teamName: string }) {
  const sessions = useQuery(api.coach.listTrainingSessions, { teamId });
  const createSession = useMutation(api.coach.createTrainingSession);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", startTime: "", endTime: "", venue: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date || !form.startTime || !form.endTime) return;
    setSaving(true);
    try {
      const startMs = new Date(`${form.date}T${form.startTime}`).getTime();
      const endMs = new Date(`${form.date}T${form.endTime}`).getTime();
      await createSession({
        teamId,
        title: form.title.trim(),
        startTime: startMs,
        endTime: endMs,
        venue: form.venue.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      setForm({ title: "", date: "", startTime: "", endTime: "", venue: "", notes: "" });
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-sky-600" /> Training Sessions — {teamName}
        </h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-2.5 text-xs font-black text-white transition hover:bg-slate-800">
          <Plus className="h-3.5 w-3.5" /> Schedule Session
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Session Title *</label>
              <input type="text" value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Fitness Drill" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Date *</label>
              <input type="date" value={form.date} onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Start Time *</label>
              <input type="time" value={form.startTime} onChange={(e) => setForm(p => ({ ...p, startTime: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">End Time *</label>
              <input type="time" value={form.endTime} onChange={(e) => setForm(p => ({ ...p, endTime: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Venue</label>
              <input type="text" value={form.venue} onChange={(e) => setForm(p => ({ ...p, venue: e.target.value }))} placeholder="e.g. Main Field" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Optional notes…" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10 resize-none" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="rounded-2xl bg-emerald-600 px-6 py-2.5 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? "Scheduling…" : "Create Session"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-2xl border border-slate-200 px-6 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      )}

      {sessions === undefined ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" /></div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-16 text-center">
          <CalendarDays className="mb-4 h-12 w-12 text-slate-300" />
          <p className="font-bold text-slate-500">No training sessions scheduled.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <div key={s._id} className={`rounded-3xl border bg-white p-5 shadow-sm ${s.status === "completed" ? "opacity-60" : "border-slate-200"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-950">{s.title}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(s.startTime), "d MMM yyyy")}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(s.startTime), "HH:mm")} – {format(new Date(s.endTime), "HH:mm")}</span>
                    {s.venue && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.venue}</span>}
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${s.status === "scheduled" ? "bg-sky-50 text-sky-600" : s.status === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                  {s.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── UC-04: Attendance ───────────────────────────── */

function AttendanceTab({ teamId, teamName }: { teamId: Id<"sportsTeams">; teamName: string }) {
  const sessions = useQuery(api.coach.listTrainingSessions, { teamId });
  const roster = useQuery(api.coach.getTeamRoster, { teamId });
  const [selectedSession, setSelectedSession] = useState<Id<"trainingSessions"> | null>(null);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5 text-indigo-600" /> Attendance — {teamName}
      </h2>

      {/* Session picker */}
      <div className="flex flex-wrap gap-2">
        {(sessions ?? []).map((s) => (
          <button
            key={s._id}
            onClick={() => setSelectedSession(s._id)}
            className={`rounded-2xl border px-4 py-2 text-xs font-bold transition ${selectedSession === s._id ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
          >
            {s.title} — {format(new Date(s.startTime), "d MMM")}
          </button>
        ))}
      </div>

      {selectedSession && roster && <AttendanceRoster sessionId={selectedSession} roster={roster} />}
    </div>
  );
}

function AttendanceRoster({ sessionId, roster }: { sessionId: Id<"trainingSessions">; roster: any[] }) {
  const attendance = useQuery(api.coach.getAttendanceForSession, { sessionId });
  const markMut = useMutation(api.coach.markAttendance);
  const [loading, setLoading] = useState<string | null>(null);

  const getStatus = (studentId: Id<"users">) => {
    return attendance?.find((a) => a.studentUserId === studentId)?.status ?? null;
  };

  const handleMark = async (studentUserId: Id<"users">, status: "present" | "absent" | "late" | "excused") => {
    setLoading(studentUserId);
    await markMut({ sessionId, studentUserId, status });
    setLoading(null);
  };

  const statuses: Array<{ value: "present" | "absent" | "late" | "excused"; label: string; color: string }> = [
    { value: "present", label: "Present", color: "bg-emerald-600 text-white" },
    { value: "late", label: "Late", color: "bg-amber-500 text-white" },
    { value: "absent", label: "Absent", color: "bg-rose-600 text-white" },
    { value: "excused", label: "Excused", color: "bg-slate-600 text-white" },
  ];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
      <div className="grid grid-cols-[1fr_auto] gap-4 bg-slate-50 px-6 py-3 text-xs font-bold uppercase tracking-widest text-slate-500">
        <span>Athlete</span>
        <span>Status</span>
      </div>
      {roster.map((m) => {
        const current = getStatus(m.studentUserId);
        return (
          <div key={m._id} className="grid grid-cols-[1fr_auto] gap-4 items-center border-t border-slate-100 px-6 py-3">
            <div>
              <p className="text-sm font-bold text-slate-800">{m.studentName}</p>
              {m.role && <span className="text-[10px] text-slate-400">{m.role}</span>}
            </div>
            <div className="flex gap-1.5">
              {statuses.map((s) => (
                <button
                  key={s.value}
                  disabled={loading === m.studentUserId}
                  onClick={() => handleMark(m.studentUserId, s.value)}
                  className={`rounded-xl px-3 py-1.5 text-[10px] font-bold transition ${current === s.value ? s.color : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────────── UC-05 & UC-08: Fixtures & Results ───────────────────────────── */

function FixturesTab({ teamId, teamName }: { teamId: Id<"sportsTeams">; teamName: string }) {
  const fixtures = useQuery(api.coach.listFixtures, { teamId });
  const createFixture = useMutation(api.coach.createFixture);
  const recordResult = useMutation(api.coach.recordResult);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ opponent: "", venue: "", isHome: true, date: "", time: "" });
  const [saving, setSaving] = useState(false);
  const [scoringId, setScoringId] = useState<Id<"matchFixtures"> | null>(null);
  const [scores, setScores] = useState({ ours: "", theirs: "", report: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.opponent.trim() || !form.venue.trim() || !form.date || !form.time) return;
    setSaving(true);
    try {
      await createFixture({
        teamId,
        opponentName: form.opponent.trim(),
        venue: form.venue.trim(),
        isHomeFixture: form.isHome,
        matchTime: new Date(`${form.date}T${form.time}`).getTime(),
      });
      setForm({ opponent: "", venue: "", isHome: true, date: "", time: "" });
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleRecordResult = async (fixtureId: Id<"matchFixtures">) => {
    if (!scores.ours || !scores.theirs) return;
    await recordResult({
      fixtureId,
      ourScore: Number(scores.ours),
      opponentScore: Number(scores.theirs),
      matchReport: scores.report.trim() || undefined,
    });
    setScoringId(null);
    setScores({ ours: "", theirs: "", report: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
          <Swords className="h-5 w-5 text-rose-600" /> Match Fixtures — {teamName}
        </h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-2.5 text-xs font-black text-white transition hover:bg-slate-800">
          <Plus className="h-3.5 w-3.5" /> New Fixture
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Opponent *</label>
              <input type="text" value={form.opponent} onChange={(e) => setForm(p => ({ ...p, opponent: e.target.value }))} placeholder="e.g. Springfield High" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Venue *</label>
              <input type="text" value={form.venue} onChange={(e) => setForm(p => ({ ...p, venue: e.target.value }))} placeholder="e.g. Main Stadium" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Date *</label>
              <input type="date" value={form.date} onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Kick-off Time *</label>
              <input type="time" value={form.time} onChange={(e) => setForm(p => ({ ...p, time: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <input type="checkbox" checked={form.isHome} onChange={(e) => setForm(p => ({ ...p, isHome: e.target.checked }))} className="rounded" /> Home fixture
          </label>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="rounded-2xl bg-emerald-600 px-6 py-2.5 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? "Creating…" : "Create Fixture"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-2xl border border-slate-200 px-6 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      )}

      {fixtures === undefined ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" /></div>
      ) : fixtures.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-16 text-center">
          <Swords className="mb-4 h-12 w-12 text-slate-300" />
          <p className="font-bold text-slate-500">No fixtures scheduled.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {fixtures.map((f) => (
            <div key={f._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${f.isHomeFixture ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>{f.isHomeFixture ? "HOME" : "AWAY"}</span>
                    <h3 className="font-black text-slate-950">vs {f.opponentName}</h3>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(f.matchTime), "d MMM yyyy, HH:mm")}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{f.venue}</span>
                  </div>
                </div>
                <div className="text-right">
                  {f.result ? (
                    <div>
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-black ${f.result.result === "win" ? "bg-emerald-100 text-emerald-700" : f.result.result === "loss" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"}`}>
                        {f.result.ourScore} – {f.result.opponentScore} ({f.result.result.toUpperCase()})
                      </span>
                    </div>
                  ) : f.status === "scheduled" ? (
                    <button onClick={() => { setScoringId(f._id); setScores({ ours: "", theirs: "", report: "" }); }} className="rounded-2xl bg-sky-600 px-4 py-2 text-[10px] font-black text-white hover:bg-sky-700">Record Score</button>
                  ) : null}
                </div>
              </div>

              {scoringId === f._id && (
                <div className="mt-4 border-t border-slate-100 pt-4 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Our Score</label>
                    <input type="number" min="0" value={scores.ours} onChange={(e) => setScores(p => ({ ...p, ours: e.target.value }))} className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-sm text-center focus:border-sky-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Opponent Score</label>
                    <input type="number" min="0" value={scores.theirs} onChange={(e) => setScores(p => ({ ...p, theirs: e.target.value }))} className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-sm text-center focus:border-sky-500 focus:outline-none" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Match Report</label>
                    <input type="text" value={scores.report} onChange={(e) => setScores(p => ({ ...p, report: e.target.value }))} placeholder="Optional match notes…" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none" />
                  </div>
                  <button onClick={() => handleRecordResult(f._id)} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">Save</button>
                  <button onClick={() => setScoringId(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50">Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── UC-06: Venue Booking ───────────────────────────── */

function VenuesTab({ venues, bookings }: { venues: any[]; bookings: any[] }) {
  const bookVenue = useMutation(api.sportsVenues.bookVenue);
  const [bookingForm, setBookingForm] = useState<{ venueId: Id<"sportsVenues">; title: string; date: string; start: string; end: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm) return;
    setSaving(true);
    try {
      await bookVenue({
        venueId: bookingForm.venueId,
        title: bookingForm.title.trim(),
        startTime: new Date(`${bookingForm.date}T${bookingForm.start}`).getTime(),
        endTime: new Date(`${bookingForm.date}T${bookingForm.end}`).getTime(),
      });
      setBookingForm(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
        <MapPin className="h-5 w-5 text-violet-600" /> Sports Venues
      </h2>

      {venues.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-16 text-center">
          <MapPin className="mb-4 h-12 w-12 text-slate-300" />
          <p className="font-bold text-slate-500">No venues registered. Ask an admin to add venues.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((v) => {
            const venueBookings = bookings.filter((b) => b.venueId === v._id);
            return (
              <div key={v._id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-black text-slate-950 mb-1">{v.name}</h3>
                {v.location && <p className="text-xs text-slate-500 flex items-center gap-1 mb-1"><MapPin className="h-3 w-3" />{v.location}</p>}
                {v.capacity && <p className="text-xs text-slate-500 flex items-center gap-1 mb-3"><Users className="h-3 w-3" />Capacity: {v.capacity}</p>}

                {venueBookings.length > 0 && (
                  <div className="mb-3 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Upcoming Bookings</p>
                    {venueBookings.slice(0, 3).map((b) => (
                      <div key={b._id} className="rounded-xl bg-sky-50 px-3 py-1.5 text-[10px] text-sky-700">
                        {b.title} — {format(new Date(b.startTime), "d MMM HH:mm")}
                      </div>
                    ))}
                  </div>
                )}

                {bookingForm?.venueId === v._id && bookingForm ? (
                  <form onSubmit={handleBook} className="space-y-3 border-t border-slate-100 pt-3">
                    <input type="text" value={bookingForm.title} onChange={(e) => setBookingForm(p => p ? ({ ...p, title: e.target.value }) : p)} placeholder="Booking title *" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none" />
                    <input type="date" value={bookingForm.date} onChange={(e) => setBookingForm(p => p ? ({ ...p, date: e.target.value }) : p)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="time" value={bookingForm.start} onChange={(e) => setBookingForm(p => p ? ({ ...p, start: e.target.value }) : p)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none" />
                      <input type="time" value={bookingForm.end} onChange={(e) => setBookingForm(p => p ? ({ ...p, end: e.target.value }) : p)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none" />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-violet-600 py-2 text-[10px] font-bold text-white hover:bg-violet-700 disabled:opacity-50">{saving ? "Booking…" : "Confirm"}</button>
                      <button type="button" onClick={() => setBookingForm(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-500 hover:bg-slate-50">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <button onClick={() => setBookingForm({ venueId: v._id, title: "", date: "", start: "", end: "" })} className="w-full rounded-2xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700">
                    Book Venue
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── UC-09 & UC-10: Evaluations / Reports ───────────────────────────── */

function EvaluationsTab({ teamId, teamName, sports }: { teamId: Id<"sportsTeams">; teamName: string; sports: any[] }) {
  const roster = useQuery(api.coach.getTeamRoster, { teamId });
  const createReport = useMutation(api.coach.createReport);
  const [selectedStudent, setSelectedStudent] = useState<Id<"users"> | null>(null);
  const [form, setForm] = useState({ score: "5", comments: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !form.comments.trim()) return;
    setSaving(true);
    try {
      // Find the sport for this team
      const sportId = sports[0]?._id; // fallback — in practice coach.ts resolves team→sport
      if (!sportId) return;
      await createReport({
        studentUserId: selectedStudent,
        sportId,
        performanceScore: Number(form.score),
        comments: form.comments.trim(),
      });
      setForm({ score: "5", comments: "" });
      setSelectedStudent(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
        <Star className="h-5 w-5 text-amber-500" /> Athlete Evaluations — {teamName}
      </h2>

      {saved && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          <CheckCircle2 className="h-4 w-4" /> Evaluation submitted!
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Roster list for evaluation */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Select Athlete to Evaluate</p>
          {(roster ?? []).map((m) => (
            <button
              key={m._id}
              onClick={() => setSelectedStudent(m.studentUserId)}
              className={`w-full flex items-center justify-between rounded-2xl border px-5 py-3 text-left transition ${selectedStudent === m.studentUserId ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
            >
              <div>
                <p className="text-sm font-bold text-slate-800">{m.studentName}</p>
                {m.role && <span className="text-[10px] text-slate-400">{m.role}</span>}
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          ))}
        </div>

        {/* Evaluation form */}
        {selectedStudent && (
          <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 h-fit">
            <h3 className="font-black text-slate-950">Performance Evaluation</h3>
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-600">Performance Score (1–10)</label>
              <input type="range" min="1" max="10" value={form.score} onChange={(e) => setForm(p => ({ ...p, score: e.target.value }))} className="w-full accent-amber-500" />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>1 – Needs work</span>
                <span className="font-black text-amber-600 text-lg">{form.score}</span>
                <span>10 – Outstanding</span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Coach Comments *</label>
              <textarea value={form.comments} onChange={(e) => setForm(p => ({ ...p, comments: e.target.value }))} rows={4} placeholder="Physical fitness, tactical understanding, team participation…" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10 resize-none" />
            </div>
            <button type="submit" disabled={saving || !form.comments.trim()} className="w-full rounded-2xl bg-amber-500 py-3 text-sm font-black text-white transition hover:bg-amber-600 disabled:opacity-50">
              {saving ? "Submitting…" : "Submit Evaluation"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
