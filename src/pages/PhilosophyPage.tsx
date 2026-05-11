export default function PhilosophyPage() {
  return (
    <div
      style={{
        padding: "60px 24px 100px",
        maxWidth: "640px",
        margin: "0 auto",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(40px, 6vw, 56px)",
          fontWeight: 400,
          marginBottom: "56px",
          lineHeight: 1.08,
        }}
      >
        Why focus
      </h1>

      {/* Opening */}
      <p
        style={{
          fontSize: "20px",
          lineHeight: 1.7,
          color: "var(--text)",
          marginBottom: "36px",
        }}
      >
        Most of what we want requires one thing first: the ability to direct our
        attention and hold it there.
      </p>

      {/* List */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          marginBottom: "40px",
          paddingLeft: "2px",
        }}
      >
        {[
          "To do good work.",
          "To be present with the people we care about.",
          "To learn something difficult.",
          "To make something worth making.",
        ].map((line) => (
          <div
            key={line}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "14px",
            }}
          >
            <span
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: "var(--accent)",
                opacity: 0.6,
                flexShrink: 0,
                marginTop: "10px",
              }}
            />
            <span
              style={{
                fontSize: "18px",
                lineHeight: 1.6,
                color: "var(--muted)",
              }}
            >
              {line}
            </span>
          </div>
        ))}
      </div>

      {/* Body */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <p style={{ fontSize: "17px", lineHeight: 1.8, color: "var(--muted)", margin: 0 }}>
          It sounds simple. It rarely is.
        </p>

        <p style={{ fontSize: "17px", lineHeight: 1.8, color: "var(--muted)", margin: 0 }}>
          You can have every resource, every opportunity, every tool. But if you
          cannot focus, if your attention scatters the moment a task requires
          depth, none of it becomes real.
        </p>

        <p style={{ fontSize: "17px", lineHeight: 1.8, color: "var(--muted)", margin: 0 }}>
          Trataka is one of the oldest attention practices. It asks you to sit,
          fix your gaze on a small flame, and keep it there. Nothing else.
        </p>

        {/* Pulled-out line */}
        <p
          style={{
            fontSize: "20px",
            lineHeight: 1.6,
            color: "var(--text)",
            fontFamily: '"Playfair Display", Georgia, serif',
            fontWeight: 400,
            margin: "8px 0",
          }}
        >
          When your mind wanders, you return.
        </p>

        <p
          style={{
            fontSize: "17px",
            lineHeight: 1.8,
            color: "var(--muted)",
            fontStyle: "italic",
            margin: 0,
          }}
        >
          That is the practice.
        </p>

        <p style={{ fontSize: "17px", lineHeight: 1.8, color: "var(--muted)", margin: 0 }}>
          It will not transform your life overnight. But done daily, it becomes
          a quiet commitment to something most people never train: the ability
          to be fully where you are.
        </p>
      </div>
    </div>
  );
}
