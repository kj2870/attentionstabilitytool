import { Link } from "react-router-dom";
import Diya from "../components/Diya";
import MeditationBackground from "../components/MeditationBackground";
import { RESEARCH_MODE } from "../lib/presentationMode";
import {
  getActiveProfile,
  getFlexibleStreak,
  getMandalaDay,
  getWeeklyCompletion,
  loadHistory,
} from "../lib/storage";

export default function HomePage() {
  const profile = getActiveProfile();
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

          {profile && (
            <p
              style={{
                fontSize: "16px",
                lineHeight: 1.5,
                color: "#bfae97",
                marginBottom: "24px",
              }}
            >
              Participant: {profile.username}
            </p>
          )}

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

        {profile && (
          <p
            style={{
              fontSize: "16px",
              lineHeight: 1.5,
              color: "#bfae97",
              marginBottom: "30px",
            }}
          >
            Welcome back, {profile.username}
          </p>
        )}

        <div
          className="glass-card"
          style={{
            width: "100%",
            maxWidth: "720px",
            padding: "22px",
            marginBottom: "26px",
          }}
        >
          <div
            style={{
              fontSize: "16px",
              color: "#cbbba7",
              marginBottom: "10px",
            }}
          >
            This week
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            {days.map((day, index) => (
              <div key={day}>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#bfae97",
                    marginBottom: "8px",
                  }}
                >
                  {day}
                </div>
                <div
                  style={{
                    fontSize: "22px",
                    color: weekly[index] ? "#FFB347" : "#8e7f71",
                  }}
                >
                  {weekly[index] ? "●" : "○"}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "20px",
              flexWrap: "wrap",
              color: "#d9cbb8",
            }}
          >
            <div>🔥 {flexibleStreak} day streak</div>
            <div>◈ Mandala Day {mandalaDay}/48</div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "14px",
            flexWrap: "wrap",
            justifyContent: "center",
            marginBottom: "24px",
          }}
        >
          <Link to="/routine" style={{ textDecoration: "none" }}>
            <button className="primary-button">Begin Practice</button>
          </Link>

          <Link to="/history" style={{ textDecoration: "none" }}>
            <button className="secondary-button">View Progress</button>
          </Link>
        </div>

        <div
          style={{
            display: "flex",
            gap: "18px",
            flexWrap: "wrap",
            justifyContent: "center",
            color: "#bfae97",
            fontSize: "15px",
          }}
        >
          <span>Science</span>
          <span>Philosophy</span>
          <span>Contact</span>
          <span>Privacy</span>
        </div>
      </div>
    </MeditationBackground>
  );
}
