import { Link } from "react-router-dom";
import { RESEARCH_MODE } from "../lib/presentationMode";
import { saveRoutineSelection } from "../lib/storage";

export default function RoutinePage() {
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
          ? "Begin the fixed 10-minute prototype session."
          : "A calm, guided 10-minute Trataka ritual."}
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

      <div style={{ marginTop: "40px" }}>
        <Link
          to="/session"
          onClick={() => saveRoutineSelection({ timeOfDay: "Night" })}
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
    </div>
  );
}
