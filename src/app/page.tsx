import Link from "next/link";
import { ArrowRight, BookOpen, ShieldCheck, GraduationCap, Laptop } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-3xl text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green-light px-4 py-1.5 text-xs font-bold text-brand-green-text mb-6">
          <ShieldCheck className="h-4 w-4" />
          Self-Hosted Examination Server
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900">
          Open<span className="text-brand-green">Hall</span>
        </h1>
        <p className="mt-4 text-base sm:text-xl text-slate-600 max-w-xl mx-auto leading-relaxed">
          Self-hosted webserver and online examination engine with zero-trust client delivery,
          LaTeX equation rendering, and real-time proctoring.
        </p>

        {/* Primary Role Selector Cards */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          {/* Candidate Card */}
          <Link
            href="/lobby"
            className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-brand-green hover:shadow-md transition-all"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-cyan-subtle text-brand-cyan mb-4 group-hover:scale-105 transition-transform">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Candidate Portal</h2>
              <p className="mt-1 text-sm text-slate-500">
                Enter your examination room, review test instructions, and take high-stakes tests.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm font-bold text-brand-green group-hover:translate-x-1 transition-transform">
              Enter Candidate Lobby <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          {/* Teacher / Host Card */}
          <Link
            href="/studio"
            className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-brand-orange hover:shadow-md transition-all"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-brand-orange mb-4 group-hover:scale-105 transition-transform">
                <Laptop className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Host &amp; Admin Studio</h2>
              <p className="mt-1 text-sm text-slate-500">
                Compose exams with visual LaTeX formulas, manage sections, and monitor live test sessions.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm font-bold text-brand-orange group-hover:translate-x-1 transition-transform">
              Open Teacher Studio <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        </div>

        {/* Footer info */}
        <div className="mt-12 text-xs text-slate-400">
          OpenHall • Built for self-hosting on Linux (x86_64/arm64) and Windows
        </div>
      </div>
    </div>
  );
}
