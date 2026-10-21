import Link from "next/link";
import { ArrowRight, GraduationCap, Laptop, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
      {/* Main 2005 3D Window Frame */}
      <div className="retro-window w-full max-w-2xl overflow-hidden">
        {/* Title Bar */}
        <div className="retro-titlebar">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-sky-200" />
            <span className="text-xs sm:text-sm font-bold tracking-wide">
              openhall — exam system
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
        <div className="p-5 sm:p-6">
          <div className="retro-sunken bg-white p-5 sm:p-6 mb-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  open<span className="text-emerald-700">hall</span>
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5">
                  self-hosted test runner and question composer
                </p>
              </div>
              <div className="hidden sm:block retro-sunken-dark px-2.5 py-1 text-center font-mono text-xs">
                <span className="text-emerald-400">status: ready</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              simple self-hosted test hall. runs exams in locked fullscreen mode, renders katex math equations, tracks tab switching, and calculates instant scores.
            </p>
          </div>

          {/* Primary Portal Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left">
            {/* Candidate Portal */}
            <Link
              href="/lobby"
              className="retro-panel group p-4 hover:bg-slate-100 block transition-all"
            >
              <div className="flex items-center justify-between mb-2.5 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <div className="retro-btn flex h-7 w-7 items-center justify-center text-sky-800">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900">take an exam</h2>
                </div>
                <span className="retro-btn px-2 py-0.5 text-[10px] font-bold">
                  student
                </span>
              </div>
              <p className="text-xs text-slate-600 mb-3 min-h-[32px]">
                browse scheduled tests, review exam rules, and launch into the fullscreen test player.
              </p>
              <div className="retro-btn-green py-1.5 text-center text-xs flex items-center justify-center gap-1.5">
                <span>go to student lobby</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>

            {/* Teacher Studio */}
            <Link
              href="/studio"
              className="retro-panel group p-4 hover:bg-slate-100 block transition-all"
            >
              <div className="flex items-center justify-between mb-2.5 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <div className="retro-btn flex h-7 w-7 items-center justify-center text-amber-800">
                    <Laptop className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900">teacher studio</h2>
                </div>
                <span className="retro-btn px-2 py-0.5 text-[10px] font-bold">
                  admin
                </span>
              </div>
              <p className="text-xs text-slate-600 mb-3 min-h-[32px]">
                create new tests, write questions with latex formulas, manage sections, and watch live candidate proctoring.
              </p>
              <div className="retro-btn-orange py-1.5 text-center text-xs flex items-center justify-center gap-1.5">
                <span>open studio</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          </div>

          {/* Status Bar */}
          <div className="retro-sunken mt-5 flex flex-wrap items-center justify-between bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
            <span>self-hosted next.js &amp; sqlite</span>
            <span>fullscreen lockdown active</span>
            <span>port 3000</span>
          </div>
        </div>
      </div>
    </div>
  );
}
