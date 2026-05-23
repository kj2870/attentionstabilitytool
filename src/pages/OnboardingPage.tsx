import { useState } from "react";
import Diya from "../components/Diya";
import MeditationBackground from "../components/MeditationBackground";
import { RESEARCH_MODE } from "../lib/presentationMode";
import { signInWithGoogle } from "../lib/auth";

export default function OnboardingPage() {
  const [step, setStep] = useState(RESEARCH_MODE ? 4 : 0);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const next = () => setStep((prev) => prev + 1);

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
    <MeditationBackground >
      <div
        className="page-shell"
        style={{
          minHeight: "100dvh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "28px 20px",
        }}
      >
        {step === 0 && (
          <div
            className="centered-column"
            style={{
              textAlign: "center",
            }}
          >
            <div style={{ marginBottom: "34px", transform: "scale(1.12)" }}>
              <Diya />
            </div>

            <h1
              style={{
                fontSize: "clamp(58px, 9vw, 84px)",
                marginBottom: "14px",
                fontWeight: 400,
                lineHeight: 1.02,
              }}
            >
              Drishti
            </h1>

            <p
              style={{
                maxWidth: "720px",
                fontSize: "clamp(22px, 3vw, 28px)",
                lineHeight: 1.45,
                color: "#d9cbb8",
                margin: "0 auto 18px",
              }}
            >
              A simple daily ritual to train attention and calm the mind.
            </p>

            <p
              style={{
                maxWidth: "620px",
                fontSize: "18px",
                lineHeight: 1.7,
                color: "#bfae97",
                margin: "0 auto 36px",
              }}
            >
              Focus on a steady flame while relaxing the body and breathing
              slowly. Over time this practice strengthens attention, emotional
              regulation, and mental clarity.
            </p>

            <button className="primary-button" onClick={next}>
              Begin
            </button>
          </div>
        )}

        {step === 1 && (
          <div
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: "880px",
              padding: "36px 32px",
            }}
          >
            <h1
              className="section-title"
              style={{
                marginBottom: "28px",
                textAlign: "center",
              }}
            >
              What happens during a session
            </h1>

            <div
              style={{
                display: "grid",
                gap: "22px",
                marginBottom: "30px",
              }}
            >
              {[
                {
                  number: "01",
                  title: "Posture",
                  action: "Sit comfortably with the flame at eye level.",
                  why: "Stable posture reduces physical distraction.",
                },
                {
                  number: "02",
                  title: "Body relaxation",
                  action: "Briefly tense and release major muscle groups.",
                  why: "This signals the nervous system to relax.",
                },
                {
                  number: "03",
                  title: "Breathing",
                  action: "Slow inhale and exhale.",
                  why: "Regulates the nervous system and prepares attention.",
                },
                {
                  number: "04",
                  title: "Flame focus",
                  action: "Gaze steadily at the flame.",
                  why: "This trains sustained attention.",
                },
                {
                  number: "05",
                  title: "Eyes closed",
                  action: "Close the eyes and observe the breath.",
                  why: "This integrates the attention practice.",
                },
              ].map((item) => (
                <div
                  key={item.number}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "64px 1fr",
                    gap: "16px",
                    alignItems: "start",
                  }}
                >
                  <div
                    style={{
                      color: "#FFB347",
                      fontSize: "24px",
                      lineHeight: 1,
                      paddingTop: "6px",
                      fontFamily: '"Playfair Display", Georgia, serif',
                    }}
                  >
                    {item.number}
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: "22px",
                        marginBottom: "7px",
                        fontFamily: '"Playfair Display", Georgia, serif',
                      }}
                    >
                      {item.title}
                    </div>

                    <div
                      style={{
                        color: "#F5E9DA",
                        fontSize: "17px",
                        lineHeight: 1.6,
                        marginBottom: "4px",
                      }}
                    >
                      {item.action}
                    </div>

                    <div
                      style={{
                        color: "#bfae97",
                        fontSize: "16px",
                        lineHeight: 1.6,
                      }}
                    >
                      {item.why}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: "center" }}>
              <button className="primary-button" onClick={next}>
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: "880px",
              padding: "36px 32px",
              textAlign: "center",
            }}
          >
            <h1 className="section-title" style={{ marginBottom: "18px" }}>
              Why practice daily
            </h1>

            <p
              style={{
                maxWidth: "700px",
                margin: "0 auto 12px",
                color: "#F5E9DA",
                fontSize: "18px",
                lineHeight: 1.65,
              }}
            >
              Attention improves through short, consistent training sessions.
            </p>

            <p
              style={{
                maxWidth: "700px",
                margin: "0 auto 14px",
                color: "#bfae97",
                fontSize: "17px",
                lineHeight: 1.65,
              }}
            >
              This practice helps strengthen your ability to stay present,
              recover from distraction, and regulate emotional responses.
            </p>

            <p
              style={{
                maxWidth: "700px",
                margin: "0 auto 30px",
                color: "#bfae97",
                fontSize: "17px",
                lineHeight: 1.65,
              }}
            >
              Like physical exercise, small sessions repeated regularly create
              the strongest long-term effects.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
                marginBottom: "30px",
                textAlign: "left",
              }}
            >
              <div className="glass-card" style={{ padding: "20px" }}>
                <div
                  style={{
                    fontSize: "20px",
                    marginBottom: "8px",
                    fontFamily: '"Playfair Display", Georgia, serif',
                  }}
                >
                  ☀ Morning
                </div>
                <div style={{ color: "#F5E9DA", marginBottom: "6px", lineHeight: 1.5 }}>
                  Clear the mind before the day begins.
                </div>
                <div style={{ color: "#bfae97", fontSize: "15px", lineHeight: 1.55 }}>
                  Start the day with steadiness and focus.
                </div>
              </div>

              <div className="glass-card" style={{ padding: "20px" }}>
                <div
                  style={{
                    fontSize: "20px",
                    marginBottom: "8px",
                    fontFamily: '"Playfair Display", Georgia, serif',
                  }}
                >
                  🌤 Midday
                </div>
                <div style={{ color: "#F5E9DA", marginBottom: "6px", lineHeight: 1.5 }}>
                  Reset attention and reduce mental fatigue.
                </div>
                <div style={{ color: "#bfae97", fontSize: "15px", lineHeight: 1.55 }}>
                  A short session can restore clarity.
                </div>
              </div>

              <div className="glass-card" style={{ padding: "20px" }}>
                <div
                  style={{
                    fontSize: "20px",
                    marginBottom: "8px",
                    fontFamily: '"Playfair Display", Georgia, serif',
                  }}
                >
                  🌙 Night
                </div>
                <div style={{ color: "#F5E9DA", marginBottom: "6px", lineHeight: 1.5 }}>
                  Release accumulated tension.
                </div>
                <div style={{ color: "#bfae97", fontSize: "15px", lineHeight: 1.55 }}>
                  Allow the mind and body to settle.
                </div>
              </div>
            </div>

            <button className="primary-button" onClick={next}>
              Continue
            </button>
          </div>
        )}

        {step === 3 && (
          <div
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: "780px",
              padding: "36px 32px",
            }}
          >
            <h1
              className="section-title"
              style={{
                marginBottom: "18px",
                textAlign: "center",
              }}
            >
              Attention feedback
            </h1>

            <p
              style={{
                color: "#F5E9DA",
                fontSize: "18px",
                lineHeight: 1.7,
                marginBottom: "14px",
                textAlign: "center",
              }}
            >
              During the flame-gazing phase, the app can estimate attention
              stability by analyzing eye movement through your camera.
            </p>

            <p
              style={{
                color: "#bfae97",
                fontSize: "17px",
                lineHeight: 1.7,
                marginBottom: "24px",
                textAlign: "center",
              }}
            >
              This helps generate simple feedback about how steady your
              attention was during the session. Camera tracking is optional and
              can be turned off at any time.
            </p>

            <div
              className="glass-card"
              style={{
                padding: "24px",
                marginBottom: "30px",
              }}
            >
              <div
                style={{
                  fontSize: "24px",
                  marginBottom: "12px",
                  fontFamily: '"Playfair Display", Georgia, serif',
                }}
              >
                Your privacy
              </div>

              <div style={{ display: "grid", gap: "10px", color: "#d9cbb8", lineHeight: 1.6 }}>
                <div>• All processing happens locally on your device</div>
                <div>• No video is stored or uploaded</div>
                <div>• No data leaves your device</div>
                <div>• Your sessions and progress stay private on this device</div>
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <button className="primary-button" onClick={next}>
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: "440px",
              padding: "48px 36px",
              textAlign: "center",
            }}
          >
            <div style={{ marginBottom: "24px", transform: "scale(0.85)" }}>
              <Diya />
            </div>

            <h1 className="section-title" style={{ marginBottom: "10px" }}>
              Save your practice
            </h1>

            <p
              style={{
                color: "#bfae97",
                fontSize: "16px",
                lineHeight: 1.65,
                marginBottom: "36px",
              }}
            >
              Create an account to track your sessions and streaks across devices.
            </p>

            {authError && (
              <div
                style={{
                  color: "#ff8080",
                  fontSize: "14px",
                  marginBottom: "20px",
                  lineHeight: 1.5,
                }}
              >
                {authError}
              </div>
            )}

            <button
              onClick={() => void handleGoogleSignIn()}
              disabled={isLoading}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                padding: "14px 20px",
                borderRadius: "16px",
                border: "1px solid rgba(255,179,71,0.25)",
                background: "rgba(255,255,255,0.07)",
                color: "#F5E9DA",
                fontSize: "16px",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.7 : 1,
                transition: "background 0.2s, border-color 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!isLoading) (e.currentTarget.style.background = "rgba(255,255,255,0.12)");
              }}
              onMouseLeave={(e) => {
                (e.currentTarget.style.background = "rgba(255,255,255,0.07)");
              }}
            >
              {!isLoading && (
                <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.2l-6.3-5.4C29.5 35.1 26.9 36 24 36c-5.1 0-9.5-3.2-11.3-7.8l-6.5 5C9.5 39.5 16.3 44 24 44z"/>
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.3 5.4C37 38.1 44 33 44 24c0-1.2-.1-2.3-.4-3.5z"/>
                </svg>
              )}
              {isLoading ? "Redirecting…" : "Continue with Google"}
            </button>
          </div>
        )}
      </div>
    </MeditationBackground>
  );
}
