import { useState, useEffect, useRef, useCallback } from 'react';
import { getAuthToken } from '@/shared/services/authService';
import { useTokenManager } from '@/features/progress/hooks/useTokenManager';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');

/**
 * Fetch module progress directly from the backend endpoint.
 * Handles token-not-yet-available on refresh: uses useTokenManager.waitForToken when
 * NextAuth session exists but backend token isn't in localStorage yet.
 * Refetches when a 'progress:updated' event is dispatched with matching moduleId.
 */
export function useModuleProgressDirect(moduleId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);
  const { waitForToken, session } = useTokenManager();

  const doFetch = useCallback((token, mid) => {
    if (!mid) return;
    setLoading(true);
    fetch(`${API_URL}/progress/module/${mid}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => (r.ok ? r.json() : null))
      .then(json => {
        if (!json) return;
        const pct = typeof json.completionPercentage === 'number'
          ? json.completionPercentage
          : (typeof json.progressPercentage === 'number' ? json.progressPercentage : null);
        if (pct !== null) {
          setData({
            percentInt: Math.round(pct),
            completedLessons: json.completedLessons ?? 0,
            totalLessons: json.totalLessons ?? 0,
            isCompleted: json.completedAt != null || pct >= 100,
          });
        }
      })
      .catch(() => { fetchedRef.current = false; })
      .finally(() => setLoading(false));
  }, []);

  // Reset fetch state when moduleId changes
  const prevModuleIdRef = useRef(null);
  if (prevModuleIdRef.current !== moduleId) {
    prevModuleIdRef.current = moduleId;
    fetchedRef.current = false;
  }

  // Initial fetch — wait for token via waitForToken when session exists (max 8 s)
  useEffect(() => {
    if (!moduleId) return;

    const run = async () => {
      let token = getAuthToken();
      if (!token && session?.user) {
        try {
          await waitForToken(8000);
          token = getAuthToken();
        } catch {
          // timeout
        }
      }
      if (token && !fetchedRef.current) {
        fetchedRef.current = true;
        doFetch(token, moduleId);
      }
    };

    run();
  }, [moduleId, session?.user, waitForToken, doFetch]);

  // Fallback: when session not ready, poll for token up to 10 s (non-NextAuth or initial load)
  useEffect(() => {
    if (!moduleId || fetchedRef.current) return;
    if (session?.user) return; // first effect handles this

    let attempts = 0;
    const interval = setInterval(() => {
      if (fetchedRef.current) {
        clearInterval(interval);
        return;
      }
      const t = getAuthToken();
      if (t) {
        clearInterval(interval);
        fetchedRef.current = true;
        doFetch(t, moduleId);
      } else if (attempts >= 20) {
        clearInterval(interval);
      }
      attempts++;
    }, 500);

    return () => clearInterval(interval);
  }, [moduleId, session?.user, doFetch]);

  // Refetch on progress:updated event for this module
  useEffect(() => {
    if (!moduleId) return;

    const handler = (e) => {
      if (e?.detail?.moduleId !== moduleId) return;
      const token = getAuthToken();
      if (!token) return;
      fetchedRef.current = true;
      doFetch(token, moduleId);
    };

    window.addEventListener('progress:updated', handler);
    return () => window.removeEventListener('progress:updated', handler);
  }, [moduleId, doFetch]);

  return { data, loading };
}
