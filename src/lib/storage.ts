import { supabase } from "./supabase";

export type SessionFeeling = "Calm" | "Neutral" | "Restless" | "";

export type SessionRecord = {
  id: string;
  date: string;
  durationMin: number;
  // Legacy fields — kept optional so older locally-cached records still load,
  // but no longer written by new sits and no longer persisted remotely.
  timeOfDay?: "Morning" | "Midday" | "Night";
  attentionScore?: number;
  grade?: "A" | "B" | "C";
  feeling: SessionFeeling;
  blinkCount?: number;
  avgDrift?: number;
  avgRecovery?: number;
  // New gaze metrics (Phase 1 — measurement infrastructure).
  // Longest unbroken held-gaze in seconds across all gaze segments this session.
  longestGazeSec?: number;
  // Sum of all held-gaze seconds across all gaze segments this session.
  totalStillnessSec?: number;
  // Blinks per minute averaged over the gaze phases only.
  blinkRateDuringGaze?: number;
  // Per-second 0/1 stability samples across all gaze rounds in order. Used to
  // draw the within-session steadiness arc. ~180 entries (4 rounds × 45s).
  gazeStabilitySamples?: number[];
  // Optional free-form note from the user, treated as developer feedback.
  note?: string;
  // IDs of milestones that became newly satisfied in this session.
  newMilestones?: string[];
};

export type LocalProfile = {
  id: string;
  username: string;
  createdAt: string;
  onboardingComplete: boolean;
  // First-time gate: false until the user has read the Foundations page.
  // Optional so older profiles deserialize cleanly; a missing value is
  // treated as `true` (grandfather) when the profile has history.
  firstReadComplete?: boolean;
  history: SessionRecord[];
};

const PROFILES_KEY = "drishti_profiles";
const ACTIVE_PROFILE_KEY = "drishti_active_profile_id";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadProfiles(): LocalProfile[] {
  return safeParse<LocalProfile[]>(localStorage.getItem(PROFILES_KEY), []);
}

export function saveProfiles(profiles: LocalProfile[]) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function createProfile(params: { username: string }): LocalProfile {
  const profiles = loadProfiles();

  const profile: LocalProfile = {
    id: crypto.randomUUID(),
    username: params.username.trim(),
    createdAt: new Date().toISOString(),
    onboardingComplete: true,
    firstReadComplete: false,
    history: [],
  };

  profiles.push(profile);
  saveProfiles(profiles);
  setActiveProfileId(profile.id);

  return profile;
}

export function getActiveProfileId(): string | null {
  return localStorage.getItem(ACTIVE_PROFILE_KEY);
}

export function setActiveProfileId(profileId: string) {
  localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
  invalidateProfileCache();
}

export function clearActiveProfile() {
  localStorage.removeItem(ACTIVE_PROFILE_KEY);
  invalidateProfileCache();
}

// Module-level cache for the active profile. Reads avoid re-parsing
// localStorage on every render (getActiveProfile is called from many places
// per render); cache is invalidated on any mutation or external storage
// change.
let activeProfileCache: LocalProfile | null | undefined;

function invalidateProfileCache() {
  activeProfileCache = undefined;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === PROFILES_KEY || e.key === ACTIVE_PROFILE_KEY) {
      invalidateProfileCache();
    }
  });
  window.addEventListener("drishti:profile-updated", invalidateProfileCache);
}

export function getActiveProfile(): LocalProfile | null {
  if (activeProfileCache !== undefined) return activeProfileCache;

  const activeId = getActiveProfileId();
  if (!activeId) {
    activeProfileCache = null;
    return null;
  }

  const profiles = loadProfiles();
  activeProfileCache = profiles.find((profile) => profile.id === activeId) ?? null;
  return activeProfileCache;
}

export function updateActiveProfile(
  updater: (profile: LocalProfile) => LocalProfile
) {
  const activeId = getActiveProfileId();
  if (!activeId) return;

  const profiles = loadProfiles();
  const index = profiles.findIndex((profile) => profile.id === activeId);

  if (index === -1) return;

  profiles[index] = updater(profiles[index]);
  saveProfiles(profiles);
  invalidateProfileCache();
}

export function hasCompletedOnboarding(): boolean {
  const activeProfile = getActiveProfile();
  return activeProfile?.onboardingComplete === true;
}

export function loadHistory(): SessionRecord[] {
  return getActiveProfile()?.history ?? [];
}

// Local + remote history caps are both 200 — keeps them in sync so older
// remote-only records don't get re-trimmed after a merge.
const HISTORY_CAP = 200;

