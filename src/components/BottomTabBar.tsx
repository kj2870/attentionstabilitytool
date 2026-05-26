import { Link, useLocation } from "react-router-dom";

type Tab = {
  to: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
  // Routes that should highlight this tab (e.g. /philosophy → About tab).
  matches: string[];
};

// Inline SVG icons keep the bundle small and styling consistent.
function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 4 L20 11 V20 H14 V14 H10 V20 H4 V11 Z"
        fill={active ? "rgba(255,179,71,0.85)" : "none"}
        stroke={active ? "rgba(255,179,71,0.85)" : "rgba(245,233,218,0.55)"}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HistoryIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle
        cx="12"
        cy="12"
        r="8"
        stroke={active ? "rgba(255,179,71,0.85)" : "rgba(245,233,218,0.55)"}
        strokeWidth="1.6"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        fill={active ? "rgba(255,179,71,0.85)" : "none"}
        stroke={active ? "rgba(255,179,71,0.85)" : "rgba(245,233,218,0.55)"}
        strokeWidth="1.6"
      />
    </svg>
  );
}

function AboutIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 5 H12 V19 H5 Z M12 5 H19 V19 H12 Z"
        fill={active ? "rgba(255,179,71,0.18)" : "none"}
        stroke={active ? "rgba(255,179,71,0.85)" : "rgba(245,233,218,0.55)"}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const TABS: Tab[] = [
  {
    to: "/",
    label: "Home",
    icon: (active) => <HomeIcon active={active} />,
    matches: ["/"],
  },
  {
    to: "/history",
    label: "History",
    icon: (active) => <HistoryIcon active={active} />,
    matches: ["/history"],
  },
  {
    to: "/about",
    label: "About",
    icon: (active) => <AboutIcon active={active} />,
    matches: ["/about", "/philosophy", "/science", "/privacy"],
  },
];

// Bottom tab navigation — mobile only. Hides itself on desktop via media query
// in index.css. Safe-area-aware so it sits clear of the home indicator on iOS.
export default function BottomTabBar() {
  const location = useLocation();

  return (
    <nav
      className="bottom-tab-bar"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 30,
        background: "rgba(10, 8, 5, 0.92)",
        borderTop: "1px solid rgba(255, 179, 71, 0.08)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          maxWidth: "560px",
          margin: "0 auto",
          padding: "8px 0 6px",
        }}
      >
        {TABS.map((tab) => {
          const active = tab.matches.some((path) =>
            path === "/" ? location.pathname === "/" : location.pathname.startsWith(path)
          );
          return (
            <Link
              key={tab.to}
              to={tab.to}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                padding: "8px 16px",
                minWidth: "72px",
                minHeight: "56px",
                textDecoration: "none",
                color: active ? "rgba(255,179,71,0.85)" : "rgba(245,233,218,0.55)",
                transition: "color 0.2s ease",
              }}
            >
              {tab.icon(active)}
              <span
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.04em",
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
