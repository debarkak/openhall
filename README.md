<h1 align="center">openhall</h1>
<p align="center">self-hosted webserver for creating and conducting exams.</p>

> [!WARNING]
> **disclaimer:** this project was built heavily with ai to save time. i needed this application as soon as possible for conducting exams and didn't want to spend months building everything from scratch when i just need it to work reliably. it's built to do what i need it to do, not to be overly polished, but public contributions, bug fixes, and PRs are very welcome! feel free to open an issue or PR :)

---

## features

| feature | category | status |
|---|---|---|
| candidate lobby & exam series picker | student ui | ✅ working |
| pre-flight integrity gate & instructions modal | anticheat | ✅ working |
| responsive exam player (portrait & landscape widescreen split) | student ui | ✅ working |
| dynamic svg circular pie progress gauge & clock countdown | timer | ✅ working |
| server-authoritative timer deadline & clock drift protection | engine | ✅ working |
| native latex math equations with katex formula rendering | math / stem | ✅ working |
| multimodal diagrams (pie charts, venn diagrams, schematics) | math / stem | ✅ working |
| 5-column question palette matrix with 4 visual states | navigation | ✅ working |
| deselect, skip, and save & next action controls | controls | ✅ working |
| interstitial guardrail modal (`✕ SAVE ATTEMPT`) on direct palette jumps | ux safety | ✅ working |
| zero-trust question delivery (answer keys sanitized from client bundles) | security | ✅ working |
| client-side browser lockdown (fullscreen, focus/blur, devtools trap) | anticheat | ✅ working |
| optimistic indexeddb answer caching & offline sync heartbeat | resilience | ✅ working |
| auto-submission trigger at `00:00:00` with radial loading spinner | engine | ✅ working |
| instant scorecard with 7-metric psychometric evaluation table | analytics | ✅ working |
| teacher exam studio with visual katex formula shortcut bar | admin cms | ✅ working |
| live proctoring cockpit with real-time candidate telemetry stream | proctoring | ✅ working |
| multi-arch docker support (linux x86_64, arm64, windows, macos) | deployment | ✅ working |

| symbol | meaning |
|---|---|
| ✅ | implemented and working |
| ⚪ | planned / wip |

---

## architecture & stack

OpenHall is engineered as a lightweight, single-stack, cross-platform application with zero brittle native C++ compilation addons:

- **frontend & api:** Next.js (App Router) + TypeScript + Tailwind CSS
- **math engine:** KaTeX (fast LaTeX formulas and radical expressions)
- **data layer:** Prisma ORM with SQLite (default zero-config file on disk) and PostgreSQL (for scaled multi-tenant clusters)
- **client storage:** IndexedDB local caching for zero-data-loss during network drops
- **runtime:** Node.js 18+ (tested on Linux x86_64, Linux ARM64, Windows 10/11, macOS)

---

## quickstart

### requirements
- Node.js 18+ (Node 20 or 22 LTS recommended)
- npm or pnpm

### run locally

```bash
# 1. clone repository
git clone https://github.com/debarkak/openhall.git
cd openhall

# 2. install dependencies
npm install

# 3. generate database and seed baseline 45-question mock exam
npx prisma db push
npm run seed

# 4. launch development server
npm run dev
```

open `http://localhost:3000` in your browser.

- **Candidate Portal:** `http://localhost:3000/lobby`
- **Host / Teacher Studio:** `http://localhost:3000/studio`
- **Live Proctor Monitor:** `http://localhost:3000/proctor`

---

## deployment (docker)

OpenHall includes multi-architecture Docker support for standard x86 servers, Apple Silicon, Raspberry Pi 4/5, and AWS Graviton:

```bash
docker compose up -d
```

---

## license

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
