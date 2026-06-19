/**
 * Instructions page — the six phases of the sit, with duration and rhythm.
 * The app live-guides every step; this is the structural overview for the
 * curious user. Linked from the landing page and the top nav.
 */
const STEPS = [
  {
    title: "Settle",
    duration: "30s",
    body: "Sit tall, eyes at screen level. Soften the shoulders and jaw, let the breath settle.",
  },
  {
    title: "Body release",
    duration: "~1.5 min",
    body: "Eight regions, feet to face. Tense for eight seconds, release for four.",
  },
  {
    title: "Breath",
    duration: "2 min",
    body: "Paced breathing — inhale for four seconds, exhale for eight. Ten cycles.",
  },
  {
    title: "Flame gaze",
    duration: "5 min",
    body: "Steady, unhurried gazing at the flame. Five rounds of sixty seconds.",
  },
  {
    title: "Eyes closed",
    duration: "12s between gaze rounds",
    body: "After rounds one through four, close the eyes and hold the afterimage briefly.",
  },
  {
    title: "Open awareness",
    duration: "~1 min",
    body: "Eyes closed, attention rests open. No object to hold.",
  },
];

export default function InstructionsPage() {
  return (
      <div
        className="page-shell"
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "48px 24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "560px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "rgba(217, 203, 184, 0.45)",
              marginBottom: "40px",
            }}
          >
            instructions
          </div>

          <ol
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "28px",
            }}
          >
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 1fr",
                  gap: "18px",
                  alignItems: "baseline",
                }}
              >
                <div
                  style={{
                    fontFamily: '"Playfair Display", Georgia, serif',
                    color: "rgba(255,179,71,0.7)",
                    fontSize: "16px",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "12px",
                      marginBottom: "6px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: '"Playfair Display", Georgia, serif',
                        fontSize: "20px",
                        color: "rgba(245, 233, 218, 0.88)",
                      }}
                    >
                      {step.title}
                    </div>
                    <div
                      style={{
                        fontFamily: '"Mukta", "DM Sans", sans-serif',
                        fontWeight: 300,
                        fontSize: "12px",
                        letterSpacing: "0.06em",
                        color: "rgba(217, 203, 184, 0.42)",
                      }}
                    >
                      {step.duration}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "15px",
                      lineHeight: 1.55,
                      color: "rgba(217, 203, 184, 0.65)",
                    }}
                  >
                    {step.body}
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <p
            style={{
              marginTop: "44px",
              fontSize: "13px",
              color: "rgba(217, 203, 184, 0.55)",
              textAlign: "center",
              maxWidth: "48ch",
              lineHeight: 1.7,
            }}
          >
            Eleven minutes, once a day. The app guides each step — camera is
            optional and only used to measure gaze steadiness.
          </p>
        </div>
      </div>
  );
}
