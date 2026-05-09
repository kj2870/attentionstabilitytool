## Agent Routing

Route tasks by complexity to control cost:

**Use `claude-haiku-4-5-20251001` (cheap) for:**
- `/lint-agent` — type errors, unused imports, prop mismatches, ESLint issues
- `/doc-agent` — JSDoc comments, inline docs, README sections

**Use Claude Sonnet (default) for:**
- Tracking engine logic (`trackingEngine.ts`, `faceDetection.ts`, `faceLandmarks.ts`)
- Auth↔storage coupling (`auth.ts` ↔ `storage.ts` ↔ `supabase.ts`)
- Session state flow (`SessionPage.tsx` end-to-end)
- Algorithm changes (`algorithm-overview.md` related code)
- Any task touching 3+ communities in the knowledge graph

### /lint-agent
Run as a sub-agent using model `claude-haiku-4-5-20251001`.
Scope: static analysis only — no logic changes.
Steps:
1. Read `graphify-out/GRAPH_REPORT.md` for isolated nodes (knowledge gaps section)
2. Run `npm run lint` and report all errors with file:line references
3. Check each isolated node from the graph — flag any unused exports or props with ≤1 connection
4. Output a prioritized fix list. Do NOT apply fixes automatically.

### /doc-agent
Run as a sub-agent using model `claude-haiku-4-5-20251001`.
Scope: documentation only — no logic changes.
Steps:
1. Read `graphify-out/GRAPH_REPORT.md` — focus on god nodes (most connected)
2. For each god node function/component that lacks a JSDoc comment, add one (1-2 lines max, no obvious comments)
3. Update `CLAUDE.md` agent routing section if new patterns are discovered
4. Run `graphify update .` when done

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- ALWAYS read graphify-out/GRAPH_REPORT.md before reading any source files, running grep/glob searches, or answering codebase questions. The graph is your primary map of the codebase.
- IF graphify-out/wiki/index.md EXISTS, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
