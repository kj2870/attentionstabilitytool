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
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.28)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "18px",
        }}
      >
        <div
          style={{
            width: "190px",
            height: "190px",
            borderRadius: "50%",
            border: isInhale
              ? "2px solid rgba(232, 122, 95, 0.45)"
              : "2px solid rgba(110, 160, 205, 0.42)",
            background: isInhale
              ? "radial-gradient(circle, rgba(232,122,95,0.24) 0%, rgba(232,122,95,0.08) 48%, transparent 74%)"
              : "radial-gradient(circle, rgba(110,160,205,0.2) 0%, rgba(110,160,205,0.06) 48%, transparent 74%)",
            transform: isInhale ? "scale(1.16)" : "scale(0.8)",
            transition: `transform ${durationSec}s linear`,
            boxShadow: isInhale
              ? "0 0 58px rgba(232,122,95,0.14)"
              : "0 0 58px rgba(110,160,205,0.13)",
          }}
        />

        <div
          style={{
            fontSize: "28px",
            color: "#F5E9DA",
            minHeight: "34px",
          }}
        >
          {isInhale ? "Inhale" : "Exhale"}
        </div>
      </div>
    </div>
  );
}
