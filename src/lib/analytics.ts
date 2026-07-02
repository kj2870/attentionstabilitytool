import posthog from "posthog-js";

// ---------------------------------------------------------------------------
// Analytics — PostHog, configured for minimal collection.
//
// Philosophy: explicit events only. No autocapture, no session replay, no
// automatic pageviews. We track ~8 hand-picked moments that answer three
// questions: where do first-timers drop off, do sitters return, and where
// inside the session do people quit. Nothing from the camera, nothing typed
// into the note field, no email — users are identified by their Supabase
// UUID only.
//
// Dormant unless VITE_POSTHOG_KEY is set AND this is a production build,
// same pattern as Sentry. Local dev never sends events.
// ---------------------------------------------------------------------------

let initialized = false;

export function initAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!import.meta.env.PROD || !key || initialized) return;

  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
    // Explicit events only — see module comment.
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    // Keep the payload lean; we don't use feature flags yet.
    advanced_disable_feature_flags: true,
    persistence: "localStorage",
  });
  initialized = true;
}

// Ties events to the Supabase user UUID (pseudonymous — no email, no name).
// Called on sign-in so retention curves work across devices.
export function identifyUser(userId: string) {
  if (!initialized) return;
  posthog.identify(userId);
}

export function resetAnalyticsIdentity() {
  if (!initialized) return;
  posthog.reset();
}

type EventName =
  | "landing_viewed"
  | "signin_started"
  | "signin_completed"
  | "foundations_completed"
  | "sit_started"
  | "sit_completed"
  | "sit_ended_early"
  | "note_submitted";

export function track(
  event: EventName,
  properties?: Record<string, string | number | boolean>
) {
  if (!initialized) return;
  posthog.capture(event, properties);
}
