"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  Eye,
  FilePlus2,
  FileText,
  Search,
  Shield,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { PortalHeader } from "@/components/shell/PortalHeader";
import type { SessionUser } from "@/lib/auth";

interface ExamItem {
  id: string;
  title: string;
  description?: string | null;
  accessCode: string;
  durationSeconds: number;
  positiveMarks: number;
  negativePenalty: number;
  isLive: boolean;
  sections: { id: string; title: string; questions: { id: string }[] }[];
  _count: { sessions: number };
}

type ExamFilter = "all" | "live" | "draft";

function questionCount(exam: ExamItem) {
  return exam.sections.reduce((total, section) => total + section.questions.length, 0);
}

export default function TeacherStudioPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [busyExamId, setBusyExamId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ExamFilter>("all");
  const [newTitle, setNewTitle] = useState("");
  const [newDuration, setNewDuration] = useState("90");
  const [createError, setCreateError] = useState<string | null>(null);

  const loadExams = useCallback(async () => {
    setLoadError(null);
    try {
      const [examsRes, authRes] = await Promise.all([
        fetch("/api/admin/exams"),
        fetch("/api/auth/me").catch(() => null),
      ]);

      if (examsRes.status === 401) {
        const destination = `${window.location.pathname}${window.location.search}`;
        window.location.assign(`/login?redirect=${encodeURIComponent(destination)}`);
        return;
      }
      if (examsRes.status === 403) {
        window.location.assign("/lobby");
        return;
      }
      if (!examsRes.ok) throw new Error("could not load the exam registry. try again.");

      const data: ExamItem[] = await examsRes.json();
      setExams(data);
      if (authRes?.ok) {
        const authData = await authRes.json();
        setCurrentUser(authData.user);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "could not load the exam registry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadExams();
  }, [loadExams]);

  useEffect(() => {
    if (!isCreateOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isCreating) setIsCreateOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isCreateOpen, isCreating]);

  const counts = useMemo(() => ({
    all: exams.length,
    live: exams.filter((exam) => exam.isLive).length,
    draft: exams.filter((exam) => !exam.isLive).length,
    questions: exams.reduce((total, exam) => total + questionCount(exam), 0),
    candidates: exams.reduce((total, exam) => total + exam._count.sessions, 0),
  }), [exams]);

  const visibleExams = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return exams.filter((exam) => {
      if (filter === "live" && !exam.isLive) return false;
      if (filter === "draft" && exam.isLive) return false;
      if (!normalizedQuery) return true;
      return [exam.title, exam.accessCode, ...exam.sections.map((section) => section.title)]
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [exams, filter, query]);

  const handleCreateExam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);
    setIsCreating(true);

    try {
      const response = await fetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          durationSeconds: Number(newDuration) * 60,
        }),
      });
      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        const destination = `${window.location.pathname}${window.location.search}`;
        window.location.assign(`/login?redirect=${encodeURIComponent(destination)}`);
        return;
      }
      if (response.status === 403) {
        window.location.assign("/lobby");
        return;
      }
      if (!response.ok) throw new Error(data?.error || "the exam could not be created.");

      if (!data?.id) throw new Error("the exam was created, but the editor could not be opened.");
      setIsCreateOpen(false);
      setNewTitle("");
      setNewDuration("90");
      router.push(`/studio/${data.id}`);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "the exam could not be created.");
    } finally {
      setIsCreating(false);
    }
  };

  const toggleExamLive = async (exam: ExamItem) => {
    setActionError(null);
    setBusyExamId(exam.id);
    try {
      const response = await fetch(`/api/admin/exams/${exam.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLive: !exam.isLive }),
      });
      const data = await response.json().catch(() => null);
      if (response.status === 401) {
        const destination = `${window.location.pathname}${window.location.search}`;
        window.location.assign(`/login?redirect=${encodeURIComponent(destination)}`);
        return;
      }
      if (response.status === 403) {
        window.location.assign("/lobby");
        return;
      }
      if (!response.ok) {
        const details = Array.isArray(data?.issues) ? ` ${data.issues.join("; ")}.` : "";
        throw new Error(`${data?.error || "could not update this exam's availability."}${details}`);
      }
      setExams((current) => current.map((item) =>
        item.id === exam.id ? { ...item, isLive: !exam.isLive } : item
      ));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "could not update exam availability.");
    } finally {
      setBusyExamId(null);
    }
  };

  const deleteExam = async (exam: ExamItem) => {
    if (exam._count.sessions > 0) return;

    const confirmed = window.confirm(
      `delete “${exam.title}”? this permanently removes its sections and questions.`
    );
    if (!confirmed) return;

    setActionError(null);
    setBusyExamId(exam.id);
    try {
      const response = await fetch(`/api/admin/exams/${exam.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "could not delete this exam.");
      setExams((current) => current.filter((item) => item.id !== exam.id));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "could not delete this exam.");
    } finally {
      setBusyExamId(null);
    }
  };

  return (
    <div className="min-h-screen">
      <PortalHeader section="teacher studio" user={currentUser}>
        <Link href="/lobby" className="retro-btn hidden sm:inline-flex gap-1.5 px-3 py-2 text-[11px]">
          <Eye className="h-3.5 w-3.5" /> candidate lobby
        </Link>
        <button
          type="button"
          onClick={() => { setCreateError(null); setIsCreateOpen(true); }}
          className="retro-btn-green gap-1.5 px-3 py-2 text-[11px]"
        >
          <FilePlus2 className="h-3.5 w-3.5" /> new test
        </button>
      </PortalHeader>

      <main className="portal-main">
        <section className="portal-hero">
          <div>
            <p className="portal-eyebrow"><BookOpen className="h-3.5 w-3.5" /> paper registry</p>
            <h1 className="portal-title">exam studio</h1>
            <p className="portal-description">
              create papers, organize questions, and keep an eye on active sessions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setCreateError(null); setIsCreateOpen(true); }}
            className="retro-btn-green hidden sm:inline-flex gap-2 px-4 py-2.5 text-xs"
          >
            <FilePlus2 className="h-4 w-4" /> create an exam
          </button>
        </section>

        <section className="studio-stats" aria-label="exam totals">
          <div className="portal-stat"><div className="portal-stat__label">all papers</div><div className="portal-stat__value">{counts.all}</div></div>
          <div className="portal-stat"><div className="portal-stat__label">live now</div><div className="portal-stat__value studio-stat-live">{counts.live}</div></div>
          <div className="portal-stat"><div className="portal-stat__label">questions</div><div className="portal-stat__value">{counts.questions}</div></div>
          <div className="portal-stat"><div className="portal-stat__label">candidate sessions</div><div className="portal-stat__value">{counts.candidates}</div></div>
        </section>

        <section className="studio-registry portal-surface" aria-labelledby="registry-heading">
          <div className="portal-section-heading studio-registry__heading">
            <div>
              <h2 id="registry-heading">your papers</h2>
              <p>edit a paper or change whether candidates can see it.</p>
            </div>
            <label className="studio-search-wrap">
              <Search className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">search exams</span>
              <input
                className="portal-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="search title, code, or section"
                type="search"
              />
            </label>
          </div>

          <div className="studio-registry__tools">
            <div className="portal-tabs" aria-label="filter exams">
              {(["all", "live", "draft"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                  className="portal-tab"
                >
                  {value} <span className="studio-tab-count">{counts[value]}</span>
                </button>
              ))}
            </div>
            <span className="studio-result-count">
              showing {visibleExams.length} of {exams.length}
            </span>
          </div>

          {actionError && <p className="portal-alert mb-4" role="alert">{actionError}</p>}

          {loading ? (
            <div className="studio-loading" role="status">loading your exam registry…</div>
          ) : loadError ? (
            <div className="portal-empty">
              <div className="portal-empty__icon"><FileText aria-hidden="true" /></div>
              <h2>the registry did not load</h2>
              <p>{loadError}</p>
              <button type="button" className="retro-btn mt-4 px-3 py-2 text-xs" onClick={() => void loadExams()}>
                try again
              </button>
            </div>
          ) : exams.length === 0 ? (
            <div className="portal-empty">
              <div className="portal-empty__icon"><FilePlus2 aria-hidden="true" /></div>
              <h2>no papers yet</h2>
              <p>create a paper, add subject sections, and write its first question.</p>
              <button
                type="button"
                className="retro-btn-green mt-4 gap-2 px-4 py-2 text-xs"
                onClick={() => setIsCreateOpen(true)}
              >
                <FilePlus2 className="h-4 w-4" /> create your first exam
              </button>
            </div>
          ) : visibleExams.length === 0 ? (
            <div className="portal-empty">
              <div className="portal-empty__icon"><Search aria-hidden="true" /></div>
              <h2>no matching papers</h2>
              <p>try a different search or status filter.</p>
              <button type="button" className="retro-btn mt-4 px-3 py-2 text-xs" onClick={() => { setQuery(""); setFilter("all"); }}>
                clear filters
              </button>
            </div>
          ) : (
            <div className="studio-exam-grid">
              {visibleExams.map((exam) => {
                const totalQuestions = questionCount(exam);
                const isBusy = busyExamId === exam.id;
                return (
                  <article className="portal-card studio-exam-card" key={exam.id}>
                    <div className="studio-exam-card__top">
                      <span className={`portal-chip ${exam.isLive ? "portal-chip--live" : ""}`}>
                        <span className="studio-status-dot" aria-hidden="true" />
                        {exam.isLive ? "published" : "draft"}
                      </span>
                      <span className="studio-exam-code" aria-label={`exam code ${exam.accessCode}`}>code: {exam.accessCode}</span>
                      <button
                        type="button"
                        className="studio-icon-button"
                        onClick={() => void toggleExamLive(exam)}
                        disabled={isBusy}
                        aria-label={`${exam.isLive ? "unpublish" : "publish"} ${exam.title}`}
                        aria-pressed={exam.isLive}
                        title={exam.isLive ? "hide from candidates" : "publish after adding questions"}
                      >
                        {isBusy ? <span className="studio-spinner" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    <div className="studio-exam-card__body">
                      <h3>{exam.title}</h3>
                      {exam.description && <p className="studio-exam-description">{exam.description}</p>}
                      <div className="studio-exam-meta">
                        <span><Clock3 aria-hidden="true" /> {Math.floor(exam.durationSeconds / 60)} min</span>
                        <span><FileText aria-hidden="true" /> {totalQuestions} {totalQuestions === 1 ? "question" : "questions"}</span>
                        <span><Users aria-hidden="true" /> {exam._count.sessions} {exam._count.sessions === 1 ? "session" : "sessions"}</span>
                      </div>

                      <div className="studio-section-list" aria-label="subject sections">
                        {exam.sections.length > 0 ? exam.sections.map((section) => (
                          <span className="studio-section-chip" key={section.id}>
                            {section.title}<b>{section.questions.length}</b>
                          </span>
                        )) : <span className="studio-section-empty">no sections yet</span>}
                      </div>
                    </div>

                    <div className="studio-exam-card__footer">
                      <Link href={`/proctor/${exam.id}`} className="retro-btn gap-1.5 px-2.5 py-2 text-[11px]">
                        <Shield className="h-3.5 w-3.5" /> monitor
                      </Link>
                      <div className="studio-exam-card__actions">
                        {exam._count.sessions > 0 && (
                          <span className="studio-delete-note">candidate records keep this paper</span>
                        )}
                        <button
                          type="button"
                          className="studio-icon-button studio-icon-button--delete"
                          onClick={() => void deleteExam(exam)}
                          disabled={isBusy || exam._count.sessions > 0}
                          aria-label={exam._count.sessions > 0
                            ? `cannot delete ${exam.title}; candidate records exist`
                            : `delete ${exam.title}`}
                          title={exam._count.sessions > 0
                            ? "papers with candidate records cannot be deleted"
                            : "delete exam"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <Link href={`/studio/${exam.id}`} className="retro-btn-orange gap-1.5 px-3 py-2 text-[11px]">
                          edit paper <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {isCreateOpen && (
        <div className="studio-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isCreating) setIsCreateOpen(false);
        }}>
          <section
            className="studio-modal portal-surface"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-exam-title"
          >
            <div className="studio-modal__heading">
              <div>
                <p className="portal-eyebrow">paper setup</p>
                <h2 id="create-exam-title">create an exam</h2>
              </div>
              <button type="button" className="studio-icon-button" onClick={() => setIsCreateOpen(false)} aria-label="close" disabled={isCreating}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="studio-create-form">
              <label className="studio-form-field">
                <span>exam title</span>
                <input
                  autoFocus
                  className="retro-field w-full px-3 py-2.5 text-sm"
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  placeholder="e.g. physics midterm"
                  maxLength={120}
                  required
                />
              </label>

              <div className="studio-form-row">
                <label className="studio-form-field">
                  <span>duration</span>
                  <div className="studio-input-suffix">
                    <input
                      className="retro-field w-full px-3 py-2.5 text-sm"
                      type="number"
                      min="5"
                      max="360"
                      value={newDuration}
                      onChange={(event) => setNewDuration(event.target.value)}
                      required
                    />
                    <small>minutes</small>
                  </div>
                </label>
                <p className="studio-create-note">starts as a draft. add questions, then publish it from the exam studio.</p>
              </div>

              {createError && <p className="portal-alert" role="alert">{createError}</p>}

              <div className="studio-modal__footer">
                <button type="button" className="retro-btn px-4 py-2 text-xs" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>
                  cancel
                </button>
                <button type="submit" className="retro-btn-green gap-2 px-4 py-2 text-xs" disabled={isCreating || !newTitle.trim()}>
                  <FilePlus2 className="h-4 w-4" /> {isCreating ? "creating…" : "create exam"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <style jsx>{`
        .studio-stats { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 11px; margin: 4px 0 23px; }
        .studio-stat-live { color: #2e7249; }
        .studio-registry { padding: 18px; }
        .studio-registry__heading { align-items: flex-end; margin-bottom: 17px; }
        .studio-search-wrap { position: relative; display: flex; align-items: center; color: #667f92; }
        .studio-search-wrap > svg { position: absolute; left: 11px; z-index: 1; pointer-events: none; }
        .studio-search-wrap .portal-search { padding-left: 34px; }
        .studio-registry__tools { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
        .studio-tab-count { margin-left: 3px; color: #778b9a; font-family: ui-monospace,SFMono-Regular,Menlo,monospace; font-size: 10px; }
        .studio-result-count { color: #748796; font-size: 11px; }
        .studio-exam-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 13px; }
        .studio-exam-card { overflow: hidden; }
        .studio-exam-card__top { display: flex; align-items: center; gap: 9px; padding: 13px 14px 11px; border-bottom: 1px solid #e0e7ec; }
        .studio-exam-code { overflow: hidden; color: #557084; font-family: ui-monospace,SFMono-Regular,Menlo,monospace; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
        .studio-status-dot { display: inline-block; width: 7px; height: 7px; flex: 0 0 auto; border-radius: 50%; background: #4e9664; box-shadow: 0 0 0 2px rgba(78,150,100,.13); }
        .studio-status-dot--muted { background: #8a9ba8; box-shadow: 0 0 0 2px rgba(138,155,168,.13); }
        .studio-icon-button { display: inline-grid; width: 32px; height: 32px; flex: 0 0 auto; place-items: center; margin-left: auto; color: #45647a; border: 1px solid #bccbd5; border-bottom: 2px solid #9aafbd; border-radius: 4px; background: linear-gradient(180deg,#fff,#edf2f5); cursor: pointer; }
        .studio-icon-button:hover:not(:disabled) { color: #1d536f; border-color: #8fa9b9; background: #f8fbfc; }
        .studio-icon-button:disabled { cursor: wait; opacity: .55; }
        .studio-icon-button--delete { margin-left: 0; color: #8c4841; }
        .studio-icon-button--delete:hover:not(:disabled) { color: #9c332d; border-color: #d2aaa6; background: #fbefee; }
        .studio-exam-card__body { flex: 1 1 auto; padding: 15px 14px 13px; }
        .studio-exam-card__body h3 { display: -webkit-box; overflow: hidden; color: #1a354a; font-size: 16px; font-weight: 850; letter-spacing: -.025em; line-height: 1.25; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
        .studio-exam-description { display: -webkit-box; overflow: hidden; margin-top: 6px; color: #64798a; font-size: 11px; line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
        .studio-exam-meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; color: #5d7487; font-size: 10px; font-weight: 650; }
        .studio-exam-meta span { display: inline-flex; align-items: center; gap: 4px; }
        .studio-exam-meta svg { width: 13px; height: 13px; color: #7890a1; }
        .studio-section-list { display: flex; min-height: 27px; flex-wrap: wrap; gap: 5px; margin-top: 13px; }
        .studio-section-chip { display: inline-flex; align-items: center; gap: 6px; max-width: 100%; padding: 4px 6px; color: #4e687b; border: 1px solid #d1dce3; border-radius: 3px; background: #f1f5f7; font-size: 10px; }
        .studio-section-chip b { color: #31546d; font-family: ui-monospace,SFMono-Regular,Menlo,monospace; font-size: 9px; }
        .studio-section-empty { color: #7a8c99; font-size: 10px; font-style: italic; }
        .studio-exam-card__footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 14px; border-top: 1px solid #e0e7ec; background: #f7f9fa; }
        .studio-exam-card__actions { display: flex; align-items: center; gap: 7px; }
        .studio-delete-note { color: #788894; font-size: 9px; line-height: 1.25; text-align: right; }
        .studio-loading { padding: 52px 12px; color: #607689; text-align: center; font-size: 13px; }
        .studio-spinner { width: 13px; height: 13px; border: 2px solid #9db0bc; border-top-color: #315f7b; border-radius: 50%; animation: studio-spin .8s linear infinite; }
        @keyframes studio-spin { to { transform: rotate(360deg); } }
        .studio-modal-backdrop { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; overflow-y: auto; padding: 20px; background: rgba(12,29,43,.58); backdrop-filter: blur(2px); }
        .studio-modal { width: min(100%, 520px); max-height: calc(100vh - 40px); overflow-y: auto; padding: 22px; box-shadow: 0 18px 48px rgba(7,22,34,.3),inset 0 1px 0 #fff; }
        .studio-modal__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 15px; padding-bottom: 16px; border-bottom: 1px solid #d7e0e6; }
        .studio-modal__heading h2 { margin-top: 5px; color: #19354a; font-size: 21px; font-weight: 850; letter-spacing: -.04em; }
        .studio-create-form { display: grid; gap: 17px; padding-top: 18px; }
        .studio-form-field { display: grid; gap: 7px; color: #415d72; font-size: 11px; font-weight: 800; }
        .studio-form-field small { color: #7c8d99; font-size: 10px; font-weight: 600; }
        .studio-form-row { display: grid; grid-template-columns: .75fr 1fr; gap: 12px; }
        .studio-create-note { align-self: center; color: #718595; font-size: 11px; line-height: 1.5; }
        .studio-input-suffix { position: relative; }
        .studio-input-suffix input { padding-right: 61px; }
        .studio-input-suffix small { position: absolute; top: 50%; right: 10px; transform: translateY(-50%); pointer-events: none; }
        .studio-status-select { display: grid; gap: 8px; padding: 0; border: 0; }
        .studio-status-select legend { margin-bottom: 8px; color: #415d72; font-size: 11px; font-weight: 800; }
        .studio-status-option { display: flex; align-items: center; gap: 10px; width: 100%; padding: 11px 12px; color: #405b70; border: 1px solid #c3d0d9; border-radius: 5px; background: #f8fafb; text-align: left; cursor: pointer; }
        .studio-status-option:hover { background: #fff; }
        .studio-status-option.is-selected { border-color: #7da78a; background: #edf5ef; box-shadow: inset 0 0 0 1px rgba(46,114,73,.12); }
        .studio-status-option span:last-child { display: grid; gap: 3px; }
        .studio-status-option b { font-size: 11px; }
        .studio-status-option small { color: #708494; font-size: 10px; }
        .studio-modal__footer { display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px; }
        @media(max-width: 900px) { .studio-exam-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } }
        @media(max-width: 640px) { .studio-stats { grid-template-columns: repeat(2,minmax(0,1fr)); } .studio-registry { padding: 13px; } .studio-registry__heading { align-items: stretch; flex-direction: column; } .studio-search-wrap,.studio-search-wrap .portal-search { width: 100%; } .studio-exam-grid { grid-template-columns: 1fr; } .studio-registry__tools { align-items: flex-start; flex-direction: column; } .studio-result-count { display: none; } .studio-form-row { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
