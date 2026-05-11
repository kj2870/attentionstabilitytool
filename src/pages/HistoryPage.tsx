import { useMemo } from "react";
import { RESEARCH_MODE } from "../lib/presentationMode";
import { getCurrentStreak, getMandalaDay, loadHistory, type SessionRecord } from "../lib/storage";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function avg(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

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
// Mandala Ring — 48-segment clockwise progress circle
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

function MandalaFlame({ day }: { day: number }) {
  const complete = day >= 48;
  // Scale from 20px at day 1 to 64px at day 48
  const size = Math.round(20 + Math.min(day, 48) * (44 / 48));
  const w = Math.round(size * 0.75);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <div
        style={{
          filter: complete
            ? "drop-shadow(0 0 18px rgba(255,160,60,0.7))"
            : day > 0
            ? `drop-shadow(0 0 ${Math.round(4 + day * 0.3)}px rgba(255,160,60,0.35))`
            : "none",
          transition: "filter 0.6s ease",
        }}
      >
        <svg
          width={w}
          height={size}
          viewBox="0 0 80 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M40 5 C52 25 60 42 50 65 C45 80 35 80 30 65 C20 42 28 25 40 5Z"
            fill="url(#mf-grad)"
          >
            {complete && (
              <animateTransform
                attributeName="transform"
                type="scale"
                values="1 1;1.04 0.97;1 1"
                dur="2.8s"
                repeatCount="indefinite"
                additive="sum"
              />
            )}
          </path>
          <path
            d="M40 22 C47 38 48 52 43 62 C40 68 36 68 33 62 C28 52 33 38 40 22Z"
            fill="url(#mf-inner)"
          />
          <ellipse cx="40" cy="60" rx="6" ry="9" fill="white" opacity="0.9">
            {complete && (
              <animate
                attributeName="opacity"
                values="0.9;0.6;0.9"
                dur="2.8s"
                repeatCount="indefinite"
              />
            )}
          </ellipse>
          <defs>
            <linearGradient id="mf-grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ff7a30" />
              <stop offset="60%" stopColor="#ffb347" />
              <stop offset="100%" stopColor="#ffcf80" />
            </linearGradient>
            <linearGradient id="mf-inner" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ffd27d" />
              <stop offset="100%" stopColor="#fff4c9" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div
        style={{
          fontSize: "12px",
          color: "rgba(255,179,71,0.6)",
          letterSpacing: "0.06em",
          fontFamily: "inherit",
        }}
      >
        {day === 0
          ? "begin"
          : day >= 48
          ? "complete"
          : `day ${day}`}
      </div>
    </div>
  );
}

