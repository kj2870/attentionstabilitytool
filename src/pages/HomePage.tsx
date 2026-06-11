import { useEffect } from "react";
import { Link } from "react-router-dom";
import Diya from "../components/Diya";
import { RESEARCH_MODE } from "../lib/presentationMode";
import { getWeeklyCompletion, loadHistory } from "../lib/storage";

export default function HomePage() {
  const history = loadHistory();
  const weekly = getWeeklyCompletion(history);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const todayIndex = (new Date().getDay() + 6) % 7;

  // Hooks must run unconditionally — this effect sits above the research-mode
  // early return. It's a no-op cleanup-wise for the research layout.
  useEffect(() => {
    if (RESEARCH_MODE) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (RESEARCH_MODE) {
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
            padding: "36px 24px",
          }}
        >
          <h1 style={{ fontSize: "clamp(46px, 7vw, 66px)", marginBottom: "14px", fontWeight: 400, lineHeight: 1.08 }}>
            Visual Attention Prototype
          </h1>
          <p style={{ maxWidth: "760px", fontSize: "clamp(18px, 2.5vw, 24px)", lineHeight: 1.5, color: "#d9cbb8", marginBottom: "30px" }}>
            Browser-based prototype for measuring visual fixation stability during guided sessions.
          </p>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", justifyContent: "center" }}>
            <Link to="/session" style={{ textDecoration: "none" }}>
              <button className="primary-button">Start Session</button>
            </Link>
            <Link to="/privacy" style={{ textDecoration: "none" }}>
              <button className="secondary-button">Privacy</button>
            </Link>
          </div>
        </div>
    );
  }

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
        {/* Page-edge vignette — gently draws the eye to center. */}
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

        {/* Diya + warm bloom — makes the diya feel lit rather than placed. */}
        <div style={{ position: "relative", marginBottom: "-4px", display: "flex", justifyContent: "center" }}>
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: "min(560px, 80vw)",
              height: "min(560px, 80vw)",
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
            fontSize: "clamp(40px, 5.6vw, 60px)",
            marginBottom: "6px",
            fontWeight: 400,
            lineHeight: 1.1,
            letterSpacing: "0.01em",
            fontFamily: '"Playfair Display", Georgia, serif',
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

        {/* Weekly card */}
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            padding: "18px 22px",
            marginBottom: "36px",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "28px",
            background: "rgba(255,255,255,0.025)",
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "6px",
            position: "relative",
            zIndex: 1,
          }}
        >
          {days.map((day, index) => {
            const isToday = index === todayIndex;
            return (
              <div key={day} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    fontSize: "11px",
                    color: isToday ? "rgba(255,179,71,0.9)" : "rgba(191,174,151,0.55)",
                    letterSpacing: "0.02em",
                  }}
                >
                  {day.charAt(0)}
                </div>
                <div
                  style={{
                    opacity: weekly[index] ? 0.95 : 0.18,
                    filter: isToday ? "drop-shadow(0 0 8px rgba(255,179,71,0.55))" : "none",
                  }}
                >
                  <svg width="22" height="28" viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
                    <path d="M40 5 C52 25 60 42 50 65 C45 80 35 80 30 65 C20 42 28 25 40 5Z" fill="#ffb347" />
                    <path d="M40 22 C47 38 48 52 43 62 C40 68 36 68 33 62 C28 52 33 38 40 22Z" fill="#ffd27d" />
                    <ellipse cx="40" cy="60" rx="6" ry="9" fill="white" opacity="0.9" />
                  </svg>
                </div>
                <div
                  style={{
                    width: "16px",
                    height: "2px",
                    borderRadius: "2px",
                    background: isToday ? "rgba(255,179,71,0.75)" : "transparent",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <Link to="/session" style={{ textDecoration: "none", position: "relative", zIndex: 1 }}>
          <button className="cta-pill">Begin</button>
        </Link>
      </div>
  );
}
