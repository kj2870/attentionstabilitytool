import { useEffect, useRef, useState } from "react";
import type { BreathAction } from "../lib/sessionScript";

type BreathGuideProps = {
  action: BreathAction;
  durationSec: number;
};

// Natural breath easing — sine-like, no sharp midpoint.
const BREATH_EASING = "cubic-bezier(0.37, 0, 0.63, 1)";

// Wider scale range so the shrink / expand is unmistakably visible.
const INHALE_SCALE = 1.35;
const EXHALE_SCALE = 0.55;

export default function BreathGuide({ action, durationSec }: BreathGuideProps) {
  // The component stays mounted across the whole breath phase (inhale ↔
  // exhale share visualMode=breath), so the action prop just re-targets
  // the CSS transition — no remount, no jump.
  //
  // On very first render we set the starting scale to the OPPOSITE of the
  // first action, then flip on the next frame. That way the browser sees
  // an actual value change and runs the transition, so the opening breath
  // visibly grows/shrinks instead of appearing at target scale instantly.
  const isInhale = action === "inhale";
  const firstRenderRef = useRef(true);
  const [primed, setPrimed] = useState(false);

  useEffect(() => {
    if (!primed) {
      const id = requestAnimationFrame(() => setPrimed(true));
      return () => cancelAnimationFrame(id);
    }
    firstRenderRef.current = false;
  }, [primed]);

  const targetScale = !primed
    ? isInhale
      ? EXHALE_SCALE
      : INHALE_SCALE
    : isInhale
    ? INHALE_SCALE
    : EXHALE_SCALE;

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
      {/* Steady ambient halo — does NOT scale. Provides constant background
          warmth so the moving disc never looks like it changes brightness. */}
      <div
        style={{
          position: "absolute",
          width: "320px",
          height: "320px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,180,100,0.10) 0%, rgba(220,140,70,0.05) 45%, transparent 75%)",
          filter: "blur(8px)",
        }}
      />
      {/* The breathing disc. Two stacked orbs (amber inhale, ember exhale) share
          the scale transform; opacity cross-fades between them on the same easing.
          Opacity interpolates cleanly in every browser, unlike radial-gradient
          strings — so the colour shift is smooth instead of snapping. */}
      <div
        style={{
          position: "relative",
          width: "240px",
          height: "240px",
          transform: `scale(${targetScale})`,
          transition: `transform ${durationSec}s ${BREATH_EASING}`,
          willChange: "transform",
          filter: "blur(2px)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,210,140,0.48) 0%, rgba(245,170,90,0.30) 40%, rgba(210,125,55,0.10) 65%, transparent 88%)",
            opacity: isInhale ? 1 : 0,
            transition: `opacity ${durationSec}s ${BREATH_EASING}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(230,165,95,0.40) 0%, rgba(200,115,55,0.26) 40%, rgba(150,75,30,0.10) 65%, transparent 88%)",
            opacity: isInhale ? 0 : 1,
            transition: `opacity ${durationSec}s ${BREATH_EASING}`,
          }}
        />
      </div>
    </div>
  );
}
