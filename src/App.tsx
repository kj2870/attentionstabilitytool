import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import RoutinePage from "./pages/RoutinePage";
import HistoryPage from "./pages/HistoryPage";
import PrivacyPage from "./pages/PrivacyPage";
import SessionPage from "./pages/SessionPage";
import OnboardingPage from "./pages/OnboardingPage";
import LoginPage from "./pages/LoginPage";
import { supabase } from "./lib/supabase";
import { syncLocalProfileFromUser } from "./lib/auth";
import { getActiveProfile, hasCompletedOnboarding } from "./lib/storage";

// ---------------------------------------------------------------------------
// Routes rendered when the user is NOT authenticated.
// ---------------------------------------------------------------------------
function UnauthRoutes() {
  const location = useLocation();
  const unauthPaths = ["/onboarding", "/login"];

  if (!unauthPaths.includes(location.pathname)) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <Routes>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/onboarding" replace />} />
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
        <Route path="/routine" element={<RoutinePage />} />
        <Route path="/session" element={<SessionPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/onboarding" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      if (u) syncLocalProfileFromUser(u);
      setUser(u);
      setAuthReady(true);
    });

    // Keep user state in sync with any auth event (login, logout, token refresh).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null;
        if (u) syncLocalProfileFromUser(u);
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
          minHeight: "100vh",
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

  return isAuthenticated ? <AuthedRoutes /> : <UnauthRoutes />;
}
