export type BodyRegion =
  | "feet"
  | "calves"
  | "thighs"
  | "pelvis"
  | "backShoulders"
  | "armsFingers"
  | "neck"
  | "face";

export type BreathAction = "inhale" | "exhale";

export type VisualMode =
  | "settle"
  | "body"
  | "breath"
  | "gaze"
  | "eyesClosed"
  | "integrate";

export type SessionPhase = {
  id: string;
  label: string;
  durationSec: number;
  instruction: string;
  visualMode: VisualMode;
  bodyRegion?: BodyRegion;
  breathAction?: BreathAction;
  fireSoundOn?: boolean;
};

const BODY_SEQUENCE: Array<{ region: BodyRegion; instruction: string }> = [
  { region: "feet", instruction: "feet" },
  { region: "calves", instruction: "calves" },
  { region: "thighs", instruction: "thighs" },
  { region: "pelvis", instruction: "pelvis and abs" },
  { region: "backShoulders", instruction: "back and shoulders" },
  { region: "armsFingers", instruction: "arms" },
  { region: "neck", instruction: "neck" },
  { region: "face", instruction: "face" },
];

export function createSessionScript(): SessionPhase[] {
  const phases: SessionPhase[] = [
    {
      id: "settle-1",
      label: "Settle",
      durationSec: 15,
      instruction: "Sit tall. Uncross your arms and legs. Place the device at eye level.",
      visualMode: "settle",
    },
    {
      id: "settle-2",
      label: "Settle",
      durationSec: 15,
      instruction: "Soften your shoulders and jaw. Let your breath settle.",
      visualMode: "settle",
    },
  ];

  BODY_SEQUENCE.forEach((item, index) => {
    phases.push({
      id: `body-${index + 1}`,
      label: "Tense + Release",
      durationSec: 12,
      instruction: item.instruction,
      visualMode: "body",
      bodyRegion: item.region,
    });
  });

  for (let i = 1; i <= 10; i += 1) {
    phases.push({
      id: `breath-${i}-in`,
      label: "Regulate",
      durationSec: 4,
      instruction: "Inhale",
      visualMode: "breath",
      breathAction: "inhale",
    });

    phases.push({
      id: `breath-${i}-out`,
      label: "Regulate",
      durationSec: 8,
      instruction: "Exhale",
      visualMode: "breath",
      breathAction: "exhale",
    });
  }

  for (let i = 1; i <= 5; i += 1) {
    phases.push({
      id: `gaze-${i}`,
      label: "Focus",
      durationSec: 55,
      instruction: "Gaze",
      visualMode: "gaze",
      fireSoundOn: true,
    });

    phases.push({
      id: `eyes-closed-${i}`,
      label: "Eyes Closed",
      durationSec: 10,
      instruction: "Eyes closed",
      visualMode: "eyesClosed",
      fireSoundOn: true,
    });
  }

  phases.push({
    id: "integrate",
    label: "Integrate",
    durationSec: 89,
    instruction: "Open awareness",
    visualMode: "integrate",
    fireSoundOn: true,
  });

  return phases;
}

export function getScriptTotalDuration(script: SessionPhase[]) {
  return script.reduce((sum, phase) => sum + phase.durationSec, 0);
}
