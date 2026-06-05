import MeditationBackground from "../components/MeditationBackground";

/**
 * Minimal instructions page — five lines, no jargon.
 * The session itself live-guides every step; this is just a primer for
 * the curious user. Linked from the landing page and the top nav.
 */
const STEPS = [
  { title: "Settle", body: "Sit tall, relax shoulders and jaw." },
  { title: "Body release", body: "Tense each area for five seconds, then let go." },
  { title: "Breath", body: "Slow inhale, longer exhale." },
  { title: "Flame gaze", body: "Look steadily at the flame." },
  { title: "Eyes closed", body: "Rest in the afterimage." },
];

export default function InstructionsPage() {
  return (
    <MeditationBackground>
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
                      fontFamily: '"Playfair Display", Georgia, serif',
                      fontSize: "20px",
                      color: "rgba(245, 233, 218, 0.88)",
                      marginBottom: "4px",
                    }}
                  >
                    {step.title}
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
              fontStyle: "italic",
              color: "rgba(217, 203, 184, 0.5)",
              textAlign: "center",
              maxWidth: "44ch",
              lineHeight: 1.6,
            }}
          >
            The app guides you through each step. Camera is optional.
          </p>
        </div>
      </div>
    </MeditationBackground>
  );
}
