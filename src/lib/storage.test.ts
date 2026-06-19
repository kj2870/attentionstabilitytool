import { describe, expect, it } from "vitest";
import {
  getCurrentStreak,
  getFlexibleStreak,
  getVowSnapshot,
  type LocalProfile,
  type SessionRecord,
} from "./storage";

function record(daysAgo: number): SessionRecord {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(20, 0, 0, 0);
  return {
    id: `r-${daysAgo}`,
    date: d.toISOString(),
    durationMin: 11,
    feeling: "",
  };
}

describe("getCurrentStreak", () => {
  it("returns 0 with no history", () => {
    expect(getCurrentStreak([])).toBe(0);
  });

  it("counts consecutive days anchored at today", () => {
    expect(getCurrentStreak([record(0), record(1), record(2)])).toBe(3);
  });

  it("anchors at yesterday when today has no session", () => {
    expect(getCurrentStreak([record(1), record(2)])).toBe(2);
  });

  it("breaks on a missed day", () => {
    expect(getCurrentStreak([record(0), record(2), record(3)])).toBe(1);
  });

  it("dedupes multiple sessions on the same day", () => {
    expect(getCurrentStreak([record(0), record(0), record(1)])).toBe(2);
  });
});

describe("getFlexibleStreak", () => {
  it("forgives a single missed day", () => {
    expect(getFlexibleStreak([record(0), record(2), record(3)])).toBe(3);
  });

  it("breaks after two missed days in a row", () => {
    expect(getFlexibleStreak([record(0), record(3)])).toBe(1);
  });
});

// Helper to build a profile with a vow taken N days ago and a list of sit
// records (relative days from today).
function profileWithVow(vowDaysAgo: number, sits: number[]): LocalProfile {
  const taken = new Date();
  taken.setDate(taken.getDate() - vowDaysAgo);
  taken.setHours(8, 0, 0, 0);
  return {
    id: "test",
    username: "t",
    createdAt: taken.toISOString(),
    onboardingComplete: true,
    history: sits.map(record),
    vow: { takenAt: taken.toISOString() },
  };
}

describe("getVowSnapshot", () => {
  it("returns null with no vow taken", () => {
    expect(
      getVowSnapshot({
        id: "x",
        username: "t",
        createdAt: new Date().toISOString(),
        onboardingComplete: true,
        history: [],
      })
    ).toBeNull();
  });

  it("day 1 on the same day the vow was taken", () => {
    const snap = getVowSnapshot(profileWithVow(0, [0]));
    expect(snap?.day).toBe(1);
    expect(snap?.todaysSitComplete).toBe(true);
    expect(snap?.broken).toBe(false);
  });

  it("day 5 after 4 days, sitting all days", () => {
    const snap = getVowSnapshot(profileWithVow(4, [0, 1, 2, 3, 4]));
    expect(snap?.day).toBe(5);
    expect(snap?.broken).toBe(false);
    expect(snap?.lastSitDay).toBe(5);
  });

  it("forgives a single missed day", () => {
    // Vow 5 days ago, sat on days 1, 2, 4, 5 (skipped day 3). Today is day 6.
    const snap = getVowSnapshot(profileWithVow(5, [5, 4, 2, 1]));
    expect(snap?.broken).toBe(false);
    expect(snap?.day).toBe(6);
  });

  it("ends the vow on two consecutive missed days", () => {
    // Vow 7 days ago, sat on days 1–4. Missed days 5 and 6. Today is day 8.
    const snap = getVowSnapshot(profileWithVow(7, [7, 6, 5, 4]));
    expect(snap?.broken).toBe(true);
    // Last sit day before the consecutive misses: day 4.
    expect(snap?.lastSitDay).toBe(4);
  });

  it("does not break before the second missed day has fully passed", () => {
    // Vow 2 days ago, sat day 1 only. Day 2 missed. Today (day 3) in progress.
    // Only one fully past missed day — not yet broken.
    const snap = getVowSnapshot(profileWithVow(2, [2]));
    expect(snap?.broken).toBe(false);
    expect(snap?.day).toBe(3);
  });

  it("marks fulfilled when day 48 is reached and sat", () => {
    const sits = Array.from({ length: 48 }, (_, i) => i);
    const snap = getVowSnapshot(profileWithVow(47, sits));
    expect(snap?.fulfilled).toBe(true);
    expect(snap?.day).toBe(48);
  });
});
