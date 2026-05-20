import type { BreathAction } from "../lib/sessionScript";

type BreathGuideProps = {
  action: BreathAction;
  durationSec: number;
};

export default function BreathGuide({ action, durationSec }: BreathGuideProps) {
  const isInhale = action === "inhale";

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
      {/* Breath orb only — the "Inhale"/"Exhale" label is rendered by SessionPage
          in the same top text slot used by all other phases (consistent layout). */}
      <div
        style={{
          width: "260px",
          height: "260px",
          borderRadius: "50%",
          background: isInhale
            ? "radial-gradient(circle, rgba(255,200,130,0.42) 0%, rgba(255,170,90,0.22) 30%, rgba(220,130,60,0.10) 55%, rgba(180,100,40,0.04) 75%, transparent 95%)"
            : "radial-gradient(circle, rgba(255,180,110,0.28) 0%, rgba(220,140,70,0.14) 35%, rgba(180,100,40,0.06) 60%, transparent 90%)",
          transform: isInhale ? "scale(1.18)" : "scale(0.82)",
          transition: `transform ${durationSec}s ease-in-out, background 1.2s ease`,
          filter: "blur(2px)",
        }}
      />
    </div>
  );
}
