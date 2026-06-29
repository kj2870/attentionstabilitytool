import { useRegisterSW } from "virtual:pwa-register/react";

// Surfaces a quiet banner when a new build is ready. Without this, a tab
// left open all day stays on the old version until the user hard-refreshes
// — they'd see "this app doesn't have the feature you mentioned" bugs that
// resolve themselves on reload.
export default function UpdateBanner() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } =
    useRegisterSW({
      // No-ops — we only care about the needRefresh state for the banner.
      onRegisteredSW() {},
      onRegisterError() {},
    });

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        bottom: "calc(20px + env(safe-area-inset-bottom))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "10px 14px 10px 20px",
        background: "rgba(20, 16, 10, 0.92)",
        border: "1px solid rgba(255, 179, 71, 0.32)",
        borderRadius: "999px",
        backdropFilter: "blur(8px)",
        color: "rgba(245, 233, 218, 0.85)",
        fontFamily: '"Mukta", "DM Sans", sans-serif',
        fontWeight: 300,
        fontSize: "13px",
        letterSpacing: "0.04em",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
      }}
    >
      <span>A new version is ready.</span>
      <button
        onClick={() => void updateServiceWorker(true)}
        style={{
          background: "rgba(255, 179, 71, 0.18)",
          border: "1px solid rgba(255, 179, 71, 0.45)",
          color: "rgba(255, 220, 170, 0.95)",
          padding: "6px 14px",
          borderRadius: "999px",
          fontFamily: "inherit",
          fontSize: "12px",
          fontWeight: 400,
          letterSpacing: "0.06em",
          cursor: "pointer",
        }}
      >
        refresh
      </button>
      <button
        onClick={() => setNeedRefresh(false)}
        aria-label="Dismiss update notice"
        style={{
          background: "transparent",
          border: "none",
          color: "rgba(217, 203, 184, 0.45)",
          fontSize: "16px",
          lineHeight: 1,
          cursor: "pointer",
          padding: "4px 6px",
        }}
      >
        ×
      </button>
    </div>
  );
}