export function saveSession(record: SessionRecord) {
  updateActiveProfile((profile) => ({
    ...profile,
    history: [record, ...profile.history].slice(0, HISTORY_CAP),
  }));
}

// Patches the note and/or feeling on a locally-saved session record
// (matched by id). Sessions auto-save at completion; these details come in
// afterwards from the summary screen.
export function updateSessionDetailsLocal(
  id: string,
  details: { note?: string; feeling?: SessionFeeling }
) {
  updateActiveProfile((profile) => ({
    ...profile,
    history: profile.history.map((r) =>
      r.id === id
        ? {
            ...r,
            note: details.note !== undefined ? details.note || undefined : r.note,
            feeling: details.feeling !== undefined ? details.feeling : r.feeling,
          }
        : r
    ),
  }));
}

export function clearHistory() {
  updateActiveProfile((profile) => ({
    ...profile,
    history: [],
  }));
}

/**
 * True when the active profile has read the Foundations gate, OR is a
 * grandfathered user (no flag set but has session history). New profiles
 * created after this feature default to `firstReadComplete: false` and
 * must read Foundations once.
 */
export function hasReadFoundations(): boolean {
  const profile = getActiveProfile();
  if (!profile) return false;
  if (profile.firstReadComplete === true) return true;
  // Grandfather: any profile with existing sessions skips Foundations.
  if (profile.firstReadComplete === undefined && profile.history.length > 0) return true;
  return false;
}

export function markFoundationsRead() {
  updateActiveProfile((profile) => ({
    ...profile,
    firstReadComplete: true,
  }));
  // Notify the app shell so it can re-evaluate the foundations gate without a
  // page reload. App.tsx listens for this event.
  window.dispatchEvent(new Event("drishti:profile-updated"));
}

