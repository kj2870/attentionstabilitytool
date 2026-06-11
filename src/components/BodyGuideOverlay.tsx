import type { BodyRegion } from "../lib/sessionScript";

type BodyGuideOverlayProps = {
  activeRegion: BodyRegion;
  phaseSecondsLeft: number;
};

// Matches sessionScript.ts — each body phase is 12s: 8s clench, 4s release.
const PHASE_TOTAL = 12;
const RELEASE_SECONDS = 4;
const CLENCH_SECONDS = PHASE_TOTAL - RELEASE_SECONDS;

// Terracotta palette adapted for the app's warm dark background.
// Layered tones create paper-cut depth without competing with the diya colours.
const COLOR_BACK = "rgba(180, 130, 90, 0.42)";   // arms + legs (back layer)
const COLOR_MID = "rgba(170, 110, 70, 0.78)";    // torso + neck (mid layer)
const COLOR_FRONT = "rgba(140, 80, 50, 0.92)";   // head (front layer)
const COLOR_SHADOW = "rgba(80, 40, 20, 0.5)";    // foot shadow

// Active region uses a warm amber that pops against the terracotta base.
const ACTIVE_FILL = "#ffb347";
const ACTIVE_GLOW = "#ffd27d";

// All body part bounds for the active-region glow overlay (viewBox 300×400).
// Used to position the soft halo behind the highlighted part.
const REGION_BOUNDS: Record<BodyRegion, { x: number; y: number; w: number; h: number }> = {
  face:          { x: 116, y: 26,  w: 68,  h: 68 },
  neck:          { x: 138, y: 86,  w: 24,  h: 22 },
  backShoulders: { x: 104, y: 102, w: 92,  h: 60 },
  armsFingers:   { x: 86,  y: 116, w: 128, h: 146 },
  pelvis:        { x: 108, y: 180, w: 84,  h: 70 },
  thighs:        { x: 116, y: 244, w: 68,  h: 70 },
  calves:        { x: 116, y: 314, w: 68,  h: 70 },
  feet:          { x: 110, y: 376, w: 80,  h: 20 },
};

