import { supabase } from "./supabase";

export type RoutineSelection = {
  timeOfDay: "Morning" | "Midday" | "Night";
};

export type SessionFeeling = "Calm" | "Neutral" | "Restless" | "";

export type SessionRecord = {
  id: string;
  date: string;
  durationMin: number;
  timeOfDay: "Morning" | "Midday" | "Night";
  attentionScore: number;
  feeling: SessionFeeling;
  grade: "A" | "B" | "C";
  blinkCount?: number;
  avgDrift?: number;
  avgRecovery?: number;
};

export type LocalProfile = {
  id: string;
  username: string;
  pin: string;
  createdAt: string;
  onboardingComplete: boolean;
  history: SessionRecord[];
  routineSelection: RoutineSelection;
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
    history: [],
    routineSelection: { timeOfDay: "Night" },
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

export function saveRoutineSelection(selection: RoutineSelection) {
  updateActiveProfile((profile) => ({
    ...profile,
    routineSelection: selection,
  }));
}

export function loadRoutineSelection(): RoutineSelection {
  return getActiveProfile()?.routineSelection ?? { timeOfDay: "Night" };
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
    time_of_day: record.timeOfDay,
    attention_score: record.attentionScore,
    feeling: record.feeling || null,
    grade: record.grade,
    blink_count: record.blinkCount ?? null,
    avg_drift: record.avgDrift ?? null,
    avg_recovery: record.avgRecovery ?? null,
  });

  if (error) {
    console.error("[Drishti] Remote session save failed:", error.message);
  }
}

export function getMandalaDay(records: SessionRecord[] = loadHistory()) {
  const uniqueDaysCount = new Set(records.map((record) => toLocalDateKey(record.date)))
    .size;

  return Math.min(uniqueDaysCount, 48);
}