function MandalaRing({ history }: { history: SessionRecord[] }) {
  const day = getMandalaDay(history);
  const complete = day >= 48;

  // Celebration glow ring at day 48
  const celebrationStyle = complete
    ? {
        boxShadow:
          "0 0 60px rgba(255,179,71,0.12), 0 0 120px rgba(255,179,71,0.06)",
        borderColor: "rgba(255,179,71,0.4)",
      }
    : {};

  return (
    <div
      className="glass-card"
      style={{
        padding: "28px 24px 24px",
        transition: "box-shadow 1s ease, border-color 1s ease",
        ...celebrationStyle,
      }}
    >
      <div
        style={{
          color: "var(--muted)",
          fontSize: "13px",
          letterSpacing: "0.04em",
          marginBottom: "20px",
        }}
      >
        48-DAY MANDALA
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "280px",
          margin: "0 auto",
          aspectRatio: "1 / 1",
        }}
      >
        {/* SVG ring */}
        <svg
          viewBox="-260 -260 520 520"
          style={{ width: "100%", height: "100%", display: "block" }}
          aria-label={`Mandala progress: ${day} of 48 days`}
        >
          {/* Segment glow filter for complete state */}
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
            return (
              <path
                key={i}
                d={segmentPath(i)}
                style={{
                  fill: on ? "#ffb347" : "rgba(255,255,255,0.04)",
                  opacity: on ? (complete ? 1 : 0.55 + (i / day) * 0.45) : 1,
                  transition: "fill 0.4s ease, opacity 0.4s ease",
                  filter: isLast && !complete ? "url(#seg-glow)" : "none",
                }}
              />
            );
          })}

          {/* Top tick mark */}
          <line
            x1="0" y1={-(R_OUT + 8)}
            x2="0" y2={-(R_OUT + 18)}
            stroke="rgba(255,179,71,0.3)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Celebration: outer pulse ring at day 48 */}
          {complete && (
            <circle cx="0" cy="0" r={R_OUT + 18} fill="none" stroke="rgba(255,179,71,0.25)" strokeWidth="2">
              <animate attributeName="r" values={`${R_OUT + 14};${R_OUT + 28};${R_OUT + 14}`} dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" />
            </circle>
          )}
        </svg>

        {/* Centre flame */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <MandalaFlame day={day} />
        </div>
      </div>

      {/* Footer label */}
      <div
        style={{
          textAlign: "center",
          marginTop: "16px",
          color: "var(--muted)",
          fontSize: "14px",
          lineHeight: 1.5,
        }}
      >
        {complete ? (
          <span style={{ color: "#ffb347" }}>
            Mandala complete. A full cycle of practice.
          </span>
        ) : day === 0 ? (
          "Complete your first session to begin."
        ) : (
          <>
            <span style={{ color: "var(--text)" }}>{48 - day}</span> days remaining
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trend Chart
// ---------------------------------------------------------------------------
function TrendChart({ history }: { history: SessionRecord[] }) {
  const points = useMemo(() => [...history].reverse().slice(-30), [history]);

  if (points.length < 2) return null;

  const W = 600;
  const H = 120;
  const PAD = { top: 12, right: 16, bottom: 24, left: 32 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const scores = points.map((p) => p.attentionScore);
  const minScore = Math.max(0, Math.min(...scores) - 10);
  const maxScore = Math.min(100, Math.max(...scores) + 10);
  const range = maxScore - minScore || 1;

  const x = (i: number) => PAD.left + (i / (points.length - 1)) * chartW;
  const y = (score: number) =>
    PAD.top + chartH - ((score - minScore) / range) * chartH;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.attentionScore)}`)
    .join(" ");

  const areaPath = `${linePath} L ${x(points.length - 1)} ${PAD.top + chartH} L ${x(0)} ${PAD.top + chartH} Z`;
  const avgScore = Math.round(avg(scores));

  return (
    <div className="glass-card" style={{ padding: "24px 20px 16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "8px",
        }}
      >
        <span style={{ color: "var(--muted)", fontSize: "13px", letterSpacing: "0.04em" }}>
          ATTENTION TREND
        </span>
        <span style={{ color: "var(--muted)", fontSize: "13px" }}>avg {avgScore}</span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", overflow: "visible" }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="area-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffb347" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#ffb347" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[25, 50, 75].map((tick) => {
          const yPos = y(Math.min(Math.max(tick, minScore), maxScore));
          if (yPos < PAD.top || yPos > PAD.top + chartH) return null;
          return (
            <g key={tick}>
              <line
                x1={PAD.left} y1={yPos} x2={PAD.left + chartW} y2={yPos}
                stroke="rgba(255,255,255,0.05)" strokeWidth="1"
              />
              <text x={PAD.left - 6} y={yPos + 4} fill="var(--muted)" fontSize="11" textAnchor="end">
                {tick}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#area-grad)" />
        <path d={linePath} fill="none" stroke="#ffb347" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle
          cx={x(points.length - 1)}
          cy={y(points[points.length - 1].attentionScore)}
          r="4"
          fill="#ffb347"
        />
      </svg>

      <div style={{ textAlign: "right", color: "var(--muted)", fontSize: "12px", marginTop: "2px" }}>
        last {points.length} sessions
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function HistoryPage() {
  const history = loadHistory();
  const streak = getCurrentStreak(history);
  const totalSessions = history.length;
  const avgAttention = Math.round(avg(history.map((s) => s.attentionScore)));

  if (RESEARCH_MODE) {
    return (
      <div style={{ padding: "80px 24px 100px", maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
        <h1 style={{ fontSize: "48px", fontWeight: 400, marginBottom: "12px" }}>Session Records</h1>
        <p style={{ color: "#d9cbb8", fontSize: "20px", lineHeight: 1.5 }}>Hidden in research mode.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "60px 24px 100px", maxWidth: "760px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "48px" }}>
        <h1 style={{ fontSize: "clamp(40px, 6vw, 56px)", fontWeight: 400, marginBottom: "10px" }}>
          History
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "18px" }}>Your practice over time.</p>
      </div>

      {history.length === 0 ? (
        <div className="glass-card" style={{ textAlign: "center", padding: "48px 32px" }}>
          <div style={{ marginBottom: "16px", opacity: 0.4 }}>
            <SmallFlame size={32} />
          </div>
          <h2 style={{ fontWeight: 400, marginBottom: "10px" }}>No sessions yet</h2>
          <p style={{ color: "var(--muted)", margin: 0 }}>
            Complete your first session to start tracking progress.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Top stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            {[
              { label: "Streak", value: streak, suffix: streak === 1 ? " day" : " days" },
              { label: "Sessions", value: totalSessions, suffix: "" },
              { label: "Avg Score", value: avgAttention, suffix: "" },
            ].map(({ label, value, suffix }) => (
              <div key={label} className="glass-card" style={{ padding: "20px 16px", textAlign: "center" }}>
                <div style={{ fontSize: "30px", fontFamily: '"Playfair Display", Georgia, serif' }}>
                  {value}
                  <span style={{ fontSize: "14px", color: "var(--muted)" }}>{suffix}</span>
                </div>
                <div style={{ color: "var(--muted)", fontSize: "13px", marginTop: "6px" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* 48-day mandala */}
          <MandalaRing history={history} />

          {/* Trend chart */}
          <TrendChart history={history} />

        </div>
      )}
    </div>
  );
}
