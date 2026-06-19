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

// A taken 48-day vow. The traditional sadhana period. Once taken, the home
// screen becomes a single anchor (Day N of 48); two consecutive missed days
// end it. Only `takenAt` is persisted — broken/fulfilled state is derived.
export type VowState = {
  // ISO timestamp of when the vow was taken. takenAt's local date = day 1.
  takenAt: string;
};

// Computed snapshot of the active vow, used by the UI.
export type VowSnapshot = {
  takenAt: string;
  // 1-based day number (today = how many days since takenAt + 1).
  day: number;
  // True once vow has been broken (two consecutive missed days in the past).
  broken: boolean;
  // True once day 48's sit has been completed.
  fulfilled: boolean;
  // Last day on which the user sat. 0 if no sits yet inside the vow window.
  lastSitDay: number;
  // True if the user has already sat today (used to block second sit / show
  // "today's sit is complete" on home).
  todaysSitComplete: boolean;
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
  // 48-day vow. Optional — only set after the user takes it up.
  vow?: VowState;
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

  const row = {
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
// patched in afterwards. Matched by exact ISO date string, which is unique
// per user in practice.
// ---------------------------------------------------------------------------
export async function updateSessionDetailsRemote(
  date: string,
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
    .eq("date", date);

  if (error) {
    console.error("[Drishti] Remote session update failed:", error.message);
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
    feeling: (row.feeling ?? "") as SessionFeeling,
    blinkCount: row.blink_count ?? undefined,
    avgDrift: row.avg_drift ?? undefined,
    avgRecovery: row.avg_recovery ?? undefined,
    longestGazeSec: row.longest_gaze_sec ?? undefined,
    totalStillnessSec: row.total_stillness_sec ?? undefined,
    blinkRateDuringGaze: row.blink_rate_during_gaze ?? undefined,
    gazeStabilitySamples: row.gaze_stability_samples ?? undefined,
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

// ---------------------------------------------------------------------------
// VOW: the 48-day commitment. Local-midnight calendar days throughout —
// "today" is the user's local date, not UTC.
// ---------------------------------------------------------------------------

function parseLocalDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysBetweenLocalKeys(startKey: string, endKey: string): number {
  const start = parseLocalDateKey(startKey);
  const end = parseLocalDateKey(endKey);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

// Takes up the 48-day vow. Overwrites any previous vow (used by both first-
// sit prompt and the "take it up again" flow after a broken vow).
export function takeVow() {
  updateActiveProfile((profile) => ({
    ...profile,
    vow: { takenAt: new Date().toISOString() },
  }));
  window.dispatchEvent(new Event("drishti:profile-updated"));
}

// True if the active profile has sat at least once today (local time).
export function isTodaysSitComplete(
  records: SessionRecord[] = loadHistory()
): boolean {
  const todayKey = toLocalDateKey(new Date().toISOString());
  return records.some((r) => toLocalDateKey(r.date) === todayKey);
}

// Computes the current state of the vow. Returns null if no vow taken.
// Pure function over (vow, history) — no persistence needed for broken/
// fulfilled state because it's derivable from the sit dates.
export function getVowSnapshot(
  profile: LocalProfile | null = getActiveProfile()
): VowSnapshot | null {
  if (!profile?.vow) return null;
  const { vow, history } = profile;

  const startKey = toLocalDateKey(vow.takenAt);
  const todayKey = toLocalDateKey(new Date().toISOString());
  const day = Math.max(1, daysBetweenLocalKeys(startKey, todayKey) + 1);

  // Sit-day keys belonging to this vow window (>= takenAt local date).
  const sitDayKeys = new Set(
    history
      .map((r) => toLocalDateKey(r.date))
      .filter((k) => k >= startKey)
  );

  // Walk past days only (everything before today). Today's sit may still
  // be pending, so it can't count as a "miss" yet.
  let consecutiveMisses = 0;
  let lastSitDay = 0;
  let broken = false;

  const pastDays = day - 1; // number of days fully elapsed before today
  for (let offset = 0; offset < pastDays; offset++) {
    const dayKey = shiftDateKey(parseLocalDateKey(startKey), offset);
    const sat = sitDayKeys.has(dayKey);
    const dayNumber = offset + 1;
    if (sat) {
      lastSitDay = dayNumber;
      consecutiveMisses = 0;
    } else {
      consecutiveMisses += 1;
      if (consecutiveMisses >= 2) {
        broken = true;
        break;
      }
    }
  }

  const todaysSitComplete = sitDayKeys.has(todayKey);
  if (todaysSitComplete && day > lastSitDay) {
    lastSitDay = day;
  }

  const fulfilled = day >= 48 && lastSitDay >= 48;

  return {
    takenAt: vow.takenAt,
    day,
    broken,
    fulfilled,
    lastSitDay,
    todaysSitComplete,
  };
}

// Discards the current vow (used after the user acknowledges a broken vow
// from the home screen, before they take it up again).
export function clearVow() {
  updateActiveProfile((profile) => ({
    ...profile,
    vow: undefined,
  }));
  window.dispatchEvent(new Event("drishti:profile-updated"));
}