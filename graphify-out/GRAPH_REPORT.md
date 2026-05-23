# Graph Report - zen-kalam-eba609  (2026-05-23)

## Corpus Check
- 45 files · ~28,184 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 384 nodes · 538 edges · 29 communities (23 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2c6a9211`
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
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]

## God Nodes (most connected - your core abstractions)
1. `SessionAudioController` - 15 edges
2. `getActiveProfile()` - 12 edges
3. `handleSaveSession()` - 9 edges
4. `updateActiveProfile()` - 8 edges
5. `loadHistory()` - 8 edges
6. `createProfile()` - 7 edges
7. `Algorithm Overview` - 7 edges
8. `Processing Pipeline` - 7 edges
9. `FocusFlow` - 7 edges
10. `syncLocalProfileFromUser()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `MandalaRing()` --calls--> `getMandalaDay()`  [EXTRACTED]
  src/pages/HistoryPage.tsx → src/lib/storage.ts
- `HistoryPage()` --calls--> `avg()`  [INFERRED]
  src/pages/HistoryPage.tsx → src/pages/SessionPage.tsx
- `signUp()` --calls--> `createProfile()`  [EXTRACTED]
  src/lib/auth.ts → src/lib/storage.ts
- `handleSaveSession()` --calls--> `saveSession()`  [EXTRACTED]
  src/pages/SessionPage.tsx → src/lib/storage.ts
- `SessionPage()` --calls--> `loadRoutineSelection()`  [EXTRACTED]
  src/pages/SessionPage.tsx → src/lib/storage.ts

## Communities (29 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (88): [attentionHistory, setAttentionHistory], [attentionScore, setAttentionScore], audioRef, avgClosureDurationMs, [avgDrift, setAvgDrift], avgInterBlinkIntervalSec, [avgRecovery, setAvgRecovery], [blinkCountLive, setBlinkCountLive] (+80 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (33): signOut(), syncLocalProfileFromUser(), clearActiveProfile(), clearHistory(), createProfile(), getActiveProfile(), getActiveProfileId(), getCurrentStreak() (+25 more)

### Community 2 - "Community 2"
Cohesion: 0.1
Nodes (16): BodyGuideOverlay(), BodyGuideOverlayProps, CueState, getCueState(), REGION_BOUNDS, REGION_POSITIONS, BreathGuideProps, BODY_SEQUENCE (+8 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (10): DiyaProps, FlameProps, LayoutProps, MeditationBackgroundProps, signIn(), signInWithGoogle(), signUp(), AppMode (+2 more)

### Community 4 - "Community 4"
Cohesion: 0.17
Nodes (11): avg(), CalendarHeatmap(), formatDate(), formatStillness(), formatTime(), MandalaRing(), polar(), segmentPath() (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (15): Behavioral Signals, Feedback, Integration With Physiological Signals, Measurement Reliability, Open Questions, Paced Breathing, Post-Fixation Open Awareness, Posture Settling (+7 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (13): Algorithm Overview, Blink Event Detection, Design Approach, Eye-State Feature Extraction, Frame Processing, Inputs, Next Steps, Objective (+5 more)

### Community 8 - "Community 8"
Cohesion: 0.21
Nodes (9): computeEAR(), computeIrisPosition(), dist(), extractEulerAngles(), EyeMetricsSnapshot, LEFT_EYE_EAR, Pt, RIGHT_EYE_EAR (+1 more)

### Community 9 - "Community 9"
Cohesion: 0.17
Nodes (12): saveSessionRemote(), appendCsvWithHeader(), avg(), buildPilotCsvRow(), downloadTextFile(), formatTimestampForKey(), handleExportResearchCsv(), handleSaveSession() (+4 more)

### Community 10 - "Community 10"
Cohesion: 0.18
Nodes (5): detectNewlyUnlocked(), Milestone, milestoneLabel(), MILESTONES, SessionRecord

### Community 11 - "Community 11"
Cohesion: 0.27
Nodes (4): SimulatedTrackingEngine, TrackingEngine, TrackingListener, TrackingMetrics

### Community 12 - "Community 12"
Cohesion: 0.2
Nodes (9): code:mermaid (flowchart TD), code:mermaid (flowchart TD), code:mermaid (flowchart LR), code:mermaid (flowchart LR), Figure 1. High-Level Measurement Pipeline, Figure 2. Eye Feature Extraction Pathway, Figure 3. Protocol Structure, Figure 4. Repeated Session Comparison (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.25
Nodes (7): __dirname, innerSize, outputs, padding, root, svgBuffer, svgPath

### Community 14 - "Community 14"
Cohesion: 0.25
Nodes (7): Commands, Current Wiring, FocusFlow, GitHub And Sharing, Local Setup, Research Docs, Supabase Setup

### Community 15 - "Community 15"
Cohesion: 0.29
Nodes (6): beginnerQuotes, deepQuotes, getQuoteForStreak(), midQuotes, getBodyCue(), SessionPage()

### Community 16 - "Community 16"
Cohesion: 0.4
Nodes (3): BeforeInstallPromptEvent, InstallPrompt(), isIOS()

### Community 18 - "Community 18"
Cohesion: 0.4
Nodes (4): Agent Routing, /doc-agent, graphify, /lint-agent

### Community 23 - "Community 23"
Cohesion: 0.67
Nodes (3): isPlausibleEyeOpenness(), processBlinkState, tick()

### Community 24 - "Community 24"
Cohesion: 0.67
Nodes (3): disableCamera(), handleResetResearchFlow(), stopCameraStream()

### Community 25 - "Community 25"
Cohesion: 0.67
Nodes (3): enableCamera(), handleContinueFromSetup(), handleStart()

## Knowledge Gaps
- **162 isolated node(s):** `__dirname`, `root`, `svgPath`, `svgBuffer`, `outputs` (+157 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SessionAudioController` connect `Community 6` to `Community 0`, `Community 2`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `loadHistory()` connect `Community 1` to `Community 0`, `Community 4`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `SessionFaceDetector` connect `Community 17` to `Community 0`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `__dirname`, `root`, `svgPath` to the rest of the system?**
  _162 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._