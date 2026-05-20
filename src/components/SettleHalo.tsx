// A very subtle breathing halo used during the settle and integrate phases.
// Anchors the eye without competing for attention — pulses on a slow 6-second
// cycle so it feels meditative rather than demanding.
//
// Same visual language as the breath orb and the body silhouette glow:
// pure radial gradient, no hard edges, blends into the dark background.
export default function SettleHalo() {
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
          width: "240px",
          height: "240px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,180,110,0.16) 0%, rgba(220,140,70,0.08) 35%, rgba(180,100,40,0.03) 60%, transparent 90%)",
          filter: "blur(4px)",
          animation: "settleBreath 6s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes settleBreath {
          0%, 100% { transform: scale(0.92); opacity: 0.7; }
          50%      { transform: scale(1.08); opacity: 1.0; }
        }
      `}</style>
    </div>
  );
}
