/**
 * =============================================================================
 * VentyLab — useProgressPersistence (DEPRECATED, NO-OP)
 * =============================================================================
 *
 * This hook used to mirror `progressByModule` into `localStorage` and rehydrate
 * it on mount. That created a "phantom persistence" effect: the UI showed
 * progress that the database never received.
 *
 * The single source of truth for progress is now `useProgress()` (SWR around
 * GET /api/progress/overview). Writing to or reading from localStorage here is
 * forbidden — the function is kept only to preserve the existing import sites.
 *
 * Module: src/features/progress/hooks/useProgressPersistence.js
 * =============================================================================
 */

export const useProgressPersistence = () => {
  // Intentionally empty. Do NOT reintroduce localStorage I/O here.
  return { loadPersistedState: () => null };
};

export default useProgressPersistence;
