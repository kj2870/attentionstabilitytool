# Graph Report - zen-kalam-eba609  (2026-05-11)

## Corpus Check
- 41 files · ~21,484 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 249 nodes · 375 edges · 19 communities (14 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `19d26a15`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]

## God Nodes (most connected - your core abstractions)
1. `SessionAudioController` - 15 edges
2. `getActiveProfile()` - 12 edges
3. `updateActiveProfile()` - 8 edges
4. `loadHistory()` - 8 edges
5. `createProfile()` - 7 edges
6. `Algorithm Overview` - 7 edges
7. `Processing Pipeline` - 7 edges
8. `FocusFlow` - 7 edges
9. `syncLocalProfileFromUser()` - 6 edges
10. `loadRoutineSelection()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `HistoryPage()` --calls--> `avg()`  [INFERRED]
  src/pages/HistoryPage.tsx → src/pages/SessionPage.tsx
- `syncLocalProfileFromUser()` --calls--> `getActiveProfile()`  [EXTRACTED]
  src/lib/auth.ts → src/lib/storage.ts
- `syncLocalProfileFromUser()` --calls--> `createProfile()`  [EXTRACTED]
  src/lib/auth.ts → src/lib/storage.ts
- `syncLocalProfileFromUser()` --calls--> `mergeRemoteHistory()`  [EXTRACTED]
  src/lib/auth.ts → src/lib/storage.ts
- `HistoryPage()` --calls--> `loadHistory()`  [EXTRACTED]
  src/pages/HistoryPage.tsx → src/lib/storage.ts

## Communities (19 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (26): FaceDetectionSnapshot, SessionFaceDetector, EyeMetricsSnapshot, SessionFaceLandmarker, beginnerQuotes, deepQuotes, getQuoteForStreak(), midQuotes (+18 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (11): DiyaProps, FlameProps, MeditationBackgroundProps, signIn(), signInWithGoogle(), signOut(), syncLocalProfileFromUser(), clearActiveProfile() (+3 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (26): signUp(), clearHistory(), createProfile(), getActiveProfile(), getActiveProfileId(), getFlexibleStreak(), getWeeklyCompletion(), hasCompletedOnboarding() (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (11): BodyGuideOverlay(), BodyGuideOverlayProps, CueState, getCueState(), BreathGuideProps, BODY_SEQUENCE, BodyRegion, BreathAction (+3 more)

### Community 4 - "Community 4"
Cohesion: 0.17
Nodes (12): getCurrentStreak(), getMandalaDay(), SessionRecord, shiftDateKey(), avg(), CalendarHeatmap(), HistoryPage(), MandalaRing() (+4 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (15): Behavioral Signals, Feedback, Integration With Physiological Signals, Measurement Reliability, Open Questions, Paced Breathing, Post-Fixation Open Awareness, Posture Settling (+7 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (13): Algorithm Overview, Blink Event Detection, Design Approach, Eye-State Feature Extraction, Frame Processing, Inputs, Next Steps, Objective (+5 more)

### Community 8 - "Community 8"
Cohesion: 0.27
Nodes (4): SimulatedTrackingEngine, TrackingEngine, TrackingListener, TrackingMetrics

### Community 9 - "Community 9"
Cohesion: 0.2
Nodes (9): code:mermaid (flowchart TD), code:mermaid (flowchart TD), code:mermaid (flowchart LR), code:mermaid (flowchart LR), Figure 1. High-Level Measurement Pipeline, Figure 2. Eye Feature Extraction Pathway, Figure 3. Protocol Structure, Figure 4. Repeated Session Comparison (+1 more)

### Community 10 - "Community 10"
Cohesion: 0.25
Nodes (7): Commands, Current Wiring, FocusFlow, GitHub And Sharing, Local Setup, Research Docs, Supabase Setup

### Community 11 - "Community 11"
Cohesion: 0.29
Nodes (3): LayoutProps, AppMode, _mode

### Community 12 - "Community 12"
Cohesion: 0.4
Nodes (4): Agent Routing, /doc-agent, graphify, /lint-agent

## Knowledge Gaps
- **70 isolated node(s):** `ImportMetaEnv`, `ImportMeta`, `BodyGuideOverlayProps`, `CueState`, `BreathGuideProps` (+65 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SessionAudioController` connect `Community 6` to `Community 0`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **What connects `ImportMetaEnv`, `ImportMeta`, `BodyGuideOverlayProps` to the rest of the system?**
  _70 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._