function toLocalDateKey(dateString: string) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDateKey(base: Date, days: number) {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCurrentStreak(records: SessionRecord[] = loadHistory()) {
  if (records.length === 0) return 0;

  const uniqueDays = Array.from(
    new Set(records.map((record) => toLocalDateKey(record.date)))
  ).sort((a, b) => (a < b ? 1 : -1));

  const todayKey = shiftDateKey(new Date(), 0);
  const yesterdayKey = shiftDateKey(new Date(), -1);

  let anchor: string | null = null;

  if (uniqueDays.includes(todayKey)) {
    anchor = todayKey;
  } else if (uniqueDays.includes(yesterdayKey)) {
    anchor = yesterdayKey;
  }

  if (!anchor) return 0;

  let streak = 0;
  const cursor = new Date(anchor);

  while (true) {
    const year = cursor.getFullYear();
    const month = `${cursor.getMonth() + 1}`.padStart(2, "0");
    const day = `${cursor.getDate()}`.padStart(2, "0");
    const key = `${year}-${month}-${day}`;

    if (!uniqueDays.includes(key)) {
      break;
    }

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function getFlexibleStreak(records: SessionRecord[] = loadHistory()) {
  if (records.length === 0) return 0;

  const uniqueDays = Array.from(
    new Set(records.map((record) => toLocalDateKey(record.date)))
  ).sort((a, b) => (a < b ? 1 : -1));

  const todayKey = shiftDateKey(new Date(), 0);
  const yesterdayKey = shiftDateKey(new Date(), -1);
  const twoDaysAgoKey = shiftDateKey(new Date(), -2);

  let anchor: string | null = null;

  if (uniqueDays.includes(todayKey)) {
    anchor = todayKey;
  } else if (uniqueDays.includes(yesterdayKey)) {
    anchor = yesterdayKey;
  } else if (uniqueDays.includes(twoDaysAgoKey)) {
    anchor = twoDaysAgoKey;
  }

  if (!anchor) return 0;

  let streak = 0;
  let missesUsed = 0;
  const cursor = new Date(anchor);

  while (true) {
    const key = shiftDateKey(cursor, 0);

    if (uniqueDays.includes(key)) {
      streak += 1;
    } else if (missesUsed < 1) {
      missesUsed += 1;
    } else {
      break;
    }

    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function getWeeklyCompletion(
  records: SessionRecord[] = loadHistory()
): boolean[] {
  const uniqueDays = new Set(records.map((record) => toLocalDateKey(record.date)));
  const now = new Date();

  const currentDay = now.getDay(); // 0 Sun ... 6 Sat
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;

  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const key = shiftDateKey(day, 0);
    return uniqueDays.has(key);
  });
}

// ---------------------------------------------------------------------------
// Remote session persistence — saves a completed session to Supabase.
// Fire-and-forget: always call with `void saveSessionRemote(record)` so the
// user is never blocked by a network call.
// ---------------------------------------------------------------------------
export async function saveSessionRemote(record: SessionRecord): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return; // not logged in; skip silently

  // Send the client-generated UUID as the row id so subsequent updates
  // (note/feeling patching) can match on a stable, unique key instead of
  // the date string — which would mismatch on retries or near-simultaneous
  // saves from two devices.
  const row = {
    id: record.id,
    user_id: user.id,
    date: record.date,
    duration_min: record.durationMin,
    feeling: record.feeling || null,
    blink_count: record.blinkCount ?? null,
    longest_gaze_sec: record.longestGazeSec ?? null,
    total_stillness_sec: record.totalStillnessSec ?? null,
    avg_drift: record.avgDrift ?? null,
    avg_recovery: record.avgRecovery ?? null,
    blink_rate_during_gaze: record.blinkRateDuringGaze ?? null,
    gaze_stability_samples: record.gazeStabilitySamples ?? null,
    note: record.note ?? null,
    new_milestones: record.newMilestones ?? null,
  };

  const { error } = await supabase.from("sessions").insert(row);
  if (error) {
    console.error("[Drishti] Remote session save failed:", error.message);
  }
}

// ---------------------------------------------------------------------------
// Attach/replace the note and/or feeling on an already-saved remote session.
// Sessions auto-save at completion (before the summary screen), so these are
// patched in afterwards. Matched on row id — the client-generated UUID is
// stable, unique, and avoids the race conditions of date-string matching.
// ---------------------------------------------------------------------------
export async function updateSessionDetailsRemote(
  id: string,
  details: { note?: string; feeling?: SessionFeeling }
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const patch: Record<string, string | null> = {};
  if (details.note !== undefined) patch.note = details.note || null;
  if (details.feeling !== undefined) patch.feeling = details.feeling || null;
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase
    .from("sessions")
    .update(patch)
    .eq("user_id", user.id)
    .eq("id", id);

  if (error) {
    console.error("[Drishti] Remote session update failed:", error.message);
  }
}

// ---------------------------------------------------------------------------
// Remote history load — fetches all sessions for the logged-in user.
// Explicitly excludes gaze_stability_samples (the heaviest column, ~3KB of
// integers per row) — it's only needed when rendering a single sit's arc,
// not for the history list. Cuts egress by ~80%.
// ---------------------------------------------------------------------------
export async function loadHistoryRemote(): Promise<SessionRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("sessions")
    .select(
      "id, date, duration_min, feeling, blink_count, avg_drift, avg_recovery, longest_gaze_sec, total_stillness_sec, blink_rate_during_gaze, note, new_milestones"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(HISTORY_CAP);

  if (error) {
    console.error("[Drishti] Remote history load failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    date: row.date as string,
    durationMin: row.duration_min as number,
    feeling: (row.feeling ?? "") as SessionFeeling,
    blinkCount: row.blink_count ?? undefined,
    avgDrift: row.avg_drift ?? undefined,
    avgRecovery: row.avg_recovery ?? undefined,
    longestGazeSec: row.longest_gaze_sec ?? undefined,
    totalStillnessSec: row.total_stillness_sec ?? undefined,
    blinkRateDuringGaze: row.blink_rate_during_gaze ?? undefined,
    note: row.note ?? undefined,
    newMilestones: row.new_milestones ?? undefined,
  }));
}

// ---------------------------------------------------------------------------
// Merge remote history into local storage — called on login so history is
// available across devices. Deduplicates by session date to avoid doubles.
// ---------------------------------------------------------------------------
export async function mergeRemoteHistory(): Promise<void> {
  const remote = await loadHistoryRemote();
  if (remote.length === 0) return;

  const local = loadHistory();
  const localDates = new Set(local.map((r) => r.date));

  const newRecords = remote.filter((r) => !localDates.has(r.date));
  if (newRecords.length === 0) return;

  updateActiveProfile((profile) => ({
    ...profile,
    history: [...newRecords, ...profile.history]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, HISTORY_CAP),
  }));
}

export function getMandalaDay(records: SessionRecord[] = loadHistory()) {
  const uniqueDaysCount = new Set(records.map((record) => toLocalDateKey(record.date)))
    .size;

  return Math.min(uniqueDaysCount, 48);
}

