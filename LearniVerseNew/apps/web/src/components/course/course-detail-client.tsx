"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import type { Id } from "../../../convex/_generated/dataModel";

import { api } from "../../../convex/_generated/api";
import { AssignmentsPanel } from "@/components/course/assignments-panel";
import { QuizzesPanel } from "@/components/course/quizzes-panel";
import { LiveSessionsPanel } from "@/components/course/live-sessions-panel";
import { Video, ExternalLink } from "lucide-react";

type CourseDetailClientProps = {
  courseId: string;
};

export function CourseDetailClient({ courseId }: CourseDetailClientProps) {
  const typedCourseId = courseId as Id<"courses">;
  const course = useQuery(api.courses.getById, { courseId: typedCourseId });
  const resources = useQuery(api.resources.listByCourse, { courseId: typedCourseId }) ?? [];
  const currentUser = useQuery(api.users.current);
  const generateUploadUrl = useMutation(api.resources.generateUploadUrl);
  const createResource = useMutation(api.resources.create);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const liveSessions = useQuery(api.liveSessions.listByCourse, { courseId: typedCourseId }) ?? [];
  const activeSession = useMemo(() => liveSessions.find(s => s.isLive), [liveSessions]);

  const canManageResources = useMemo(() => {
    return currentUser?.role === "admin" || currentUser?.role === "teacher";
  }, [currentUser?.role]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file || !title.trim()) {
      return;
    }

    setIsUploading(true);

    try {
      const uploadUrl = await generateUploadUrl({});
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      const { storageId } = (await uploadResult.json()) as { storageId: Id<"_storage"> };

      await createResource({
        courseId: typedCourseId,
        title: title.trim(),
        description: description.trim() || undefined,
        storageId,
        fileName: file.name,
      });

      setTitle("");
      setDescription("");
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  }

  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as "resources" | "assignments" | "quizzes" | "live" | null;
  const [activeTab, setActiveTab] = useState<"resources" | "assignments" | "quizzes" | "live">(
    tabParam && ["resources", "assignments", "quizzes", "live"].includes(tabParam)
      ? tabParam
      : "resources",
  );

  // Sync if URL param changes (e.g. navigating from teacher dashboard)
  useEffect(() => {
    if (tabParam && ["resources", "assignments", "quizzes", "live"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  if (course === undefined) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
        <div className="flex h-[60vh] w-full items-center justify-center rounded-[2.5rem] border border-slate-200 bg-white/60 backdrop-blur-xl">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-sky-600" />
            <p className="text-sm font-medium text-slate-500">Entering classroom...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
        <div className="rounded-[2.5rem] border border-slate-200 bg-white/80 p-12 text-center shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Classroom Not Found
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            This classroom doesn&apos;t exist yet or the course was removed.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex rounded-full bg-slate-950 px-8 py-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-14 sm:px-10">
      {/* Header Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white/70 p-10 shadow-[0_22px_70px_rgba(15,23,42,0.04)] backdrop-blur-xl">
        <div className="relative z-10 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div className="space-y-4">
            <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-sky-700">
              <Link href="/dashboard" className="hover:text-sky-900">Dashboard</Link>
              <span className="text-slate-300">/</span>
              <span>Classroom</span>
            </nav>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
              {course.courseName}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{course.courseCode}</span>
              <span>&bull;</span>
              <span>{course.qualification?.name ?? course.department}</span>
              {typeof course.semester === "number" && (
                <>
                  <span>&bull;</span>
                  <span>Semester {course.semester}</span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {activeSession && (
              <a
                href={activeSession.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-600 animate-pulse ring-8 ring-emerald-500/10"
              >
                <Video className="h-4 w-4" />
                Join Live Now
              </a>
            )}
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
            >
              Leave Classroom
            </Link>
          </div>
        </div>
      </section>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-1">
        {[
          { id: "resources", label: "Resources", count: resources.length },
          { id: "assignments", label: "Assignments" },
          { id: "quizzes", label: "Quizzes" },
          { id: "live", label: "Live Classes" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`relative flex items-center gap-2 px-6 py-3 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "text-slate-950"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                activeTab === tab.id ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 h-0.5 w-full bg-slate-950" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-2 flex-1">
        {activeTab === "resources" && (
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              {resources.length === 0 ? (
                <div className="group relative flex flex-col items-center justify-center space-y-6 rounded-4xl border border-dashed border-slate-300 bg-white/50 p-20 text-center transition hover:border-sky-300 hover:bg-sky-50/30">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
                    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-950">No materials yet</h3>
                  <p className="mt-2 text-sm text-slate-500 max-w-xs">
                    Your teacher has not uploaded any study materials for this course yet.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {resources.map((resource) => (
                    <ResourceCard key={resource._id} resource={resource} />
                  ))}
                </div>
              )}
            </div>

            {canManageResources && (
              <aside className="sticky top-8 self-start">
                <div className="rounded-4xl border border-slate-200 bg-white/80 p-8 shadow-[0_18px_60px_rgba(15,23,42,0.04)] backdrop-blur-xl">
                  <header className="mb-6">
                    <h3 className="text-xl font-semibold tracking-tight text-slate-950">Upload Material</h3>
                    <p className="mt-2 text-sm text-slate-500">Add slides, handouts, or notes for your students.</p>
                  </header>
                  <form onSubmit={onSubmit} className="grid gap-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-600">Title</label>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Lecture 1: Introduction"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-600">Description</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Key concepts covered..."
                        rows={3}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-600">File</label>
                      <div className="group relative">
                        <input
                          type="file"
                          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                        <div className="flex h-32 flex-col items-center justify-center rounded-4xl border-2 border-dashed border-slate-200 bg-white transition hover:border-slate-950">
                          <svg className="h-8 w-8 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                          </svg>
                          <span className="text-xs font-medium text-slate-500">
                            {file ? file.name : "Select or drag file"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isUploading || !file || !title.trim()}
                      className="h-14 w-full rounded-full bg-slate-950 text-sm font-bold text-white transition hover:bg-slate-800 disabled:bg-slate-300"
                    >
                      {isUploading ? "Uploading..." : "Publish Material"}
                    </button>
                  </form>
                </div>
              </aside>
            )}
          </div>
        )}

        {activeTab === "assignments" && <AssignmentsPanel courseId={courseId} />}
        {activeTab === "quizzes" && <QuizzesPanel courseId={courseId} />}
        {activeTab === "live" && <LiveSessionsPanel courseId={courseId} />}
      </div>
    </main>
  );
}

function ResourceCard({ resource }: { resource: any }) {
  return (
    <article className="group relative rounded-2xl border border-slate-200 bg-white/60 p-6 transition hover:bg-white hover:shadow-[0_15px_40px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-slate-950">{resource.title}</h4>
            <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 font-medium">
              <span>{resource.fileName}</span>
              <span>&bull;</span>
              <span>{formatBytes(resource.size)}</span>
              {resource.uploadedAt && (
                <>
                  <span>&bull;</span>
                  <span>{new Date(resource.uploadedAt).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
        </div>
        {resource.url && (
          <a
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center rounded-full bg-slate-100 px-5 text-xs font-bold uppercase tracking-widest text-slate-950 transition hover:bg-slate-950 hover:text-white"
          >
            Download
          </a>
        )}
      </div>
      {resource.description && (
        <p className="mt-4 text-sm leading-7 text-slate-600 pl-16">
          {resource.description}
        </p>
      )}
    </article>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
