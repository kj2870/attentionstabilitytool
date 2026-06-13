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
// Mandala Ring (kept from previous design — gentle 48-day arc)
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
// Within-session gaze steadiness arc
// Smooths the binary 0/1 stability samples with a small rolling average so the
// line reads as continuous texture rather than a noisy bit pattern.
// ---------------------------------------------------------------------------
function GazeSteadinessArc({ samples }: { samples: number[] }) {
  const width = 600;
  const height = 80;
  const padX = 8;
  const padY = 6;

  // Rolling 5-second mean — soft enough to feel meditative, fine enough that a
  // recovery from a drift is still visible.
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
    return (
      <div
        style={{
          fontSize: "12px",
          letterSpacing: "0.04em",
          color: "rgba(245, 233, 218, 0.35)",
          textAlign: "center",
          padding: "20px 0",
        }}
      >
        steadiness will appear here after your next session
      </div>
    );
  }

  const stepX = (width - padX * 2) / Math.max(1, smoothed.length - 1);
  const yFor = (v: number) => padY + (1 - v) * (height - padY * 2);
  const points = smoothed.map((v, i) => `${padX + i * stepX},${yFor(v)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: "80px", display: "block" }}
    >
      <defs>
        <linearGradient id="arc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,179,71,0.35)" />
          <stop offset="100%" stopColor="rgba(255,179,71,0)" />
        </linearGradient>
      </defs>
      {/* Soft area under the line */}
      <polyline
        points={`${padX},${height - padY} ${points} ${padX + (smoothed.length - 1) * stepX},${
          height - padY
        }`}
        fill="url(#arc-fill)"
        stroke="none"
      />
      <polyline
        points={points}
        fill="none"
        stroke="rgba(255, 200, 130, 0.85)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Trend sparkline — single warm line, no axes, no zones.
// ---------------------------------------------------------------------------
function TrendLine({
  values,
  unitLabel,
}: {
  values: number[];
  unitLabel: string;
}) {
  const width = 600;
  const height = 70;
  const padX = 8;
  const padY = 10;

  if (values.length === 0) {
    return (
      <div
        style={{
          fontSize: "12px",
          color: "rgba(245, 233, 218, 0.35)",
          textAlign: "center",
          padding: "20px 0",
        }}
      >
        your trend will appear here as you practice
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (width - padX * 2) / Math.max(1, values.length - 1);
  const yFor = (v: number) => padY + (1 - (v - min) / range) * (height - padY * 2);

  const points = values.map((v, i) => `${padX + i * stepX},${yFor(v)}`).join(" ");
  // The current-session dot is rendered as an HTML element absolutely
  // positioned over the stretched SVG, so it stays a true circle regardless
  // of the SVG's preserveAspectRatio="none" horizontal stretch.
  const lastXPercent = ((padX + (values.length - 1) * stepX) / width) * 100;
  const lastYPercent = (yFor(values[values.length - 1]) / height) * 100;

  return (
    <div style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: "70px", display: "block" }}
      >
        <polyline
          points={points}
          fill="none"
          stroke="rgba(255, 200, 130, 0.85)"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: `calc(${lastXPercent}% - 4px)`,
          top: `calc(${lastYPercent}% - 4px)`,
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: "rgba(255, 220, 160, 1)",
          boxShadow: "0 0 10px rgba(255, 200, 130, 0.45)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "11px",
          color: "rgba(245, 233, 218, 0.4)",
          marginTop: "4px",
        }}
      >
        <span>
          {min.toFixed(min < 10 ? 1 : 0)} {unitLabel}
        </span>
        <span>
          {max.toFixed(max < 10 ? 1 : 0)} {unitLabel}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Build a plain-language observation from the history. Factual, no verdict.
// ---------------------------------------------------------------------------
function buildObservation(history: SessionRecord[]): string {
  if (history.length === 0) return "your first sit will start the arc";
  if (history.length < 3) return "a few sits in — patterns usually emerge by sit 6 or 7";

  // Oldest-first
  const ordered = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const baselineCount = Math.min(3, ordered.length);
  const baseline =
    ordered.slice(0, baselineCount).reduce((s, r) => s + (r.longestGazeSec ?? 0), 0) /
    baselineCount;
  const recentCount = Math.min(7, ordered.length);
  const recent =
    ordered.slice(-recentCount).reduce((s, r) => s + (r.longestGazeSec ?? 0), 0) /
    recentCount;

  if (baseline === 0 && recent === 0)
    return "we'll have more to say once your sits include held-gaze segments";

  const delta = baseline === 0 ? 1 : (recent - baseline) / baseline;
  const fmt = (v: number) => `${v.toFixed(0)}s`;

  if (delta >= 0.15) {
    return `your longest gaze recently averaged ${fmt(recent)}, up from ${fmt(baseline)} when you started`;
  }
  if (delta <= -0.15) {
    return `your longest gaze has been hovering around ${fmt(recent)} recently`;
  }
  return `your longest gaze has been steady around ${fmt(recent)}`;
}

// ---------------------------------------------------------------------------
// Section heading — quiet, tracked, lowercase.
// ---------------------------------------------------------------------------
function SectionHeading({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: "11px",
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "rgba(245, 233, 218, 0.4)",
        marginBottom: "10px",
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
            maxWidth: "440px",
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
        maxWidth: "min(280px, 60vw)",
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
// Main Page
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

  const observation = useMemo(() => buildObservation(history), [history]);

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
        padding: "40px 24px 80px",
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
            Complete your first sit to begin the mandala.
          </p>
        </div>
      ) : (
        <>
          {/* Observation line — quiet, factual, no verdict. */}
          <div
            style={{
              fontSize: "15px",
              color: "rgba(245, 233, 218, 0.7)",
              lineHeight: 1.6,
              textAlign: "center",
              maxWidth: "44ch",
              margin: "0 auto 44px",
              fontFamily: '"Playfair Display", Georgia, serif',
            }}
          >
            {observation}
          </div>

          {/* Within-session gaze steadiness arc. */}
          <section style={{ marginBottom: "36px" }}>
            <SectionHeading label="gaze steadiness — last sit" />
            {lastWithArc ? (
              <GazeSteadinessArc samples={lastWithArc.gazeStabilitySamples ?? []} />
            ) : (
              <div
                style={{
                  fontSize: "12px",
                  color: "rgba(245, 233, 218, 0.35)",
                  textAlign: "center",
                  padding: "20px 0",
                }}
              >
                steadiness will appear here after your next sit
              </div>
            )}
          </section>

          {/* Longest gaze trend. */}
          <section style={{ marginBottom: "36px" }}>
            <SectionHeading label="longest gaze — across sits" />
            <TrendLine values={longestGazeTrend} unitLabel="s" />
          </section>

          {/* Blink rate during gaze trend. */}
          <section style={{ marginBottom: "48px" }}>
            <SectionHeading label="blink rate during gaze — across sits" />
            <TrendLine values={blinkRateTrend} unitLabel="/min" />
          </section>

          {/* Mandala below — the long arc. */}
          <section style={{ marginTop: "24px" }}>
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
          </section>
        </>
      )}
    </div>
  );
}
