import { Link } from "react-router-dom";
import MeditationBackground from "../components/MeditationBackground";

// Mobile-only hub page that links to the longer-form content pages.
// On desktop the same pages are reachable directly from the top nav.
const SECTIONS = [
  {
    to: "/instructions",
    title: "Instructions",
    description: "What happens in a session, in five lines.",
  },
  {
    to: "/philosophy",
    title: "Why focus",
    description: "The practice and what it asks of us.",
  },
  {
    to: "/science",
    title: "The research",
    description: "Studies on trataka and sustained attention.",
  },
  {
    to: "/privacy",
    title: "Privacy",
    description: "How your data is handled.",
  },
];

export default function AboutPage() {
  return (
    <MeditationBackground>
    <div
      style={{
        padding: "48px 24px 96px",
        maxWidth: "560px",
        margin: "0 auto",
        fontFamily: '"DM Sans", system-ui, sans-serif',
      }}
    >
      <h1
        style={{
          fontSize: "clamp(36px, 8vw, 48px)",
          fontWeight: 400,
          marginBottom: "32px",
          lineHeight: 1.1,
        }}
      >
        About
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {SECTIONS.map((section) => (
          <Link
            key={section.to}
            to={section.to}
            style={{
              textDecoration: "none",
              padding: "20px 22px",
              borderRadius: "16px",
              background: "rgba(255, 179, 71, 0.04)",
              border: "1px solid rgba(255, 179, 71, 0.08)",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              minHeight: "72px",
              justifyContent: "center",
              transition: "background 0.2s, border-color 0.2s",
            }}
          >
            <div
              style={{
                fontSize: "18px",
                fontFamily: '"Playfair Display", Georgia, serif',
                color: "rgba(245, 233, 218, 0.9)",
              }}
            >
              {section.title}
            </div>
            <div
              style={{
                fontSize: "14px",
                color: "rgba(245, 233, 218, 0.55)",
                lineHeight: 1.45,
              }}
            >
              {section.description}
            </div>
          </Link>
        ))}
      </div>
    </div>
    </MeditationBackground>
  );
}
