import type { BodyRegion } from "../lib/sessionScript";

type BodyGuideOverlayProps = {
  activeRegion: BodyRegion;
  phaseSecondsLeft: number;
};

// Matches sessionScript.ts — each body phase is 10s, halfway flips clench → release.
const PHASE_TOTAL = 10;
const PHASE_HALF = 5;

// SVG viewBox is 240 wide × 420 tall. These coordinates locate each region on the figure.
// y-positions are tuned to the silhouette path below.
const REGION_POSITIONS: Record<BodyRegion, { cx: number; cy: number; r: number }> = {
  face:          { cx: 120, cy: 48,  r: 36 },
  neck:          { cx: 120, cy: 92,  r: 28 },
  backShoulders: { cx: 120, cy: 130, r: 56 },
  armsFingers:   { cx: 120, cy: 175, r: 80 },
  pelvis:        { cx: 120, cy: 215, r: 52 },
  thighs:        { cx: 120, cy: 270, r: 48 },
  calves:        { cx: 120, cy: 340, r: 44 },
  feet:          { cx: 120, cy: 400, r: 50 },
};

// Smooth, contiguous humanoid silhouette path designed to match the mockup.
// Head → neck → shoulders → torso narrowing at waist → legs together → ground.
const FIGURE_PATH = `
  M 120 18
  C 138 18, 152 32, 152 52
  C 152 70, 142 82, 132 87
  C 138 92, 144 96, 148 102
  C 156 110, 168 120, 178 132
  C 188 144, 192 156, 192 170
  C 192 188, 184 198, 174 204
  C 168 212, 162 220, 158 230
  L 158 250
  C 158 264, 154 280, 152 296
  L 150 326
  C 148 340, 146 352, 144 366
  C 142 380, 140 392, 138 402
  C 137 410, 134 414, 130 416
  L 110 416
  C 106 414, 103 410, 102 402
  C 100 392, 98 380, 96 366
  C 94 352, 92 340, 90 326
  L 88 296
  C 86 280, 82 264, 82 250
  L 82 230
  C 78 220, 72 212, 66 204
  C 56 198, 48 188, 48 170
  C 48 156, 52 144, 62 132
  C 72 120, 84 110, 92 102
  C 96 96, 102 92, 108 87
  C 98 82, 88 70, 88 52
  C 88 32, 102 18, 120 18
  Z
`;

export default function BodyGuideOverlay({
  activeRegion,
  phaseSecondsLeft,
}: BodyGuideOverlayProps) {
  const isClench = phaseSecondsLeft > PHASE_HALF;
  const elapsedInHalf = isClench
    ? PHASE_TOTAL - phaseSecondsLeft
    : PHASE_HALF - phaseSecondsLeft;
  // Progress 0..1 across each half — used for glow intensity envelope.
  const halfProgress = Math.max(0, Math.min(1, elapsedInHalf / PHASE_HALF));

  // Clench: glow builds up. Release: glow softens. Eased for organic feel.
  const intensity = isClench
    ? 0.55 + halfProgress * 0.45 // 0.55 → 1.0
    : 1.0 - halfProgress * 0.7;  // 1.0 → 0.3

  const pos = REGION_POSITIONS[activeRegion];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: "clamp(220px, 32vw, 300px)",
          aspectRatio: "240 / 440",
          position: "relative",
        }}
      >
        <svg
          viewBox="0 0 240 440"
          width="100%"
          height="100%"
          style={{ display: "block", overflow: "visible" }}
        >
          <defs>
            {/* Soft humanoid silhouette gradient — faded so it bleeds into the background. */}
            <radialGradient id="figureGradient" cx="50%" cy="48%" r="62%">
              <stop offset="0%" stopColor="rgba(120, 102, 84, 0.42)" />
              <stop offset="55%" stopColor="rgba(80, 68, 56, 0.32)" />
              <stop offset="100%" stopColor="rgba(40, 32, 24, 0)" />
            </radialGradient>

            {/* Warm amber glow gradient for the active region. */}
            <radialGradient id="regionGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255, 210, 140, 0.95)" />
              <stop offset="35%" stopColor="rgba(255, 179, 71, 0.65)" />
              <stop offset="70%" stopColor="rgba(220, 130, 60, 0.22)" />
              <stop offset="100%" stopColor="rgba(180, 90, 40, 0)" />
            </radialGradient>

            {/* Heavy Gaussian blur so the glow bleeds into the silhouette. */}
            <filter id="softBloom" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="14" />
            </filter>

            {/* Even softer outer halo. */}
            <filter id="outerHalo" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="28" />
            </filter>

            {/* Clip glow to silhouette so light only appears within the body. */}
            <clipPath id="silhouetteClip">
              <path d={FIGURE_PATH} />
            </clipPath>
          </defs>

          {/* Outer halo — soft warm light spreading beyond the body, blending with background. */}
          <g style={{ opacity: intensity * 0.6, transition: "opacity 1.2s ease" }}>
            <circle
              cx={pos.cx}
              cy={pos.cy}
              r={pos.r * 2.2}
              fill="url(#regionGlow)"
              filter="url(#outerHalo)"
              style={{ transition: "cx 1.4s ease, cy 1.4s ease, r 1.4s ease" }}
            />
          </g>

          {/* Base silhouette — soft, fades into dark. */}
          <path d={FIGURE_PATH} fill="url(#figureGradient)" />

          {/* Glow clipped to the body — the active region lights up from inside. */}
          <g clipPath="url(#silhouetteClip)" style={{ opacity: intensity, transition: "opacity 1.2s ease" }}>
            <circle
              cx={pos.cx}
              cy={pos.cy}
              r={pos.r * 1.4}
              fill="url(#regionGlow)"
              filter="url(#softBloom)"
              style={{ transition: "cx 1.4s ease, cy 1.4s ease, r 1.4s ease" }}
            />
          </g>

          {/* Bright core for the active region. */}
          <g style={{ opacity: intensity * 0.85, transition: "opacity 1.2s ease" }}>
            <circle
              cx={pos.cx}
              cy={pos.cy}
              r={pos.r * 0.55}
              fill="url(#regionGlow)"
              filter="url(#softBloom)"
              style={{ transition: "cx 1.4s ease, cy 1.4s ease, r 1.4s ease" }}
            />
          </g>
        </svg>
      </div>
    </div>
  );
}
