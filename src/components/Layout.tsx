import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { RESEARCH_MODE } from "../lib/presentationMode";
import BottomTabBar from "./BottomTabBar";

type LayoutProps = {
  children: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navLeft = RESEARCH_MODE
    ? [{ to: "/", label: "Home" }, { to: "/session", label: "Session" }]
    : [{ to: "/", label: "Home" }, { to: "/philosophy", label: "Philosophy" }, { to: "/science", label: "Science" }];

  const navRight = RESEARCH_MODE
    ? [{ to: "/privacy", label: "Privacy" }]
    : [{ to: "/history", label: "History" }, { to: "/privacy", label: "Privacy" }];

  const isSessionRoute = location.pathname === "/session";

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0E0E10",
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
            <nav style={{ display: "flex", gap: "22px", fontSize: "15px" }}>
              {navLeft.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    style={{
                      color: active ? "rgba(255,179,71,0.85)" : "rgba(245,233,218,0.5)",
                      textDecoration: "none",
                      transition: "color 0.18s ease",
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right nav */}
            <nav style={{ display: "flex", gap: "22px", fontSize: "15px" }}>
              {navRight.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    style={{
                      color: active ? "rgba(255,179,71,0.85)" : "rgba(245,233,218,0.5)",
                      textDecoration: "none",
                      transition: "color 0.18s ease",
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>
      )}

      <main>{children}</main>

      {/* Mobile-only bottom tab navigation — hidden on desktop via CSS */}
      {!isSessionRoute && <BottomTabBar />}
    </div>
  );
}
