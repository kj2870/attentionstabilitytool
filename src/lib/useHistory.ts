/**
 * useHistory — merged session history from local cache + Supabase.
 *
 * Strategy:
 *  1. Return localStorage snapshot immediately (zero latency for UI).
 *  2. Fetch remote sessions in the background.
 *  3. Merge: remote is source of truth; any local-only records (created in
 *     this session before a network flush) are appended so nothing is lost.
 *     Dedup by matching `id` (UUID assigned at save time).
 */

import { useEffect, useState } from "react";
import {
  loadHistory,
  loadHistoryRemote,
  saveProfiles,
  loadProfiles,
  getActiveProfileId,
  type SessionRecord,
} from "./storage";

export type UseHistoryResult = {
  history: SessionRecord[];
  isLoading: boolean;
  /** Re-fetch remote data (e.g. after a session is saved). */
  refresh: () => void;
};

export function useHistory(): UseHistoryResult {
  const [history, setHistory] = useState<SessionRecord[]>(() => loadHistory());
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    loadHistoryRemote()
      .then((remote) => {
        if (cancelled) return;

        if (remote.length === 0) {
          // No remote data — just keep local.
          setIsLoading(false);
          return;
        }

        // Build a set of remote IDs for fast lookup.
        const remoteIds = new Set(remote.map((r) => r.id));

        // Append any local-only records (created before this sync).
        const localOnly = loadHistory().filter((r) => !remoteIds.has(r.id));
        const merged = [...remote, ...localOnly].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        // Write merged back to localStorage so next open is fast.
        const activeId = getActiveProfileId();
        if (activeId) {
          const profiles = loadProfiles();
          const idx = profiles.findIndex((p) => p.id === activeId);
          if (idx !== -1) {
            profiles[idx] = { ...profiles[idx], history: merged.slice(0, 100) };
            saveProfiles(profiles);
          }
        }

        setHistory(merged);
        setIsLoading(false);
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tick]);

  const refresh = () => setTick((t) => t + 1);

  return { history, isLoading, refresh };
}
