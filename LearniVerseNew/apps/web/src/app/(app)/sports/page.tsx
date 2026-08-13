"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import {
  Trophy, Users, MapPin, Clock, User, Plus, CheckCircle2, XCircle,
  Shield, Calendar, ClipboardCheck, Target, Star, ChevronRight,
  CalendarDays, Dumbbell, Swords, BarChart3, FileText, QrCode, TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { QrScanner } from "@/components/qr-scanner";
import { StudentQrCode } from "@/components/student-qr-code";

type Tab = "teams" | "training" | "fixtures" | "attendance" | "venues" | "evaluations" | "reports";

export default function CoachSportsPage() {
  const user = useQuery(api.users.current);
  const isCoachOrAdmin = user?.role === "coach" || user?.role === "admin";
  const isStudent = user?.role === "student";
  const teams = useQuery(api.coach.listMyTeams, isCoachOrAdmin ? {} : "skip");
  const sports = useQuery(api.sports.listAll);
  const venues = useQuery(api.sportsVenues.listVenues, isCoachOrAdmin ? {} : "skip");
  const venueBookings = useQuery(api.sportsVenues.listBookings, isCoachOrAdmin ? {} : "skip");
  const studentSports = useQuery(api.sports.listForStudent, isStudent ? {} : "skip");

  const [tab, setTab] = useState<Tab>("teams");
  const [selectedTeamId, setSelectedTeamId] = useState<Id<"sportsTeams"> | null>(null);

  // Loading state — teams/studentSports are only ever undefined-while-loading
  // for the role that actually queries them; everyone else skips them.
  if (
    user === undefined ||
    (isCoachOrAdmin && teams === undefined) ||
    (isStudent && studentSports === undefined)
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (isStudent) {
    return <StudentSportsView sports={studentSports ?? []} />;
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
    { key: "reports", label: "Reports", icon: BarChart3 },
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
      {tab === "evaluations" && selectedTeam && <EvaluationsTab teamId={selectedTeam._id} teamName={selectedTeam.name} />}
      {tab === "reports" && selectedTeam && <ReportsTab teamId={selectedTeam._id} />}

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

/* ───────────────────────────── Student: Sports & Training Hub ───────────────────────────── */

type StudentTab = "schedule" | "sports" | "attendance" | "pass";

function StudentSportsView({ sports }: { sports: any[] }) {
  const scheduleData = useQuery(api.sports.listStudentTrainingSchedule, {});
  const register = useMutation(api.sports.register);
  const withdraw = useMutation(api.sports.withdraw);
  const [tab, setTab] = useState<StudentTab>("schedule");
  const [busyId, setBusyId] = useState<string | null>(null);

  const registeredSports = sports.filter((s) => s.isRegistered);
  const upcomingSessions = scheduleData?.upcomingSessions ?? [];
  const pastSessions = scheduleData?.pastSessions ?? [];
  const upcomingFixtures = scheduleData?.upcomingFixtures ?? [];
  const attendancePercentage = scheduleData?.attendancePercentage;

  const handleRegister = async (sportId: string) => {
    setBusyId(sportId);
    try {
      await register({ sportId: sportId as Id<"sports"> });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to register.");
    } finally {
      setBusyId(null);
    }
  };

  const handleWithdraw = async (registrationId: string) => {
    setBusyId(registrationId);
    try {
      await withdraw({ registrationId: registrationId as Id<"sportRegistrations"> });
    } finally {
      setBusyId(null);
    }
  };

  const tabs: { key: StudentTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: "schedule", label: "Training & Matches", icon: CalendarDays, badge: upcomingSessions.length || undefined },
    { key: "sports", label: "Browse Sports", icon: Trophy, badge: registeredSports.length || undefined },
    { key: "attendance", label: "Attendance Record", icon: ClipboardCheck },
    { key: "pass", label: "My Sports Pass (QR)", icon: QrCode },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10 sm:px-10">
      {/* Header */}
      <header className="mb-8 border-b border-slate-100 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">Student Athletics</span>
            {registeredSports.length > 0 && (
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-800">
                {registeredSports.length} Sport{registeredSports.length > 1 ? "s" : ""} Enrolled
              </span>
            )}
          </div>
          <button
            onClick={() => setTab("pass")}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-800 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
          >
            <QrCode className="h-4 w-4 text-emerald-600" />
            <span>Show QR Check-in Pass</span>
          </button>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950">Sports & Training</h1>
            <p className="mt-2 text-sm text-slate-500 max-w-2xl">
              Track your upcoming practice sessions, match fixtures, team schedules, and training attendance.
            </p>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-center">
              <span className="block text-2xl font-black text-slate-950">{upcomingSessions.length}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Upcoming Practice</span>
            </div>
            {attendancePercentage !== null && attendancePercentage !== undefined && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center">
                <span className="block text-2xl font-black text-emerald-700">{attendancePercentage}%</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Attendance Rate</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="mb-8 flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1">
        {tabs.map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              tab === key ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {!!badge && (
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                tab === key ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: Training Schedule & Fixtures */}
      {tab === "schedule" && (
        <div className="space-y-8">
          {/* Upcoming Training Sessions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-emerald-600" /> Upcoming Training Sessions
              </h2>
              <span className="text-xs font-bold text-slate-400">{upcomingSessions.length} Scheduled</span>
            </div>

            {upcomingSessions.length === 0 ? (
              <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
                <CalendarDays className="mb-3 h-10 w-10 text-slate-300" />
                <p className="font-bold text-slate-600">No upcoming training sessions scheduled.</p>
                <p className="mt-1 text-xs text-slate-400">
                  {registeredSports.length === 0
                    ? "Register for a sport below to join a team and view training dates."
                    : "Your coach hasn't scheduled any new training sessions yet."}
                </p>
                {registeredSports.length === 0 && (
                  <button
                    onClick={() => setTab("sports")}
                    className="mt-4 rounded-2xl bg-slate-950 px-5 py-2 text-xs font-black text-white hover:bg-slate-800"
                  >
                    Browse Sports
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingSessions.map((session: any) => {
                  const isTodaySession = new Date(session.startTime).toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={session._id}
                      className={`rounded-3xl border p-6 shadow-sm transition hover:shadow-md flex flex-col justify-between ${
                        isTodaySession ? "border-emerald-300 bg-emerald-50/40 ring-2 ring-emerald-500/20" : "border-slate-200 bg-white"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                              {session.sportName} · {session.teamName}
                            </span>
                            <h3 className="font-black text-slate-950 text-lg leading-snug">{session.title}</h3>
                          </div>
                          {isTodaySession && (
                            <span className="shrink-0 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-black text-white uppercase">
                              Today
                            </span>
                          )}
                        </div>

                        <div className="space-y-2 text-xs text-slate-600 mb-4">
                          <p className="flex items-center gap-2 font-medium">
                            <Calendar className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            {format(session.startTime, "EEEE, d MMMM yyyy")}
                          </p>
                          <p className="flex items-center gap-2 font-medium">
                            <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            {format(session.startTime, "HH:mm")} – {format(session.endTime, "HH:mm")}
                          </p>
                          <p className="flex items-center gap-2 font-medium">
                            <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            {session.venueName}
                          </p>
                          <p className="flex items-center gap-2 font-medium">
                            <User className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            {session.coachName}
                          </p>
                        </div>

                        {session.notes && (
                          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600 mb-4">
                            <span className="font-bold text-slate-800 block mb-0.5">Focus & Drills:</span>
                            {session.notes}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        {session.attendanceStatus ? (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                            session.attendanceStatus === "present" ? "bg-emerald-100 text-emerald-800"
                            : session.attendanceStatus === "late" ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-600"
                          }`}>
                            <CheckCircle2 className="h-3 w-3" /> Marked {session.attendanceStatus}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">Scan QR at venue to check in</span>
                        )}
                        <button
                          onClick={() => setTab("pass")}
                          className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                        >
                          <QrCode className="h-3.5 w-3.5" /> ID Pass
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Match Fixtures */}
          {upcomingFixtures.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
                  <Swords className="h-5 w-5 text-rose-600" /> Upcoming Match Fixtures
                </h2>
                <span className="text-xs font-bold text-slate-400">{upcomingFixtures.length} Matches</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingFixtures.map((fixture: any) => (
                  <div key={fixture._id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-600">{fixture.sportName} · {fixture.teamName}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${fixture.isHomeFixture ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"}`}>
                          {fixture.isHomeFixture ? "Home" : "Away"}
                        </span>
                      </div>
                      <h3 className="font-black text-slate-950 text-lg mb-3">vs {fixture.opponentName}</h3>
                      <div className="space-y-1 text-xs text-slate-500 mb-4">
                        <p className="flex items-center gap-1.5"><Calendar className="h-3 w-3" />{format(fixture.matchTime, "EEEE, d MMMM yyyy")}</p>
                        <p className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{format(fixture.matchTime, "HH:mm")}</p>
                        <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{fixture.venueName}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Browse Sports & Registration */}
      {tab === "sports" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-emerald-600" /> Available Sports & Extracurriculars
            </h2>
          </div>

          {sports.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-16 text-center">
              <Trophy className="mb-4 h-12 w-12 text-slate-300" />
              <p className="font-bold text-slate-500">No sports available yet.</p>
              <p className="mt-1 text-sm text-slate-400">Check back once the school has added some.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sports.map((sport) => (
                <div key={sport._id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-black text-slate-950 text-lg">{sport.name}</h3>
                        {sport.category && <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">{sport.category}</span>}
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50">
                        <Trophy className="h-5 w-5 text-emerald-600" />
                      </div>
                    </div>

                    {sport.description && <p className="text-xs text-slate-500 mb-3">{sport.description}</p>}

                    <div className="space-y-1 mb-4 text-xs text-slate-500">
                      {sport.coachName && <p className="flex items-center gap-1.5"><User className="h-3 w-3" />{sport.coachName}</p>}
                      {sport.venue && <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{sport.venue}</p>}
                      {sport.schedule && <p className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{sport.schedule}</p>}
                      <p className="flex items-center gap-1.5"><Users className="h-3 w-3" />{sport.enrolledCount} registered{sport.maxCapacity ? ` / ${sport.maxCapacity}` : ""}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    {sport.isRegistered ? (
                      <button
                        onClick={() => handleWithdraw(sport.registrationId)}
                        disabled={busyId === sport.registrationId}
                        className="w-full flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50 py-2.5 text-xs font-black text-emerald-700 transition hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {busyId === sport.registrationId ? "Withdrawing…" : "Enrolled — Click to Withdraw"}
                      </button>
                    ) : sport.isFull ? (
                      <button disabled className="w-full rounded-2xl border border-slate-200 py-2.5 text-xs font-bold text-slate-400">
                        Full
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRegister(sport._id)}
                        disabled={busyId === sport._id}
                        className="w-full rounded-2xl bg-slate-950 py-2.5 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
                      >
                        {busyId === sport._id ? "Registering…" : "Register for Sport"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Attendance History */}
      {tab === "attendance" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-emerald-600" /> Attendance History
            </h2>
            {scheduleData?.totalSessions ? (
              <span className="text-xs font-bold text-slate-500">
                {scheduleData.attendedCount} / {scheduleData.totalSessions} sessions attended
              </span>
            ) : null}
          </div>

          {pastSessions.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-16 text-center">
              <ClipboardCheck className="mb-4 h-12 w-12 text-slate-300" />
              <p className="font-bold text-slate-500">No past session attendance logged yet.</p>
              <p className="mt-1 text-sm text-slate-400">Attendance records will appear here after training sessions.</p>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 bg-slate-50 px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-500">
                <span>Session / Sport</span>
                <span>Date & Time</span>
                <span>Attendance Status</span>
              </div>
              <div className="divide-y divide-slate-100">
                {pastSessions.map((session: any) => (
                  <div key={session._id} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-6 py-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{session.title}</p>
                      <p className="text-xs text-slate-400">{session.sportName} · {session.teamName} · {session.venueName}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p className="font-bold text-slate-700">{format(session.startTime, "d MMM yyyy")}</p>
                      <p>{format(session.startTime, "HH:mm")} - {format(session.endTime, "HH:mm")}</p>
                    </div>
                    <div>
                      {session.attendanceStatus === "present" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Present
                        </span>
                      ) : session.attendanceStatus === "late" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 border border-amber-200">
                          <Clock className="h-3.5 w-3.5" /> Late
                        </span>
                      ) : session.attendanceStatus === "excused" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 border border-sky-200">
                          Excused
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                          Not Recorded
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Digital Sports Pass / QR Code */}
      {tab === "pass" && (
        <div className="flex flex-col items-center justify-center py-6">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <QrCode className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-black text-slate-950">Student Sports Pass</h2>
            <p className="mt-1 text-xs text-slate-500 mb-6">
              Present this QR pass to your coach at the start of training to check in and record your attendance.
            </p>
            <StudentQrCode />
          </div>
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
  const venues = useQuery(api.sportsVenues.listVenues, {});
  const createSession = useMutation(api.coach.createTrainingSession);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", startTime: "", endTime: "", venueId: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date || !form.startTime || !form.endTime) return;
    setSaving(true);
    setError(null);
    try {
      const startMs = new Date(`${form.date}T${form.startTime}`).getTime();
      const endMs = new Date(`${form.date}T${form.endTime}`).getTime();
      const venue = (venues ?? []).find((v) => v._id === form.venueId);
      await createSession({
        teamId,
        title: form.title.trim(),
        startTime: startMs,
        endTime: endMs,
        venue: venue?.name,
        venueId: form.venueId ? (form.venueId as Id<"sportsVenues">) : undefined,
        notes: form.notes.trim() || undefined,
      });
      setForm({ title: "", date: "", startTime: "", endTime: "", venueId: "", notes: "" });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule session — check for a time conflict.");
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
              <select value={form.venueId} onChange={(e) => setForm(p => ({ ...p, venueId: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none">
                <option value="">No venue selected</option>
                {(venues ?? []).map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Optional notes…" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10 resize-none" />
          </div>
          {error && (
            <p className="rounded-2xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700">{error}</p>
          )}
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
  const scanMut = useMutation(api.coach.markAttendanceByScanCode);
  const [loading, setLoading] = useState<string | null>(null);
  const [scannerOn, setScannerOn] = useState(false);
  const [scanResult, setScanResult] = useState<{ text: string; ok: boolean } | null>(null);
  const lastScan = useRef<{ code: string; at: number } | null>(null);

  const getStatus = (studentId: Id<"users">) => {
    return attendance?.find((a) => a.studentUserId === studentId)?.status ?? null;
  };

  const handleMark = async (studentUserId: Id<"users">, status: "present" | "absent" | "late" | "excused") => {
    setLoading(studentUserId);
    await markMut({ sessionId, studentUserId, status });
    setLoading(null);
  };

  // html5-qrcode keeps firing onScan while the same code stays in frame —
  // debounce repeats of the same code within a few seconds.
  const handleScan = useCallback(
    async (code: string) => {
      const now = Date.now();
      if (lastScan.current && lastScan.current.code === code && now - lastScan.current.at < 5000) return;
      lastScan.current = { code, at: now };
      try {
        const result = await scanMut({ sessionId, scanCode: code });
        setScanResult({ text: `${result.fullName} — ${result.status === "late" ? "Late" : "Present"}`, ok: true });
      } catch (err) {
        setScanResult({ text: err instanceof Error ? err.message : "Scan failed.", ok: false });
      }
    },
    [sessionId, scanMut],
  );

  const statuses: Array<{ value: "present" | "absent" | "late" | "excused"; label: string; color: string }> = [
    { value: "present", label: "Present", color: "bg-emerald-600 text-white" },
    { value: "late", label: "Late", color: "bg-amber-500 text-white" },
    { value: "absent", label: "Absent", color: "bg-rose-600 text-white" },
    { value: "excused", label: "Excused", color: "bg-slate-600 text-white" },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="flex items-center gap-2 text-sm font-black text-slate-950">
            <QrCode className="h-4 w-4 text-indigo-600" /> Scan to Check In
          </h4>
          <button
            onClick={() => { setScannerOn((v) => !v); setScanResult(null); }}
            className="rounded-xl bg-indigo-600 px-3 py-1.5 text-[10px] font-black text-white hover:bg-indigo-700"
          >
            {scannerOn ? "Stop Camera" : "Start Camera"}
          </button>
        </div>
        {scanResult && (
          <div className={`mb-3 flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold ${scanResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
            {scanResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {scanResult.text}
          </div>
        )}
        <QrScanner active={scannerOn} onScan={handleScan} />
        {!scannerOn && <p className="text-xs text-slate-400">Late arrivals (past the grace window) are detected automatically from the scan time — no manual "Late" click needed.</p>}
      </div>

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
    </div>
  );
}

/* ───────────────────────────── UC-05 & UC-08: Fixtures & Results ───────────────────────────── */

function FixturesTab({ teamId, teamName }: { teamId: Id<"sportsTeams">; teamName: string }) {
  const fixtures = useQuery(api.coach.listFixtures, { teamId });
  const standings = useQuery(api.coach.getTeamStandings, { teamId });
  const venues = useQuery(api.sportsVenues.listVenues, {});
  const createFixture = useMutation(api.coach.createFixture);
  const recordResult = useMutation(api.coach.recordResult);
  const createSportsEvent = useMutation(api.events.createSportsEvent);
  const scanTicketMut = useMutation(api.events.scanTicket);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ opponent: "", venue: "", venueId: "", isHome: true, date: "", time: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scoringId, setScoringId] = useState<Id<"matchFixtures"> | null>(null);
  const [scores, setScores] = useState({ ours: "", theirs: "", report: "" });

  const [ticketFixtureId, setTicketFixtureId] = useState<Id<"matchFixtures"> | null>(null);
  const [ticketForm, setTicketForm] = useState({ price: "", capacity: "" });
  const [ticketSaving, setTicketSaving] = useState(false);
  const [ticketDone, setTicketDone] = useState<string | null>(null);

  const [scannerOn, setScannerOn] = useState(false);
  const [scanResult, setScanResult] = useState<{ text: string; ok: boolean } | null>(null);
  const lastScan = useRef<{ code: string; at: number } | null>(null);

  const handleSellTickets = async (fixture: any) => {
    setTicketSaving(true);
    try {
      await createSportsEvent({
        title: `${teamName} vs ${fixture.opponentName}`,
        description: `${fixture.isHomeFixture ? "Home" : "Away"} fixture — ${teamName} vs ${fixture.opponentName}.`,
        eventDate: fixture.matchTime,
        location: fixture.venue,
        capacity: ticketForm.capacity ? Number(ticketForm.capacity) : undefined,
        ticketPrice: ticketForm.price ? Number(ticketForm.price) : undefined,
        fixtureId: fixture._id,
      });
      setTicketDone(fixture._id);
      setTicketFixtureId(null);
      setTicketForm({ price: "", capacity: "" });
    } finally {
      setTicketSaving(false);
    }
  };

  const handleScan = useCallback(
    async (code: string) => {
      const now = Date.now();
      if (lastScan.current && lastScan.current.code === code && now - lastScan.current.at < 5000) return;
      lastScan.current = { code, at: now };
      try {
        const result = await scanTicketMut({ ticketCode: code });
        setScanResult({ text: `✓ ${result.attendeeName} — ${result.eventName}`, ok: true });
      } catch (err) {
        setScanResult({ text: err instanceof Error ? err.message : "Scan failed.", ok: false });
      }
    },
    [scanTicketMut],
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.opponent.trim() || !form.venue.trim() || !form.date || !form.time) return;
    setSaving(true);
    setError(null);
    try {
      await createFixture({
        teamId,
        opponentName: form.opponent.trim(),
        venue: form.venue.trim(),
        venueId: form.venueId ? (form.venueId as Id<"sportsVenues">) : undefined,
        isHomeFixture: form.isHome,
        matchTime: new Date(`${form.date}T${form.time}`).getTime(),
      });
      setForm({ opponent: "", venue: "", venueId: "", isHome: true, date: "", time: "" });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create fixture — check for a scheduling conflict.");
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
              <input type="text" value={form.venue} onChange={(e) => setForm(p => ({ ...p, venue: e.target.value, venueId: "" }))} placeholder="e.g. Main Stadium, or pick a registered venue below" className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10" />
              {(venues ?? []).length > 0 && (
                <select
                  value={form.venueId}
                  onChange={(e) => {
                    const v = (venues ?? []).find((x) => x._id === e.target.value);
                    setForm((p) => ({ ...p, venueId: e.target.value, venue: v?.name ?? p.venue }));
                  }}
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-2 text-xs focus:border-sky-500 focus:outline-none"
                >
                  <option value="">— or pick a registered venue (checks for conflicts) —</option>
                  {(venues ?? []).map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
                </select>
              )}
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
          {error && (
            <p className="rounded-2xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700">{error}</p>
          )}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="rounded-2xl bg-emerald-600 px-6 py-2.5 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? "Creating…" : "Create Fixture"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-2xl border border-slate-200 px-6 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      )}

      {standings && standings.played > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
            <TrendingUp className="h-4 w-4 text-emerald-600" /> Season Standing
          </h3>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {[
              { label: "Played", value: standings.played },
              { label: "Won", value: standings.wins },
              { label: "Drawn", value: standings.draws },
              { label: "Lost", value: standings.losses },
              { label: "Goal Diff", value: standings.goalDifference > 0 ? `+${standings.goalDifference}` : standings.goalDifference },
              { label: "Points", value: standings.points },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-slate-50 py-3 text-center">
                <p className="text-lg font-black text-slate-950">{s.value}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
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
                <div className="text-right space-y-2">
                  {f.result ? (
                    <div>
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-black ${f.result.result === "win" ? "bg-emerald-100 text-emerald-700" : f.result.result === "loss" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"}`}>
                        {f.result.ourScore} – {f.result.opponentScore} ({f.result.result.toUpperCase()})
                      </span>
                    </div>
                  ) : f.status === "scheduled" ? (
                    <div className="flex flex-col items-end gap-1.5">
                      <button onClick={() => { setScoringId(f._id); setScores({ ours: "", theirs: "", report: "" }); }} className="rounded-2xl bg-sky-600 px-4 py-2 text-[10px] font-black text-white hover:bg-sky-700">Record Score</button>
                      {ticketDone === f._id ? (
                        <span className="text-[10px] font-bold text-emerald-600">✓ Ticketed event created</span>
                      ) : (
                        <button onClick={() => { setTicketFixtureId(f._id); setTicketForm({ price: "", capacity: "" }); }} className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2 text-[10px] font-black text-violet-700 hover:bg-violet-100">Sell Tickets</button>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              {ticketFixtureId === f._id && (
                <div className="mt-4 border-t border-slate-100 pt-4 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Ticket Price (R, blank = free)</label>
                    <input type="number" min="0" value={ticketForm.price} onChange={(e) => setTicketForm(p => ({ ...p, price: e.target.value }))} placeholder="e.g. 50" className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Capacity (blank = unlimited)</label>
                    <input type="number" min="1" value={ticketForm.capacity} onChange={(e) => setTicketForm(p => ({ ...p, capacity: e.target.value }))} placeholder="e.g. 200" className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none" />
                  </div>
                  <button onClick={() => handleSellTickets(f)} disabled={ticketSaving} className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50">
                    {ticketSaving ? "Creating…" : "Create Ticketed Event"}
                  </button>
                  <button onClick={() => setTicketFixtureId(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50">Cancel</button>
                </div>
              )}

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

      {/* UC-07 gate entry: scan tickets sold for this team's fixtures */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="flex items-center gap-2 text-sm font-black text-slate-950">
            <QrCode className="h-4 w-4 text-violet-600" /> Scan Tickets at the Gate
          </h4>
          <button
            onClick={() => { setScannerOn((v) => !v); setScanResult(null); }}
            className="rounded-xl bg-violet-600 px-3 py-1.5 text-[10px] font-black text-white hover:bg-violet-700"
          >
            {scannerOn ? "Stop Camera" : "Start Camera"}
          </button>
        </div>
        {scanResult && (
          <div className={`mb-3 flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold ${scanResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
            {scanResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {scanResult.text}
          </div>
        )}
        <QrScanner active={scannerOn} onScan={handleScan} />
      </div>
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

function EvaluationsTab({ teamId, teamName }: { teamId: Id<"sportsTeams">; teamName: string }) {
  const roster = useQuery(api.coach.getTeamRoster, { teamId });
  const createReport = useMutation(api.coach.createReport);
  const [selectedStudent, setSelectedStudent] = useState<Id<"users"> | null>(null);
  const [form, setForm] = useState({ score: "5", comments: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // sportId is resolved server-side from teamId — never trust a client-picked
  // sportId (the old code hardcoded sports[0], tagging evaluations to the
  // wrong sport for any team that wasn't first in the list).
  const stats = useQuery(
    api.coach.getAthleteStats,
    selectedStudent ? { teamId, studentUserId: selectedStudent } : "skip",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !form.comments.trim()) return;
    setSaving(true);
    try {
      await createReport({
        studentUserId: selectedStudent,
        teamId,
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

            {stats && (
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-amber-50 p-4 text-xs">
                <div>
                  <p className="font-black text-amber-800">
                    {stats.attendanceRate != null ? `${stats.attendanceRate}%` : "—"}
                  </p>
                  <p className="text-[10px] text-amber-700">
                    Attendance ({stats.sessionsAttended}/{stats.sessionsScheduled} sessions)
                  </p>
                </div>
                <div>
                  <p className="font-black text-amber-800">{stats.avgPastScore ?? "—"}</p>
                  <p className="text-[10px] text-amber-700">
                    Avg. past score ({stats.priorEvaluationCount} prior eval{stats.priorEvaluationCount === 1 ? "" : "s"})
                  </p>
                </div>
              </div>
            )}

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

/* ───────────────────────────── UC-09: Season Report ───────────────────────────── */

function ReportsTab({ teamId }: { teamId: Id<"sportsTeams"> }) {
  const report = useQuery(api.coach.generateSeasonReport, { teamId });

  if (report === undefined) {
    return <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-violet-600" /> Season Report
        </h2>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800">
          <FileText className="h-3.5 w-3.5" /> Print / Save as PDF
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-8">
        <div className="border-b border-slate-100 pb-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-violet-600">{report.sportName}</p>
          <h1 className="text-2xl font-black text-slate-950">{report.teamName} — Season Report</h1>
          <p className="mt-1 text-xs text-slate-500">Coach: {report.coachName} · Generated {format(report.generatedAt, "d MMM yyyy, HH:mm")}</p>
        </div>

        {/* Standings */}
        <div>
          <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">Standings</h3>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-7">
            {[
              { label: "Played", value: report.standings.played },
              { label: "Won", value: report.standings.wins },
              { label: "Drawn", value: report.standings.draws },
              { label: "Lost", value: report.standings.losses },
              { label: "GF", value: report.standings.goalsFor },
              { label: "GA", value: report.standings.goalsAgainst },
              { label: "Points", value: report.standings.points },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-slate-50 py-3 text-center">
                <p className="text-lg font-black text-slate-950">{s.value}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Roster performance */}
        <div>
          <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">
            Roster Performance ({report.roster.length} athletes · {report.trainingSessionsHeld} sessions held)
          </h3>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <span>Athlete</span>
              <span>Attendance</span>
              <span>Evaluations</span>
              <span>Avg Score</span>
            </div>
            {report.roster.map((r) => (
              <div key={r.studentUserId} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center border-t border-slate-100 px-4 py-2.5">
                <span className="text-sm font-bold text-slate-800">{r.fullName}</span>
                <span className="text-xs text-slate-600">{r.attendanceRate != null ? `${r.attendanceRate}%` : "—"} ({r.sessionsAttended}/{r.sessionsScheduled})</span>
                <span className="text-xs text-slate-600">{r.evaluationCount}</span>
                <span className="text-xs font-bold text-slate-800">{r.avgScore ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Fixture history */}
        <div>
          <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">Fixture History</h3>
          {report.fixtureHistory.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No completed fixtures yet.</p>
          ) : (
            <div className="space-y-2">
              {report.fixtureHistory.map((f, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2 text-xs">
                  <span className="font-bold text-slate-800">{f.isHomeFixture ? "vs" : "@"} {f.opponentName} · {format(f.matchTime, "d MMM yyyy")}</span>
                  {f.result && (
                    <span className={`font-black ${f.result.result === "win" ? "text-emerald-600" : f.result.result === "loss" ? "text-rose-600" : "text-slate-500"}`}>
                      {f.result.ourScore}–{f.result.opponentScore} ({f.result.result.toUpperCase()})
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
