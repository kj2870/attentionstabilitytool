import { useMemo } from "react";

type MeditationBackgroundProps = {
  children: React.ReactNode;
  // When false, always renders the canonical evening palette. Used by the
  // session: the world outside the practice breathes with the day, but the
  // room you sit in is always the same room.
  timeAware?: boolean;
};

// ---------------------------------------------------------------------------
// Time-of-day palette. Four anchor moods, interpolated continuously by the
// local clock so the shift is never a snap — light through a window, not a
// theme switch. All anchors stay inside the same warm amber family; evening
// is the canonical drishti look and the others are gentle departures from it.
// ---------------------------------------------------------------------------
type Rgb = [number, number, number];
type Rgba = [number, number, number, number];

type PaletteAnchor = {
  hour: number; // centre of the mood, 0-24
  top: Rgb;
  mid1: Rgb;
  mid2: Rgb;
  glow: Rgba;
};

const hexToRgb = (hex: string): Rgb => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

// Anchors in clock order. Night wraps around midnight.
const ANCHORS: PaletteAnchor[] = [
  // night — embers, darkest field; the flame carries more.
  { hour: 1, top: hexToRgb("#080604"), mid1: hexToRgb("#0e0a06"), mid2: hexToRgb("#120d07"), glow: [255, 140, 60, 0.08] },
  // dawn — pale, waking, faint rose cast.
  { hour: 7, top: hexToRgb("#0d0b09"), mid1: hexToRgb("#17110b"), mid2: hexToRgb("#1b140d"), glow: [255, 185, 125, 0.11] },
  // day — neutral warm, quietest glow.
  { hour: 13, top: hexToRgb("#0c0a07"), mid1: hexToRgb("#141008"), mid2: hexToRgb("#181109"), glow: [255, 165, 85, 0.09] },
  // evening — the canonical drishti amber (unchanged from the original).
  { hour: 19, top: hexToRgb("#0a0805"), mid1: hexToRgb("#15100a"), mid2: hexToRgb("#1a120a"), glow: [255, 150, 70, 0.12] },
];

const EVENING = ANCHORS[3];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [
  Math.round(lerp(a[0], b[0], t)),
  Math.round(lerp(a[1], b[1], t)),
  Math.round(lerp(a[2], b[2], t)),
];
const cssRgb = (c: Rgb) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
const cssRgba = (c: Rgba) =>
  `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${c[3].toFixed(3)})`;

function paletteForHour(hour: number): { sky: string; glow: string } {
  // Find the two anchors the hour falls between (cyclically) and blend.
  const extended = [...ANCHORS, { ...ANCHORS[0], hour: ANCHORS[0].hour + 24 }];
  const h = hour < ANCHORS[0].hour ? hour + 24 : hour;

  let from = extended[0];
  let to = extended[1];
  for (let i = 0; i < extended.length - 1; i += 1) {
    if (h >= extended[i].hour && h <= extended[i + 1].hour) {
      from = extended[i];
      to = extended[i + 1];
      break;
    }
  }
  const t = (h - from.hour) / (to.hour - from.hour || 1);

  const top = mixRgb(from.top, to.top, t);
  const mid1 = mixRgb(from.mid1, to.mid1, t);
  const mid2 = mixRgb(from.mid2, to.mid2, t);
  const glow: Rgba = [
    lerp(from.glow[0], to.glow[0], t),
    lerp(from.glow[1], to.glow[1], t),
    lerp(from.glow[2], to.glow[2], t),
    lerp(from.glow[3], to.glow[3], t),
  ];

  return {
    sky: `linear-gradient(180deg, ${cssRgb(top)} 0%, ${cssRgb(mid1)} 40%, ${cssRgb(mid2)} 70%, ${cssRgb(top)} 100%)`,
    glow: cssRgba(glow),
  };
}

export default function MeditationBackground({
  children,
  timeAware = true,
}: MeditationBackgroundProps) {
  // Computed once per mount — pages are short-lived enough that live
  // updating mid-visit would never be perceptible.
  const palette = useMemo(() => {
    if (!timeAware) {
      return {
        sky: `linear-gradient(180deg, ${cssRgb(EVENING.top)} 0%, ${cssRgb(EVENING.mid1)} 40%, ${cssRgb(EVENING.mid2)} 70%, ${cssRgb(EVENING.top)} 100%)`,
        glow: cssRgba(EVENING.glow),
      };
    }
    const now = new Date();
    return paletteForHour(now.getHours() + now.getMinutes() / 60);
  }, [timeAware]);

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100dvh",
        background: palette.sky,
      }}
    >
      {/* Decorative layers clipped to their own stacking context — keeps them
          from leaking outside the viewport without creating a scroll boundary
          on the outer wrapper. */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        {/* soft halo */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse 60% 45% at center 48%, ${palette.glow} 0%, transparent 65%)`,
          }}
        />

        {/* vignette */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at center, transparent 0%, transparent 40%, rgba(0,0,0,0.32) 75%, rgba(0,0,0,0.62) 100%)",
          }}
        />

        {/* floor gradient */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "32%",
            background:
              "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(30,18,8,0.28) 40%, rgba(20,12,6,0.55) 100%)",
          }}
        />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}
