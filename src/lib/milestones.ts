// ---------------------------------------------------------------------------
// Milestones — fixed, named achievements that unlock as the user practises.
// Each milestone is satisfied or unsatisfied based on a deterministic rule
// evaluated against the user's session history.
//
// Computed at session save time:
//   1. Evaluate which milestones are satisfied BEFORE this session's record
//   2. Evaluate which milestones are satisfied AFTER (i.e. including it)
//   3. The difference = newly unlocked milestones to display on the summary
// ---------------------------------------------------------------------------

import type { SessionRecord } from "./storage";

export type Milestone = {
  id: string;
  label: string;
  // Returns true if this milestone is satisfied given the provided history.
  test: (history: SessionRecord[]) => boolean;
};

// --- Helpers ---
function totalSessions(history: SessionRecord[]): number {
  return history.length;
}

function maxLongestGaze(history: SessionRecord[]): number {
  return history.reduce((m, r) => Math.max(m, r.longestGazeSec ?? 0), 0);
}

function totalStillnessMinutes(history: SessionRecord[]): number {
  const totalSec = history.reduce((s, r) => s + (r.totalStillnessSec ?? 0), 0);
  return totalSec / 60;
}

// Consecutive-day streak from a sorted-newest-first session list.
function dayStreak(history: SessionRecord[]): number {
  if (history.length === 0) return 0;
  const days = new Set(
    history.map((r) => new Date(r.date).toISOString().slice(0, 10))
  );
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// Returns the largest gap between consecutive sessions (in days). Used for
// "Returned after a break" style milestones — measured from the latest session
// backward.
function lastGapDays(history: SessionRecord[]): number {
  if (history.length < 2) return 0;
  const sorted = [...history].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const latest = new Date(sorted[0].date).getTime();
  const previous = new Date(sorted[1].date).getTime();
  return (latest - previous) / (1000 * 60 * 60 * 24);
}

// --- Milestone definitions ---
export const MILESTONES: Milestone[] = [
  // Consistency
  { id: "first-session", label: "First session", test: (h) => totalSessions(h) >= 1 },
  { id: "three-sessions", label: "Three sessions", test: (h) => totalSessions(h) >= 3 },
  { id: "one-week", label: "One week", test: (h) => totalSessions(h) >= 7 },
  { id: "two-weeks", label: "Two weeks", test: (h) => totalSessions(h) >= 14 },
  { id: "first-mandala", label: "First mandala", test: (h) => totalSessions(h) >= 48 },
  { id: "one-hundred", label: "One hundred sessions", test: (h) => totalSessions(h) >= 100 },

  // Streaks
  { id: "streak-3", label: "Three days in a row", test: (h) => dayStreak(h) >= 3 },
  { id: "streak-7", label: "One week of daily practice", test: (h) => dayStreak(h) >= 7 },
  { id: "streak-14", label: "Two weeks unbroken", test: (h) => dayStreak(h) >= 14 },
  { id: "streak-30", label: "One month unbroken", test: (h) => dayStreak(h) >= 30 },

  // Single-gaze quality
  { id: "gaze-5", label: "Five seconds held", test: (h) => maxLongestGaze(h) >= 5 },
  { id: "gaze-10", label: "Ten seconds held", test: (h) => maxLongestGaze(h) >= 10 },
  { id: "gaze-20", label: "Twenty seconds held", test: (h) => maxLongestGaze(h) >= 20 },
  { id: "gaze-30", label: "Thirty seconds held", test: (h) => maxLongestGaze(h) >= 30 },
  { id: "gaze-45", label: "Forty-five seconds held", test: (h) => maxLongestGaze(h) >= 45 },
  { id: "gaze-60", label: "One full minute held", test: (h) => maxLongestGaze(h) >= 60 },

  // Lifetime accumulation
  { id: "lifetime-5m", label: "Five minutes total", test: (h) => totalStillnessMinutes(h) >= 5 },
  { id: "lifetime-30m", label: "Thirty minutes total", test: (h) => totalStillnessMinutes(h) >= 30 },
  { id: "lifetime-1h", label: "One hour total", test: (h) => totalStillnessMinutes(h) >= 60 },
  { id: "lifetime-3h", label: "Three hours total", test: (h) => totalStillnessMinutes(h) >= 180 },
  { id: "lifetime-10h", label: "Ten hours total", test: (h) => totalStillnessMinutes(h) >= 600 },
  { id: "lifetime-24h", label: "One full day of practice", test: (h) => totalStillnessMinutes(h) >= 1440 },

  // Special
  { id: "return-week", label: "Returned after a break", test: (h) => lastGapDays(h) >= 7 },
  { id: "return-month", label: "Began again", test: (h) => lastGapDays(h) >= 30 },
];

// Returns the IDs of milestones that became satisfied by adding `newRecord`
// to `historyBefore`. Excludes any that were already satisfied.
export function detectNewlyUnlocked(
  historyBefore: SessionRecord[],
  newRecord: SessionRecord
): string[] {
  const historyAfter = [...historyBefore, newRecord];
  const newlyUnlocked: string[] = [];
  for (const milestone of MILESTONES) {
    const before = milestone.test(historyBefore);
    const after = milestone.test(historyAfter);
    if (!before && after) newlyUnlocked.push(milestone.id);
  }
  return newlyUnlocked;
}

// Map an ID back to its display label. Returns the ID itself if unknown.
export function milestoneLabel(id: string): string {
  return MILESTONES.find((m) => m.id === id)?.label ?? id;
}
