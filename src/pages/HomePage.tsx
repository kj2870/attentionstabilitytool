import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Diya from "../components/Diya";
import { RESEARCH_MODE } from "../lib/presentationMode";
import {
  clearVow,
  getVowSnapshot,
  getWeeklyCompletion,
  isTodaysSitComplete,
  loadHistory,
  takeVow,
} from "../lib/storage";

export default function HomePage() {
  const navigate = useNavigate();
  const history = loadHistory();
  const weekly = getWeeklyCompletion(history);
  const vow = getVowSnapshot();
  const sitDoneToday = isTodaysSitComplete(history);
  const [showVowPrompt, setShowVowPrompt] = useState(false);

  const handleTakeVow = () => {
    takeVow();
    setShowVowPrompt(false);
    // Force a re-render so the new vow snapshot renders.
    navigate("/", { replace: true });
  };

  const handleAcknowledgeBrokenVow = () => {
    clearVow();
    navigate("/", { replace: true });
  };

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
            letterSpacing: "0.04em",
            fontFamily: '"Samarkan", "Playfair Display", Georgia, serif',
          }}
        >
          drishti
        </h1>

        {/* The body of the home screen has four states:
              1. Pre-vow: tagline trio + weekly card + Begin + take-up link
              2. Active vow, sit pending: Day N of 48 + Begin
              3. Active vow, sit done: Day N of 48 + "today's sit is complete"
              4. Broken vow: "the vow ended on day N. take it up again." */}

        {showVowPrompt ? (
          <VowPromptInline onTake={handleTakeVow} onCancel={() => setShowVowPrompt(false)} />
        ) : vow?.broken ? (
          <BrokenVowNotice lastSitDay={vow.lastSitDay} onAcknowledge={handleAcknowledgeBrokenVow} />
        ) : vow ? (
          <ActiveVowDisplay
            day={vow.day}
            sitDoneToday={sitDoneToday}
            fulfilled={vow.fulfilled}
          />
        ) : (
          <PreVowTagline
            days={days}
            todayIndex={todayIndex}
            weekly={weekly}
            sitDoneToday={sitDoneToday}
            onTakeVow={() => setShowVowPrompt(true)}
          />
        )}
      </div>
  );
}

// ---------------------------------------------------------------------------
// Pre-vow body: tagline trio + weekly card + Begin (or "today's sit is
// complete") + small "take up the practice as a 48-day vow" link.
// ---------------------------------------------------------------------------
type PreVowTaglineProps = {
  days: string[];
  todayIndex: number;
  weekly: boolean[];
  sitDoneToday: boolean;
  onTakeVow: () => void;
};

