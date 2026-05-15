export default function PhilosophyPage() {
  return (
    <div
      style={{
        padding: "60px 24px 100px",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(40px, 6vw, 56px)",
          fontWeight: 400,
          marginBottom: "48px",
          lineHeight: 1.08,
        }}
      >
        Why focus
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <p style={{ fontSize: "17px", lineHeight: 1.8, color: "var(--muted)", margin: 0 }}>
          Most of what we want requires one thing first: the ability to direct our attention and hold it there.
        </p>

        <p style={{ fontSize: "17px", lineHeight: 1.8, color: "var(--muted)", margin: 0 }}>
          To do good work. To be present with the people we care about. To learn something difficult. To make something worth making.
        </p>

        <p style={{ fontSize: "17px", lineHeight: 1.8, color: "var(--muted)", margin: 0 }}>
          It sounds simple. It rarely is. You can have every resource, every opportunity, every tool. But if you cannot focus — if your attention scatters the moment a task requires depth — none of it becomes real.
        </p>

        <p style={{ fontSize: "17px", lineHeight: 1.8, color: "var(--muted)", margin: 0 }}>
          Trataka is one of the oldest attention practices. It asks you to sit, fix your gaze on a small flame, and keep it there. Nothing else. When your mind wanders, you return. That is the practice.
        </p>

        <p style={{ fontSize: "17px", lineHeight: 1.8, color: "var(--muted)", margin: 0 }}>
          It will not transform your life overnight. But done daily, it becomes a quiet commitment to something most people never train: the ability to be fully where you are.
        </p>
      </div>
    </div>
  );
}
