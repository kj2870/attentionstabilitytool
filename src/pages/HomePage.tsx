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
          <h1
            style={{
              fontSize: "clamp(46px, 7vw, 66px)",
              marginBottom: "14px",
              fontWeight: 400,
              lineHeight: 1.08,
            }}
          >
            Visual Attention Prototype
          </h1>

          <p
            style={{
              maxWidth: "760px",
              fontSize: "clamp(18px, 2.5vw, 24px)",
              lineHeight: 1.5,
              color: "#d9cbb8",
              marginBottom: "30px",
            }}
          >
            Browser-based prototype for measuring visual fixation stability during guided sessions.
          </p>

          <div
            style={{
              display: "flex",
              gap: "14px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
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
        <div
          style={{
            marginBottom: "24px",
            display: "flex",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <div style={{ transform: "translateX(-8px)" }}>
            <Diya />
          </div>
        </div>

        <h1
          style={{
            fontSize: "clamp(56px, 9vw, 82px)",
            marginBottom: "12px",
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
            marginBottom: "10px",
          }}
        >
          A simple daily ritual to train attention and calm the mind.
        </p>

        <div
          className="glass-card"
          style={{
            width: "100%",
            maxWidth: "480px",
            padding: "24px 28px",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              color: "var(--muted)",
              letterSpacing: "0.04em",
              marginBottom: "16px",
            }}
          >
            THIS WEEK
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "6px",
              marginBottom: "20px",
            }}
          >
            {days.map((day, index) => (
              <div key={day} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <div style={{ fontSize: "11px", color: "var(--muted-2)", letterSpacing: "0.02em" }}>
                  {day.charAt(0)}
                </div>
                <div style={{ opacity: weekly[index] ? 1 : 0.18 }}>
                  <svg width="14" height="18" viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
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
              gap: "24px",
              color: "var(--muted)",
              fontSize: "14px",
            }}
          >
            <span>{flexibleStreak} day streak</span>
            <span style={{ opacity: 0.3 }}>·</span>
            <span>Mandala day {mandalaDay} / 48</span>
          </div>
        </div>

        <Link to="/routine" style={{ textDecoration: "none" }}>
          <button className="primary-button">Begin Practice</button>
        </Link>
      </div>
    </MeditationBackground>
  );
}
