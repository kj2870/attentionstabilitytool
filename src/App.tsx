import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import Layout from "./components/Layout";
import InstallPrompt from "./components/InstallPrompt";
import HomePage from "./pages/HomePage";
import HistoryPage from "./pages/HistoryPage";
import PrivacyPage from "./pages/PrivacyPage";
import SciencePage from "./pages/SciencePage";
import PhilosophyPage from "./pages/PhilosophyPage";
import AboutPage from "./pages/AboutPage";
import SessionPage from "./pages/SessionPage";
import OnboardingPage from "./pages/OnboardingPage";
import LoginPage from "./pages/LoginPage";
import InstructionsPage from "./pages/InstructionsPage";
import FoundationsPage from "./pages/FoundationsPage";
import { supabase } from "./lib/supabase";
import { syncLocalProfileFromUser } from "./lib/auth";
import { getActiveProfile, hasCompletedOnboarding, hasReadFoundations } from "./lib/storage";

// ---------------------------------------------------------------------------
// Routes rendered when the user is NOT authenticated.
// ---------------------------------------------------------------------------
function UnauthRoutes() {
  const location = useLocation();
  // Instructions, philosophy, science, and privacy are public — accessible
  // from the landing without requiring sign-in.
  const unauthPaths = [
    "/onboarding",
    "/login",
    "/instructions",
    "/philosophy",
    "/science",
    "/privacy",
  ];

  if (!unauthPaths.includes(location.pathname)) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <Routes>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/instructions" element={<InstructionsPage />} />
      <Route path="/philosophy" element={<PhilosophyPage />} />
      <Route path="/science" element={<SciencePage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="*" element={<Navigate to="/onboarding" replace />} />
    </Routes>
  );
}

// ---------------------------------------------------------------------------
// One-time foundations gate — shown after sign-in until the user has read
// the foundations page. Grandfathered users (with existing history) skip it.
// ---------------------------------------------------------------------------
function FoundationsGate() {
  const location = useLocation();
  // Allow the foundations page itself; everything else routes back to it.
  if (location.pathname !== "/foundations") {
    return <Navigate to="/foundations" replace />;
  }
  return (
    <Routes>
      <Route path="/foundations" element={<FoundationsPage />} />
      <Route path="*" element={<Navigate to="/foundations" replace />} />
    </Routes>
  );
}

// ---------------------------------------------------------------------------
// Routes rendered when the user IS authenticated.
// ---------------------------------------------------------------------------
function AuthedRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/session" element={<SessionPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/instructions" element={<InstructionsPage />} />
        <Route path="/science" element={<SciencePage />} />
        <Route path="/philosophy" element={<PhilosophyPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/onboarding" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/foundations" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

// ---------------------------------------------------------------------------
// Root app — resolves Supabase session before rendering anything.
// ---------------------------------------------------------------------------
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    // Resolve the existing session on first load.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null;
      if (u) await syncLocalProfileFromUser(u);
      setUser(u);
      setAuthReady(true);
    });

    // Keep user state in sync with any auth event (login, logout, token refresh).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null;
        if (u) void syncLocalProfileFromUser(u);
        setUser(u);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Hold render until Supabase has resolved the initial session —
  // prevents a flash of the onboarding screen for logged-in users.
  if (!authReady) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "#0e0e10",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "#bfae97", fontSize: "18px", letterSpacing: "0.04em" }}>
          ·
        </div>
      </div>
    );
  }

  const activeProfile = getActiveProfile();
  const onboardingComplete = hasCompletedOnboarding();
  const isAuthenticated = !!user && !!activeProfile && onboardingComplete;
  const needsFoundations = isAuthenticated && !hasReadFoundations();

  return (
    <>
      {!isAuthenticated && <UnauthRoutes />}
      {isAuthenticated && needsFoundations && <FoundationsGate />}
      {isAuthenticated && !needsFoundations && <AuthedRoutes />}
      <InstallPrompt />
    </>
  );
}
