import { useEffect, useState } from "react";
import type { BreathAction } from "../lib/sessionScript";

type BreathGuideProps = {
  action: BreathAction;
  durationSec: number;
};

// Natural breath easing — sine-like, no sharp midpoint.
const BREATH_EASING = "cubic-bezier(0.37, 0, 0.63, 1)";

export default function BreathGuide({ action, durationSec }: BreathGuideProps) {
  // Start small on the very first mount so the opening inhale visibly grows
  // from a tiny seed. After the first frame we flip to the real target scale
  // and the CSS transition carries it. Because this component stays mounted
  // across all breath phases (inhale ↔ exhale phases share visualMode=breath),
  // the action prop simply re-targets the transform — no remount, no jump.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const isInhale = action === "inhale";
  // Tighter range so the shift between inhale and exhale feels gentle rather
  // than dramatic, and the perceived "shade" of the gradient stays uniform.
  const targetScale = !mounted ? 0.42 : isInhale ? 1.12 : 0.7;

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
      {/* The breathing disc — gradient shifts subtly between a brighter amber
          on inhale and a deeper ember on exhale. Scale + colour animate together
          on the same easing so the breath feels like one continuous gesture. */}
      <div
        style={{
          width: "240px",
          height: "240px",
          borderRadius: "50%",
          background: isInhale
            ? "radial-gradient(circle, rgba(255,210,140,0.48) 0%, rgba(245,170,90,0.30) 40%, rgba(210,125,55,0.10) 65%, transparent 88%)"
            : "radial-gradient(circle, rgba(230,165,95,0.40) 0%, rgba(200,115,55,0.26) 40%, rgba(150,75,30,0.10) 65%, transparent 88%)",
          transform: `scale(${targetScale})`,
          transition: `transform ${durationSec}s ${BREATH_EASING}, background ${durationSec}s ${BREATH_EASING}`,
          filter: "blur(2px)",
        }}
      />
    </div>
  );
}
