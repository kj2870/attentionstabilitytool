import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "../lib/auth";
import MeditationBackground from "../components/MeditationBackground";

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
    <MeditationBackground>
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
          marginBottom: "40px",
        }}
      >
        Privacy
      </h1>

      <div className="glass-card" style={{ padding: "28px 30px", marginBottom: "16px" }}>
        <h2 style={{ fontWeight: 400, fontSize: "18px", marginTop: 0, marginBottom: "16px" }}>
          Your data
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", color: "var(--muted)", fontSize: "16px", lineHeight: 1.7 }}>
          <p style={{ margin: 0 }}>Video is processed entirely on your device. Nothing is recorded or uploaded.</p>
          <p style={{ margin: 0 }}>Session metrics (longest gaze, blink rate, duration) are saved to your account so you can see your trend over time.</p>
          <p style={{ margin: 0 }}>Your account is secured through Google. We do not store passwords or sell your data.</p>
          <p style={{ margin: 0 }}>To delete your account and all associated data, contact us at privacy@drishti.app.</p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: "28px 30px" }}>
        <h2 style={{ fontWeight: 400, fontSize: "18px", marginTop: 0, marginBottom: "12px" }}>
          Account
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "16px", lineHeight: 1.7, marginBottom: "20px", marginTop: 0 }}>
          Signing out clears your local session. Your practice history remains saved and will sync when you sign back in.
        </p>
        <button
          onClick={() => void handleSignOut()}
          disabled={isSigningOut}
          style={{
            padding: "12px 28px",
            borderRadius: "14px",
            border: "1px solid rgba(255,179,71,0.3)",
            background: "transparent",
            color: "#FFB347",
            fontSize: "16px",
            cursor: isSigningOut ? "not-allowed" : "pointer",
            opacity: isSigningOut ? 0.6 : 1,
            fontFamily: "inherit",
          }}
        >
          {isSigningOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
    </MeditationBackground>
  );
}
