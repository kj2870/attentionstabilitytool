import { useEffect, useState } from "react";
import type { BreathAction } from "../lib/sessionScript";

type BreathGuideProps = {
  action: BreathAction;
  durationSec: number;
};

export default function BreathGuide({ action, durationSec }: BreathGuideProps) {
  // Start at a small scale on mount so the first inhale visibly expands from small.
  // After the first frame fires we flip to the real target scale, letting the CSS
  // transition carry it smoothly. On every subsequent action flip (inhale ↔ exhale)
  // the transition runs at the full breath duration.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const isInhale = action === "inhale";
  const targetScale = !mounted ? 0.48 : isInhale ? 1.18 : 0.72;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      {/* Single consistent gradient — only scale changes so the colour never shifts
          abruptly between inhale and exhale. The transition runs at the full breath
          duration so expansion/contraction is perfectly in sync with the cue. */}
      <div
        style={{
          width: "260px",
          height: "260px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,195,120,0.38) 0%, rgba(240,155,75,0.20) 35%, rgba(200,115,50,0.08) 60%, transparent 90%)",
          transform: `scale(${targetScale})`,
          transition: `transform ${durationSec}s ease-in-out`,
          filter: "blur(2px)",
        }}
      />
    </div>
  );
}
