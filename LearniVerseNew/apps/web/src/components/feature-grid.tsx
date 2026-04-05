import Link from "next/link";

const features = [
  {
    href: "/courses",
    eyebrow: "Academics",
    title: "Course Catalog",
    body: "Browse the live academic catalog, open course classrooms, and access resources, assignments, and quizzes.",
  },
  {
    href: "/apply",
    eyebrow: "Admissions",
    title: "Admissions Portal",
    body: "Submit an application with faculty, qualification, and course selection. Handle NSC uploads and track review status.",
  },
  {
    href: "/teacher",
    eyebrow: "Faculty",
    title: "Faculty Center",
    body: "Review course activity, monitor the assessment queue, and jump straight into classrooms that need attention.",
  },
  {
    href: "/progress",
    eyebrow: "Records",
    title: "Academic Results",
    body: "Track evaluation performance and assignment results by course from the student reporting dashboard.",
  },
];

export function FeatureGrid() {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {features.map((feature) => (
        <Link
          key={feature.href}
          href={feature.href}
          className="rounded-[1.75rem] border border-slate-200 bg-white/70 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)] transition hover:border-slate-300"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
            {feature.eyebrow}
          </p>
          <h3 className="mt-3 text-xl font-semibold text-slate-950">
            {feature.title}
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">{feature.body}</p>
        </Link>
      ))}
    </section>
  );
}
