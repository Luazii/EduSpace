/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  ArrowRight,
  GraduationCap,
  Calendar,
  Globe,
  ArrowUpRight,
  Star,
  Quote,
} from "lucide-react";

export default function Home() {
  return (
    <div className="overflow-x-hidden">

      {/* ── Hero ── */}
      <section className="relative min-h-[880px] flex items-center bg-background overflow-hidden">
        {/* Background blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-primary-container/20 blur-[120px]" />
          <div className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full bg-secondary-container/20 blur-[100px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl w-full px-6 sm:px-10 grid lg:grid-cols-2 gap-12 items-center py-24">
          {/* Left */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary-container/20 px-3 py-1 text-secondary text-sm font-bold tracking-wide">
              <Sparkles className="h-3.5 w-3.5 fill-current" />
              ACCREDITED CAPS EDUCATION
            </div>

            <h1 className="font-headline text-6xl md:text-7xl font-extrabold text-on-surface leading-[1.08] tracking-tight">
              Your Future,{" "}
              <span className="text-primary italic">Your Way</span>
            </h1>

            <p className="text-xl text-on-surface-variant max-w-lg leading-relaxed font-medium">
              Experience a world-class high school education that adapts to your life.
              Flexible, high-quality, and designed for the modern South African scholar.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/apply"
                className="deep-sea-gradient text-on-primary px-8 py-4 rounded-xl font-bold text-lg hover:-translate-y-0.5 shadow-lg shadow-primary/20 inline-block"
              >
                Enrol Now
              </Link>
              <Link
                href="/courses"
                className="ghost-border bg-surface-container-lowest text-primary px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-2 hover:bg-surface-container-low"
              >
                View Subjects
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-8 pt-4">
              {[
                { value: "Grade 8–12", label: "Full CAPS curriculum" },
                { value: "100%", label: "Online & flexible" },
                { value: "Live", label: "Teacher sessions" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="font-headline text-2xl font-extrabold text-on-surface">{s.value}</p>
                  <p className="text-sm text-on-surface-variant">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — image + floating card */}
          <div className="relative hidden lg:block">
            <div className="absolute -top-10 -right-10 w-56 h-56 bg-secondary-container/30 rounded-full blur-3xl" />
            <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl rotate-1 hover:rotate-0 transition-transform duration-500">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBndaDw2_yo23JMt5Wshpa6DpljSMTh-WKz1nhOR5jf0ib9mUEzC4tbbTzT8f1WTrhkPCTZuS4RMsmWMjTZDdPrXqrkgg-GtCpvvW1JtYR4vfLHQrDsi4VyXT91Mrj8NUbdj6sY7gcmSZbH1l-eeEB6DZFAQ9s_bvVD-jbb-40G1PL3w3QYEqmZX5tHjDGBAF7bO8j5OsqknkerB1EwdMDsZsuB2x21ve3uYsktbX1fiwlGkpMOpdhJfc5Bu3h8cFX9bA6Japk5AhfP"
                alt="Student studying at EduSpace"
                className="w-full aspect-[4/5] object-cover"
              />
            </div>
            {/* Floating stat card */}
            <div className="absolute -bottom-8 -left-8 bg-surface-container-lowest/90 backdrop-blur-md p-6 rounded-2xl shadow-xl ghost-border max-w-xs">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full deep-sea-gradient flex items-center justify-center text-on-primary flex-shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-primary">98% Pass Rate</p>
                  <p className="text-xs text-on-surface-variant">
                    Graduates accepted to top SA universities
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section className="py-16 bg-surface-container-low">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 text-center">
          <p className="text-xs font-bold text-outline uppercase tracking-[0.2em] mb-10">
            Our graduates study at
          </p>
          <div className="flex flex-wrap justify-center items-center gap-10 md:gap-20 opacity-50 grayscale hover:grayscale-0 hover:opacity-80 transition-all duration-700">
            {[
              { label: "UCT", full: "University of Cape Town" },
              { label: "WITS", full: "University of the Witwatersrand" },
              { label: "UP", full: "University of Pretoria" },
              { label: "SU", full: "Stellenbosch University" },
            ].map((u) => (
              <div key={u.label} className="text-center">
                <div className="font-headline text-2xl font-extrabold text-primary">{u.label}</div>
                <div className="text-[10px] font-bold text-outline tracking-wide uppercase mt-0.5">{u.full}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Bento ── */}
      <section className="py-28 bg-background">
        <div className="mx-auto max-w-7xl px-6 sm:px-10">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
            <div className="max-w-2xl">
              <h2 className="font-headline text-4xl md:text-5xl font-extrabold text-on-surface mb-5">
                Designed for Excellence
              </h2>
              <p className="text-lg text-on-surface-variant leading-relaxed">
                We have reimagined the high school experience for the digital age,
                focusing on three core pillars that ensure learner success.
              </p>
            </div>
            <Link
              href="/courses"
              className="flex items-center gap-1.5 font-bold text-secondary hover:underline whitespace-nowrap"
            >
              Explore Curriculum
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <GraduationCap className="h-7 w-7" />,
                bg: "bg-primary-container/15 text-primary",
                title: "Expert Teachers",
                body: "Learn from qualified, SACE-registered educators who are dedicated to each learner's academic growth and mentorship.",
              },
              {
                icon: <Calendar className="h-7 w-7" />,
                bg: "bg-secondary-container/20 text-secondary",
                title: "Flexible Scheduling",
                body: "Balance your studies with sports, arts, or travel. Your education follows your schedule — not the other way around.",
                featured: true,
              },
              {
                icon: <Globe className="h-7 w-7" />,
                bg: "bg-tertiary-container/20 text-tertiary",
                title: "Full CAPS Curriculum",
                body: "Every subject aligned to the South African CAPS framework, from Mathematics and Sciences to Languages and the Arts.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className={`bg-surface-container-lowest p-8 rounded-3xl ghost-border hover:-translate-y-2 transition-transform duration-300 ${card.featured ? "shadow-xl shadow-slate-200/60" : ""}`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 ${card.bg}`}>
                  {card.icon}
                </div>
                <h3 className="font-headline text-2xl font-bold text-on-surface mb-4">{card.title}</h3>
                <p className="text-on-surface-variant leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-28 bg-surface-container-low">
        <div className="mx-auto max-w-7xl px-6 sm:px-10">
          <div className="text-center mb-20">
            <h2 className="font-headline text-4xl font-extrabold text-on-surface mb-4">
              Start Your Journey
            </h2>
            <p className="text-on-surface-variant max-w-xl mx-auto">
              Enrolment is open year-round. Begin your path in three simple steps.
            </p>
          </div>

          <div className="relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-8 left-0 right-0 h-px bg-outline-variant/30" />
            <div className="grid md:grid-cols-3 gap-12">
              {[
                {
                  n: "1",
                  title: "Apply Online",
                  body: "Complete our simple enrolment wizard: choose your grade, select subjects, and upload your documents.",
                },
                {
                  n: "2",
                  title: "Meet Your Advisor",
                  body: "Work 1-on-1 with a counsellor to build your personalised academic path and set your goals.",
                },
                {
                  n: "3",
                  title: "Start Learning",
                  body: "Log in to your dashboard and dive into live sessions, assignments, and a global learning community.",
                },
              ].map((step) => (
                <div key={step.n} className="relative z-10 text-center space-y-5">
                  <div className="w-16 h-16 rounded-full deep-sea-gradient text-on-primary flex items-center justify-center mx-auto text-2xl font-bold ring-8 ring-surface-container-low shadow-lg shadow-primary/20">
                    {step.n}
                  </div>
                  <h4 className="font-headline text-xl font-bold text-on-surface">{step.title}</h4>
                  <p className="text-on-surface-variant px-4 leading-relaxed">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonial ── */}
      <section className="py-28 overflow-hidden bg-background">
        <div className="mx-auto max-w-7xl px-6 sm:px-10">
          <div className="bg-surface-container-lowest rounded-[3rem] p-10 md:p-20 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-center gap-12 ghost-border">
            <div className="relative flex-shrink-0">
              <div className="w-56 h-56 rounded-full overflow-hidden border-8 border-surface-container-low">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCcYnnbhzMnqslM7thAhV3H-VO-uDJX72N0M226PADr6lHKah7UTTOEPsL_RBf6oQ1Lfd0R7XRM0dAGokWLKkkNnWfjdNfd5ebJ0LUeM1Pny9_r6i5AGqBDo8uFLqPajHKFSdWHrZH67MFcSS66C9p-l9PjFlGTKbyVY6O4Ee1Xh9JcbHTUr2JRXaoORSrhPukSZP3_YLCf-o5pljevJn0cjdtBaqZyW-yMEXhEGs_jaSho4Pt_VBVP29rmFsf03UXWNgclJJ02u3Ps"
                  alt="Thandi M — EduSpace Graduate"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-2 -right-2 w-14 h-14 bg-secondary rounded-full flex items-center justify-center text-on-secondary progress-aura">
                <Quote className="h-6 w-6" />
              </div>
            </div>

            <div>
              <div className="flex gap-1 mb-6 text-secondary">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-current" />
                ))}
              </div>
              <blockquote className="font-headline text-2xl md:text-3xl font-semibold text-on-surface leading-tight mb-8">
                "EduSpace gave me the freedom to pursue athletics at a provincial level while
                maintaining top marks. The teachers are incredibly supportive and the platform
                makes studying genuinely enjoyable."
              </blockquote>
              <div>
                <p className="font-bold text-on-surface text-lg">Thandi M.</p>
                <p className="text-on-surface-variant">Class of 2024 &bull; UCT Engineering Applicant</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-20 px-6 sm:px-10">
        <div className="mx-auto max-w-5xl deep-sea-gradient rounded-[2.5rem] p-10 md:p-20 text-center text-on-primary relative overflow-hidden">
          <div className="pointer-events-none absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-40 -mt-40" />
          <div className="relative z-10">
            <h2 className="font-headline text-4xl md:text-5xl font-extrabold mb-6">
              Ready to define your own path?
            </h2>
            <p className="text-xl opacity-90 mb-10 max-w-2xl mx-auto leading-relaxed">
              Join thousands of learners who have discovered a better way to learn.
              Enrolment for the upcoming term is now open.
            </p>
            <div className="flex flex-wrap justify-center gap-5">
              <Link
                href="/apply"
                className="bg-surface-container-lowest text-primary px-10 py-4 rounded-xl font-bold text-lg hover:bg-surface-bright transition-colors shadow-lg"
              >
                Apply for Admission
              </Link>
              <Link
                href="/courses"
                className="bg-primary-container/20 text-on-primary px-10 py-4 rounded-xl font-bold text-lg border border-on-primary/30 hover:bg-primary-container/30 transition-colors"
              >
                Browse Subjects
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
