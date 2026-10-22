import Link from "next/link";
import {
  ArrowUpRight,
  BookOpenCheck,
  GraduationCap,
  Laptop,
  LockKeyhole,
  Server,
} from "lucide-react";
import { PortalHeader } from "@/components/shell/PortalHeader";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <PortalHeader section="welcome desk" />

      <main className="portal-main max-w-5xl">
        <section className="home-intro">
          <div className="home-intro__copy">
            <p className="portal-eyebrow">
              <span className="home-status-dot" aria-hidden="true" />
              assessment workspace · self-hosted
            </p>
            <h1 className="home-title">openhall</h1>
            <p className="home-lede">
              build a paper, run the exam, and review the results from one place.
              your school keeps control of its users and exam data.
            </p>
          </div>

          <div className="home-system-card" aria-label="openhall system details">
            <div className="home-system-card__top">
              <Server className="h-4 w-4" />
              <span>system desk</span>
              <span className="home-system-card__indicator" />
            </div>
            <dl>
              <div><dt>deployment</dt><dd>self-hosted</dd></div>
              <div><dt>math notation</dt><dd>katex</dd></div>
              <div><dt>session storage</dt><dd>local database</dd></div>
            </dl>
          </div>
        </section>

        <section className="home-workspaces" aria-labelledby="workspace-heading">
          <div className="home-section-heading">
            <div>
              <p className="portal-eyebrow">choose a workspace</p>
              <h2 id="workspace-heading">where are you headed?</h2>
            </div>
            <span className="home-section-index">01 / 02</span>
          </div>

          <div className="home-workspace-grid">
            <Link href="/lobby" className="home-workspace home-workspace--candidate">
              <div className="home-workspace__icon"><GraduationCap aria-hidden="true" /></div>
              <div className="home-workspace__content">
                <span className="home-workspace__eyebrow">for candidates</span>
                <h3>exam lobby</h3>
                <p>find an available test, continue an attempt, or review a finished scorecard.</p>
              </div>
              <span className="home-workspace__action">
                open candidate lobby <ArrowUpRight aria-hidden="true" />
              </span>
            </Link>

            <Link href="/studio" className="home-workspace home-workspace--staff">
              <div className="home-workspace__icon"><Laptop aria-hidden="true" /></div>
              <div className="home-workspace__content">
                <span className="home-workspace__eyebrow">for teachers</span>
                <h3>teacher studio</h3>
                <p>create exams, arrange subject sections, and review candidate activity.</p>
              </div>
              <span className="home-workspace__action">
                open teacher studio <ArrowUpRight aria-hidden="true" />
              </span>
            </Link>
          </div>
        </section>

        <footer className="home-footer">
          <span><BookOpenCheck aria-hidden="true" /> a quiet place to run a fair exam</span>
          <span><LockKeyhole aria-hidden="true" /> sign in is required for both workspaces</span>
        </footer>
      </main>
    </div>
  );
}