export default function BodyGuideOverlay({
  activeRegion,
  phaseSecondsLeft,
}: BodyGuideOverlayProps) {
  const isClench = phaseSecondsLeft > RELEASE_SECONDS;
  const elapsedInHalf = isClench
    ? PHASE_TOTAL - phaseSecondsLeft
    : RELEASE_SECONDS - phaseSecondsLeft;
  const halfProgress = Math.max(
    0,
    Math.min(1, elapsedInHalf / (isClench ? CLENCH_SECONDS : RELEASE_SECONDS))
  );

  // Glow builds during clench, softens during release — same envelope as the diya feel.
  const intensity = isClench
    ? 0.55 + halfProgress * 0.45
    : 1.0 - halfProgress * 0.7;

  const isActive = (r: BodyRegion) => activeRegion === r;
  const bounds = REGION_BOUNDS[activeRegion];

  // Helper: returns the fill for a body part — terracotta when inactive,
  // amber when active. Used inline in the SVG below.
  const partFill = (r: BodyRegion, base: string) => (isActive(r) ? ACTIVE_FILL : base);

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
          // Height-driven sizing: the figure always fits inside its container
          // (feet to head visible), shrinking before it would ever be cut off.
          height: "min(100%, 380px)",
          maxWidth: "min(60vw, 300px)",
          aspectRatio: "300 / 400",
          position: "relative",
        }}
      >
        <svg
          viewBox="0 0 300 400"
          width="100%"
          height="100%"
          style={{ display: "block", overflow: "visible" }}
        >
          <defs>
            {/* Subtle paper-shadow filter — keeps the layered depth feel of the original. */}
            <filter id="paperShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" />
              <feOffset dx="2" dy="3" result="off" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.35" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Strong outer glow used behind the active body part. */}
            <filter id="activeGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="18" />
            </filter>

            {/* Tighter inner glow on the active part itself. */}
            <filter id="activeBloom" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <radialGradient id="haloGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={ACTIVE_GLOW} stopOpacity="0.85" />
              <stop offset="40%" stopColor={ACTIVE_FILL} stopOpacity="0.55" />
              <stop offset="100%" stopColor={ACTIVE_FILL} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Outer halo positioned behind the active region — bleeds light into the background. */}
          <g style={{ opacity: intensity * 0.7, transition: "opacity 0.8s ease" }}>
            <ellipse
              cx={bounds.x + bounds.w / 2}
              cy={bounds.y + bounds.h / 2}
              rx={bounds.w * 0.9}
              ry={bounds.h * 0.9}
              fill="url(#haloGradient)"
              filter="url(#activeGlow)"
              style={{ transition: "cx 1.0s ease, cy 1.0s ease, rx 1.0s ease, ry 1.0s ease" }}
            />
          </g>

          {/* Back layer: arms (left + right) */}
          <g filter="url(#paperShadow)">
            <rect
              x="86" y="116" width="28" height="146" rx="14"
              fill={partFill("armsFingers", COLOR_BACK)}
              filter={isActive("armsFingers") ? "url(#activeBloom)" : undefined}
              style={{ transition: "fill 0.6s ease" }}
            />
            <rect
              x="186" y="116" width="28" height="146" rx="14"
              fill={partFill("armsFingers", COLOR_BACK)}
              filter={isActive("armsFingers") ? "url(#activeBloom)" : undefined}
              style={{ transition: "fill 0.6s ease" }}
            />
          </g>

          {/* Back layer: legs — split into thighs (top) and calves (bottom) for region targeting */}
          <g filter="url(#paperShadow)">
            {/* Left thigh */}
            <rect
              x="116" y="244" width="32" height="70" rx="14"
              fill={partFill("thighs", COLOR_BACK)}
              filter={isActive("thighs") ? "url(#activeBloom)" : undefined}
              style={{ transition: "fill 0.6s ease" }}
            />
            {/* Right thigh */}
            <rect
              x="152" y="244" width="32" height="70" rx="14"
              fill={partFill("thighs", COLOR_BACK)}
              filter={isActive("thighs") ? "url(#activeBloom)" : undefined}
              style={{ transition: "fill 0.6s ease" }}
            />
            {/* Left calf */}
            <rect
              x="116" y="314" width="32" height="70" rx="14"
              fill={partFill("calves", COLOR_BACK)}
              filter={isActive("calves") ? "url(#activeBloom)" : undefined}
              style={{ transition: "fill 0.6s ease" }}
            />
            {/* Right calf */}
            <rect
              x="152" y="314" width="32" height="70" rx="14"
              fill={partFill("calves", COLOR_BACK)}
              filter={isActive("calves") ? "url(#activeBloom)" : undefined}
              style={{ transition: "fill 0.6s ease" }}
            />
          </g>

          {/* Mid layer: neck */}
          <g filter="url(#paperShadow)">
            <rect
              x="138" y="86" width="24" height="22" rx="10"
              fill={partFill("neck", COLOR_MID)}
              filter={isActive("neck") ? "url(#activeBloom)" : undefined}
              style={{ transition: "fill 0.6s ease" }}
            />
          </g>

          {/* Mid layer: torso — split visually via an upper-shoulders rect overlay on top */}
          <g filter="url(#paperShadow)">
            {/* Full torso path acts as the pelvis/base */}
            <path
              d="M104 118 Q104 104 120 102 L180 102 Q196 104 196 118 L192 232 Q192 248 176 250 L124 250 Q108 248 108 232 Z"
              fill={isActive("pelvis") || isActive("backShoulders") ? ACTIVE_FILL : COLOR_MID}
              filter={isActive("pelvis") || isActive("backShoulders") ? "url(#activeBloom)" : undefined}
              style={{ transition: "fill 0.6s ease" }}
            />
            {/* Shoulders overlay — only fully opaque when backShoulders is active,
                otherwise blends with the torso for the original silhouette feel */}
            {isActive("backShoulders") && (
              <rect
                x="104" y="102" width="92" height="60" rx="14"
                fill={ACTIVE_GLOW}
                opacity={0.4}
                filter="url(#activeBloom)"
                style={{ transition: "opacity 0.6s ease" }}
              />
            )}
          </g>

          {/* Front layer: head */}
          <g filter="url(#paperShadow)">
            <circle
              cx="150" cy="60" r="34"
              fill={partFill("face", COLOR_FRONT)}
              filter={isActive("face") ? "url(#activeBloom)" : undefined}
              style={{ transition: "fill 0.6s ease" }}
            />
          </g>

          {/* Foot shadow ellipses — also serve as the "feet" target */}
          <g opacity="0.7">
            <ellipse
              cx="132" cy="386" rx="22" ry="6"
              fill={isActive("feet") ? ACTIVE_FILL : COLOR_SHADOW}
              filter={isActive("feet") ? "url(#activeBloom)" : undefined}
              style={{ transition: "fill 0.6s ease" }}
            />
            <ellipse
              cx="168" cy="386" rx="22" ry="6"
              fill={isActive("feet") ? ACTIVE_FILL : COLOR_SHADOW}
              filter={isActive("feet") ? "url(#activeBloom)" : undefined}
              style={{ transition: "fill 0.6s ease" }}
            />
          </g>
        </svg>
      </div>
    </div>
  );
}
