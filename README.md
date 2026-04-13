# FocusFlow

FocusFlow is a React + TypeScript + Vite app for guided attention sessions with local tracking, Supabase auth, and Supabase session persistence.

Project location:
`C:\Users\kj287\Documents\01_Projects\focusflow`

GitHub repository:
[https://github.com/kj2870/attentionstabilitytool](https://github.com/kj2870/attentionstabilitytool)

## Current Wiring

- Frontend: React 19 + Vite
- Auth: Supabase Auth
- Session data: local cache plus `public.sessions` in Supabase
- Database schema: [`supabase-schema.sql`](./supabase-schema.sql)
- URL sharing / SPA routing: [`vercel.json`](./vercel.json)

## Research Docs

- [`algorithm-overview.md`](./algorithm-overview.md)
- [`protocol-and-questions.md`](./protocol-and-questions.md)
- [`system-diagrams.md`](./system-diagrams.md)

## Local Setup

1. Work from `C:\Users\kj287\Documents\01_Projects\focusflow`.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env`.
4. Add your Supabase project URL and anon key.
5. Run `npm run dev`.

## Supabase Setup

1. Open your Supabase project SQL editor.
2. Run the SQL in [`supabase-schema.sql`](./supabase-schema.sql).
3. Confirm `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present in `.env`.
4. Test signup, login, and saving a completed session.

The app already writes completed sessions to Supabase through `saveSessionRemote()` in `src/lib/storage.ts`.

## GitHub And Sharing

- Local git remote should use:
  `https://github.com/kj2870/attentionstabilitytool.git`
- Primary repository page:
  [https://github.com/kj2870/attentionstabilitytool](https://github.com/kj2870/attentionstabilitytool)
- Vercel SPA rewrites are already configured so shared app URLs resolve correctly.

## Commands

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`
