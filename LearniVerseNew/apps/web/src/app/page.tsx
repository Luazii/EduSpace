import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
      <section className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8 rounded-[2rem] border border-black/10 bg-white/80 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-10">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
              Next.js + Convex + Clerk
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
              LearniVerse is being rebuilt as a modern academic platform.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              The new stack is live in this monorepo and ready for the first real
              feature slices. We&apos;re keeping the education platform, dropping the
              gym modules, and rebuilding the product around typed backend logic and
              cleaner route boundaries.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Enter the dashboard
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
            >
              Create your first user
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          {[
            {
              title: "Monorepo baseline",
              body: "The legacy MVC code remains in place while the new app lives under apps/web for side-by-side migration.",
            },
            {
              title: "Auth foundation",
              body: "Clerk is wired into the App Router shell with modal sign-in and sign-up flows plus protected route handling.",
            },
            {
              title: "Backend foundation",
              body: "Convex is connected with an initial academic schema focused on users, profiles, faculties, qualifications, courses, and resources.",
            },
          ].map((card) => (
            <article
              key={card.title}
              className="rounded-[1.75rem] border border-slate-200 bg-white/75 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]"
            >
              <h2 className="text-xl font-semibold text-slate-950">{card.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{card.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
