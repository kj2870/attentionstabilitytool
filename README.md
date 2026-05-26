# Drishti

A browser-based daily attention-training app built around *trataka* — the yogic practice of sustained visual fixation on a flame. Each session guides you through a structured sequence (posture → body scan → breathing → gaze → integration) while the webcam quietly measures eye-behaviour signals that describe how stable your visual engagement is over time.

**Live app:** deployed on Vercel from the `main` branch of this repo.

---

## What it does

1. **Structured session** (~18 min) — timed phases with voice/sound cues:
   - *Settle* — posture and breath awareness
   - *Body scan* — progressive muscle tension + release (feet → face)
   - *Breathing* — 10 slow paced breaths
   - *Gaze rounds* — stare at a candle flame; eyes-closed recovery after each round
   - *Integrate* — open-awareness period

2. **Passive eye tracking** — MediaPipe FaceMesh runs in-browser during gaze phases, extracting:
   - Eye openness (EAR — Eye Aspect Ratio)
   - Blink events and rate
   - Iris position relative to the fixation target
   - Closure burden (% time spent near-closed)
   - Longest unbroken held-gaze streak (seconds)

3. **Session history** — every completed session is saved locally and synced to Supabase. The History page shows a mandala-style ring where each segment = one session.

4. **Progressive tracking** — streak counter, 48-day mandala progress, milestone badges.

5. **PWA** — installable on iOS/Android as a home screen app; bottom tab navigation on mobile.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Inline styles (no CSS framework) |
| Fonts | Playfair Display (headers), DM Sans (body) |
| Eye tracking | MediaPipe FaceMesh (WASM, runs entirely in-browser) |
| Auth | Supabase Auth — Google OAuth |
| Database | Supabase (Postgres) — `public.sessions` table |
| Local cache | `localStorage` — zero-latency reads, synced to Supabase on save |
| Routing | React Router v6 |
| Deployment | Vercel — SPA rewrites via `vercel.json` |
| PWA | `vite-plugin-pwa` — service worker + manifest |

---

## Project structure

```
src/
├── pages/
│   ├── HomePage.tsx          # Landing: diya, weekly dots, streak, Begin button
│   ├── SessionPage.tsx       # Core: all session phases, eye tracking, summary screen
│   ├── HistoryPage.tsx       # Mandala ring + session detail drawer
│   ├── OnboardingPage.tsx    # First-run: username entry
│   ├── LoginPage.tsx         # Google OAuth sign-in
│   ├── AboutPage.tsx         # Mobile hub linking to Philosophy / Science / Privacy
│   ├── PhilosophyPage.tsx    # Long-form: why focus, the practice
│   ├── SciencePage.tsx       # Research summaries on trataka and attention
│   └── PrivacyPage.tsx       # Data handling policy
│
├── components/
│   ├── Layout.tsx            # Shell: sticky top nav (desktop) + BottomTabBar (mobile)
│   ├── BottomTabBar.tsx      # Mobile-only: Home / History / About tabs
│   ├── MeditationBackground.tsx  # Warm dark gradient + vignette wrapper
│   ├── BodyGuideOverlay.tsx  # SVG body figure with amber-glow active region
│   ├── BreathGuide.tsx       # Pulsing orb synced to inhale/exhale timing
│   ├── SettleHalo.tsx        # Soft ambient ring for settle + integrate phases
│   ├── Diya.tsx              # Animated SVG diya for the home screen
│   └── InstallPrompt.tsx     # PWA "Add to Home Screen" banner
│
└── lib/
    ├── sessionScript.ts      # Defines all phases, timings, body regions, breath cues
    ├── trackingEngine.ts     # Frame-by-frame eye metric aggregation + scoring
    ├── faceDetection.ts      # MediaPipe FaceMesh initialisation + face snapshot
    ├── faceLandmarks.ts      # EAR, iris position, blink detection from landmarks
    ├── storage.ts            # localStorage read/write + Supabase save/load
    ├── useHistory.ts         # React hook: merges local cache + remote history
    ├── auth.ts               # Supabase session sync → local profile
    ├── supabase.ts           # Supabase client (reads VITE_SUPABASE_* env vars)
    └── presentationMode.ts   # RESEARCH_MODE flag — alternate UI for lab use
```

---

## Session phases (what `sessionScript.ts` generates)

| Phase | Duration | What happens |
|---|---|---|
| Settle ×3 | 30 s | Text instructions; SettleHalo ambient glow |
| Body scan ×8 | 80 s | SVG figure highlights each region; clench 5 s → release 5 s |
| Breathing ×10 | ~80 s | Breath orb expands on inhale, contracts on exhale |
| Gaze ×4 | ~4 min | Diya video; MediaPipe tracks eyes; longest streak recorded |
| Eyes closed ×4 | ~2 min | Recovery after each gaze round |
| Integrate | 60 s | Open awareness; SettleHalo |

