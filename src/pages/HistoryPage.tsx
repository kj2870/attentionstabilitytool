import { useMemo, useState } from "react";
import { RESEARCH_MODE } from "../lib/presentationMode";
import { getMandalaDay, loadHistory, type SessionRecord } from "../lib/storage";

// ---------------------------------------------------------------------------
// Small Flame — used in empty state
// ---------------------------------------------------------------------------
function SmallFlame({ size = 16, opacity = 1 }: { size?: number; opacity?: number }) {
  return (
    <svg
      width={size * 0.8}
      height={size}
      viewBox="0 0 80 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity, display: "block" }}
    >
      <path
        d="M40 5 C52 25 60 42 50 65 C45 80 35 80 30 65 C20 42 28 25 40 5Z"
        fill="url(#sf-grad)"
      />
      <path
        d="M40 22 C47 38 48 52 43 62 C40 68 36 68 33 62 C28 52 33 38 40 22Z"
        fill="url(#sf-inner)"
      />
      <ellipse cx="40" cy="60" rx="6" ry="9" fill="white" opacity="0.85" />
      <defs>
        <linearGradient id="sf-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ff7a30" />
          <stop offset="60%" stopColor="#ffb347" />
          <stop offset="100%" stopColor="#ffcf80" />
        </linearGradient>
        <linearGradient id="sf-inner" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffd27d" />
          <stop offset="100%" stopColor="#fff4c9" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Mandala Ring — 48-segment clockwise progress circle (clickable segments)
// ---------------------------------------------------------------------------
const N = 48;
const R_OUT = 230;
const R_IN = 178;
const GAP_DEG = 1.6;

function polar(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [r * Math.cos(a), r * Math.sin(a)];
}

function segmentPath(i: number): string {
  const step = 360 / N;
  const start = i * step + GAP_DEG / 2;
  const end = (i + 1) * step - GAP_DEG / 2;
  const [x1, y1] = polar(R_OUT, start);
  const [x2, y2] = polar(R_OUT, end);
  const [x3, y3] = polar(R_IN, end);
  const [x4, y4] = polar(R_IN, start);
  const large = end - start > 180 ? 1 : 0;
  return [
    `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `A ${R_OUT} ${R_OUT} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
    `A ${R_IN} ${R_IN} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
    "Z",
  ].join(" ");
}

// ---------------------------------------------------------------------------
// Build per-day session map: for each unique date, the "best" session of the day.
// Returns sessions sorted oldest-first, so segment[i] ↔ daySession[i].
// ---------------------------------------------------------------------------
function buildDaySessions(history: SessionRecord[]): SessionRecord[] {
  const byDay = new Map<string, SessionRecord>();
  for (const record of history) {
    const key = new Date(record.date).toISOString().slice(0, 10);
    const existing = byDay.get(key);
    const score = record.longestGazeSec ?? 0;
    const existingScore = existing?.longestGazeSec ?? 0;
    if (!existing || score > existingScore) {
      byDay.set(key, record);
    }
  }
  return Array.from(byDay.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([, record]) => record);
}

// ---------------------------------------------------------------------------
// Format helpers for the detail panel
// ---------------------------------------------------------------------------
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatStillness(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

// ---------------------------------------------------------------------------
// Detail panel — appears inline when a mandala segment is clicked
// ---------------------------------------------------------------------------
function SessionDetail({ session, dayNumber }: { session: SessionRecord; dayNumber: number }) {
  return (
    <div
      style={{
        marginTop: "32px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
        animation: "fadeIn 0.35s ease",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(245, 233, 218, 0.4)",
        }}
      >
        Day {dayNumber}  ·  {formatDate(session.date)}  ·  {formatTime(session.date)}
      </div>

      <div
        style={{
          fontSize: "clamp(56px, 10vw, 80px)",
          fontFamily: '"Playfair Display", Georgia, serif',
          fontWeight: 400,
          color: "rgba(245, 233, 218, 0.95)",
          lineHeight: 1,
          letterSpacing: "-0.01em",
        }}
      >
        {session.longestGazeSec ?? 0}s
      </div>

      <div style={{ fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(245, 233, 218, 0.4)" }}>
        Longest gaze
      </div>

      {session.totalStillnessSec !== undefined && (
        <div style={{ fontSize: "13px", color: "rgba(245, 233, 218, 0.55)", marginTop: "4px" }}>
          {formatStillness(session.totalStillnessSec)} of stillness
        </div>
      )}

      {session.note && (
        <div
          style={{
            marginTop: "16px",
            maxWidth: "440px",
            fontSize: "14px",
            lineHeight: 1.6,
            color: "rgba(245, 233, 218, 0.65)",
            fontStyle: "italic",
            padding: "0 16px",
          }}
        >
          "{session.note}"
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mandala Ring with clickable segments
// ---------------------------------------------------------------------------
function MandalaRing({
  history,
  selectedDay,
  onSelect,
}: {
  history: SessionRecord[];
  selectedDay: number | null;
  onSelect: (dayIndex: number) => void;
}) {
  const day = getMandalaDay(history);
  const complete = day >= 48;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "360px",
        margin: "0 auto",
        aspectRatio: "1 / 1",
      }}
    >
      <svg
        viewBox="-260 -260 520 520"
        style={{ width: "100%", height: "100%", display: "block" }}
        aria-label={`Mandala progress: ${day} of 48 days`}
      >
        <defs>
          <filter id="seg-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {Array.from({ length: N }, (_, i) => {
          const on = i < day;
          const isLast = i === day - 1;
          const isSelected = selectedDay === i;
          return (
            <path
              key={i}
              d={segmentPath(i)}
              onClick={() => on && onSelect(i)}
              style={{
                fill: on
                  ? isSelected
                    ? "#fff4c9"
                    : "#ffb347"
                  : "rgba(255,255,255,0.04)",
                opacity: on ? (complete ? 1 : 0.55 + (i / day) * 0.45) : 1,
                transition: "fill 0.3s ease, opacity 0.3s ease",
                filter: isLast && !complete && !isSelected ? "url(#seg-glow)" : "none",
                cursor: on ? "pointer" : "default",
              }}
            />
          );
        })}

        {/* Top tick mark */}
        <line
          x1="0"
          y1={-(R_OUT + 8)}
          x2="0"
          y2={-(R_OUT + 18)}
          stroke="rgba(255,179,71,0.3)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Day counter at center */}
        <text
          x="0"
          y="-10"
          textAnchor="middle"
          fill="rgba(245, 233, 218, 0.92)"
          fontSize="78"
          fontFamily="'Playfair Display', Georgia, serif"
          fontWeight="400"
        >
          {day}
        </text>
        <text
          x="0"
          y="42"
          textAnchor="middle"
          fill="rgba(245, 233, 218, 0.4)"
          fontSize="18"
          letterSpacing="6"
        >
          / 48
        </text>

        {/* Celebration: outer pulse ring at day 48 */}
        {complete && (
          <circle
            cx="0"
            cy="0"
            r={R_OUT + 18}
            fill="none"
            stroke="rgba(255,179,71,0.25)"
            strokeWidth="2"
          >
            <animate
              attributeName="r"
              values={`${R_OUT + 14};${R_OUT + 28};${R_OUT + 14}`}
              dur="3s"
              repeatCount="indefinite"
            />
            <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function HistoryPage() {
  const history = loadHistory();
  const daySessions = useMemo(() => buildDaySessions(history), [history]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  if (RESEARCH_MODE) {
    return (
      <div style={{ padding: "80px 24px 100px", maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
        <h1 style={{ fontSize: "48px", fontWeight: 400, marginBottom: "12px" }}>Session Records</h1>
        <p style={{ color: "#d9cbb8", fontSize: "20px", lineHeight: 1.5 }}>Hidden in research mode.</p>
      </div>
    );
  }

  const selectedSession = selectedDay !== null ? daySessions[selectedDay] : null;

  return (
    <div
      style={{
        padding: "60px 24px 120px",
        maxWidth: "640px",
        margin: "0 auto",
        fontFamily: '"DM Sans", system-ui, sans-serif',
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {history.length === 0 ? (
        <div style={{ textAlign: "center", padding: "120px 32px" }}>
          <div style={{ marginBottom: "20px", opacity: 0.4, display: "flex", justifyContent: "center" }}>
            <SmallFlame size={36} />
          </div>
          <p
            style={{
              color: "rgba(245, 233, 218, 0.5)",
              fontSize: "14px",
              letterSpacing: "0.04em",
              margin: 0,
            }}
          >
            Complete your first session to begin the mandala.
          </p>
        </div>
      ) : (
        <>
          <MandalaRing
            history={history}
            selectedDay={selectedDay}
            onSelect={(i) => setSelectedDay((prev) => (prev === i ? null : i))}
          />

          {selectedSession ? (
            <SessionDetail session={selectedSession} dayNumber={selectedDay! + 1} />
          ) : (
            <div
              style={{
                marginTop: "32px",
                textAlign: "center",
                fontSize: "12px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgba(245, 233, 218, 0.3)",
              }}
            >
              Tap a lit segment to view that day
            </div>
          )}
        </>
      )}
    </div>
  );
}
