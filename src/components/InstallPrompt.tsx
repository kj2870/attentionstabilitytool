import { useEffect, useState } from "react";

// BeforeInstallPromptEvent isn't in the standard DOM lib types.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "drishti_install_dismissed_at";
// Re-show the prompt at most every 14 days if dismissed.
const REDISPLAY_DAYS = 14;

function shouldShowAgain(): boolean {
  const dismissedAt = localStorage.getItem(DISMISSED_KEY);
  if (!dismissedAt) return true;
  const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
  return daysSince > REDISPLAY_DAYS;
}

function isStandalone(): boolean {
  // Already installed — match either standard or iOS Safari syntax.
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  );
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

// Subtle bottom-of-screen banner inviting the user to install the app.
// Two modes:
//   - Android Chrome: uses the `beforeinstallprompt` API for one-tap install.
//   - iOS Safari: shows manual "Share → Add to Home Screen" instructions.
// Hides itself if the app is already installed, dismissed recently, or on desktop.
export default function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (!shouldShowAgain()) return;

    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    if (!isMobile) return; // desktop — don't bother

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // On iOS, the API doesn't fire — show the manual prompt after a short delay.
    if (isIOS()) {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => {
        window.removeEventListener("beforeinstallprompt", handler);
        clearTimeout(t);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  };

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted" || outcome === "dismissed") {
      dismiss();
    }
  };

  const showAndroid = !!promptEvent;
  const showIOS = !promptEvent && isIOS();

  return (
    <div
      style={{
        position: "fixed",
        left: "16px",
        right: "16px",
        bottom: "calc(16px + env(safe-area-inset-bottom))",
        padding: "16px 18px",
        borderRadius: "16px",
        background: "rgba(20, 16, 10, 0.94)",
        border: "1px solid rgba(255, 179, 71, 0.18)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        fontFamily: "inherit",
        animation: "slideUp 0.5s ease",
      }}
    >
      <style>{`@keyframes slideUp { from { transform: translateY(120%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

      <div
        style={{
          fontSize: "14px",
          color: "rgba(245, 233, 218, 0.85)",
          lineHeight: 1.45,
        }}
      >
        {showAndroid && "Install Drishti for the full experience."}
        {showIOS && (
          <>
            Add Drishti to your home screen. Tap the share button{" "}
            <span style={{ color: "rgba(255, 179, 71, 0.9)" }}>⎙</span> then
            "Add to Home Screen".
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <button
          onClick={dismiss}
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(245, 233, 218, 0.5)",
            fontSize: "13px",
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          Not now
        </button>
        {showAndroid && (
          <button
            onClick={install}
            style={{
              background: "rgba(255, 179, 71, 0.9)",
              color: "#1a1209",
              border: "none",
              padding: "8px 16px",
              borderRadius: "999px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Install
          </button>
        )}
      </div>
    </div>
  );
}
