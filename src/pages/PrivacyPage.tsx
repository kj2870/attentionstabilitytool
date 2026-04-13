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
        padding: "60px 24px 100px",
        maxWidth: "680px",
        margin: "0 auto",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(40px, 6vw, 56px)",
          fontWeight: 400,
          marginBottom: "32px",
        }}
      >
        Privacy
      </h1>

      <div
        className="glass-card"
        style={{ padding: "28px 30px", marginBottom: "20px" }}
      >
        <div
          style={{
            fontSize: "22px",
            fontFamily: '"Fraunces", Georgia, serif',
            marginBottom: "16px",
          }}
        >
          How your data is handled
        </div>

        <div
          style={{
            display: "grid",
            gap: "12px",
            color: "#d9cbb8",
            fontSize: "16px",
            lineHeight: 1.7,
          }}
        >
          <div>● All video processing happens locally on your device. No video is ever stored or uploaded.</div>
          <div>● Session metrics — attention score, blink count, and duration — are saved to your account so you can track progress over time.</div>
          <div>● Your account is secured with email and password via Supabase. We do not sell or share your data.</div>
          <div>● You can delete your account and all associated data at any time by contacting us.</div>
        </div>
      </div>

      <div
        className="glass-card"
        style={{ padding: "28px 30px", marginBottom: "32px" }}
      >
        <div
          style={{
            fontSize: "22px",
            fontFamily: '"Fraunces", Georgia, serif',
            marginBottom: "16px",
          }}
        >
          Account
        </div>

        <p
          style={{
            color: "#bfae97",
            fontSize: "15px",
            lineHeight: 1.65,
            marginBottom: "20px",
          }}
        >
          Signing out will clear your local session. Your practice history
          remains saved to your account and will be available when you sign
          back in.
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
          {isSigningOut ? "Signing out…" : "Sign Out"}
        </button>
      </div>
    </div>
  );
}
