import { supabase } from "./supabase";

export type SessionFeeling = "Calm" | "Neutral" | "Restless" | "";

export type SessionRecord = {
  id: string;
  date: string;
  durationMin: number;
  // timeOfDay is legacy — kept optional so older saved records still load.
  // Never set by new sessions; never shown in UI.
  timeOfDay?: "Morning" | "Midday" | "Night";
  attentionScore: number;
  feeling: SessionFeeling;
  grade: "A" | "B" | "C";
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
  pin: string;
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

export function createProfile(params: {
  username: string;
  pin: string;
}): LocalProfile {
  const profiles = loadProfiles();

  const profile: LocalProfile = {
    id: crypto.randomUUID(),
    username: params.username.trim(),
    pin: params.pin,
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
}

export function clearActiveProfile() {
  localStorage.removeItem(ACTIVE_PROFILE_KEY);
}

export function getActiveProfile(): LocalProfile | null {
  const activeId = getActiveProfileId();
  if (!activeId) return null;

  const profiles = loadProfiles();
  return profiles.find((profile) => profile.id === activeId) ?? null;
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
}

export function hasCompletedOnboarding(): boolean {
  const activeProfile = getActiveProfile();
  return activeProfile?.onboardingComplete === true;
}

export function loadHistory(): SessionRecord[] {
  return getActiveProfile()?.history ?? [];
}

export function saveSession(record: SessionRecord) {
  updateActiveProfile((profile) => ({
    ...profile,
    history: [record, ...profile.history].slice(0, 100),
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

  const { error } = await supabase.from("sessions").insert({
    user_id: user.id,
    date: record.date,
    duration_min: record.durationMin,
    // Legacy column — kept populated for backward DB compatibility. Not used in UI.
    time_of_day: record.timeOfDay ?? "Night",
    attention_score: record.attentionScore,
    feeling: record.feeling || null,
    grade: record.grade,
    blink_count: record.blinkCount ?? null,
    avg_drift: record.avgDrift ?? null,
    avg_recovery: record.avgRecovery ?? null,
    longest_gaze_sec: record.longestGazeSec ?? null,
    total_stillness_sec: record.totalStillnessSec ?? null,
    note: record.note ?? null,
    new_milestones: record.newMilestones ?? null,
  });

  if (error) {
    console.error("[Drishti] Remote session save failed:", error.message);
  }
}

// ---------------------------------------------------------------------------
// Remote history load — fetches all sessions for the logged-in user.
// ---------------------------------------------------------------------------
export async function loadHistoryRemote(): Promise<SessionRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[Drishti] Remote history load failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    date: row.date as string,
    durationMin: row.duration_min as number,
    timeOfDay: (row.time_of_day ?? undefined) as "Morning" | "Midday" | "Night" | undefined,
    attentionScore: row.attention_score as number,
    feeling: (row.feeling ?? "") as SessionFeeling,
    grade: row.grade as "A" | "B" | "C",
    blinkCount: row.blink_count ?? undefined,
    avgDrift: row.avg_drift ?? undefined,
    avgRecovery: row.avg_recovery ?? undefined,
    longestGazeSec: row.longest_gaze_sec ?? undefined,
    totalStillnessSec: row.total_stillness_sec ?? undefined,
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
      .slice(0, 200),
  }));
}

export function getMandalaDay(records: SessionRecord[] = loadHistory()) {
  const uniqueDaysCount = new Set(records.map((record) => toLocalDateKey(record.date)))
    .size;

  return Math.min(uniqueDaysCount, 48);
}