function PreVowTagline({ days, todayIndex, weekly, sitDoneToday, onTakeVow }: PreVowTaglineProps) {
  return (
    <>
      <p
        style={{
          margin: 0,
          maxWidth: "32ch",
          fontSize: "clamp(17px, 1.9vw, 21px)",
          fontFamily: '"Mukta", "DM Sans", sans-serif',
          fontWeight: 300,
          letterSpacing: "0.02em",
          lineHeight: 1.4,
          color: "rgba(245, 233, 218, 0.8)",
        }}
      >
        A practice in steadiness.
      </p>

      <p
        style={{
          margin: "18px 0 40px",
          fontFamily: '"Mukta", "DM Sans", sans-serif',
          fontWeight: 300,
          fontSize: "12px",
          letterSpacing: "0.32em",
          paddingLeft: "0.32em",
          textTransform: "lowercase",
          color: "rgba(217, 203, 184, 0.52)",
        }}
      >
        body · breath · gaze · awareness
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

      {sitDoneToday ? (
        <SitCompleteLine />
      ) : (
        <Link to="/session" style={{ textDecoration: "none", position: "relative", zIndex: 1 }}>
          <button className="cta-pill">Begin</button>
        </Link>
      )}

      {/* Quiet take-up link — always visible pre-vow. */}
      <button
        onClick={onTakeVow}
        style={{
          marginTop: "32px",
          background: "transparent",
          border: "none",
          fontFamily: '"Mukta", "DM Sans", sans-serif',
          fontSize: "12px",
          fontWeight: 300,
          letterSpacing: "0.08em",
          color: "rgba(217, 203, 184, 0.42)",
          cursor: "pointer",
          textDecoration: "underline",
          textDecorationColor: "rgba(217, 203, 184, 0.16)",
          textUnderlineOffset: "4px",
          padding: 0,
          position: "relative",
          zIndex: 1,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(245, 233, 218, 0.7)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(217, 203, 184, 0.42)")}
      >
        take up the practice as a 48-day vow
      </button>
    </>
  );
}

// ---------------------------------------------------------------------------
// Active-vow body: just "Day N of 48" and the Begin button (or sit-complete
// line). No tagline, no weekly card. The day counter contains everything.
// ---------------------------------------------------------------------------
type ActiveVowDisplayProps = {
  day: number;
  sitDoneToday: boolean;
  fulfilled: boolean;
};

function ActiveVowDisplay({ day, sitDoneToday, fulfilled }: ActiveVowDisplayProps) {
  const clampedDay = Math.min(day, 48);
  return (
    <>
      <div
        style={{
          margin: "8px 0 44px",
          fontFamily: '"Mukta", "DM Sans", sans-serif',
          fontWeight: 300,
          fontSize: "clamp(16px, 1.8vw, 19px)",
          letterSpacing: "0.18em",
          paddingLeft: "0.18em",
          textTransform: "lowercase",
          color: "rgba(245, 233, 218, 0.78)",
        }}
      >
        day {clampedDay} of 48
      </div>

      {fulfilled ? (
        <div
          style={{
            fontFamily: '"Mukta", "DM Sans", sans-serif',
            fontWeight: 300,
            fontSize: "13px",
            letterSpacing: "0.08em",
            color: "rgba(255, 200, 130, 0.7)",
            position: "relative",
            zIndex: 1,
          }}
        >
          the practice is fulfilled.
        </div>
      ) : sitDoneToday ? (
        <SitCompleteLine />
      ) : (
        <Link to="/session" style={{ textDecoration: "none", position: "relative", zIndex: 1 }}>
          <button className="cta-pill">Begin</button>
        </Link>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Broken-vow notice — quiet, sober, with a re-take option.
// ---------------------------------------------------------------------------
type BrokenVowNoticeProps = {
  lastSitDay: number;
  onAcknowledge: () => void;
};

function BrokenVowNotice({ lastSitDay, onAcknowledge }: BrokenVowNoticeProps) {
  return (
    <div
      style={{
        margin: "8px 0 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "14px",
        maxWidth: "34ch",
        position: "relative",
        zIndex: 1,
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: '"Mukta", "DM Sans", sans-serif',
          fontWeight: 300,
          fontSize: "clamp(16px, 1.8vw, 19px)",
          lineHeight: 1.5,
          color: "rgba(245, 233, 218, 0.74)",
        }}
      >
        the vow ended on day {lastSitDay}.
      </p>
      <p
        style={{
          margin: 0,
          fontFamily: '"Mukta", "DM Sans", sans-serif',
          fontWeight: 300,
          fontSize: "13px",
          letterSpacing: "0.04em",
          color: "rgba(217, 203, 184, 0.5)",
          lineHeight: 1.7,
        }}
      >
        take it up again when you're ready.
      </p>
      <button onClick={onAcknowledge} className="cta-pill" style={{ marginTop: "20px" }}>
        Continue
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline vow take-up prompt — appears on the home screen when the user taps
// the take-up link. Same copy as the post-session prompt for consistency.
// ---------------------------------------------------------------------------
type VowPromptInlineProps = {
  onTake: () => void;
  onCancel: () => void;
};

function VowPromptInline({ onTake, onCancel }: VowPromptInlineProps) {
  return (
    <div
      style={{
        margin: "8px 0 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "18px",
        maxWidth: "36ch",
        position: "relative",
        zIndex: 1,
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: '"Mukta", "DM Sans", sans-serif',
          fontWeight: 300,
          fontSize: "clamp(17px, 1.9vw, 21px)",
          lineHeight: 1.6,
          color: "rgba(245, 233, 218, 0.82)",
        }}
      >
        This practice is traditionally taken as a vow.
        <br />
        Forty-eight days. One sit per day.
      </p>
      <div style={{ display: "flex", gap: "16px", alignItems: "center", marginTop: "12px" }}>
        <button onClick={onTake} className="cta-pill">
          I take it up
        </button>
        <button
          onClick={onCancel}
          style={{
            background: "transparent",
            border: "none",
            fontFamily: '"Mukta", "DM Sans", sans-serif',
            fontSize: "13px",
            fontWeight: 300,
            letterSpacing: "0.06em",
            color: "rgba(217, 203, 184, 0.5)",
            cursor: "pointer",
            padding: "8px 10px",
          }}
        >
          not yet
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// "today's sit is complete" line — replaces the Begin button on days when
// the user has already sat. Quiet, no action.
// ---------------------------------------------------------------------------
function SitCompleteLine() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div
        style={{
          fontFamily: '"Mukta", "DM Sans", sans-serif',
          fontWeight: 300,
          fontSize: "14px",
          letterSpacing: "0.06em",
          color: "rgba(245, 233, 218, 0.66)",
        }}
      >
        today's sit is complete.
      </div>
      <div
        style={{
          fontFamily: '"Mukta", "DM Sans", sans-serif',
          fontWeight: 200,
          fontSize: "12px",
          letterSpacing: "0.06em",
          color: "rgba(217, 203, 184, 0.36)",
        }}
      >
        return tomorrow.
      </div>
    </div>
  );
}
