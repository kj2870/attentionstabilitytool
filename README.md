# Drishti

A laptop-first, browser-based daily attention practice built around *trataka* — the yogic technique of sustained visual fixation on a flame. Each sit is an 11-minute guided arc (body → breath → gaze → open awareness) while the webcam quietly measures how steadily the eyes hold a single point of light.

Nothing is uploaded from the camera. All vision processing runs on-device via MediaPipe.

> *drishti* (Sanskrit): *the gaze, the way of seeing.*

---

## What it does

**A single 11-minute session, once a day.** Six phases guided by animation, ambient audio, and short text cues. The camera measures gaze steadiness during the flame-gazing rounds; the summary shows what you did and one line from the traditions the practice comes from.

**Signup → Foundations gate → daily sit → summary.** First-time users read a short primer explaining *why* attention is trainable before their first session. Returning users go straight to Home.

**Auto-saves.** Every completed sit is written to `localStorage` immediately and synced to Supabase in the background. Notes, feelings, and gaze metrics all travel together.

---

## Session structure

Defined in [`src/lib/sessionScript.ts`](src/lib/sessionScript.ts). Total: **660 seconds = 11:00**.

| # | Phase | Duration | Structure |
|---|---|---|---|
| 1 | Settle | 30s | 2 × 15s posture / breath instructions |
| 2 | Body release | 96s | 8 regions (feet → face). Each region: 8s tense + 4s release. |
| 3 | Breath | 120s | 10 paced cycles. Each cycle: 4s inhale + 8s exhale. |
| 4 | Flame gaze | 300s | 5 rounds × 60s of steady candle gazing. |
| 5 | Eyes closed | 48s | 12s afterimage hold after gaze rounds 1–4 (round 5 flows directly into open awareness). |
| 6 | Open awareness | 66s | Silent, eyes closed. |

**Total by category:** 30 + 96 + 120 + 300 + 48 + 66 = 660s.

Ends with a gong. There is a ~2.5s "afterglow" window between session end and the summary card so the gong rings against the dissolving visual, not against a bright text card.

---

## Eye tracking

