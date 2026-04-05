"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";

export function StudySessionsClient() {
  const sessions = useQuery(api.studySessions.listMine) ?? [];
  const createSession = useMutation(api.studySessions.create);
  const completeSession = useMutation(api.studySessions.complete);
  const createTask = useMutation(api.taskItems.create);
  const toggleTask = useMutation(api.taskItems.toggle);

  const [title, setTitle] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [notes, setNotes] = useState("");
  const [taskDrafts, setTaskDrafts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Pomodoro State
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      // Optional: Play chime logic here
      if (!isBreak) {
        setTimeLeft(5 * 60);
        setIsBreak(true);
      } else {
        setTimeLeft(25 * 60);
        setIsBreak(false);
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, isBreak]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setIsBreak(false);
    setTimeLeft(25 * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const sortedSessions = [...sessions].sort((a, b) =>
    a.sessionDate.localeCompare(b.sessionDate),
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !sessionDate) {
      return;
    }

    setIsSaving(true);

    try {
      await createSession({
        title: title.trim(),
        sessionDate,
        notes: notes.trim() || undefined,
      });

      setTitle("");
      setSessionDate("");
      setNotes("");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr]">
      <div className="space-y-8">
        {/* Pomodoro Timer */}
        <section className="rounded-4xl border border-slate-200 bg-[#111827] p-8 text-white shadow-[0_20px_80px_rgba(17,24,39,0.15)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-300">
            Focus Lab
          </p>
          <div className="mt-8 flex flex-col items-center text-center">
            <h2 className="text-6xl font-black tracking-tighter tabular-nums">
              {formatTime(timeLeft)}
            </h2>
            <p className="mt-2 text-sm font-semibold uppercase tracking-widest text-slate-400">
              {isBreak ? "Short Break" : "Deep Work Session"}
            </p>
            
            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={toggleTimer}
                className={`rounded-full px-8 py-3 text-sm font-bold uppercase tracking-widest transition ${
                  isActive 
                    ? "bg-slate-800 text-slate-300 hover:bg-slate-700" 
                    : "bg-white text-slate-950 hover:bg-slate-100"
                }`}
              >
                {isActive ? "Pause" : "Start"}
              </button>
              <button
                onClick={resetTimer}
                className="rounded-full border border-white/10 px-6 py-3 text-sm font-bold uppercase tracking-widest text-white hover:bg-white/5"
              >
                Reset
              </button>
            </div>
          </div>
        </section>

        {/* Create Session Form */}
        <form
          onSubmit={onSubmit}
          className="rounded-4xl border border-slate-200 bg-white/70 p-8 shadow-[0_22px_70px_rgba(15,23,42,0.04)] backdrop-blur-xl"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sky-700">
            Planner
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            Schedule Session
          </h1>
          <div className="mt-8 grid gap-5">
            <Input label="Session title" value={title} onChange={setTitle} placeholder="E.g. Biology Revision" />
            <Input label="Target Date" value={sessionDate} onChange={setSessionDate} type="date" placeholder="" />
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Strategic Notes
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="What are our goals for this session?"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950 placeholder:text-slate-400"
              />
            </label>
            <button
              type="submit"
              disabled={isSaving}
              className="mt-2 rounded-full bg-slate-950 px-5 py-4 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-slate-800 disabled:bg-slate-400"
            >
              {isSaving ? "Syncing..." : "Add to Roadmap"}
            </button>
          </div>
        </form>
      </div>

      {/* Session Timeline */}
      <section className="space-y-6">
        <header className="flex items-center justify-between px-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">Session Timeline</h2>
            <p className="text-sm text-slate-500">Your upcoming learning journey.</p>
          </div>
        </header>

        <div className="grid gap-6">
          {sortedSessions.length === 0 ? (
            <div className="rounded-4xl border border-dashed border-slate-300 bg-white/50 p-20 text-center">
              <p className="text-sm text-slate-500 font-medium italic">Your timeline is clear. Start planning!</p>
            </div>
          ) : (
            sortedSessions.map((session) => (
              <article
                key={session._id}
                className="group relative rounded-4xl border border-slate-200 bg-white/60 p-8 transition hover:bg-white hover:shadow-[0_20px_50px_rgba(15,23,42,0.04)] backdrop-blur-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className={`h-2 w-2 rounded-full ${session.status === "completed" ? "bg-emerald-500" : "bg-sky-500 animate-pulse"}`} />
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        {new Date(session.sessionDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight text-slate-950">{session.title}</h3>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {session.status !== "completed" ? (
                      <button
                        type="button"
                        onClick={() => void completeSession({ studySessionId: session._id })}
                        className="rounded-full bg-emerald-50 px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-emerald-700 transition hover:bg-emerald-100"
                      >
                        Complete
                      </button>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Finished
                      </span>
                    )}
                  </div>
                </div>

                {session.notes && (
                  <p className="mt-4 text-sm leading-relaxed text-slate-600 border-l-2 border-slate-100 pl-4">
                    {session.notes}
                  </p>
                )}

                {/* Sub-tasks */}
                <div className="mt-8 space-y-3">
                  {session.taskItems
                    .sort((a, b) => a.position - b.position)
                    .map((task) => (
                      <div
                        key={task._id}
                        onClick={() => void toggleTask({ taskItemId: task._id })}
                        className="group/task flex cursor-pointer items-center gap-4 rounded-2xl border border-slate-100 bg-white/50 px-5 py-3 transition hover:border-sky-200 hover:bg-white"
                      >
                        <div className={`flex h-5 w-5 items-center justify-center rounded-md border transition ${
                          task.isComplete 
                            ? "bg-sky-600 border-sky-600 text-white" 
                            : "border-slate-300 group-hover/task:border-sky-400"
                        }`}>
                          {task.isComplete && <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <span className={`text-sm font-medium transition ${
                          task.isComplete ? "text-slate-400 line-through" : "text-slate-700"
                        }`}>
                          {task.title}
                        </span>
                      </div>
                    ))}
                  
                  <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-6">
                    <input
                      value={taskDrafts[session._id] ?? ""}
                      onChange={(event) =>
                        setTaskDrafts((current) => ({
                          ...current,
                          [session._id]: event.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (taskDrafts[session._id] ?? "").trim()) {
                          void createTask({
                            studySessionId: session._id,
                            title: (taskDrafts[session._id] ?? "").trim(),
                          }).then(() =>
                            setTaskDrafts((current) => ({ ...current, [session._id]: "" })),
                          );
                        }
                      }}
                      placeholder="Add high-priority task..."
                      className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        void createTask({
                          studySessionId: session._id,
                          title: (taskDrafts[session._id] ?? "").trim(),
                        }).then(() =>
                          setTaskDrafts((current) => ({ ...current, [session._id]: "" })),
                        )
                      }
                      disabled={!(taskDrafts[session._id] ?? "").trim()}
                      className="text-xs font-bold uppercase tracking-widest text-sky-700 hover:text-sky-900 disabled:opacity-30"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950 placeholder:text-slate-400"
      />
    </label>
  );
}