Total: ~18 minutes.

---

## Eye tracking pipeline

```
Webcam frame
   ↓
faceDetection.ts  — MediaPipe FaceMesh → 468 face landmarks
   ↓
faceLandmarks.ts  — EAR (eye aspect ratio), iris x/y, blink detection
   ↓
trackingEngine.ts — rolling windows → blink rate, closure burden,
                    held-gaze streak, signal quality score
   ↓
SessionPage.tsx   — attentionScore (0–100), longestGazeSec, totalStillnessSec
   ↓
storage.ts        — saved to localStorage + Supabase on Finish
```

**Key metrics stored per session:**

| Field | Description |
|---|---|
| `attentionScore` | 0–100 composite from blink rate, closure burden, openness stability |
| `longestGazeSec` | Longest single unbroken held-gaze streak |
| `totalStillnessSec` | Sum of all held-gaze seconds across gaze rounds |
| `blinkCount` | Total blinks detected |
| `closure_burden` | Avg % of gaze-phase time spent with eyes near-closed |
| `signal_coverage` | Avg % of frames where face/eye signal was valid |
| `blink_rate_avg` | Mean blinks per minute |
| `attention_score_avg` | Mean attention score across the session |

---

## Database schema

The Supabase table `public.sessions` mirrors `SessionRecord` in `storage.ts`. Run the SQL files in order to set up or migrate:

1. **`supabase-schema.sql`** — initial schema (run once on a fresh project)
2. **`supabase-migration-v2.sql`** — renames `avg_drift → closure_burden`, `avg_recovery → signal_coverage`; adds `attention_score_avg`, `blink_rate_avg`, `signal_quality_end`

Row-level security is enabled — users can only read/write their own rows (matched by `auth.uid()`).

---

## Local development

### Prerequisites

- Node 20+
- A Supabase project (free tier works)
- Google OAuth configured in Supabase Auth → Providers

### Setup

```bash
git clone https://github.com/kj2870/attentionstabilitytool.git
cd attentionstabilitytool
npm install
```

Create `.env` in the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

```bash
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run preview    # preview the production build locally
npm run lint       # TypeScript + ESLint checks
```

### Database setup

1. Open your Supabase project → SQL Editor
2. Run `supabase-schema.sql`
3. If upgrading an existing schema, also run `supabase-migration-v2.sql`

---

## Deployment (Vercel)

The app deploys automatically from `main`. `vercel.json` rewrites all routes to `/index.html` so React Router handles client-side navigation correctly.

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the Vercel project's Environment Variables.

---

## Research mode

Setting `RESEARCH_MODE = true` in `src/lib/presentationMode.ts` switches the app to a stripped-down presentation view suitable for lab use:

- Home page shows "Visual Attention Prototype" with a plain Start Session button
- Session page shows only the core tracking UI (no diya, no decorative elements)
- All personal/streak/history elements are hidden

---

## Knowledge graph

The project uses [graphify](https://github.com/safishamsi/graphify) to maintain a codebase knowledge graph in `graphify-out/`. After changing code, refresh it with:

```bash
python -m graphify update .
```

The `graphify-out/GRAPH_REPORT.md` lists god nodes (most connected abstractions), community structure, and surprising cross-file relationships. AI coding assistants should read this before navigating the codebase.

---

## Key design decisions

- **No CSS framework** — all styling is inline React styles. Keeps the bundle minimal and makes visual changes easy to trace.
- **Local-first storage** — `localStorage` is the primary store; Supabase is a background sync. The app works offline after first load.
- **MediaPipe in WASM** — no server round-trips for eye tracking. All video processing stays on-device; no frames are ever uploaded.
- **Single session script** — `sessionScript.ts` is the single source of truth for all phase timings and sequences. Changing the protocol means editing one file.
- **Warm dark palette** — `#0e0e10` background, amber `#ffb347` accent, Playfair Display for contemplative feel. The diya video uses `mix-blend-mode: screen` to blend into the background.

---

## Research context

Drishti is also a research prototype for studying whether webcam-derived eye-behaviour signals can track attentional changes over repeated sessions. See:

- [`algorithm-overview.md`](./algorithm-overview.md) — signal extraction pipeline
- [`protocol-and-questions.md`](./protocol-and-questions.md) — protocol rationale and open questions
- [`system-diagrams.md`](./system-diagrams.md) — architecture diagrams
