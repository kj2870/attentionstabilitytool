import { describe, expect, it } from "vitest";
import { createSessionScript, getScriptTotalDuration } from "./sessionScript";

describe("createSessionScript", () => {
  const script = createSessionScript();

  it("totals exactly 11 minutes (660s)", () => {
    expect(getScriptTotalDuration(script)).toBe(660);
  });

  it("has 5 gaze rounds of 60s each", () => {
    const gaze = script.filter((p) => p.visualMode === "gaze");
    expect(gaze).toHaveLength(5);
    gaze.forEach((p) => expect(p.durationSec).toBe(60));
  });

  it("has eyes-closed holds after rounds 1-4 only — round 5 flows into integrate", () => {
    const eyesClosed = script.filter((p) => p.visualMode === "eyesClosed");
    expect(eyesClosed).toHaveLength(4);
    eyesClosed.forEach((p) => expect(p.durationSec).toBe(12));

    const lastGazeIndex = script.map((p) => p.id).lastIndexOf("gaze-5");
    expect(script[lastGazeIndex + 1].visualMode).toBe("integrate");
  });

  it("body phases are 12s each (8s clench + 4s release)", () => {
    const body = script.filter((p) => p.visualMode === "body");
    expect(body).toHaveLength(8);
    body.forEach((p) => expect(p.durationSec).toBe(12));
  });

  it("breath cycles alternate 4s inhale / 8s exhale", () => {
    const breath = script.filter((p) => p.visualMode === "breath");
    expect(breath).toHaveLength(20);
    breath.forEach((p) => {
      expect(p.durationSec).toBe(p.breathAction === "inhale" ? 4 : 8);
    });
  });
});
