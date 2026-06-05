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
              color: "rgba(245, 233, 218, 0.92)",
              lineHeight: 1.25,
              marginBottom: "40px",
              maxWidth: "22ch",
            }}
          >
            Attention is trained, not given.
          </h1>

          <div
            style={{
              fontSize: "16px",
              lineHeight: 1.8,
              color: "rgba(217, 203, 184, 0.82)",
              maxWidth: "52ch",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: "22px",
            }}
          >
            <p style={{ margin: 0 }}>
              Trataka is the practice of resting attention on a single point of
              light. The flame holds your gaze. When the mind moves, you
              return. That returning, repeated, is the whole training.
            </p>

            <p style={{ margin: 0 }}>
              Attention is a skill, not a fixed trait. Each time you bring
              focus back, you strengthen the circuits between the prefrontal
              cortex and the networks that produce mind-wandering. Over weeks,
              the wandering quiets. Focus steadies. The space between stimulus
              and reaction widens.
            </p>

            <p style={{ margin: 0 }}>
              Drishti is ten minutes. You will settle the body, slow the
              breath, gaze at a flame in four rounds, and close in silence.
              There is nothing to achieve in any one session. The practice
              changes you only when it is repeated.
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
