import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "../lib/auth";

export default function PrivacyPage() {
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      navigate("/onboarding", { replace: true });
    } catch {
      setIsSigningOut(false);
    }
  };

  return (
    <div
      style={{
        padding: "64px 24px 100px",
        maxWidth: "640px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "rgba(217, 203, 184, 0.45)",
          marginBottom: "28px",
        }}
      >
        your data
      </div>

      <h1
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: "clamp(28px, 4vw, 38px)",
          fontWeight: 400,
          color: "rgba(245, 233, 218, 0.92)",
          marginBottom: "36px",
          lineHeight: 1.2,
        }}
      >
        Privacy
      </h1>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "22px",
          fontSize: "16px",
          lineHeight: 1.8,
          color: "rgba(217, 203, 184, 0.82)",
          marginBottom: "56px",
        }}
      >
        <p style={{ margin: 0 }}>
          Video from your camera is processed entirely on your device. Nothing
          is recorded or uploaded.
        </p>

        <p style={{ margin: 0 }}>
          Session metrics (longest gaze, blink rate, duration) are saved to
          your account so you can see your trend over time.
        </p>

        <p style={{ margin: 0 }}>
          Any feedback notes you write on the summary screen are saved
          alongside them.
        </p>

        <p style={{ margin: 0 }}>
          The developer can read this data — it's used to understand whether
          the practice is helping people and to improve the app. It is not
          sold or shared with anyone else.
        </p>

        <p style={{ margin: 0 }}>
          Your password is handled by Google. We do not store it.
        </p>
      </div>

      <div
        style={{
          borderTop: "1px solid rgba(255, 179, 71, 0.08)",
          paddingTop: "32px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(217, 203, 184, 0.45)",
            marginBottom: "16px",
          }}
        >
          account
        </div>

        <p
          style={{
            color: "rgba(217, 203, 184, 0.75)",
            fontSize: "15px",
            lineHeight: 1.75,
            marginTop: 0,
            marginBottom: "24px",
          }}
        >
          Signing out clears your local session. Your practice history stays
          saved and will sync when you sign back in.
        </p>

        <button
          onClick={() => void handleSignOut()}
          disabled={isSigningOut}
          className="cta-pill"
        >
          {isSigningOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );
}
