import { useNavigate } from "react-router-dom";
import { markFoundationsRead } from "../lib/storage";
import { track } from "../lib/analytics";

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
    track("foundations_completed");
    navigate("/", { replace: true });
  };

  return (
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
              maxWidth: "28ch",
            }}
          >
            Attention is trained, not inherited.
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
              Trataka is an ancient practice of steady gazing. A single flame
              becomes the object of attention. The eyes rest on the light, the
              mind inevitably wanders, and attention is gently returned. This
              simple act of returning is the practice.
            </p>

            <p style={{ margin: 0 }}>
              Many people believe focus is something they either have or do not
              have. In reality, attention is a capacity that can be strengthened
              through repetition. Each time you notice distraction and come
              back to the flame, you reinforce the neural pathways involved in
              sustained attention and self-regulation. Over time, mental
              restlessness softens, concentration deepens, and a greater sense
              of presence emerges.
            </p>

            <p style={{ margin: 0 }}>
              In this 11-minute practice, you will settle the body, slow the
              breath, and move through five rounds of gazing. The invitation is
              not to force concentration or achieve a particular state.
              Instead, allow the flame to anchor your awareness. When the mind
              drifts, simply return.
            </p>

            <p style={{ margin: 0 }}>
              The benefit of Trataka is not found in a single session, but in
              the steady accumulation of practice. One return strengthens
              attention. Hundreds of returns transform it.
            </p>
          </div>

          <button
            onClick={handleBegin}
            className="cta-pill"
            style={{ marginTop: "56px" }}
          >
            Begin practice
          </button>
        </div>
      </div>
  );
}
