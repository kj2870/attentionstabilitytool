import { useEffect } from "react";
import { Link } from "react-router-dom";
import Diya from "../components/Diya";
import MeditationBackground from "../components/MeditationBackground";
import { RESEARCH_MODE } from "../lib/presentationMode";
import {
  getFlexibleStreak,
  getMandalaDay,
  getWeeklyCompletion,
  loadHistory,
} from "../lib/storage";

export default function HomePage() {
  const history = loadHistory();
  const weekly = getWeeklyCompletion(history);
  const flexibleStreak = getFlexibleStreak(history);
  const mandalaDay = getMandalaDay(history);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  if (RESEARCH_MODE) {
    return (
      <MeditationBackground timeOfDay="Night">
        <div
          className="page-shell"
          style={{
            minHeight: "100vh",
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
      </MeditationBackground>
    );
  }

  // Streak display — hide until day 2, show "day 1" on first day
  const streakLabel =
    flexibleStreak === 0
      ? null
      : flexibleStreak === 1
      ? "day 1"
      : `${flexibleStreak} day streak`;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <MeditationBackground timeOfDay="Night">
      <div
        className="page-shell"
        style={{
          height: "100vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: "16px 24px",
        }}
      >
        {/* Diya + wordmark — tight unit */}
        <div style={{ marginBottom: "6px", display: "flex", justifyContent: "center" }}>
          <div style={{ transform: "translateX(-8px)" }}>
            <Diya />
          </div>
        </div>

        <h1
          style={{
            fontSize: "clamp(48px, 7vw, 72px)",
            marginBottom: "10px",
            fontWeight: 400,
            lineHeight: 1.02,
            letterSpacing: "-0.02em",
            fontFamily: '"Instrument Serif", Georgia, serif',
          }}
        >
          drishti
        </h1>

        <p
          style={{
            maxWidth: "36ch",
            fontSize: "clamp(15px, 1.8vw, 18px)",
            lineHeight: 1.55,
            color: "rgba(217, 203, 184, 0.62)",
            marginBottom: "24px",
          }}
        >
          A daily ritual to train attention and calm the mind.
        </p>

        {/* Weekly card */}
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            padding: "16px 20px",
            marginBottom: "20px",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "28px",
            background: "rgba(255,255,255,0.025)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "6px",
              marginBottom: "14px",
            }}
          >
            {days.map((day, index) => (
              <div key={day} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <div style={{ fontSize: "11px", color: "rgba(191,174,151,0.55)", letterSpacing: "0.02em" }}>
                  {day.charAt(0)}
                </div>
                <div style={{ opacity: weekly[index] ? 0.9 : 0.15 }}>
                  <svg width="16" height="20" viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
                    <path d="M40 5 C52 25 60 42 50 65 C45 80 35 80 30 65 C20 42 28 25 40 5Z" fill="#ffb347" />
                    <path d="M40 22 C47 38 48 52 43 62 C40 68 36 68 33 62 C28 52 33 38 40 22Z" fill="#ffd27d" />
                    <ellipse cx="40" cy="60" rx="6" ry="9" fill="white" opacity="0.9" />
                  </svg>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "20px",
              color: "rgba(203,187,167,0.7)",
              fontSize: "13px",
            }}
          >
            {streakLabel && (
              <>
                <span>{streakLabel}</span>
                <span style={{ opacity: 0.3 }}>·</span>
              </>
            )}
            <span>{mandalaDay}/48</span>
          </div>
        </div>

        {/* CTA */}
        <Link to="/routine" style={{ textDecoration: "none" }}>
          <button className="primary-button">Begin</button>
        </Link>
      </div>
    </MeditationBackground>
  );
}
