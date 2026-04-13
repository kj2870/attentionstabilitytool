import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Diya from "../components/Diya";
import MeditationBackground from "../components/MeditationBackground";
import { signIn } from "../lib/auth";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "15px 16px",
  marginBottom: "12px",
  borderRadius: "16px",
  border: "1px solid rgba(255,179,71,0.16)",
  background: "rgba(255,255,255,0.05)",
  color: "#F5E9DA",
  outline: "none",
  fontSize: "16px",
};

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async () => {
    if (!email.trim()) { setError("Please enter your email."); return; }
    if (!password) { setError("Please enter your password."); return; }

    setIsLoading(true);
    setError("");

    try {
      await signIn({ email, password });
      // onAuthStateChange in App.tsx will detect the session and redirect to "/"
      navigate("/", { replace: true });
    } catch (err) {
      setError((err as Error).message ?? "Sign in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") void handleSignIn();
  };

  return (
    <MeditationBackground timeOfDay="Night">
      <div
        className="page-shell"
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "28px 20px",
        }}
      >
        <div
          className="glass-card"
          style={{
            width: "100%",
            maxWidth: "440px",
            padding: "40px 36px",
            textAlign: "center",
          }}
        >
          <div style={{ marginBottom: "28px", transform: "scale(0.9)" }}>
            <Diya />
          </div>

          <h1
            className="section-title"
            style={{ marginBottom: "10px" }}
          >
            Welcome back
          </h1>

          <p
            style={{
              color: "#bfae97",
              fontSize: "16px",
              lineHeight: 1.65,
              marginBottom: "28px",
            }}
          >
            Sign in to continue your practice.
          </p>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="email"
            style={inputStyle}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="current-password"
            style={inputStyle}
          />

          {error && (
            <div
              style={{
                color: "#ff8080",
                fontSize: "14px",
                marginBottom: "14px",
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          <button
            className="primary-button"
            onClick={() => void handleSignIn()}
            disabled={isLoading}
            style={{ width: "100%", opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading ? "Signing in…" : "Sign In"}
          </button>

          <div
            style={{
              marginTop: "24px",
              color: "#bfae97",
              fontSize: "15px",
            }}
          >
            New here?{" "}
            <span
              onClick={() => navigate("/onboarding")}
              style={{ color: "#FFB347", cursor: "pointer" }}
            >
              Create account
            </span>
          </div>
        </div>
      </div>
    </MeditationBackground>
  );
}
