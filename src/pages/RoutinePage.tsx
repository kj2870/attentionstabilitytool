import { Link } from "react-router-dom";
import { useState } from "react";
import { RESEARCH_MODE } from "../lib/presentationMode";
import { loadRoutineSelection, saveRoutineSelection } from "../lib/storage";

export default function RoutinePage() {
  const savedRoutine = loadRoutineSelection();
  const [timeOfDay, setTimeOfDay] = useState(savedRoutine.timeOfDay);

  const options: {
    label: "Morning" | "Midday" | "Night";
    sub: string;
  }[] = RESEARCH_MODE
    ? [
        {
          label: "Morning",
          sub: "Context label for morning session runs.",
        },
        {
          label: "Midday",
          sub: "Context label for midday session runs.",
        },
        {
          label: "Night",
          sub: "Context label for evening session runs.",
        },
      ]
    : [
        {
          label: "Morning",
          sub: "Steady the mind before the day begins.",
        },
        {
          label: "Midday",
          sub: "Reset attention and clear mental residue.",
        },
        {
          label: "Night",
          sub: "Soften the system and settle into stillness.",
        },
      ];

  return (
    <div
      style={{
        padding: "60px 24px 100px",
        maxWidth: "900px",
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "56px", fontWeight: 400, marginBottom: "12px" }}>
        {RESEARCH_MODE ? "Prototype Session Setup" : "Prepare Your Practice"}
      </h1>

      <p
        style={{
          color: "#d9cbb8",
          fontSize: "22px",
          marginBottom: "18px",
          lineHeight: 1.5,
        }}
      >
        {RESEARCH_MODE
          ? "Select a context label and begin the fixed 10-minute prototype session."
          : "Choose the time context for today’s practice. The session itself stays the same: a calm, guided 10-minute Trataka ritual."}
      </p>

      <div
        style={{
          color: "#bfae97",
          fontSize: "18px",
          marginBottom: "38px",
        }}
      >
        Session length: 10 minutes
      </div>

      <div
        style={{
          maxWidth: "520px",
          margin: "0 auto",
          border: "1px solid rgba(255,179,71,0.18)",
          borderRadius: "24px",
          padding: "28px",
          textAlign: "left",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <h2 style={{ fontWeight: 400, marginTop: 0, marginBottom: "20px" }}>
          Time of Day
        </h2>

        <div style={{ display: "grid", gap: "16px" }}>
          {options.map((item) => (
            <button
              key={item.label}
              onClick={() => setTimeOfDay(item.label)}
              style={{
                background:
                  timeOfDay === item.label
                    ? "rgba(255,179,71,0.14)"
                    : "rgba(255,255,255,0.02)",
                color: "#F5E9DA",
                border: "1px solid rgba(255,179,71,0.22)",
                padding: "18px 20px",
                borderRadius: "18px",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: "20px", marginBottom: "6px" }}>
                {item.label}
              </div>
              <div style={{ color: "#cbbba7", fontSize: "16px" }}>{item.sub}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "40px" }}>
        <Link
          to="/session"
          onClick={() => saveRoutineSelection({ timeOfDay })}
          style={{ textDecoration: "none" }}
        >
          <button
            style={{
              background: "#FFB347",
              color: "#1a1209",
              padding: "16px 30px",
              borderRadius: "16px",
              fontSize: "18px",
              border: "none",
            }}
          >
            {RESEARCH_MODE ? "Start Prototype Session" : "Begin Session"}
          </button>
        </Link>
      </div>

      {!RESEARCH_MODE && (
        <div style={{ marginTop: "24px", color: "#bfae97", fontSize: "18px" }}>
          Selected: {timeOfDay}
        </div>
      )}
    </div>
  );
}
