/**
 * Mode switching for Drishti.
 *
 * Priority (highest → lowest):
 *   1. URL param  ?mode=research | ?mode=consumer
 *      → saves to localStorage, strips param from URL so links stay clean
 *   2. localStorage key  "drishti_mode"
 *      → persists across page reloads without needing a rebuild
 *   3. Vite env var  VITE_APP_MODE  (set in .env / .env.local)
 *   4. Default: "consumer"
 *
 * Quick-switch in the browser console:
 *   localStorage.setItem("drishti_mode", "research"); location.reload();
 *   localStorage.setItem("drishti_mode", "consumer");  location.reload();
 *
 * Quick-switch via URL:
 *   http://localhost:5173/?mode=research
 *   http://localhost:5173/?mode=consumer
 */

type AppMode = "research" | "consumer";

function resolveMode(): AppMode {
  if (typeof window === "undefined") return "consumer";

  // 1. URL param — highest priority
  const params = new URLSearchParams(window.location.search);
  const urlMode = params.get("mode");

  if (urlMode === "research" || urlMode === "consumer") {
    try {
      localStorage.setItem("drishti_mode", urlMode);
    } catch {
      // localStorage unavailable (private browsing edge case) — proceed anyway
    }

    // Strip the param from the URL so it doesn't stay in the address bar
    params.delete("mode");
    const cleaned =
      window.location.pathname + (params.toString() ? `?${params.toString()}` : "");
    window.history.replaceState({}, "", cleaned);

    return urlMode;
  }

  // 2. localStorage
  try {
    const stored = localStorage.getItem("drishti_mode");
    if (stored === "research" || stored === "consumer") return stored;
  } catch {
    // ignore
  }

  // 3. Vite env variable (set VITE_APP_MODE=research in .env.local)
  const envMode = import.meta.env.VITE_APP_MODE;
  if (envMode === "research" || envMode === "consumer") return envMode;

  // 4. Default
  return "consumer";
}

const _mode = resolveMode();

export const RESEARCH_MODE = _mode === "research";
export const APP_MODE: AppMode = _mode;
