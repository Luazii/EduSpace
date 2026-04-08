"use client";

import Link from "next/link";
import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { CheckoutButton } from "@/components/payments/checkout-button";
import { CheckCircle, Clock, GraduationCap, FileText, CreditCard, BookOpen, ChevronRight, Home } from "lucide-react";

const NEXT_STEPS = [
  {
    icon: <Clock className="h-5 w-5" />,
    title: "Application Review",
    body: "The admissions office will review your documents and application details, typically within 3–5 business days.",
    color: "bg-primary-container/15 text-primary",
  },
  {
    icon: <CreditCard className="h-5 w-5" />,
    title: "Pay Registration Fee",
    body: "Once you receive confirmation, pay the registration fee to secure your place for the academic year.",
    color: "bg-secondary-container/20 text-secondary",
  },
  {
    icon: <BookOpen className="h-5 w-5" />,
    title: "Start Learning",
    body: "Your account will be activated and you will receive access to your course materials and timetable.",
    color: "bg-tertiary-container/20 text-tertiary",
  },
];

export default function SubmittedApplicationPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = use(params);
  const application = useQuery(api.enrollments.getById, {
    applicationId: applicationId as Id<"enrollmentApplications">,
  });

  if (application === undefined) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (application === null) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <p className="text-on-surface-variant">Application not found.</p>
        <Link href="/apply" className="mt-4 inline-block font-bold text-primary hover:underline">
          Back to Apply
        </Link>
      </div>
    );
  }

  const gradeDisplay = application.gradeLabel ?? application.qualification?.name ?? "High School";
  const subjects = application.selectedSubjectNames ?? [];

  const docChecklist = [
    { label: "Birth Certificate / Learner ID", present: !!application.birthCertStorageId },
    { label: "Parent / Guardian ID",           present: !!application.parentIdStorageId },
    { label: "Proof of Residence",             present: !!application.proofOfResidenceStorageId },
    { label: "Latest School Report",           present: !!application.schoolReportStorageId },
    { label: "Transfer Letter / Card",         present: !!application.transferLetterStorageId },
  ];

  const docsUploaded = docChecklist.filter((d) => d.present).length;

  return (
    <div className="mx-auto max-w-3xl w-full px-6 sm:px-10 py-14 space-y-8">

      {/* ── Success Banner ── */}
      <div className="deep-sea-gradient rounded-3xl p-10 text-center text-on-primary relative overflow-hidden">
        <div className="pointer-events-none absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <CheckCircle className="h-10 w-10 text-on-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="font-headline text-3xl font-extrabold">Application Submitted!</h1>
            <p className="mt-2 text-on-primary/80 max-w-md mx-auto">
              Your application for <strong>{gradeDisplay}</strong> has been received and is currently under review by the admissions office.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur-sm px-6 py-3 text-sm font-bold tracking-wide">
            Ref: {applicationId.slice(-10).toUpperCase()}
          </div>
        </div>
      </div>

      {/* ── Application Summary ── */}
      <div className="bg-surface-container-lowest rounded-3xl p-7 ghost-border space-y-6">
        <h2 className="font-headline text-lg font-bold text-on-surface flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          Application Summary
        </h2>

        <div className="grid sm:grid-cols-2 gap-5">
          {/* Grade */}
          <div className="rounded-2xl bg-background p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-outline mb-2">Grade Applied For</p>
            <p className="font-headline text-xl font-extrabold text-primary">{gradeDisplay}</p>
          </div>

          {/* Subject count */}
          <div className="rounded-2xl bg-background p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-outline mb-2">Subjects Selected</p>
            <p className="font-headline text-xl font-extrabold text-secondary">{subjects.length} subject{subjects.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Subject tags */}
        {subjects.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-outline mb-3">Subject List</p>
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => (
                <span key={s} className="rounded-full bg-primary-container/15 px-3 py-1 text-xs font-bold text-primary">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-outline mb-3">
            Documents — {docsUploaded} of {docChecklist.length} uploaded
          </p>
          <div className="grid gap-2">
            {docChecklist.map(({ label, present }) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  present ? "bg-secondary/15 text-secondary" : "bg-surface-container text-outline"
                }`}>
                  {present ? "✓" : "–"}
                </span>
                <span className={present ? "text-on-surface" : "text-outline"}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Payment CTA ── */}
      {application.paymentStatus !== "paid" && (
        <div className="rounded-3xl border-2 border-primary-container/30 bg-primary-container/10 p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div>
            <p className="font-headline font-bold text-on-surface">Pay Registration Fee</p>
            <p className="mt-1 text-sm text-on-surface-variant max-w-sm">
              Secure your place by paying the registration fee. Your application is pending payment confirmation.
            </p>
          </div>
          <div className="flex-shrink-0">
            <CheckoutButton applicationId={applicationId} />
          </div>
        </div>
      )}

      {/* ── What Happens Next ── */}
      <div className="bg-surface-container-lowest rounded-3xl p-7 ghost-border space-y-6">
        <h2 className="font-headline text-lg font-bold text-on-surface">What Happens Next</h2>
        <div className="grid gap-5">
          {NEXT_STEPS.map((step, i) => (
            <div key={step.title} className="flex items-start gap-4">
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${step.color}`}>
                {step.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-outline">Step {i + 1}</span>
                </div>
                <p className="font-bold text-on-surface">{step.title}</p>
                <p className="mt-0.5 text-sm text-on-surface-variant leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Nav Links ── */}
      <div className="flex flex-wrap justify-between items-center gap-4 pt-2">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <Home className="h-4 w-4" />
          Back to Home
        </Link>
        <Link
          href="/apply"
          className="flex items-center gap-2 rounded-xl bg-surface-container px-5 py-3 text-sm font-bold text-on-surface hover:bg-surface-container-high transition-colors"
        >
          View My Applications
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

    </div>
  );
}
