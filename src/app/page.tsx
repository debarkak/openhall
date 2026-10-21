import Link from "next/link";
import { ArrowRight, GraduationCap, Laptop, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
      {/* Main Classic 3D Window Frame */}
      <div className="retro-window w-full max-w-3xl overflow-hidden">
        {/* Classic 3D Title Bar */}
        <div className="retro-titlebar">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-sky-200" />
            <span className="text-xs sm:text-sm font-bold tracking-wide">
              OpenHall Examination Control Center v1.0
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="retro-btn flex h-5 w-5 items-center justify-center text-[10px] leading-none">
              _
            </span>
            <span className="retro-btn flex h-5 w-5 items-center justify-center text-[10px] leading-none">
              □
            </span>
            <span className="retro-btn flex h-5 w-5 items-center justify-center text-[10px] leading-none text-red-700">
              ✕
            </span>
          </div>
        </div>

        {/* Window Content */}
        <div className="p-6 sm:p-8">
          <div className="retro-sunken bg-white p-6 sm:p-8 mb-6">
            <div className="flex items-center justify-between border-b-2 border-slate-300 pb-4 mb-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                  Open<span className="text-green-700">Hall</span>
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-600 mt-1">
                  Institutional Self-Hosted Examination Engine &amp; CBT Client
                </p>
              </div>
              <div className="hidden sm:block retro-sunken-dark px-3 py-1.5 text-center font-mono text-xs">
                <div>SERVER: READY</div>
                <div className="text-emerald-400">STATUS: ONLINE</div>
              </div>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">
              OpenHall delivers a zero-trust examination environment with real-time proctoring telemetry,
              strict client hardware lockdown, and full KaTeX mathematical equation support.
            </p>
          </div>

          {/* Primary Portal Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            {/* Candidate Portal */}
            <Link
              href="/lobby"
              className="retro-panel group p-5 hover:bg-slate-200 block transition-none active:translate-x-[1px] active:translate-y-[1px]"
            >
              <div className="flex items-center justify-between mb-3 border-b border-slate-300 pb-2">
                <div className="flex items-center gap-2">
                  <div className="retro-sunken flex h-8 w-8 items-center justify-center bg-sky-100 text-sky-800">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Candidate Lobby</h2>
                </div>
                <span className="retro-btn px-2 py-0.5 text-[10px] font-bold">
                  PORTAL
                </span>
              </div>
              <p className="text-xs text-slate-600 mb-4 min-h-[36px]">
                Access scheduled exams, enter verification lobby, and launch the locked examination environment.
              </p>
              <div className="retro-btn-green py-2 text-center text-xs flex items-center justify-center gap-1.5">
                <span>Enter Candidate Portal</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>

            {/* Teacher Studio */}
            <Link
              href="/studio"
              className="retro-panel group p-5 hover:bg-slate-200 block transition-none active:translate-x-[1px] active:translate-y-[1px]"
            >
              <div className="flex items-center justify-between mb-3 border-b border-slate-300 pb-2">
                <div className="flex items-center gap-2">
                  <div className="retro-sunken flex h-8 w-8 items-center justify-center bg-amber-100 text-amber-800">
                    <Laptop className="h-5 w-5" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Teacher Studio</h2>
                </div>
                <span className="retro-btn px-2 py-0.5 text-[10px] font-bold">
                  ADMIN
                </span>
              </div>
              <p className="text-xs text-slate-600 mb-4 min-h-[36px]">
                Author multi-section questions with visual LaTeX, manage exam status, and monitor live candidate telemetry.
              </p>
              <div className="retro-btn-orange py-2 text-center text-xs flex items-center justify-center gap-1.5">
                <span>Open Authoring Studio</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          </div>

          {/* Classic Status Bar */}
          <div className="retro-sunken mt-6 flex flex-wrap items-center justify-between bg-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700">
            <span>Platform: Self-Hosted Node.js / SQLite</span>
            <span>Zero-Trust Client Lockdown Active</span>
            <span>Port: 3000</span>
          </div>
        </div>
      </div>
    </div>
  );
}
