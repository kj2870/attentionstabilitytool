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
// Mandala Ring geometry
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

// ---------------------------------------------------------------------------
// Shared chart bits
// ---------------------------------------------------------------------------
const AXIS_LABEL: React.CSSProperties = {
  fontSize: "11px",
  fontFamily: '"Mukta", "DM Sans", sans-serif',
  fontWeight: 300,
  letterSpacing: "0.04em",
  color: "rgba(245, 233, 218, 0.38)",
};

function EmptyChartNote({ text }: { text: string }) {
  return (
    <div
      style={{
        fontSize: "12px",
        fontFamily: '"Mukta", "DM Sans", sans-serif',
        fontWeight: 300,
        color: "rgba(245, 233, 218, 0.35)",
        textAlign: "center",
        padding: "26px 0",
        border: "1px dashed rgba(245, 233, 218, 0.08)",
        borderRadius: "12px",
      }}
    >
      {text}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Within-sit gaze steadiness arc — per-second 0/1 samples smoothed with a
// rolling mean. Upgrades for readability:
//   • "held N% of gaze time" headline so the chart has a takeaway
//   • faint separators at each 60s gaze-round boundary
//   • steady / drifting side labels so the y-axis has meaning
// ---------------------------------------------------------------------------
function GazeSteadinessArc({ samples }: { samples: number[] }) {
  const width = 600;
  const height = 96;
  const padX = 8;
  const padY = 8;

  const smoothed = useMemo(() => {
    if (samples.length === 0) return [] as number[];
    const window = 5;
    const out: number[] = [];
    for (let i = 0; i < samples.length; i += 1) {
      let sum = 0;
      let count = 0;
      for (let j = Math.max(0, i - window + 1); j <= i; j += 1) {
        sum += samples[j];
        count += 1;
      }
      out.push(sum / count);
    }
    return out;
  }, [samples]);

  if (smoothed.length === 0) {
    return <EmptyChartNote text="appears after your next sit with the camera on" />;
  }

  const heldPercent = Math.round(
    (samples.reduce((s, v) => s + v, 0) / samples.length) * 100
  );

  const stepX = (width - padX * 2) / Math.max(1, smoothed.length - 1);
  const yFor = (v: number) => padY + (1 - v) * (height - padY * 2);
  const points = smoothed.map((v, i) => `${padX + i * stepX},${yFor(v)}`).join(" ");

  // Gaze rounds are 60s each — separators mark the boundaries so the five
  // rounds read as chapters.
  const roundBoundaries: number[] = [];
  for (let s = 60; s < samples.length; s += 60) roundBoundaries.push(s);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "8px",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            fontSize: "26px",
            fontFamily: '"Playfair Display", Georgia, serif',
            color: "rgba(245, 233, 218, 0.92)",
            lineHeight: 1,
          }}
        >
          {heldPercent}%
        </span>
        <span style={AXIS_LABEL}>of gaze time held steady</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px" }}>
        {/* y-axis meaning */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "2px 0",
          }}
        >
          <span style={AXIS_LABEL}>steady</span>
          <span style={AXIS_LABEL}>drifting</span>
        </div>

        <div>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            style={{ width: "100%", height: "96px", display: "block" }}
          >
            <defs>
              <linearGradient id="arc-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,179,71,0.32)" />
                <stop offset="100%" stopColor="rgba(255,179,71,0)" />
              </linearGradient>
            </defs>

            {/* Reference line at fully-steady */}
            <line
              x1={padX}
              y1={yFor(1)}
              x2={width - padX}
              y2={yFor(1)}
              stroke="rgba(245,233,218,0.10)"
              strokeWidth="1"
              strokeDasharray="2 5"
              vectorEffect="non-scaling-stroke"
            />

            {/* Round separators */}
            {roundBoundaries.map((s) => (
              <line
                key={s}
                x1={padX + s * stepX}
                y1={padY}
                x2={padX + s * stepX}
                y2={height - padY}
                stroke="rgba(245,233,218,0.08)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            <polyline
              points={`${padX},${height - padY} ${points} ${
                padX + (smoothed.length - 1) * stepX
              },${height - padY}`}
              fill="url(#arc-fill)"
              stroke="none"
            />
            <polyline
              points={points}
              fill="none"
              stroke="rgba(255, 200, 130, 0.9)"
              strokeWidth={1.6}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "4px",
            }}
          >
            <span style={AXIS_LABEL}>round 1</span>
            <span style={AXIS_LABEL}>
              round {Math.min(5, Math.ceil(samples.length / 60))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trend chart — one value per sit. Readability upgrades:
//   • current value stated as a headline, with unit
//   • visible dots per sit while data is sparse (≤14 points)
//   • soft area fill + min/max gridlines
//   • works from a single data point (dot + value, no degenerate line)
// ---------------------------------------------------------------------------
function TrendChart({
  values,
  unitLabel,
  hint,
  emptyText,
}: {
  values: number[];
  unitLabel: string;
  hint?: string;
  emptyText: string;
}) {
  const width = 600;
  const height = 84;
  const padX = 10;
  const padY = 12;

  if (values.length === 0) {
    return <EmptyChartNote text={emptyText} />;
  }

  const current = values[values.length - 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX =
    values.length === 1 ? 0 : (width - padX * 2) / (values.length - 1);
  const yFor = (v: number) =>
    values.length === 1
      ? height / 2
      : padY + (1 - (v - min) / range) * (height - padY * 2);
  const xFor = (i: number) => (values.length === 1 ? width / 2 : padX + i * stepX);

  const points = values.map((v, i) => `${xFor(i)},${yFor(v)}`).join(" ");
  const showDots = values.length <= 14;

  const fmt = (v: number) => v.toFixed(v < 10 && v % 1 !== 0 ? 1 : 0);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "8px",
          marginBottom: "10px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "26px",
            fontFamily: '"Playfair Display", Georgia, serif',
            color: "rgba(245, 233, 218, 0.92)",
            lineHeight: 1,
          }}
        >
          {fmt(current)}
          <span
            style={{
              fontSize: "14px",
              fontFamily: '"Mukta", "DM Sans", sans-serif',
              fontWeight: 300,
              color: "rgba(245, 233, 218, 0.45)",
              marginLeft: "4px",
            }}
          >
            {unitLabel}
          </span>
        </span>
        <span style={AXIS_LABEL}>latest sit</span>
        {hint && (
          <span style={{ ...AXIS_LABEL, marginLeft: "auto" }}>{hint}</span>
        )}
      </div>

      <div style={{ position: "relative" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          style={{ width: "100%", height: "84px", display: "block" }}
        >
          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,179,71,0.22)" />
              <stop offset="100%" stopColor="rgba(255,179,71,0)" />
            </linearGradient>
          </defs>

          {/* min / max gridlines */}
          {values.length > 1 && (
            <>
              <line
                x1={padX}
                y1={yFor(max)}
                x2={width - padX}
                y2={yFor(max)}
                stroke="rgba(245,233,218,0.08)"
                strokeWidth="1"
                strokeDasharray="2 5"
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={padX}
                y1={yFor(min)}
                x2={width - padX}
                y2={yFor(min)}
                stroke="rgba(245,233,218,0.08)"
                strokeWidth="1"
                strokeDasharray="2 5"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}

          {values.length > 1 && (
            <>
              <polyline
                points={`${xFor(0)},${height - padY} ${points} ${xFor(
                  values.length - 1
                )},${height - padY}`}
                fill="url(#trend-fill)"
                stroke="none"
              />
              <polyline
                points={points}
                fill="none"
                stroke="rgba(255, 200, 130, 0.9)"
                strokeWidth={1.6}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
        </svg>

        {/* Dots as HTML overlays so they stay circular despite the SVG's
            horizontal stretch. Shown while data is sparse; the latest sit
            always gets the bright marker. */}
        {values.map((v, i) => {
          const isLast = i === values.length - 1;
          if (!showDots && !isLast) return null;
          const xPct = (xFor(i) / width) * 100;
          const yPct = (yFor(v) / height) * 100;
          return (
            <div
              key={i}
              aria-hidden
              style={{
                position: "absolute",
                left: `calc(${xPct}% - ${isLast ? 4 : 2.5}px)`,
                top: `calc(${yPct}% - ${isLast ? 4 : 2.5}px)`,
                width: isLast ? "8px" : "5px",
                height: isLast ? "8px" : "5px",
                borderRadius: "50%",
                background: isLast
                  ? "rgba(255, 220, 160, 1)"
                  : "rgba(255, 200, 130, 0.55)",
                boxShadow: isLast ? "0 0 10px rgba(255, 200, 130, 0.45)" : "none",
                pointerEvents: "none",
              }}
            />
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "4px",
        }}
      >
        <span style={AXIS_LABEL}>
          {values.length === 1 ? "first sit" : `${values.length} sits`}
        </span>
        <span style={AXIS_LABEL}>
          {values.length > 1 ? `best ${fmt(max)} ${unitLabel}` : "your trend starts here"}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compact stat tiles across the top of the data column.
// ---------------------------------------------------------------------------
function StatTiles({ history }: { history: SessionRecord[] }) {
  const totalSits = history.length;
  const bestGaze = Math.max(0, ...history.map((r) => r.longestGazeSec ?? 0));
  const stillnessMin = Math.round(
    history.reduce((s, r) => s + (r.totalStillnessSec ?? 0), 0) / 60
  );

  const tiles = [
    { value: String(totalSits), label: totalSits === 1 ? "sit" : "sits" },
    { value: `${bestGaze}s`, label: "best gaze" },
    { value: `${stillnessMin}m`, label: "total stillness" },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "10px",
      }}
    >
      {tiles.map((t) => (
        <div
          key={t.label}
          style={{
            border: "1px solid rgba(255, 179, 71, 0.10)",
            borderRadius: "14px",
            background: "rgba(255, 255, 255, 0.02)",
            padding: "14px 8px 12px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "24px",
              fontFamily: '"Playfair Display", Georgia, serif',
              color: "rgba(245, 233, 218, 0.92)",
              lineHeight: 1.1,
            }}
          >
            {t.value}
          </div>
          <div style={{ ...AXIS_LABEL, marginTop: "4px" }}>{t.label}</div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section heading — quiet, tracked, lowercase.
// ---------------------------------------------------------------------------
function SectionHeading({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: "11px",
        fontFamily: '"Mukta", "DM Sans", sans-serif',
        fontWeight: 300,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "rgba(245, 233, 218, 0.4)",
        marginBottom: "12px",
      }}
    >
      {label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail panel — appears when a mandala segment is clicked
// ---------------------------------------------------------------------------
function SessionDetail({ session, dayNumber }: { session: SessionRecord; dayNumber: number }) {
  return (
    <div
      style={{
        marginTop: "16px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
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

      <div style={{ fontSize: "13px", color: "rgba(245, 233, 218, 0.75)", lineHeight: 1.7 }}>
        Longest gaze: {session.longestGazeSec ?? 0}s
        {session.blinkRateDuringGaze !== undefined && (
          <>
            <span style={{ color: "rgba(245, 233, 218, 0.25)", margin: "0 10px" }}>·</span>
            Blink rate during gaze: {session.blinkRateDuringGaze.toFixed(1)}/min
          </>
        )}
      </div>

      {session.note && (
        <div
          style={{
            marginTop: "2px",
            maxWidth: "360px",
            fontSize: "13px",
            lineHeight: 1.6,
            color: "rgba(245, 233, 218, 0.55)",
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
        maxWidth: "min(320px, 70vw)",
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

        <line
          x1="0"
          y1={-(R_OUT + 8)}
          x2="0"
          y2={-(R_OUT + 18)}
          stroke="rgba(255,179,71,0.3)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

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
// Main Page — two columns: data (left) · mandala (right).
// ---------------------------------------------------------------------------
export default function HistoryPage() {
  const history = loadHistory();
  const daySessions = useMemo(() => buildDaySessions(history), [history]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Oldest-first ordered history, used for trend lines.
  const ordered = useMemo(
    () =>
      [...history].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    [history]
  );

  // Last session with stability samples (may not be the most recent if older
  // sessions are pre-schema).
  const lastWithArc = useMemo(
    () =>
      [...ordered]
        .reverse()
        .find((r) => r.gazeStabilitySamples && r.gazeStabilitySamples.length > 0) ?? null,
    [ordered]
  );

  const longestGazeTrend = useMemo(
    () =>
      ordered
        .map((r) => r.longestGazeSec ?? 0)
        .filter((v) => v >= 0)
        .slice(-30),
    [ordered]
  );

  const blinkRateTrend = useMemo(
    () =>
      ordered
        .map((r) => r.blinkRateDuringGaze)
        .filter((v): v is number => typeof v === "number")
        .slice(-30),
    [ordered]
  );

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
        padding: "40px 32px 80px",
        maxWidth: "1080px",
        margin: "0 auto",
        fontFamily: '"DM Sans", system-ui, sans-serif',
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .record-grid {
          display: flex;
          gap: 48px;
          align-items: flex-start;
        }
        .record-grid__data {
          flex: 1.15 1 420px;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 36px;
        }
        .record-grid__divider {
          width: 1px;
          align-self: stretch;
          background: linear-gradient(
            180deg,
            transparent 0%,
            rgba(245, 233, 218, 0.14) 18%,
            rgba(245, 233, 218, 0.14) 82%,
            transparent 100%
          );
        }
        .record-grid__mandala {
          flex: 1 1 340px;
          min-width: 0;
          position: sticky;
          top: 84px;
        }
        @media (max-width: 860px) {
          .record-grid { flex-direction: column; gap: 44px; }
          .record-grid__divider { display: none; }
          .record-grid__mandala { position: static; width: 100%; }
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
            Complete your first sit to begin the mandala.
          </p>
        </div>
      ) : (
        <div className="record-grid">
          {/* ------------- Left column: the data ------------- */}
          <div className="record-grid__data">
            <StatTiles history={history} />

            <section>
              <SectionHeading label="gaze steadiness — last sit" />
              {lastWithArc ? (
                <GazeSteadinessArc samples={lastWithArc.gazeStabilitySamples ?? []} />
              ) : (
                <EmptyChartNote text="appears after your next sit with the camera on" />
              )}
            </section>

            <section>
              <SectionHeading label="longest gaze — across sits" />
              <TrendChart
                values={longestGazeTrend}
                unitLabel="s"
                hint="higher is steadier"
                emptyText="your trend will appear as you practice"
              />
            </section>

            <section>
              <SectionHeading label="blink rate during gaze — across sits" />
              <TrendChart
                values={blinkRateTrend}
                unitLabel="/min"
                hint="lower is calmer"
                emptyText="appears after your next sit with the camera on"
              />
            </section>
          </div>

          {/* ------------- Divider ------------- */}
          <div className="record-grid__divider" aria-hidden />

          {/* ------------- Right column: the mandala ------------- */}
          <div className="record-grid__mandala">
            <SectionHeading label="the 48-day arc" />
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
                  marginTop: "20px",
                  textAlign: "center",
                  fontSize: "11px",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "rgba(245, 233, 218, 0.3)",
                }}
              >
                Tap a lit segment for that day
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
