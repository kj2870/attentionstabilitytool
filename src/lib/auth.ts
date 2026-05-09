import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { createProfile, clearActiveProfile, getActiveProfile, mergeRemoteHistory } from "./storage";

// ---------------------------------------------------------------------------
// Google sign-in — redirects to Google, then back to the app.
// ---------------------------------------------------------------------------
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/`,
    },
  });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Sign out — clears both Supabase session and local profile cache.
// ---------------------------------------------------------------------------
export async function signOut(): Promise<void> {
  clearActiveProfile();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Sync — creates a local profile from the Supabase user if none exists,
// then pulls down their session history from Supabase.
// Called on app startup and on every auth state change.
// ---------------------------------------------------------------------------
export async function syncLocalProfileFromUser(user: User): Promise<void> {
  const existing = getActiveProfile();

  if (!existing) {
    const username =
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      user.email?.split("@")[0] ??
      "User";

    createProfile({ username, pin: "****" });
  }

  // Pull remote history in the background — won't block the UI.
  void mergeRemoteHistory();
}
