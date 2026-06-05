import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { RESEARCH_MODE } from "../lib/presentationMode";
import { signOut } from "../lib/auth";
import BottomTabBar from "./BottomTabBar";
import MeditationBackground from "./MeditationBackground";

type LayoutProps = {
  children: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      navigate("/onboarding", { replace: true });
    } catch {
      setSigningOut(false);
    }
  };

  const navLeft = RESEARCH_MODE
    ? [{ to: "/", label: "Home" }, { to: "/session", label: "Session" }]
    : [
        { to: "/", label: "Home" },
        { to: "/instructions", label: "Instructions" },
        { to: "/philosophy", label: "Philosophy" },
        { to: "/science", label: "Science" },
      ];

  const navRight = RESEARCH_MODE
    ? [{ to: "/privacy", label: "Privacy" }]
    : [{ to: "/history", label: "History" }, { to: "/privacy", label: "Privacy" }];

  const isSessionRoute = location.pathname === "/session";

  return (
    <MeditationBackground>
    <div
      style={{
        minHeight: "100dvh",
        color: "#F5E9DA",
      }}
    >
      {!isSessionRoute && (
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            background: "transparent",
          }}
        >
          <div
            className="page-shell"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "18px 24px",
            }}
          >
            {/* Left nav */}
            <nav style={{ display: "flex", gap: "26px", fontSize: "14px", textTransform: "lowercase", letterSpacing: "0.08em" }}>
              {navLeft.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    style={{
                      color: active ? "rgba(245,233,218,0.92)" : "rgba(245,233,218,0.5)",
                      textDecoration: "none",
                      borderBottom: active
                        ? "1px solid rgba(255,179,71,0.55)"
                        : "1px solid transparent",
                      paddingBottom: "3px",
                      transition: "color 0.18s ease, border-color 0.18s ease",
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right nav */}
            <nav style={{ display: "flex", gap: "26px", fontSize: "14px", textTransform: "lowercase", letterSpacing: "0.08em", alignItems: "center" }}>
              {navRight.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    style={{
                      color: active ? "rgba(245,233,218,0.92)" : "rgba(245,233,218,0.5)",
                      textDecoration: "none",
                      borderBottom: active
                        ? "1px solid rgba(255,179,71,0.55)"
                        : "1px solid transparent",
                      paddingBottom: "3px",
                      transition: "color 0.18s ease, border-color 0.18s ease",
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
              {!RESEARCH_MODE && (
                <button
                  onClick={() => void handleSignOut()}
                  disabled={signingOut}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    color: "rgba(245,233,218,0.35)",
                    fontSize: "14px",
                    letterSpacing: "0.08em",
                    textTransform: "lowercase",
                    fontFamily: "inherit",
                    cursor: signingOut ? "not-allowed" : "pointer",
                    transition: "color 0.18s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!signingOut) {
                      e.currentTarget.style.color = "rgba(245,233,218,0.65)";
                      e.currentTarget.style.transform = "none";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "rgba(245,233,218,0.35)";
                  }}
                  aria-label="Sign out"
                >
                  {signingOut ? "…" : "sign out"}
                </button>
              )}
            </nav>
          </div>
        </header>
      )}

      <main className="route-fade-in">{children}</main>

      {/* Mobile-only bottom tab navigation — hidden on desktop via CSS */}
      {!isSessionRoute && <BottomTabBar />}
    </div>
    </MeditationBackground>
  );
}
