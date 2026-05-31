import { useEffect, useState } from "react";

/**
 * BrushstrokeEyes — two brush-stroke closed eyes with a warm bloom behind.
 * Used between trataka gaze rounds (eyes-closed recovery phases).
 * Fades in on mount and breathes gently in sync with the recovery rest.
 */
export default function BrushstrokeEyes() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    // Flow element — not absolutely positioned — so it contributes height
    // to the visual container and doesn't collapse to zero.
    <div
      style={{
        width: "100%",
        height: "clamp(260px, 42vh, 360px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 1.4s ease-in-out",
      }}
    >
      {/* Stage — square, scales with the shorter viewport dimension. */}
      <div
        style={{
          position: "relative",
          width: "min(220px, 58vw)",
          height: "min(220px, 58vw)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Warm non-scaling bloom behind the eyes. */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: "140%",
            height: "80%",
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,196,120,0.40), rgba(255,170,90,0) 68%)",
            filter: "blur(26px)",
            animation: "brushBloom 9s ease-in-out infinite",
          }}
        />

        {/* The two brush-stroke closed eyes as a single SVG. */}
        <svg
          viewBox="0 0 200 120"
          style={{
            position: "relative",
            width: "72%",
            filter: "drop-shadow(0 0 12px rgba(255,180,100,0.45))",
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
          .brushstroke-eyes { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
