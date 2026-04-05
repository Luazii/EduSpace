import Link from "next/link";

type RoutePlaceholderProps = {
  eyebrow: string;
  title: string;
  body: string;
};

export function RoutePlaceholder({
  eyebrow,
  title,
  body,
}: RoutePlaceholderProps) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 px-6 py-14 sm:px-10">
      <section className="w-full rounded-[2rem] border border-black/10 bg-white/80 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
          {eyebrow}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
          {body}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Back to dashboard
          </Link>
          <Link
            href="/"
            className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
          >
            Home
          </Link>
        </div>
      </section>
    </main>
  );
}
