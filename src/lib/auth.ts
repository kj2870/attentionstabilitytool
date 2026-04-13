import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { createProfile, clearActiveProfile, getActiveProfile } from "./storage";

// ---------------------------------------------------------------------------
// Sign up — creates a Supabase account and a local profile cache.
// ---------------------------------------------------------------------------
export async function signUp(params: {
  email: string;
  password: string;
  username: string;
}): Promise<{ needsEmailConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email: params.email.trim(),
    password: params.password,
    options: {
      data: { username: params.username.trim() },
    },
  });

  if (error) throw error;

  // When email confirmation is disabled in Supabase, a session is returned
  // immediately and we can create the local profile right away.
  if (data.session) {
    createProfile({ username: params.username.trim(), pin: "****" });
    return { needsEmailConfirmation: false };
  }

  // Email confirmation is enabled — user must verify before they can log in.
  return { needsEmailConfirmation: true };
}

// ---------------------------------------------------------------------------
// Sign in — authenticates with Supabase and syncs local profile.
// ---------------------------------------------------------------------------
export async function signIn(params: {
  email: string;
  password: string;
}): Promise<void> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: params.email.trim(),
    password: params.password,
  });

  if (error) throw error;

  if (data.user) {
    syncLocalProfileFromUser(data.user);
  }
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
// Sync — creates a local profile from the Supabase user if none exists.
// Called on app startup when a returning user already has a valid session.
// ---------------------------------------------------------------------------
export function syncLocalProfileFromUser(user: User): void {
  const existing = getActiveProfile();
  if (existing) return; // local profile already in place

  const username =
    (user.user_metadata?.username as string | undefined) ??
    user.email?.split("@")[0] ??
    "User";

  createProfile({ username, pin: "****" });
}
