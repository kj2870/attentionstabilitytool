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
      {/* Outer halo — larger, dimmer, slower rhythm. Centered on the same
          point as the inner halo so the two pulse concentrically rather than
          wobbling optically off-axis. */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "300px",
          height: "300px",
          marginLeft: "-150px",
          marginTop: "-150px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,170,90,0.10) 0%, rgba(210,130,60,0.05) 40%, transparent 75%)",
          filter: "blur(8px)",
          animation: "settleBreathOuter 9s ease-in-out infinite",
        }}
      />
      {/* Inner halo — primary, brighter, faster rhythm. */}
      <div
        style={{
          position: "relative",
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
        @keyframes settleBreathOuter {
          0%, 100% { transform: scale(0.96); opacity: 0.55; }
          50%      { transform: scale(1.12); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
