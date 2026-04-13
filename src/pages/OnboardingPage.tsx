import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Diya from "../components/Diya";
import MeditationBackground from "../components/MeditationBackground";
import { RESEARCH_MODE } from "../lib/presentationMode";
import { signUp } from "../lib/auth";

export default function OnboardingPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(RESEARCH_MODE ? 4 : 0);

  // Step 4 — account creation fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const next = () => setStep((prev) => prev + 1);

  const handleCreateAccount = async () => {
    const normalizedUsername = username.trim();

    if (!normalizedUsername) { setAuthError("Please enter a display name."); return; }
    if (!email.trim()) { setAuthError("Please enter your email."); return; }
    if (password.length < 6) { setAuthError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setAuthError("Passwords do not match."); return; }

    setIsLoading(true);
    setAuthError("");

    try {
      const { needsEmailConfirmation } = await signUp({
        email,
        password,
        username: normalizedUsername,
      });

      if (needsEmailConfirmation) {
        setEmailSent(true);
      } else {
        // Session created immediately — App.tsx will detect it and redirect.
        navigate("/", { replace: true });
      }
    } catch (err) {
      setAuthError((err as Error).message ?? "Account creation failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
                      fontFamily: '"Fraunces", Georgia, serif',
                    }}
                  >
                    {item.number}
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: "22px",
                        marginBottom: "7px",
                        fontFamily: '"Fraunces", Georgia, serif',
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
                    fontFamily: '"Fraunces", Georgia, serif',
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
                    fontFamily: '"Fraunces", Georgia, serif',
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
                    fontFamily: '"Fraunces", Georgia, serif',
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
                  fontFamily: '"Fraunces", Georgia, serif',
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

        {step === 4 && !emailSent && (
          <div
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: "480px",
              padding: "36px 30px",
              textAlign: "center",
            }}
          >
            <h1 className="section-title" style={{ marginBottom: "14px" }}>
              Create your account
            </h1>

            <p
              style={{
                color: "#bfae97",
                fontSize: "16px",
                lineHeight: 1.65,
                marginBottom: "24px",
              }}
            >
              Choose a display name and set up your login to save your
              progress across devices.
            </p>

            {(
              [
                {
                  type: "text",
                  placeholder: "Display name",
                  value: username,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value),
                  autoComplete: "name",
                },
                {
                  type: "email",
                  placeholder: "Email",
                  value: email,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
                  autoComplete: "email",
                },
                {
                  type: "password",
                  placeholder: "Password (min 6 characters)",
                  value: password,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
                  autoComplete: "new-password",
                },
                {
                  type: "password",
                  placeholder: "Confirm password",
                  value: confirmPassword,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value),
                  autoComplete: "new-password",
                },
              ] as const
            ).map((field) => (
              <input
                key={field.placeholder}
                type={field.type}
                placeholder={field.placeholder}
                value={field.value}
                onChange={field.onChange}
                autoComplete={field.autoComplete}
                style={{
                  width: "100%",
                  padding: "15px 16px",
                  marginBottom: "12px",
                  borderRadius: "16px",
                  border: "1px solid rgba(255,179,71,0.16)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#F5E9DA",
                  outline: "none",
                  fontSize: "16px",
                }}
              />
            ))}

            {authError && (
              <div
                style={{
                  color: "#ff8080",
                  fontSize: "14px",
                  marginBottom: "14px",
                  lineHeight: 1.5,
                }}
              >
                {authError}
              </div>
            )}

            <button
              className="primary-button"
              onClick={() => void handleCreateAccount()}
              disabled={isLoading}
              style={{ width: "100%", opacity: isLoading ? 0.7 : 1 }}
            >
              {isLoading ? "Creating account…" : "Start Practice"}
            </button>

            <div
              style={{
                marginTop: "20px",
                color: "#bfae97",
                fontSize: "15px",
              }}
            >
              Already have an account?{" "}
              <span
                onClick={() => navigate("/login")}
                style={{ color: "#FFB347", cursor: "pointer" }}
              >
                Log in
              </span>
            </div>
          </div>
        )}

        {step === 4 && emailSent && (
          <div
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: "480px",
              padding: "40px 36px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "20px" }}>✉</div>

            <h1 className="section-title" style={{ marginBottom: "14px" }}>
              Check your email
            </h1>

            <p
              style={{
                color: "#d9cbb8",
                fontSize: "17px",
                lineHeight: 1.7,
                marginBottom: "12px",
              }}
            >
              We sent a confirmation link to{" "}
              <span style={{ color: "#FFB347" }}>{email}</span>.
            </p>

            <p style={{ color: "#bfae97", fontSize: "15px", lineHeight: 1.65 }}>
              Click the link in that email to activate your account, then return
              here and{" "}
              <span
                onClick={() => navigate("/login")}
                style={{ color: "#FFB347", cursor: "pointer" }}
              >
                sign in
              </span>
              .
            </p>
          </div>
        )}
      </div>
    </MeditationBackground>
  );
}
