import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Diya from "../components/Diya";
import { signInWithGoogle } from "../lib/auth";
import { track } from "../lib/analytics";

/**
 * Landing screen for first-time visitors. One screen, no scroll.
 * Diya (with warm bloom) → wordmark → tagline pair → CTA → quiet links.
 * Everything inside a 100dvh container with overflow: hidden so it always
 * fits the viewport.
 */
export default function OnboardingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    track("landing_viewed");
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setAuthError("");
    track("signin_started");
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
        height: "100dvh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "16px 24px",
      }}
    >
      {/* Edge vignette — gently draws the eye to centre, matches the home
          screen so the moment of sign-in feels continuous. */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 80% 70% at center 48%, transparent 55%, rgba(0,0,0,0.55) 100%)",
          zIndex: 0,
        }}
      />

      {/* Diya with warm bloom — makes the flame feel lit rather than placed. */}
      <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: "min(520px, 78vw)",
            height: "min(520px, 78vw)",
            transform: "translate(-50%, -50%)",
            background:
              "radial-gradient(circle, rgba(255,176,90,0.28) 0%, rgba(255,150,70,0.10) 32%, transparent 62%)",
            filter: "blur(30px)",
            pointerEvents: "none",
          }}
        />
        <div className="home-diya-scaler" style={{ position: "relative" }}>
          <Diya />
        </div>
      </div>

      <h1
        style={{
          fontSize: "clamp(44px, 6.4vw, 64px)",
          margin: "8px 0 14px",
          fontWeight: 400,
          lineHeight: 1.05,
          letterSpacing: "0.04em",
          fontFamily: '"Samarkan", "Playfair Display", Georgia, serif',
          position: "relative",
          zIndex: 1,
        }}
      >
        drishti
      </h1>

      {/* Tagline pair — Mukta light, matches the session voice. */}
      <p
        style={{
          margin: 0,
          maxWidth: "32ch",
          fontSize: "clamp(17px, 1.9vw, 21px)",
          fontFamily: '"Mukta", "DM Sans", sans-serif',
          fontWeight: 300,
          letterSpacing: "0.02em",
          lineHeight: 1.4,
          color: "rgba(245, 233, 218, 0.82)",
          position: "relative",
          zIndex: 1,
        }}
      >
        A practice in steadiness.
      </p>

      <p
        style={{
          margin: "14px 0 0",
          fontFamily: '"Mukta", "DM Sans", sans-serif',
          fontWeight: 300,
          fontSize: "12px",
          letterSpacing: "0.32em",
          paddingLeft: "0.32em",
          textTransform: "lowercase",
          color: "rgba(217, 203, 184, 0.52)",
          position: "relative",
          zIndex: 1,
        }}
      >
        body · breath · gaze · awareness
      </p>

      {/* Auth error slot — fixed height so the CTA doesn't shift when an
          error appears. */}
      <div
        aria-live="polite"
        style={{
          minHeight: "20px",
          marginTop: "36px",
          marginBottom: "12px",
          maxWidth: "32ch",
          color: "#ff8080",
          fontSize: "13px",
          lineHeight: 1.5,
          position: "relative",
          zIndex: 1,
        }}
      >
        {authError}
      </div>

      <button
        onClick={() => void handleGoogleSignIn()}
        disabled={isLoading}
        className="cta-pill"
        style={{ position: "relative", zIndex: 1 }}
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

      {/* Tertiary links — quietly grouped below the CTA. One row, dot
          separator, so no element looks orphaned. */}
      <div
        style={{
          marginTop: "28px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          fontSize: "12px",
          fontFamily: '"Mukta", "DM Sans", sans-serif',
          fontWeight: 300,
          letterSpacing: "0.06em",
          color: "rgba(217, 203, 184, 0.45)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Link
          to="/instructions"
          style={{
            color: "inherit",
            textDecoration: "none",
            borderBottom: "1px solid rgba(217, 203, 184, 0.2)",
            paddingBottom: "2px",
          }}
        >
          instructions
        </Link>
        <span aria-hidden style={{ opacity: 0.4 }}>·</span>
        <Link
          to="/privacy"
          style={{
            color: "inherit",
            textDecoration: "none",
            borderBottom: "1px solid rgba(217, 203, 184, 0.2)",
            paddingBottom: "2px",
          }}
        >
          privacy
        </Link>
      </div>

      {/* Single quiet reassurance line — the trust claim. */}
      <div
        style={{
          marginTop: "20px",
          fontSize: "11px",
          fontFamily: '"Mukta", "DM Sans", sans-serif',
          fontWeight: 300,
          letterSpacing: "0.04em",
          color: "rgba(217, 203, 184, 0.34)",
          position: "relative",
          zIndex: 1,
        }}
      >
        camera optional · processed on your device
      </div>
    </div>
  );
}
