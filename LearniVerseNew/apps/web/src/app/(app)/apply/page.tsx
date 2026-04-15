"use client";

import { useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { ApplyWizard } from "@/components/enrollments/apply-wizard";
import { ParentEnrollmentList } from "@/components/enrollments/parent-enrollment-list";
import { Loader2 } from "lucide-react";

export default function ApplyPage() {
  const searchParams = useSearchParams();
  const showWizard = searchParams.get("new") === "true";
  const applications = useQuery(api.enrollments.listMine);

  if (applications === undefined) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    );
  }

  const hasApplications = applications.length > 0;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
      {showWizard || !hasApplications ? <ApplyWizard /> : <ParentEnrollmentList />}
    </main>
  );
}
