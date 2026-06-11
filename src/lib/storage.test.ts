import { describe, expect, it } from "vitest";
import {
  getCurrentStreak,
  getFlexibleStreak,
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
    attentionScore: 80,
    feeling: "",
    grade: "B",
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
