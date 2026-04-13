type MeditationBackgroundProps = {
  timeOfDay: "Morning" | "Midday" | "Night";
  children: React.ReactNode;
};

export default function MeditationBackground({
  timeOfDay,
  children,
}: MeditationBackgroundProps) {
  const palette =
    timeOfDay === "Morning"
      ? {
          sky: "linear-gradient(180deg, #2b2430 0%, #5a4a45 35%, #a06e47 70%, #0E0E10 100%)",
          glow: "rgba(255, 190, 120, 0.10)",
          accent: "rgba(255, 210, 140, 0.10)",
        }
      : timeOfDay === "Midday"
      ? {
          sky: "linear-gradient(180deg, #1f2430 0%, #3c404f 30%, #665c52 70%, #0E0E10 100%)",
          glow: "rgba(255, 179, 71, 0.08)",
          accent: "rgba(255, 220, 160, 0.06)",
        }
      : {
          sky: "linear-gradient(180deg, #10131d 0%, #181624 35%, #241c21 65%, #0E0E10 100%)",
          glow: "rgba(255, 150, 70, 0.08)",
          accent: "rgba(255, 180, 110, 0.05)",
        };

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        overflow: "hidden",
        background: palette.sky,
      }}
    >
      {/* soft halo behind diya */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at center 46%, ${palette.glow} 0%, transparent 30%)`,
          pointerEvents: "none",
        }}
      />

      {/* vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at center, transparent 0%, transparent 35%, rgba(0,0,0,0.28) 68%, rgba(0,0,0,0.58) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* simple temple/floor suggestion */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "28%",
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.0) 0%, rgba(20,14,10,0.35) 10%, rgba(24,18,14,0.65) 100%)",
          borderTop: `1px solid ${palette.accent}`,
          pointerEvents: "none",
        }}
      />

      {/* pillar suggestions */}
      <div
        style={{
          position: "absolute",
          left: "8%",
          top: 0,
          bottom: 0,
          width: "34px",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
          opacity: 0.35,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: "8%",
          top: 0,
          bottom: 0,
          width: "34px",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
          opacity: 0.35,
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}