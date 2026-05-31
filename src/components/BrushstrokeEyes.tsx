import { useEffect, useState } from "react";

/**
 * BrushstrokeEyes — two brush-stroke closed eyes with a warm bloom behind.
 * Used between trataka gaze rounds (eyes-closed recovery phases).
 * Fades in on mount and breathes gently in sync with the recovery rest.
 *
 * The bloom is a single non-scaling radial gradient that holds steady
 * brightness while the eyes themselves drift through a subtle scale loop,
 * so the composition reads as a calm afterglow rather than animation.
 */
export default function BrushstrokeEyes() {
  // Drive an opacity fade-in on first frame so this composes smoothly with
  // whatever was on screen during the preceding gaze round.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 1.4s ease-in-out",
      }}
    >
      {/* Stage — square box that scales with viewport. */}
      <div
        style={{
          position: "relative",
          width: "min(46vh, 78vw)",
          aspectRatio: "1 / 1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Warm bloom behind the eyes. Non-scaling so brightness stays calm. */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: "120%",
            height: "70%",
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,196,120,0.40), rgba(255,170,90,0) 68%)",
            filter: "blur(26px)",
            animation: "brushBloom 9s ease-in-out infinite",
          }}
        />

        {/* The two brush-stroke eyes, drawn as one SVG. */}
        <svg
          viewBox="0 0 200 120"
          style={{
            position: "relative",
            width: "62%",
            filter: "drop-shadow(0 0 10px rgba(255,180,100,0.4))",
            animation: "brushEyes 9s ease-in-out infinite",
          }}
        >
          <defs>
            <linearGradient id="brushEyesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,232,196,0.96)" />
              <stop offset="100%" stopColor="rgba(255,182,110,0.7)" />
            </linearGradient>
          </defs>
          <g fill="url(#brushEyesGrad)">
            <path d="M24 58 Q58 82 92 58 Q58 66 24 58 Z" />
            <path d="M108 58 Q142 82 176 58 Q142 66 108 58 Z" />
          </g>
        </svg>
      </div>

      {/* Keyframes scoped via a one-off <style> tag — keeps the component
          self-contained without adding rules to the global stylesheet. */}
      <style>{`
        @keyframes brushBloom {
          0%, 100% { opacity: 0.82; }
          50%      { opacity: 1; }
        }
        @keyframes brushEyes {
          0%, 100% { opacity: 0.9;  transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.025); }
        }
        @media (prefers-reduced-motion: reduce) {
          svg[viewBox="0 0 200 120"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