All processing happens on-device in-browser via [MediaPipe Tasks Vision](https://developers.google.com/mediapipe/solutions/vision/face_landmarker). Video frames never leave the machine.

**Signal pipeline** ([`src/lib/faceDetection.ts`](src/lib/faceDetection.ts) → [`src/lib/faceLandmarks.ts`](src/lib/faceLandmarks.ts) → `SessionPage.tsx`):

```
Webcam frame
   ↓ 30 fps
FaceLandmarker  → 468 landmarks + iris centers + head pose (yaw/pitch/roll)
   ↓
EAR (eye aspect ratio) + iris x/y + head-rotation delta from baseline
   ↓
1 Hz held-gaze tick — evaluates per second:
   • face present (< 1.5 s since last valid frame)
   • eyes open  (EAR > 0.18)
   • no blink this second
   • signal quality good/fair (not poor)
   • iris within ± 0.08 of baseline
   • head within ± 8.6° of baseline (yaw/pitch/roll)
   ↓ if all true
count as one "held gaze" second → grows current streak
```

Baseline (iris + head) is captured while the camera is active but the session hasn't started yet, so the user isn't asked to hold still on cue.

**What's persisted per sit** (schema in [`supabase-schema-v4.sql`](supabase-schema-v4.sql)):

| Column | Meaning |
|---|---|
| `date` | ISO timestamp (client) |
| `duration_min` | Actual elapsed minutes (partial on "end early") |
| `longest_gaze_sec` | Longest unbroken held-gaze streak this sit |
| `total_stillness_sec` | Sum of held-gaze seconds across all gaze rounds |
| `blink_rate_during_gaze` | Blinks per minute averaged over the gaze phases |
| `blink_count` | Total blinks detected |
| `avg_drift`, `avg_recovery` | Legacy signal-quality composites |
| `gaze_stability_samples` | Per-second 0/1 array across gaze rounds (used to draw the within-sit steadiness arc on the Record page) |
| `feeling` | `Calm` / `Neutral` / `Restless` / `null` |
| `note` | Optional free-form feedback |
| `new_milestones` | Milestone IDs unlocked this sit |

A companion `profiles` table holds `{id, username, created_at}` and is auto-populated by a trigger on `auth.users` insert so usernames are visible next to session rows in the dashboard.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript + Vite 7 |
| Routing | React Router v7 |
| Styling | Inline styles + a small [`index.css`](src/index.css) for keyframes / CSS variables. No CSS framework. |
| Wordmark font | **Samarkan** (self-hosted, `.ttf` in [`src/assets/fonts/`](src/assets/fonts/)) |
| Session voice | **Mukta** Light / ExtraLight — OFL, self-hosted |
| Editorial serif | **Playfair Display** — Google Fonts |
| Body sans (fallback) | **DM Sans** — Google Fonts |
| Vision | MediaPipe Tasks Vision WASM (in-browser) |
| Auth | Supabase Auth — Google OAuth only |
| Database | Supabase Postgres — `public.sessions` + `public.profiles` |
| Local cache | `localStorage` — the primary store; Supabase is background sync |
| Audio | HTML `<audio>` for beds/gong + Web Audio synthesized transition tones |
| PWA | `vite-plugin-pwa` — service worker + manifest, precaches ambient audio + diya video |
| Deployment | Vercel — SPA rewrites + security headers via [`vercel.json`](vercel.json) |
| Error tracking | Optional Sentry (dormant unless `VITE_SENTRY_DSN` is set in production) |
| Testing | Vitest — unit tests for script invariants and streak logic |
| CI | GitHub Actions — typecheck + lint + tests on push / PR |

---

## Project structure

```
src/
├── pages/
│   ├── OnboardingPage.tsx    # Landing (unauth): diya + wordmark + tagline + Google sign-in
│   ├── LoginPage.tsx         # Returning-user sign-in variant
│   ├── FoundationsPage.tsx   # One-time gate: primer on why attention is trainable
│   ├── HomePage.tsx          # Authed home: diya + tagline pair + weekly card + Begin
│   ├── SessionPage.tsx       # The 11-min sit: state machine, tracking, audio, summary
│   ├── HistoryPage.tsx       # "Record" — mandala + trend lines + steadiness arc
│   ├── InstructionsPage.tsx  # Six-phase overview with durations
│   ├── PhilosophyPage.tsx    # The practice, without jargon
│   ├── SciencePage.tsx       # Research summaries on trataka + attention
│   ├── PrivacyPage.tsx       # Honest data policy + sign out
│   └── AboutPage.tsx         # (Mobile only, older layout)
│
├── components/
│   ├── Layout.tsx            # Top nav shell (Home / Instructions / Philosophy / Science + Record / Privacy)
│   ├── BottomTabBar.tsx      # Mobile-only tab bar
│   ├── MeditationBackground.tsx  # Warm dark gradient + vignette + floor glow
│   ├── Diya.tsx / Flame.tsx  # SVG diya for landing / home
│   ├── BodyGuideOverlay.tsx  # SVG body figure with amber-glow active region
│   ├── BreathGuide.tsx       # Pulsing orb, scale-driven by phase timing
│   ├── SettleHalo.tsx        # Ambient concentric halos for settle + integrate
│   ├── BrushstrokeEyes.tsx   # Closed-eye brushstrokes for eyes-closed holds
│   ├── ErrorBoundary.tsx     # Root-level render-error recovery screen
│   ├── UpdateBanner.tsx      # "A new version is ready — refresh" via useRegisterSW
│   ├── InstallPrompt.tsx     # PWA install banner
│   └── PublicPageNav.tsx     # Back-to-landing link on public content pages
│
└── lib/
    ├── sessionScript.ts      # Single source of truth: all phases, timings, cues
    ├── sessionAudio.ts       # Bell/tones/beds — intro music, fire crackle, transitions
    ├── sessionSettings.ts    # Sound / camera preview toggles
    ├── faceDetection.ts      # MediaPipe FaceDetector init + snapshot
    ├── faceLandmarks.ts      # 468-landmark → EAR + iris + head pose
    ├── trackingEngine.ts     # (Type shims — most tracking now lives in SessionPage)
    ├── storage.ts            # localStorage + Supabase sessions + profile cache
    ├── quotes.ts             # 48 daily quotes (Yoga Sutras, Gita, Upanishads, Zen, Vedanta)
    ├── milestones.ts         # 48-day mandala + streak milestones
    ├── auth.ts               # Supabase session sync → local profile
    ├── supabase.ts           # Supabase client
    └── presentationMode.ts   # RESEARCH_MODE — dev-only override for lab use

Tests:  src/lib/sessionScript.test.ts   (11-min invariant, phase counts)
        src/lib/storage.test.ts         (streak arithmetic edge cases)
```

Also worth knowing:

- **[`supabase-schema-v4.sql`](supabase-schema-v4.sql)** is the current canonical schema. Older `supabase-schema.sql` / `supabase-migration-v2.sql` / `-v3.sql` are kept for historical reference but should not be used on a fresh install.
- **[`src/assets/sounds/`](src/assets/sounds/)** — `bell.mp3` (gong), `intro-ambient.mp3` (pre-gaze bed, ~4 MB), `fire-ambience.mp3` (gaze-phase crackle, ~7 MB). All three are precached by the service worker.
- **[`src/assets/fonts/`](src/assets/fonts/)** — Samarkan (display wordmark, shareware — Titivillus Foundry) + Mukta Light / ExtraLight / Regular (OFL — Ek Type).

---

## Local development

**Prerequisites:** Node 20+, a Supabase project (free tier), a Google Cloud OAuth client configured on the Supabase side.

```bash
git clone https://github.com/kj2870/attentionstabilitytool.git
cd attentionstabilitytool
npm install
```

Create `.env` from [`.env.example`](.env.example):

```
VITE_APP_MODE=consumer
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
# Optional (production only):
# VITE_SENTRY_DSN=https://…@sentry.io/…
```

```bash
npm run dev       # http://localhost:5173
npm run build     # production build → dist/
npm run preview   # serve the built app locally
npm run lint      # ESLint + typescript-eslint
npm run test      # Vitest — unit tests
```

Typecheck runs as part of `npm run build` (via `tsc -b`), and separately in CI.

### Database setup (fresh install)

1. Supabase dashboard → SQL Editor → New query
2. Paste [`supabase-schema-v4.sql`](supabase-schema-v4.sql) and run
3. Verify:

   ```sql
   select column_name, data_type
   from information_schema.columns
   where table_schema = 'public' and table_name = 'sessions'
   order by ordinal_position;
   ```

That creates the `sessions` table + `profiles` table + RLS policies + a signup trigger that auto-creates a profile row. Users can only see their own rows via RLS; the developer has full visibility through the Supabase dashboard (service role bypasses RLS).

### Auth setup

- Supabase Auth → Providers → **enable Google**
- Add your local + production URLs to Supabase Auth → URL Configuration → Redirect URLs
- In Google Cloud Console, add the same URLs to the OAuth client's *Authorized redirect URIs* and *Authorized JavaScript origins*

---

## Deployment (Vercel)

Deploys from `main` automatically. [`vercel.json`](vercel.json) handles:

- SPA rewrites so client-side routes work on refresh
- Security headers: CSP, X-Frame-Options: DENY, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy limiting camera to `self` and disabling mic/geolocation/FLoC

**Vercel env vars to set:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_MODE=consumer` (and optionally `VITE_SENTRY_DSN`).

---

## Design system

### Typography

- **Samarkan** — the "drishti" wordmark only. Devanagari-styled Latin display face; not used for body text.
- **Mukta Light / ExtraLight** — the entire session voice (phase labels, cue words, settle instructions, paused overlay). All in-session text is one family, one weight.
- **Playfair Display** — editorial serif for hero numbers on the summary and the daily quote (italic). Never for body copy.
- **DM Sans** — global body fallback where a plain sans is needed.

### Color

Warm dark. `#0e0e10` background, warm amber `#ffb347` accent for active state and CTAs. All decorative gradients are terracotta / amber / cream — no cool blue or purple. Text is off-white (`#F5E9DA`) with muted opacity variants for hierarchy.

### Motion

- **Route fade:** 900 ms (matches in-session cross-fade default).
- **In-session cross-fades:** typically 900–2400 ms (deliberately slow).
- **Diya bloom-in / backdrop pre-darken:** 2400 ms — synchronized so the flame arrives *into* darkness, not after it.
- **Bed crossfade:** symmetric 2000 ms in both directions (intro ↔ fire).
- **Text swap:** 300 ms half-fade for inhale/exhale (fast enough to be legible on a 4 s inhale), 700 ms for the body cue.
- `prefers-reduced-motion: reduce` collapses everything to instant cuts.

### Layout scale

- Landing / Home: single viewport (`height: 100dvh; overflow: hidden`) — never scrolls.
- Session: fixed-height text slot at top, visual centered in remaining space, progress bar at the bottom. Text lives in the same place in every phase.
- Summary: two-column split — stats/action on the left, daily quote on the right, hairline gradient rule between. Stacks vertically below 760 px.

---

## Features (things worth knowing exist)

**Session experience**
- Six-phase 11-min guided arc with audio + visuals
- Pause / resume mid-sit (state held; audio holds; timer freezes)
- End early — saves partial elapsed time honestly
- Wake lock so the laptop display can't dim mid-gaze
- Camera-denied fallback — session still runs, summary shows duration instead of "Longest gaze: 0 sec", "try camera again" retry pill
- Auto-save on completion — closing the tab on the summary can't lose a sit
- 2.5 s afterglow between session-end and summary so the closing gong breathes

**Data**
- Local + Supabase sync with retry once on failure, upsert (id-conflict-safe)
- Row-level security — users see only their own rows
- Explicit column selection on remote history load (skips heavy `gaze_stability_samples` — cuts egress ~80%)
- Notes + feeling are patched onto the auto-saved row via id (not date) match

**Content**
- 48 daily quotes cycled by mandala day (Yoga Sutras, Gita, Upanishads, Dhammapada, Zen, Vedanta) — arc'd from grounding → deepening → pointing inward
- Real citations, not motivational filler

**Trust / privacy**
- All vision processing on-device (MediaPipe WASM)
- Note-field disclosure: "notes are shared with the developer" surfaces the moment the user starts typing
- Honest Privacy page — the developer can read this data, it's not sold, it's used to improve the app
- CSP + Permissions-Policy in production headers

**Reliability**
- Root-level React error boundary → recovery screen
- Service worker update banner ("A new version is ready — refresh") via `useRegisterSW`
- Sentry hooks (optional — set `VITE_SENTRY_DSN`)
- 12 unit tests guarding script invariants and streak arithmetic
- CI runs typecheck + lint + tests on push / PR

**Performance**
- Bundle split: `mediapipe`, `supabase`, `react` chunks separate from main
- Main bundle ~300 KB (was ~500 KB+ before split)
- PWA precache includes audio + video assets (~14.7 MB total, downloaded once)

---

## Research mode

Set `VITE_APP_MODE=research` in `.env` (or add `?mode=research` in **dev builds only** — production ignores URL overrides). This switches to a stripped-down lab layout:

- Home page shows "Visual Attention Prototype" with a plain Start Session button
- All personal/streak/history elements are hidden
- Long-form content pages (Philosophy / Science) are not linked from nav

---

## Repository layout

```
.
├── src/                       # Application source (see structure above)
├── public/                    # Static: diya video, favicons, PWA icons
├── supabase-schema-v4.sql     # Canonical schema — run this on a fresh Supabase project
├── supabase-schema.sql        # Historical — pre-v4
├── supabase-migration-v2.sql  # Historical — pre-v4
├── supabase-migration-v3.sql  # Historical — pre-v4
├── vercel.json                # SPA rewrites + security headers
├── vite.config.ts             # Bundle split + PWA workbox config
├── vitest.config.ts           # Test runner config
├── .github/workflows/ci.yml   # Typecheck + lint + tests on push / PR
├── graphify-out/              # Knowledge graph (see below)
├── algorithm-overview.md      # Signal-extraction pipeline documentation
├── protocol-and-questions.md  # Protocol rationale + open research questions
├── system-diagrams.md         # Architecture diagrams
└── CLAUDE.md                  # Instructions for AI coding assistants (agent routing)
```

## Key design decisions

- **Local-first storage.** `localStorage` is the primary store. Supabase is a background sync. The app works offline after first load. `useSyncExternalStore`-style caching on the active profile so `getActiveProfile()` doesn't re-parse localStorage on every render.
- **On-device vision.** No frames ever leave the device. MediaPipe runs in WASM in-browser.
- **Single source of truth for the protocol.** [`sessionScript.ts`](src/lib/sessionScript.ts) defines every phase — change one file to change the practice. A unit test asserts the total is always exactly 660 s.
- **UUIDs generated client-side.** Session rows use the client's `crypto.randomUUID()` as the primary key (sent explicitly on insert), so subsequent updates (note / feeling patching) match on a stable key instead of the date string.
- **Two independent audio subsystems.** HTML `<audio>` elements for the ambient beds and gong (long-form playback with crossfade). Web Audio synthesis for the eyes-open / eyes-close transition tones (precise, sample-accurate, no `.play()` latency).

---

## Knowledge graph

The project uses [graphify](https://github.com/safishamsi/graphify) to maintain a codebase knowledge graph in [`graphify-out/`](graphify-out/). After changing code, refresh it:

```bash
python -m graphify update .
```

[`graphify-out/GRAPH_REPORT.md`](graphify-out/GRAPH_REPORT.md) lists god nodes (most-connected abstractions), community structure, and cross-file relationships. AI coding assistants should read this before navigating.

---

## Research context

Drishti also serves as a research prototype for whether webcam-derived eye-behavior signals can meaningfully track attentional change over repeated sessions. See:

- [`algorithm-overview.md`](algorithm-overview.md) — signal extraction pipeline
- [`protocol-and-questions.md`](protocol-and-questions.md) — protocol rationale and open questions
- [`system-diagrams.md`](system-diagrams.md) — architecture diagrams

---

## License

The application code is currently unlicensed (all rights reserved).

Bundled third-party fonts:
- **Mukta** — SIL Open Font License 1.1 (Ek Type). See [`src/assets/fonts/Mukta-OFL.txt`](src/assets/fonts/Mukta-OFL.txt).
- **Samarkan** — shareware (Titivillus Foundry). Registration is $7.50 for continued use per the font's readme; not yet registered.
