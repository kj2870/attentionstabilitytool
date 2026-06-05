import { useNavigate } from "react-router-dom";
import MeditationBackground from "../components/MeditationBackground";
import { markFoundationsRead } from "../lib/storage";

/**
 * One-time gate shown to new users immediately after sign-in.
 * Combines the philosophy + science crux into a single short read.
 * The only forward action is "Begin practice" — which sets the
 * firstReadComplete flag and lands the user on Home.
 *
 * Existing users (grandfathered) never see this page.
 */
export default function FoundationsPage() {
  const navigate = useNavigate();

  const handleBegin = () => {
    markFoundationsRead();
    navigate("/", { replace: true });
  };

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
          padding: "64px 24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "620px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "rgba(217, 203, 184, 0.45)",
              marginBottom: "32px",
            }}
          >
            before you begin
          </div>

          <h1
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: "clamp(28px, 4vw, 38px)",
              fontWeight: 400,
              fontStyle: "italic",
              color: "rgba(245, 233, 218, 0.9)",
              lineHeight: 1.25,
              marginBottom: "36px",
              maxWidth: "26ch",
            }}
          >
            Attention is the foundation of a clear mind.
          </h1>

          <div
            style={{
              fontSize: "16px",
              lineHeight: 1.75,
              color: "rgba(217, 203, 184, 0.78)",
              maxWidth: "52ch",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <p style={{ margin: 0 }}>
              For thousands of years, contemplative traditions have used
              steady-gaze practices — <em>trataka</em> — to train the mind.
              Sustained attention on a single point teaches the nervous system
              to settle, to recover from distraction, and to rest in stillness.
            </p>

            <p style={{ margin: 0 }}>
              Modern research treats attention as a skill, not a trait. Short,
              consistent training measurably improves focus, emotional
              regulation, and the ability to return to the present moment after
              the mind wanders.
            </p>

            <p style={{ margin: 0 }}>
              Drishti is ten minutes. A body release, slow breath, four rounds
              of gazing, and a quiet integration. Done daily, the effect
              compounds. There is no goal beyond the practice itself.
            </p>
          </div>

          <button
            onClick={handleBegin}
            style={{
              marginTop: "56px",
              padding: "14px 36px",
              borderRadius: "999px",
              border: "1px solid rgba(255,179,71,0.45)",
              background: "rgba(255,179,71,0.18)",
              color: "#ffd9a3",
              fontSize: "16px",
              fontWeight: 500,
              letterSpacing: "0.06em",
              cursor: "pointer",
              backdropFilter: "blur(6px)",
              transition: "background 0.3s ease, box-shadow 0.5s ease, color 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,179,71,0.28)";
              e.currentTarget.style.boxShadow = "0 0 28px rgba(255,179,71,0.35)";
              e.currentTarget.style.color = "#ffe6c2";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,179,71,0.18)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.color = "#ffd9a3";
            }}
          >
            Begin practice
          </button>
        </div>
      </div>
    </MeditationBackground>
  );
}
