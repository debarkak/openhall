# OpenHall AI Research & Implementation Prompt

Copy and paste the prompt below into your AI coding assistant (or run with `/goal` or `/plan`) to conduct deep, exhaustive research before building:

```markdown
You are an elite Principal Software Architect and EdTech Systems Specialist. Your mission is to perform deep, exhaustive research and design a bulletproof blueprint for "OpenHall" — a modern, self-hosted web server and online examination platform.

CRITICAL DIRECTIVE: DO NOT WRITE ANY APPLICATION CODE YET. This phase is dedicated 100% to deep research, document analysis, architectural design, anticheat modeling, and UX precision planning.

---

### Phase 1: Deep Analysis of Existing Artifacts & Visual Proof
1. Inspect all files and documentation located in the `samples/` directory:
   - Read and thoroughly analyze `samples/REVERSE_ENGINEERING_SPEC.md`.
   - Inspect the 37 extracted high-resolution screenshots in `samples/screencasts/` (covering lobby, pre-exam integrity agreement, portrait & landscape exam players, LaTeX math formulas, pie charts, Venn diagrams, question palette states, Deselect/Skip/Save & Next controls, the "SAVE ATTEMPT" warning modal, timer expiry countdown, loading spinner, and the final results scorecard).
2. Document every visual nuance from the screenshots:
   - Exact hex colors (Cyan `#9cd2df` / `#0891b2`, Green `#7ab73a` / `#e2f3d4`, Orange `#e04d01`, Background `#f8fafc`).
   - Component typography, padding, borders, and state indicators.
   - The SVG circular pie progress gauge that depletes/fills dynamically with the digital countdown `HH:MM:SS`.
   - The 5-column question palette matrix with 4 visual states (Unvisited, Visited Unanswered, Active Border, Attempted Green).
   - Responsive breakpoints (Portrait single-column layout vs. Landscape 2-column widescreen split).

---

### Phase 2: Online Examination Structure & Assessment Science Research
1. Research how standard high-stakes computer-based testing engines (NTA, JEE, SAT, EdTech exam platforms) manage:
   - Multi-section paper hierarchy (Section order, section hopping, optional vs. mandatory questions).
   - Marking weight configurations (Positive marks e.g. +4.0, negative penalty e.g. -1.0 or 0.0, partial scoring).
   - Time allocation paradigms: Global exam timer vs. section-locked timers.
   - Question serialization & delivery: Sanitizing correct answer keys from client bundles to prevent DOM inspection cheating.

---

### Phase 3: Teacher / Examiner Authoring Experience (Admin CMS)
Research and design a frictionless, intuitive UI/UX for teachers and administrators to compose examinations without technical barriers:
1. Question Composer UI:
   - Mark weight selector (Positive marks, negative penalty, question tag/difficulty).
   - Rich Text & Formatting: Bold, italics, sub/superscript, bulleted lists.
   - Native LaTeX / Markdown Equation Editor: Visual formula bar (fractions, square roots, integrals, matrices) with instant real-time KaTeX preview.
   - Diagram & Asset Uploader: Drag-and-drop support for geometric figures, circuit schematics, charts, and diagrams with automatic client-side resizing and optimization.
   - Multiple Choice Option Manager: Add 2–6 choices, rich-text/LaTeX support inside option cards, and a single-click radio button to set the authoritative answer key.
   - Explanation / Solution Editor: Rich-text explanations rendered to students during post-exam review.
2. Section & Exam Orchestrator:
   - Drag-and-drop question and section reordering.
   - Access code generation, test scheduling, and candidate roster invites.

---

### Phase 4: Anti-Cheat, Proctoring & Exam Integrity Research
Perform comprehensive research into web-based exam integrity and cheating countermeasures:
1. Client-Side Browser Lockdown:
   - Fullscreen enforcement (`requestFullscreen()`, trapping `fullscreenchange`).
   - Focus & Visibility tracking (`visibilitychange`, `window.onblur`, `window.onfocus`) to detect application switching (Alt+Tab, Windows key, notification taps).
   - Keyboard interception: Trapping `ESC`, `F11`, `F12` (DevTools), `Ctrl+C`, `Ctrl+V`, `Ctrl+Shift+I`, and browser back/forward keys.
   - Disabling context menus (right-click) and text selection within the question viewport.
   - Multiple display / screen sharing detection via `window.screen` and Screen Capture API heuristics.
2. Server-Authoritative Integrity:
   - Authoritative server timer: The server determines the exact expiration timestamp (`deadline = startedAt + durationSeconds`); client countdown is purely a visual proxy.
   - Answer persistence heartbeat: Continuous background debounced syncing of attempts to prevent data loss on network drops.
   - Telemetry audit log: Recording every suspicious event (e.g. `TAB_SWITCH`, `FULLSCREEN_EXIT`) with exact timestamps in the host's live monitor.

---

### Phase 5: Student UI Fidelity & Exact Screenshot Parity
Detail the implementation strategy to ensure the student examination player is an exact pixel-accurate clone of the recorded exam interface in `samples/screencasts/`:
1. The exact layout, buttons, and font weight seen in `samples/screencasts/03_exam_start_mat_q1.png` and `31_landscape_mode_mat_q19.png`.
2. Action Controls:
   - `[ Deselect ]`: Resets the active radio selection without jumping.
   - `[ Skip ]`: Advances without answering.
   - `[ Save & Next ]`: Commits answer, updates palette badge to green, and moves to next question.
3. The Interstitial Guardrail Modal (`samples/screencasts/30_save_attempt_warning_modal.png`):
   - When jumping via the question palette while an uncommitted option is selected, display:
     *"SAVE ATTEMPT - Save this question's attempt? Use [Save and Next] at the bottom to avoid this popup from appearing again."* with `[ No ]` and `[ Yes ]` actions.
4. Auto-Submission at `00:00:00`:
   - Freezes all buttons, displays the orange radial spinner loader (`samples/screencasts/26_submission_loader_spinner.png`), and redirects to the scorecard.
5. Scorecard Table (`samples/screencasts/36_exam_results_scorecard.png`):
   - Display: Total Questions, Maximum Marks, Questions Attempted, Correct Responses, Incorrect Responses, Unattempted Questions, and Final Score.

---

### Phase 6: Cross-Platform & Self-Hosted System Architecture
1. Deployment & Cross-Compatibility:
   - Must run effortlessly across Linux (Ubuntu, Debian, Alpine, RHEL) and Windows (Server, 10, 11).
   - Must support both x86_64 (Intel/AMD) and arm64 (Apple Silicon, Raspberry Pi, AWS Graviton) without native compilation bottlenecks or fragile platform-specific C++ addons.
   - Self-contained server architecture: Lightweight single-stack solution (e.g. Next.js standalone server with SQLite/PostgreSQL, or Go backend + embedded React frontend, or Node.js).
2. Repository Directory Organization:
   - All documentation, research reports, and specifications MUST reside strictly inside `samples/`.
   - The application source code will be authored cleanly in the repository root (`./`).

---

### Deliverable:
Produce a comprehensive, master-grade Research & Architecture Synthesis Report inside `samples/RESEARCH_REPORT.md` that synthesizes all the above findings into an actionable, step-by-step engineering roadmap before any code is written.
```
