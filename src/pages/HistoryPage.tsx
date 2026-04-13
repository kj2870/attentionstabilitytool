import { RESEARCH_MODE } from "../lib/presentationMode";
import { clearHistory, getCurrentStreak, loadHistory } from "../lib/storage";

export default function HistoryPage() {
  const history = loadHistory();

  const avg = (values: number[]) => {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  const totalSessions = history.length;
  const currentStreak = getCurrentStreak(history);
  const averageAttention = Number(
    avg(
      history.map((session) =>
        typeof session.attentionScore === "number" ? session.attentionScore : 0
      )
    ).toFixed(0)
  );

  if (RESEARCH_MODE) {
    return (
      <div
        style={{
          padding: "80px 24px 100px",
          maxWidth: "900px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "48px", fontWeight: 400, marginBottom: "12px" }}>
          Session Records
        </h1>
        <p style={{ color: "#d9cbb8", fontSize: "20px", lineHeight: 1.5 }}>
          Hidden in research mode to keep the demo focused on live session instrumentation.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "60px 24px 100px",
        maxWidth: "1000px",
        margin: "0 auto",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h1 style={{ fontSize: "56px", fontWeight: 400, marginBottom: "12px" }}>
          History
        </h1>
        <p style={{ color: "#d9cbb8", fontSize: "22px" }}>
          Your practice streak and progress over time.
        </p>
      </div>

      {history.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
            marginBottom: "28px",
          }}
        >
          <div className="glass-card" style={{ padding: "18px" }}>
            <div className="muted-text" style={{ marginBottom: "6px" }}>
              Current Streak
            </div>
            <div style={{ fontSize: "30px" }}>{currentStreak}</div>
          </div>

          <div className="glass-card" style={{ padding: "18px" }}>
            <div className="muted-text" style={{ marginBottom: "6px" }}>
              Total Sessions
            </div>
            <div style={{ fontSize: "30px" }}>{totalSessions}</div>
          </div>

          <div className="glass-card" style={{ padding: "18px" }}>
            <div className="muted-text" style={{ marginBottom: "6px" }}>
              Average Attention
            </div>
            <div style={{ fontSize: "30px" }}>{averageAttention}</div>
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <div className="glass-card" style={{ textAlign: "center", padding: "40px" }}>
          <h2 style={{ fontWeight: 400 }}>No sessions yet</h2>
          <p style={{ color: "#cbbba7" }}>
            Complete a session and save it to see your progress here.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gap: "18px" }}>
            {history.map((session) => (
              <div
                key={session.id}
                className="glass-card"
                style={{
                  padding: "24px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "20px",
                    flexWrap: "wrap",
                    marginBottom: "18px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "22px", marginBottom: "6px" }}>
                      {new Date(session.date).toLocaleString()}
                    </div>
                    <div className="muted-text">
                      {session.timeOfDay} · {session.durationMin} min
                    </div>
                  </div>

                  <div className="muted-text">Grade {session.grade}</div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: "14px",
                  }}
                >
                  <div className="metric-card">
                    <div className="metric-label">Attention Score</div>
                    <div style={{ fontSize: "24px" }}>{session.attentionScore}</div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-label">Feeling</div>
                    <div style={{ fontSize: "24px" }}>{session.feeling || "—"}</div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-label">Time of Day</div>
                    <div style={{ fontSize: "24px" }}>{session.timeOfDay}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: "28px" }}>
            <button
              className="secondary-button"
              onClick={() => {
                clearHistory();
                window.location.reload();
              }}
            >
              Clear History
            </button>
          </div>
        </>
      )}
    </div>
  );
}
