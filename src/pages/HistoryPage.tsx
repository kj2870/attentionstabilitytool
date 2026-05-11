import { useMemo } from "react";
import { RESEARCH_MODE } from "../lib/presentationMode";
import { getCurrentStreak, loadHistory, type SessionRecord } from "../lib/storage";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function toDateKey(dateString: string) {
  const d = new Date(dateString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// ---------------------------------------------------------------------------
// Small Flame — used in calendar heatmap
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
// Trend Chart — attention score over last N sessions
// ---------------------------------------------------------------------------
function TrendChart({ history }: { history: SessionRecord[] }) {
  const points = useMemo(() => {
    return [...history].reverse().slice(-30);
  }, [history]);

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
  const y = (score: number) => PAD.top + chartH - ((score - minScore) / range) * chartH;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.attentionScore)}`)
    .join(" ");

  const areaPath = `${linePath} L ${x(points.length - 1)} ${PAD.top + chartH} L ${x(0)} ${PAD.top + chartH} Z`;

  const avgScore = Math.round(avg(scores));

  return (
    <div className="glass-card" style={{ padding: "24px 20px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
        <span style={{ color: "var(--muted)", fontSize: "13px", letterSpacing: "0.04em" }}>
          ATTENTION TREND
        </span>
        <span style={{ color: "var(--muted)", fontSize: "13px" }}>
          avg {avgScore}
        </span>
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

        {/* Y-axis gridlines */}
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

        {/* Area fill */}
        <path d={areaPath} fill="url(#area-grad)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#ffb347" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Dots — only show last point */}
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
// Calendar Heatmap — 12 weeks, flames on completed days
// ---------------------------------------------------------------------------
function CalendarHeatmap({ history }: { history: SessionRecord[] }) {
  const sessionDates = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of history) {
      const key = toDateKey(s.date);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [history]);

  // Build 15 weeks of days ending today
  const WEEKS = 15;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find the most recent Sunday
  const endSunday = new Date(today);
  endSunday.setDate(today.getDate() + (7 - today.getDay()) % 7);

  const days: { date: Date; key: string }[] = [];
  for (let w = WEEKS - 1; w >= 0; w--) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(endSunday);
      date.setDate(endSunday.getDate() - w * 7 - (6 - d));
      days.push({
        date,
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
      });
    }
  }

  const CELL = 28;
  const GAP = 4;
  const LABEL_W = 28;

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="glass-card" style={{ padding: "24px 20px" }}>
      <div style={{ color: "var(--muted)", fontSize: "13px", letterSpacing: "0.04em", marginBottom: "16px" }}>
        PRACTICE CALENDAR
      </div>

      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "flex", gap: `${GAP}px`, minWidth: "fit-content" }}>
          {/* Day labels */}
          <div style={{ display: "flex", flexDirection: "column", gap: `${GAP}px`, paddingTop: "24px" }}>
            {dayLabels.map((label, i) => (
              <div
                key={i}
                style={{
                  width: `${LABEL_W}px`,
                  height: `${CELL}px`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--muted)",
                  fontSize: "11px",
                }}
              >
                {i % 2 === 1 ? label : ""}
              </div>
            ))}
          </div>

          {/* Week columns */}
          {Array.from({ length: WEEKS }, (_, wk) => {
            const weekDays = days.slice(wk * 7, wk * 7 + 7);
            const firstOfWeek = weekDays[0].date;
            const showMonthLabel = firstOfWeek.getDate() <= 7;

            return (
              <div key={wk} style={{ display: "flex", flexDirection: "column", gap: `${GAP}px` }}>
                {/* Month label */}
                <div
                  style={{
                    height: "20px",
                    fontSize: "11px",
                    color: "var(--muted)",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {showMonthLabel
                    ? firstOfWeek.toLocaleString("default", { month: "short" })
                    : ""}
                </div>

                {/* Day cells */}
                {weekDays.map(({ date, key }) => {
                  const count = sessionDates.get(key) ?? 0;
                  const isFuture = date > today;
                  const isToday = key === toDateKey(today.toISOString());

                  return (
                    <div
                      key={key}
                      title={`${date.toLocaleDateString()} — ${count > 0 ? `${count} session${count > 1 ? "s" : ""}` : "no session"}`}
                      style={{
                        width: `${CELL}px`,
                        height: `${CELL}px`,
                        borderRadius: "8px",
                        border: isToday
                          ? "1px solid rgba(255,179,71,0.45)"
                          : "1px solid rgba(255,255,255,0.04)",
                        background: count > 0
                          ? "rgba(255,179,71,0.08)"
                          : isFuture
                          ? "transparent"
                          : "rgba(255,255,255,0.02)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: isFuture ? 0.2 : 1,
                        transition: "background 0.15s",
                      }}
                    >
                      {count > 0 && (
                        <SmallFlame
                          size={18}
                          opacity={count > 1 ? 1 : 0.85}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Weekly Summary
// ---------------------------------------------------------------------------
function WeeklySummary({ history }: { history: SessionRecord[] }) {
  const { thisWeek, lastWeek, diff } = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() + mondayOffset);
    thisMonday.setHours(0, 0, 0, 0);

    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);

    const thisWeekSessions = history.filter((s) => new Date(s.date) >= thisMonday);
    const lastWeekSessions = history.filter(
      (s) => new Date(s.date) >= lastMonday && new Date(s.date) < thisMonday
    );

    const thisAvg = Math.round(avg(thisWeekSessions.map((s) => s.attentionScore)));
    const lastAvg = Math.round(avg(lastWeekSessions.map((s) => s.attentionScore)));

    const uniqueDays = (sessions: SessionRecord[]) =>
      new Set(sessions.map((s) => toDateKey(s.date))).size;

    return {
      thisWeek: { sessions: thisWeekSessions.length, days: uniqueDays(thisWeekSessions), avg: thisAvg },
      lastWeek: { sessions: lastWeekSessions.length, days: uniqueDays(lastWeekSessions), avg: lastAvg },
      diff: thisAvg - lastAvg,
    };
  }, [history]);

  if (thisWeek.sessions === 0 && lastWeek.sessions === 0) return null;

  return (
    <div className="glass-card" style={{ padding: "24px" }}>
      <div style={{ color: "var(--muted)", fontSize: "13px", letterSpacing: "0.04em", marginBottom: "16px" }}>
        THIS WEEK
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
        <div>
          <div style={{ fontSize: "28px", fontFamily: '"Fraunces", serif', color: "var(--text)" }}>
            {thisWeek.days}<span style={{ fontSize: "14px", color: "var(--muted)", marginLeft: "4px" }}>/ 7</span>
          </div>
          <div style={{ color: "var(--muted)", fontSize: "13px", marginTop: "4px" }}>days</div>
        </div>

        <div>
          <div style={{ fontSize: "28px", fontFamily: '"Fraunces", serif', color: "var(--text)" }}>
            {thisWeek.sessions}
          </div>
          <div style={{ color: "var(--muted)", fontSize: "13px", marginTop: "4px" }}>sessions</div>
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontSize: "28px", fontFamily: '"Fraunces", serif', color: "var(--text)" }}>
              {thisWeek.avg || "—"}
            </span>
            {lastWeek.sessions > 0 && thisWeek.sessions > 0 && (
              <span style={{ fontSize: "13px", color: diff > 0 ? "#7ecb8a" : diff < 0 ? "#e07070" : "var(--muted)" }}>
                {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : "—"}
              </span>
            )}
          </div>
          <div style={{ color: "var(--muted)", fontSize: "13px", marginTop: "4px" }}>avg attention</div>
        </div>
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
        <p style={{ color: "#d9cbb8", fontSize: "20px", lineHeight: 1.5 }}>
          Hidden in research mode.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "60px 24px 100px", maxWidth: "760px", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "48px" }}>
        <h1 style={{ fontSize: "clamp(40px, 6vw, 56px)", fontWeight: 400, marginBottom: "10px" }}>
          History
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "18px" }}>
          Your practice over time.
        </p>
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
                <div style={{ fontSize: "30px", fontFamily: '"Fraunces", serif' }}>
                  {value}
                  <span style={{ fontSize: "14px", color: "var(--muted)" }}>{suffix}</span>
                </div>
                <div style={{ color: "var(--muted)", fontSize: "13px", marginTop: "6px" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Weekly summary */}
          <WeeklySummary history={history} />

          {/* Trend chart */}
          <TrendChart history={history} />

          {/* Calendar heatmap */}
          <CalendarHeatmap history={history} />

        </div>
      )}
    </div>
  );
}
