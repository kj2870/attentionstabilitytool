import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { RESEARCH_MODE } from "../lib/presentationMode";

type LayoutProps = {
  children: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = RESEARCH_MODE
    ? [
        { to: "/", label: "Home" },
        { to: "/session", label: "Session" },
        { to: "/privacy", label: "Privacy" },
      ]
    : [
        { to: "/", label: "Home" },
        { to: "/history", label: "History" },
        { to: "/philosophy", label: "Philosophy" },
        { to: "/science", label: "Science" },
        { to: "/privacy", label: "Privacy" },
      ];

  const isSessionRoute = location.pathname === "/session";

  return (
    <div
      style={{
        minHeight: "100vh",
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
            backdropFilter: "blur(10px)",
            background: "rgba(14,14,16,0.55)",
            borderBottom: "1px solid rgba(255,179,71,0.08)",
          }}
        >
          <div
            className="page-shell"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "20px 24px",
            }}
          >
            <div style={{ fontSize: "24px", letterSpacing: "1.5px" }}>
              {RESEARCH_MODE ? "VISUAL ATTENTION PROTOTYPE" : ""}
            </div>

            <nav
              style={{
                display: "flex",
                gap: "22px",
                fontSize: "15px",
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              {navItems.map((item) => {
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
    </div>
  );
}
