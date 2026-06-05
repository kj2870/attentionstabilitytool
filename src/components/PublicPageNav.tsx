import { Link } from "react-router-dom";

/**
 * Minimal top-left back link used on pages reachable pre-auth
 * (Instructions, Philosophy, Science, Privacy). Authenticated users see the
 * full top nav from Layout instead — this component is conditionally rendered
 * by checking the URL pathname, since the Layout itself is not mounted for
 * unauth routes.
 *
 * The pages render this themselves and it's a no-op when the page is being
 * shown inside the authenticated Layout (the full nav is already overhead).
 */
export default function PublicPageNav() {
  return (
    <div
      style={{
        position: "fixed",
        top: "env(safe-area-inset-top, 0px)",
        left: 0,
        right: 0,
        padding: "20px 24px",
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      <Link
        to="/onboarding"
        style={{
          pointerEvents: "auto",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "13px",
          letterSpacing: "0.08em",
          color: "rgba(217, 203, 184, 0.55)",
          textDecoration: "none",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M15 6 L9 12 L15 18"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        back
      </Link>
    </div>
  );
}
