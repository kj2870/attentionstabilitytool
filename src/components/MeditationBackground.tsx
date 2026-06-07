type MeditationBackgroundProps = {
  children: React.ReactNode;
};

export default function MeditationBackground({ children }: MeditationBackgroundProps) {
  // Warm dark palette that matches the diya video's amber-on-black tonality.
  // Avoids cool blue/purple notes that made the diya feel like a separate block.
  const palette = {
    sky: "linear-gradient(180deg, #0a0805 0%, #15100a 40%, #1a120a 70%, #0a0805 100%)",
    glow: "rgba(255, 150, 70, 0.10)",
  };

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100dvh",
        background: palette.sky,
      }}
    >
      {/* Decorative layers clipped to their own stacking context — keeps them
          from leaking outside the viewport without creating a scroll boundary
          on the outer wrapper. */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        {/* soft halo */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse 60% 45% at center 48%, ${palette.glow} 0%, transparent 65%)`,
          }}
        />

        {/* vignette */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at center, transparent 0%, transparent 40%, rgba(0,0,0,0.32) 75%, rgba(0,0,0,0.62) 100%)",
          }}
        />

        {/* floor gradient */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "32%",
            background:
              "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(30,18,8,0.28) 40%, rgba(20,12,6,0.55) 100%)",
          }}
        />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}
