import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

// Top-level error boundary — a render-time exception anywhere in the tree
// shows a calm recovery screen instead of a blank page.
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Drishti] Uncaught render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "linear-gradient(180deg, #0a0805 0%, #15100a 60%, #0a0805 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "20px",
          textAlign: "center",
          padding: "32px",
          color: "rgba(245, 233, 218, 0.85)",
          fontFamily: '"DM Sans", system-ui, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: "clamp(22px, 3vw, 28px)",
            fontFamily: '"Playfair Display", Georgia, serif',
            fontWeight: 400,
          }}
        >
          Something flickered out.
        </div>
        <div
          style={{
            fontSize: "14px",
            lineHeight: 1.7,
            color: "rgba(217, 203, 184, 0.6)",
            maxWidth: "38ch",
          }}
        >
          An unexpected error interrupted the app. Your saved sessions are safe.
        </div>
        <button className="cta-pill" onClick={() => window.location.reload()}>
          Return
        </button>
      </div>
    );
  }
}
