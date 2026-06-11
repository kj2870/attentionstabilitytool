import { useState } from "react";
import { Link } from "react-router-dom";
import Diya from "../components/Diya";
import { signInWithGoogle } from "../lib/auth";

/**
 * Single-screen landing for first-time visitors.
 * Diya + wordmark + tagline + Google sign-in + small "Instructions" link.
 * All previous multi-step onboarding content has moved into the dedicated
 * Instructions / Philosophy / Science / Privacy pages and (post-auth) the
 * one-time Foundations gate.
 */
export default function OnboardingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setAuthError("");
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError((err as Error).message ?? "Sign in failed. Please try again.");
      setIsLoading(false);
    }
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
          textAlign: "center",
          padding: "32px 24px",
        }}
      >
        <div style={{ marginBottom: "-4px" }}>
          <Diya />
        </div>

        <h1
          style={{
            fontSize: "clamp(48px, 7vw, 72px)",
            marginBottom: "10px",
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: "0.04em",
            fontFamily: '"Samarkan", "Playfair Display", Georgia, serif',
          }}
        >
          drishti
        </h1>

        <p
          style={{
            maxWidth: "36ch",
            fontSize: "clamp(16px, 1.9vw, 19px)",
            lineHeight: 1.55,
            color: "rgba(217, 203, 184, 0.68)",
            marginBottom: "44px",
          }}
        >
          A daily ritual to train attention and calm the mind.
        </p>

        {/* Fixed slot for auth errors so showing one doesn't shove the CTA down. */}
        <div
          aria-live="polite"
          style={{
            minHeight: "20px",
            marginBottom: "16px",
            maxWidth: "32ch",
            color: "#ff8080",
            fontSize: "14px",
            lineHeight: 1.5,
          }}
        >
          {authError}
        </div>

        <button
          onClick={() => void handleGoogleSignIn()}
          disabled={isLoading}
          className="cta-pill"
        >
          {!isLoading && (
            <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.2l-6.3-5.4C29.5 35.1 26.9 36 24 36c-5.1 0-9.5-3.2-11.3-7.8l-6.5 5C9.5 39.5 16.3 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.3 5.4C37 38.1 44 33 44 24c0-1.2-.1-2.3-.4-3.5z" />
            </svg>
          )}
          {isLoading ? "Redirecting…" : "Continue with Google"}
        </button>

        <Link
          to="/instructions"
          style={{
            marginTop: "32px",
            fontSize: "13px",
            letterSpacing: "0.08em",
            color: "rgba(217, 203, 184, 0.5)",
            textDecoration: "none",
            borderBottom: "1px solid rgba(217, 203, 184, 0.18)",
            paddingBottom: "2px",
          }}
        >
          instructions
        </Link>

        <div
          style={{
            marginTop: "48px",
            fontSize: "11px",
            letterSpacing: "0.06em",
            color: "rgba(217, 203, 184, 0.35)",
            maxWidth: "32ch",
            lineHeight: 1.6,
          }}
        >
          Camera optional. Data stays on your device.{" "}
          <Link
            to="/privacy"
            style={{ color: "rgba(217, 203, 184, 0.55)", textDecoration: "underline" }}
          >
            Privacy
          </Link>
        </div>
      </div>
  );
}
