import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import * as Sentry from "@sentry/react";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

// Error tracking — opt-in via env var. If VITE_SENTRY_DSN isn't set (e.g.
// local dev), Sentry stays dormant. Only enabled in production builds so
// dev console errors don't pollute the dashboard.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (import.meta.env.PROD && sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    // Conservative trace sampling — capture 10% of transactions so we have
    // performance signal without blowing through free-tier quota.
    tracesSampleRate: 0.1,
    // Don't ship session replay until we have a privacy-reviewed strategy
    // for it (would record what the user sees, including any notes typed).
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);