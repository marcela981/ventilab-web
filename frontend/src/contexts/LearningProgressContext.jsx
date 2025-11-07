'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Chip from '@mui/material/Chip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SyncIcon from '@mui/icons-material/Sync';
import {
  configureProgressService,
  fetchProgress,
  upsertProgress,
  bulkSyncProgress,
} from '@/services/api/progressService';
import { getAuthToken, getUserData } from '@/services/authService';

const PROGRESS_MAP_KEY = 'vlab:progress:map';
const PROGRESS_QUEUE_KEY = 'vlab:progress:queue';
const AUTOSAVE_INTERVAL_MS = 30_000;
const MAX_SYNC_BATCH = 100;

const normalizeRecord = (record, lessonIdFallback, moduleIdFallback) => {
  if (!record && !lessonIdFallback) {
    return null;
  }

  const lessonId = record?.lessonId ?? lessonIdFallback;
  if (!lessonId) {
    return null;
  }

  const positionSeconds = Number.isFinite(record?.positionSeconds)
    ? record.positionSeconds
    : 0;
  const progress = typeof record?.progress === 'number' ? record.progress : 0;
  const attempts = Number.isFinite(record?.attempts) ? record.attempts : 0;
  const score = record?.score === null || record?.score === undefined
    ? null
    : Number(record.score);

  return {
    moduleId: record?.moduleId ?? moduleIdFallback ?? null,
    lessonId,
    positionSeconds: positionSeconds >= 0 ? positionSeconds : 0,
    progress: progress >= 0 ? progress : 0,
    isCompleted: Boolean(record?.isCompleted),
    attempts: attempts >= 0 ? attempts : 0,
    score: Number.isFinite(score) ? score : null,
    metadata: record?.metadata ?? null,
    clientUpdatedAt: record?.clientUpdatedAt ?? null,
    serverUpdatedAt: record?.serverUpdatedAt ?? null,
  };
};

const createDefaultProgress = (lessonId, moduleId) => normalizeRecord({
  lessonId,
  moduleId: moduleId ?? null,
  positionSeconds: 0,
  progress: 0,
  isCompleted: false,
  attempts: 0,
  score: null,
  metadata: null,
  clientUpdatedAt: null,
  serverUpdatedAt: null,
}, lessonId, moduleId ?? null);

const appendUnique = (queue, record) => {
  const normalized = normalizeRecord(record);
  if (!normalized) {
    return queue;
  }
  const filtered = queue.filter((item) => item.lessonId !== normalized.lessonId);
  return [...filtered, normalized];
};

const mergeUnique = (queue, records) => {
  if (!records || !records.length) {
    return queue;
  }
  return records.reduce((acc, item) => appendUnique(acc, item), queue);
};

/**
 * Resolve last-write-wins conflict using PUT/POST /api/progress contracts.
 * Expects server responses shaped as:
 * {
 *   id,
 *   userId,
 *   moduleId,
 *   lessonId,
 *   positionSeconds,
 *   progress,
 *   isCompleted,
 *   attempts,
 *   score,
 *   metadata,
 *   clientUpdatedAt: '2025-11-07T13:10:00.000Z',
 *   serverUpdatedAt: '2025-11-07T13:10:00.532Z',
 *   createdAt
 * }
 */
const resolveLWWConflict = (localRecord, serverRecord) => {
  const normalizedLocal = normalizeRecord(localRecord);
  const normalizedServer = normalizeRecord(
    serverRecord,
    normalizedLocal?.lessonId,
    normalizedLocal?.moduleId,
  );

  if (!normalizedServer) {
    return {
      record: normalizedLocal,
      shouldRequeue: false,
    };
  }

  if (!normalizedLocal) {
    return {
      record: {
        ...normalizedServer,
        clientUpdatedAt: normalizedServer.clientUpdatedAt
          ?? normalizedServer.serverUpdatedAt
          ?? new Date().toISOString(),
      },
      shouldRequeue: false,
    };
  }

  const localTime = normalizedLocal.clientUpdatedAt
    ? Date.parse(normalizedLocal.clientUpdatedAt)
    : 0;
  const serverTime = normalizedServer.serverUpdatedAt
    ? Date.parse(normalizedServer.serverUpdatedAt)
    : Number.POSITIVE_INFINITY;

  if (localTime && localTime > serverTime) {
    const merged = normalizeRecord({
      ...normalizedServer,
      ...normalizedLocal,
      lessonId: normalizedServer.lessonId ?? normalizedLocal.lessonId,
      moduleId: normalizedLocal.moduleId ?? normalizedServer.moduleId ?? null,
      clientUpdatedAt: normalizedLocal.clientUpdatedAt,
      serverUpdatedAt: normalizedServer.serverUpdatedAt,
    }, normalizedServer.lessonId ?? normalizedLocal.lessonId, normalizedLocal.moduleId ?? normalizedServer.moduleId ?? null);

    return {
      record: merged,
      shouldRequeue: true,
    };
  }

  return {
    record: {
      ...normalizedServer,
      clientUpdatedAt: normalizedServer.clientUpdatedAt
        ?? normalizedServer.serverUpdatedAt
        ?? normalizedLocal.clientUpdatedAt
        ?? new Date().toISOString(),
    },
    shouldRequeue: false,
  };
};

const mapSyncErrorMessage = (code) => {
  switch (code) {
    case 'INVALID_ITEM':
      return 'Entrada de progreso inválida recibida durante la sincronización.';
    case 'INVALID_IDENTIFIERS':
      return 'Identificadores de módulo o lección inválidos.';
    case 'INVALID_TIMESTAMP':
      return 'Timestamp de cliente inválido para el progreso.';
    case 'INVALID_POSITION':
      return 'positionSeconds debe ser un entero no negativo.';
    case 'INVALID_ATTEMPTS':
      return 'attempts debe ser un entero no negativo.';
    case 'INVALID_PROGRESS':
      return 'progress debe estar entre 0 y 1.';
    case 'INVALID_SCORE':
      return 'score debe ser un número válido o null.';
    case 'INVALID_METADATA':
      return 'metadata de progreso inválida. Debe ser un JSON válido.';
    case 'METADATA_TOO_LARGE':
      return 'metadata supera el tamaño máximo permitido (8KB).';
    default:
      return code || 'Error durante la sincronización.';
  }
};

const LearningProgressContext = createContext({
  progressMap: {},
  currentLessonId: null,
  syncStatus: 'idle',
  lastSyncError: null,
  setCurrentLesson: async () => {},
  updateProgress: () => {},
  flushNow: async () => false,
  getLessonProgress: () => null,
  completedLessons: new Set(),
  markLessonComplete: async () => {},
  quizScores: {},
  saveQuizScore: () => {},
  timeSpent: 0,
  updateTimeSpent: () => {},
  flashcards: [],
  addFlashcard: () => {},
  updateFlashcard: () => {},
  flashcardReviews: {},
  markFlashcardReviewed: () => {},
  getFlashcardsDue: () => [],
  getFlashcardStats: {
    total: 0,
    due: 0,
    new: 0,
    reviewed: 0,
    completionRate: 0,
  },
  dismissError: () => {},
});

export const LearningProgressProvider = ({ children }) => {
  const [progressMap, setProgressMap] = useState({});
  const [progressVersion, setProgressVersion] = useState(0);
  const [queue, setQueue] = useState([]);
  const [currentLessonId, setCurrentLessonId] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSyncError, setLastSyncError] = useState(null);
  const [currentModule, setCurrentModuleState] = useState(null);

  const [quizScores, setQuizScores] = useState({});
  const [timeSpent, setTimeSpent] = useState(0);
  const [flashcards, setFlashcards] = useState([]);
  const [flashcardReviews, setFlashcardReviews] = useState({});

  const progressMapRef = useRef(progressMap);
  const queueRef = useRef(queue);
  const currentLessonIdRef = useRef(currentLessonId);
  const currentModuleIdRef = useRef(null);
  const isFlushingRef = useRef(false);

  const bumpVersion = useCallback(() => {
    setProgressVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    progressMapRef.current = progressMap;
  }, [progressMap]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentLessonIdRef.current = currentLessonId;
  }, [currentLessonId]);

  useEffect(() => {
    configureProgressService({
      getAuth: () => {
        const token = getAuthToken();
        const user = getUserData?.();
        return {
          token,
          userId: user?.id ?? user?._id ?? null,
        };
      },
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const storedMapRaw = localStorage.getItem(PROGRESS_MAP_KEY);
      if (storedMapRaw) {
        const storedMap = JSON.parse(storedMapRaw);
        const restored = Object.entries(storedMap).reduce((acc, [lessonId, value]) => {
          const normalized = normalizeRecord({
            ...value,
            lessonId,
          }, lessonId, value?.moduleId ?? null);
          if (normalized) {
            acc[lessonId] = normalized;
          }
          return acc;
        }, {});
        setProgressMap(restored);
      }
    } catch (error) {
      console.warn('[LearningProgressContext] Falló la restauración de progressMap', error);
    }

    try {
      const storedQueueRaw = localStorage.getItem(PROGRESS_QUEUE_KEY);
      if (storedQueueRaw) {
        const storedQueue = JSON.parse(storedQueueRaw);
        const restoredQueue = Array.isArray(storedQueue)
          ? storedQueue.reduce((acc, item) => {
            const normalized = normalizeRecord(item);
            return normalized ? [...acc, normalized] : acc;
          }, [])
          : [];
        setQueue(restoredQueue);
        if (restoredQueue.length > 0) {
          setSyncStatus('offline-queued');
        }
      }
    } catch (error) {
      console.warn('[LearningProgressContext] Falló la restauración de la cola de progreso', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(PROGRESS_MAP_KEY, JSON.stringify(progressMap));
    } catch (error) {
      console.warn('[LearningProgressContext] No se pudo persistir progressMap', error);
    }
  }, [progressMap]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(PROGRESS_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.warn('[LearningProgressContext] No se pudo persistir la cola de progreso', error);
    }
  }, [queue]);

  const applyServerMerge = useCallback((updatesArray = []) => {
    if (!Array.isArray(updatesArray) || updatesArray.length === 0) {
      return;
    }

    setProgressMap((prev) => {
      const next = { ...prev };
      updatesArray.forEach((updRaw) => {
        const normalized = normalizeRecord(updRaw);
        if (!normalized?.lessonId) {
          return;
        }
        const previous = next[normalized.lessonId] || createDefaultProgress(normalized.lessonId, normalized.moduleId ?? null);
        next[normalized.lessonId] = {
          ...previous,
          ...normalized,
          moduleId: normalized.moduleId ?? previous.moduleId ?? null,
        };
      });
      return next;
    });
    bumpVersion();
  }, [bumpVersion]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const token = getAuthToken();
    if (!token || !navigator.onLine) {
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        const remoteRecords = await fetchProgress();
        if (!isMounted || !Array.isArray(remoteRecords) || remoteRecords.length === 0) {
          return;
        }

        const normalizedRecords = remoteRecords
          .map((record) => normalizeRecord(record))
          .filter(Boolean);

        if (normalizedRecords.length === 0) {
          return;
        }

        const toRequeue = [];

        const nextToApply = [];
        normalizedRecords.forEach((serverRecord) => {
          const lessonId = serverRecord.lessonId;
          if (!lessonId) {
            return;
          }
          const localRecord = progressMapRef.current[lessonId];
          if (!localRecord) {
            nextToApply.push(serverRecord);
            return;
          }
          const { record: mergedRecord, shouldRequeue } = resolveLWWConflict(localRecord, serverRecord);
          nextToApply.push(mergedRecord);
          if (shouldRequeue) {
            toRequeue.push(mergedRecord);
          }
        });
        applyServerMerge(nextToApply);

        if (toRequeue.length > 0) {
          setQueue((prev) => mergeUnique(prev, toRequeue));
          setSyncStatus('offline-queued');
        }
      } catch (error) {
        console.debug('[LearningProgressContext] No se pudo cargar progreso remoto', error);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const enqueueForLater = useCallback((record) => {
    if (!record) {
      return;
    }
    setQueue((prev) => appendUnique(prev, record));
  }, []);

  /**
   * Flush local progress state to API.
   *
   * PUT /api/progress body (single lesson example):
   * {
   *   "moduleId": "module-ventilation-basics",
   *   "lessonId": "lesson-ventilator-modes",
   *   "positionSeconds": 185,
   *   "progress": 0.42,
   *   "isCompleted": false,
   *   "clientUpdatedAt": "2025-11-07T13:10:00.000Z"
   * }
   *
   * POST /api/progress/sync body:
   * { "items": [ { ...UserProgressLike, "clientUpdatedAt": "2025-11-07T13:12:00.000Z" } ] }
   *
   * Response shape from sync:
   * {
   *   "data": {
   *     "merged": [ { "lessonId": "lesson-ventilator-modes", "merged": true } ],
   *     "records": [ { "lessonId": "lesson-ventilator-modes", "serverUpdatedAt": "2025-11-07T13:12:00.447Z", ... } ]
   *   }
   * }
   */
  const flushNow = useCallback(async () => {
    if (isFlushingRef.current || typeof window === 'undefined') {
      return false;
    }

    const activeLessonId = currentLessonIdRef.current;
    const activeRecord = activeLessonId
      ? progressMapRef.current[activeLessonId]
      : null;

    if (!navigator.onLine) {
      if (activeRecord) {
        enqueueForLater(activeRecord);
      }
      setSyncStatus('offline-queued');
      return false;
    }

    isFlushingRef.current = true;

    setSyncStatus('saving');
    setLastSyncError(null);

    const queueSnapshot = queueRef.current;
    const totalQueueLength = queueSnapshot.length;
    const pendingRequeue = [];
    let queueForLater = [];
    const recordsToApply = [];
    let encounteredError = null;
    const debugMergeSummary = [];

    if (activeRecord) {
      try {
        const serverRecord = await upsertProgress(activeRecord);
        const normalizedServer = normalizeRecord(serverRecord, activeRecord.lessonId, activeRecord.moduleId);

        if (!normalizedServer) {
          encounteredError = new Error('Invalid server response for active lesson');
          pendingRequeue.push(activeRecord);
        } else {
          const { record: mergedRecord, shouldRequeue } = resolveLWWConflict(activeRecord, normalizedServer);
          recordsToApply.push(mergedRecord);
          if (shouldRequeue) {
            pendingRequeue.push(mergedRecord);
          }
          debugMergeSummary.push({
            lessonId: mergedRecord.lessonId,
            merged: !shouldRequeue,
            source: 'active',
          });
        }
      } catch (error) {
        encounteredError = error;
        pendingRequeue.push(activeRecord);
      }
    }

    if (!encounteredError && totalQueueLength > 0) {
      let cursor = 0;

      while (!encounteredError && cursor < totalQueueLength) {
        const batch = queueSnapshot.slice(cursor, cursor + MAX_SYNC_BATCH);
        cursor += MAX_SYNC_BATCH;

        try {
          const syncResponse = await bulkSyncProgress(batch);
          const mergedEntries = Array.isArray(syncResponse?.merged) ? syncResponse.merged : [];
          const serverRecords = Array.isArray(syncResponse?.records) ? syncResponse.records : [];

          batch.forEach((item, index) => {
            const mergedEntry = mergedEntries[index];
            const serverRecordRaw = serverRecords[index];

            if (mergedEntry?.error) {
              const message = mapSyncErrorMessage(mergedEntry.error);
              encounteredError = encounteredError || new Error(message);
              queueForLater = appendUnique(queueForLater, item);
              debugMergeSummary.push({
                lessonId: item.lessonId,
                merged: false,
                error: mergedEntry.error,
              });
              return;
            }

            if (!serverRecordRaw) {
              encounteredError = encounteredError || new Error('Sync response missing record data');
              queueForLater = appendUnique(queueForLater, item);
              return;
            }

            const normalizedServer = normalizeRecord(serverRecordRaw, item.lessonId, item.moduleId);
            if (!normalizedServer) {
              encounteredError = encounteredError || new Error('Sync response invalid format');
              queueForLater = appendUnique(queueForLater, item);
              return;
            }

            const { record: mergedRecord, shouldRequeue } = resolveLWWConflict(item, normalizedServer);
            recordsToApply.push(mergedRecord);

            const mergedFlag = mergedEntry?.merged ?? !shouldRequeue;
            if (shouldRequeue || mergedFlag === false) {
              pendingRequeue.push(mergedRecord);
            }

            debugMergeSummary.push({
              lessonId: mergedRecord.lessonId,
              merged: mergedFlag,
              conflict: shouldRequeue,
            });
          });
        } catch (error) {
          // Si es un error de conexión, no lo tratamos como error crítico
          // El progreso se mantendrá en la cola para sincronizar más tarde
          const isNetworkError = error.message?.includes('conectar') || 
                                 error.message?.includes('fetch') ||
                                 error.name === 'TypeError';
          
          if (isNetworkError) {
            console.warn('[LearningProgress] Network error during bulk sync, will retry later:', error.message);
            queueForLater = mergeUnique(queueForLater, batch);
          } else {
            encounteredError = error;
            queueForLater = mergeUnique(queueForLater, batch);
          }
        }
      }

      if (encounteredError && cursor < totalQueueLength) {
        queueForLater = mergeUnique(queueForLater, queueSnapshot.slice(cursor));
      }
    }

    if (totalQueueLength > MAX_SYNC_BATCH) {
      console.debug('[LearningProgress] Queue processed in %d batches', Math.ceil(totalQueueLength / MAX_SYNC_BATCH));
    }

    const finalQueue = mergeUnique(queueForLater, pendingRequeue);

    if (recordsToApply.length > 0) {
      applyServerMerge(recordsToApply);
    }

    setQueue(finalQueue);

    if (debugMergeSummary.length > 0) {
      console.debug('[LearningProgress] Sync summary', debugMergeSummary);
    }

    if (encounteredError) {
      // Solo mostrar como error si no es un error de red
      const isNetworkError = encounteredError.message?.includes('conectar') || 
                            encounteredError.message?.includes('fetch') ||
                            encounteredError.name === 'TypeError';
      
      if (isNetworkError) {
        // Errores de red se tratan como offline
        setSyncStatus('offline-queued');
        setLastSyncError(null);
      } else {
        setSyncStatus('error');
        setLastSyncError(encounteredError.message || 'Error al sincronizar progreso.');
      }
      isFlushingRef.current = false;
      return false;
    }

    setLastSyncError(null);
    setSyncStatus(finalQueue.length === 0 ? 'saved' : 'offline-queued');
    isFlushingRef.current = false;
    return true;
  }, [applyServerMerge, enqueueForLater]);

  useEffect(() => {
    if (!currentLessonId) {
      return undefined;
    }

    const interval = setInterval(() => {
      flushNow().catch(() => {});
    }, AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [currentLessonId, flushNow]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleOnline = () => {
      flushNow().catch(() => {});
    };

    const handleOffline = () => {
      setSyncStatus('offline-queued');
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flushNow().catch(() => {});
      }
    };

    const handleBeforeUnload = () => {
      flushNow().catch(() => {});
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [flushNow]);

  const setCurrentModuleCompat = useCallback((value) => {
    const normalized = typeof value === 'string' ? value : null;
    currentModuleIdRef.current = normalized;
    setCurrentModuleState(normalized);
  }, []);

  const setCurrentLesson = useCallback(async (lessonId, moduleId) => {
    if (!lessonId) {
      setCurrentLessonId(null);
      setCurrentModuleCompat(null);
      return null;
    }

    setCurrentLessonId(lessonId);
    const resolvedModuleId = moduleId ?? currentModuleIdRef.current ?? null;
    setCurrentModuleCompat(resolvedModuleId);

    const localRecord = progressMapRef.current[lessonId]
      || createDefaultProgress(lessonId, resolvedModuleId ?? null);

    let recordToApply = {
      ...localRecord,
      moduleId: resolvedModuleId ?? localRecord?.moduleId ?? null,
    };
    let shouldRequeue = false;

    if (typeof window !== 'undefined' && navigator.onLine) {
      try {
        const remote = await fetchProgress({ lessonId });
        if (Array.isArray(remote) && remote.length > 0) {
          const serverRecord = normalizeRecord(remote[0], lessonId, resolvedModuleId ?? localRecord.moduleId);
          const result = resolveLWWConflict(localRecord, serverRecord);
          recordToApply = result.record;
          shouldRequeue = result.shouldRequeue;
        }
      } catch (error) {
        console.debug('[LearningProgressContext] No se pudo precargar progreso remoto', error);
      }
    }

    applyServerMerge([recordToApply]);

    if (shouldRequeue) {
      setQueue((prev) => appendUnique(prev, recordToApply));
      setSyncStatus('offline-queued');
    }

    return recordToApply;
  }, [applyServerMerge]);

  const updateProgress = useCallback((partial = {}) => {
    const lessonId = currentLessonIdRef.current;
    const moduleId = partial.moduleId ?? currentModuleIdRef.current ?? null;

    if (!lessonId) {
      return;
    }

    setProgressMap((prev) => {
      const existing = prev[lessonId] || createDefaultProgress(lessonId, moduleId);
      const updated = normalizeRecord({
        ...existing,
        ...partial,
        lessonId,
        moduleId: moduleId ?? existing.moduleId,
        clientUpdatedAt: new Date().toISOString(),
      }, lessonId, moduleId ?? existing.moduleId);

      return {
        ...prev,
        [lessonId]: updated,
      };
    });

    setSyncStatus((prev) => (prev === 'offline-queued' ? prev : 'idle'));
    setLastSyncError(null);
  }, []);

  const getLessonProgress = useCallback((lessonId) => {
    if (!lessonId) {
      return null;
    }
    return progressMapRef.current[lessonId]
      || createDefaultProgress(lessonId, progressMapRef.current[lessonId]?.moduleId ?? null);
  }, []);

  const markLessonComplete = useCallback(async (lessonId, moduleId = currentModuleIdRef.current) => {
    if (!lessonId) {
      return;
    }
    if (lessonId !== currentLessonIdRef.current) {
      await setCurrentLesson(lessonId, moduleId);
    }
    updateProgress({
      isCompleted: true,
      progress: 1,
      moduleId,
    });
  }, [setCurrentLesson, updateProgress]);

  const saveQuizScore = useCallback((lessonId, score) => {
    if (!lessonId) {
      return;
    }
    setQuizScores((prev) => ({
      ...prev,
      [lessonId]: score,
    }));
  }, []);

  const updateTimeSpent = useCallback((increment = 1) => {
    setTimeSpent((prev) => prev + (Number.isFinite(increment) ? increment : 0));
  }, []);

  const addFlashcard = useCallback((flashcard) => {
    if (!flashcard || !flashcard.id) {
      return;
    }
    setFlashcards((prev) => {
      const exists = prev.some((item) => item.id === flashcard.id);
      if (exists) {
        return prev;
      }
      return [
        ...prev,
        {
          ...flashcard,
          createdAt: new Date().toISOString(),
        },
      ];
    });
  }, []);

  const updateFlashcard = useCallback((updatedFlashcard) => {
    if (!updatedFlashcard || !updatedFlashcard.id) {
      return;
    }
    setFlashcards((prev) => prev.map((flashcard) => (
      flashcard.id === updatedFlashcard.id
        ? { ...flashcard, ...updatedFlashcard }
        : flashcard
    )));
  }, []);

  const markFlashcardReviewed = useCallback((flashcardId, rating) => {
    if (!flashcardId) {
      return;
    }
    setFlashcardReviews((prev) => ({
      ...prev,
      [flashcardId]: {
        ...prev[flashcardId],
        lastReview: new Date().toISOString(),
        rating,
        totalReviews: (prev[flashcardId]?.totalReviews || 0) + 1,
      },
    }));
  }, []);

  const getFlashcardsDue = useCallback(() => {
    if (!Array.isArray(flashcards)) {
      return [];
    }

    const now = new Date();
    return flashcards.filter((flashcard) => {
      if (!flashcard || !flashcard.sm2Data || !flashcard.sm2Data.nextReviewDate) {
        return true;
      }
      const nextReview = new Date(flashcard.sm2Data.nextReviewDate);
      return now >= nextReview;
    });
  }, [flashcards]);

  const getFlashcardStats = useMemo(() => {
    if (!Array.isArray(flashcards)) {
      return {
        total: 0,
        due: 0,
        new: 0,
        reviewed: 0,
        completionRate: 0,
      };
    }

    const total = flashcards.length;
    const due = getFlashcardsDue().length;
    const newCards = flashcards.filter((card) => !card?.sm2Data || card.sm2Data.repetitions === 0).length;
    const reviewed = flashcards.filter((card) => card?.sm2Data && card.sm2Data.repetitions > 0).length;

    return {
      total,
      due,
      new: newCards,
      reviewed,
      completionRate: total > 0 ? (reviewed / total) * 100 : 0,
    };
  }, [flashcards, getFlashcardsDue]);

  const dismissError = useCallback(() => {
    setLastSyncError(null);
  }, []);

  const getModuleProgress = useCallback((moduleId, lessonIds = []) => {
    if (!moduleId) {
      return {
        percent: 0,
        percentInt: 0,
        completedLessons: 0,
        totalLessons: 0,
      };
    }

    const normalizedLessons = Array.isArray(lessonIds) ? lessonIds.filter(Boolean) : [];

    const entries = Object.values(progressMap).filter(
      (entry) => entry?.moduleId === moduleId && entry?.lessonId,
    );

    const lessonSet = normalizedLessons.length > 0
      ? new Set(normalizedLessons)
      : new Set(entries.map((entry) => entry.lessonId));

    if (lessonSet.size === 0) {
      return {
        percent: 0,
        percentInt: 0,
        completedLessons: 0,
        totalLessons: 0,
      };
    }

    const entryMap = entries.reduce((acc, entry) => {
      if (entry.lessonId) {
        acc[entry.lessonId] = entry;
      }
      return acc;
    }, {});

    let completed = 0;
    let percentSum = 0;

    lessonSet.forEach((lessonId) => {
      const record = entryMap[lessonId];
      const progressValue = record
        ? (record.isCompleted ? 1 : Math.max(0, Math.min(1, record.progress ?? 0)))
        : 0;

      percentSum += progressValue;
      if (progressValue >= 1) {
        completed += 1;
      }
    });

    const totalLessons = lessonSet.size;
    const percent = totalLessons ? percentSum / totalLessons : 0;

    return {
      percent,
      percentInt: Math.round(percent * 100),
      completedLessons: completed,
      totalLessons,
    };
  }, [progressMap, progressVersion]);

  const getCurriculumProgress = useCallback((modules) => {
    if (!Array.isArray(modules) || modules.length === 0) {
      return {};
    }

    return modules.reduce((acc, module) => {
      if (!module || !module.id) {
        return acc;
      }

      const lessonIds = Array.isArray(module.lessons)
        ? module.lessons.map((lesson) => lesson?.id).filter(Boolean)
        : [];

      acc[module.id] = getModuleProgress(module.id, lessonIds);
      return acc;
    }, {});
  }, [getModuleProgress]);

  const completedLessons = useMemo(() => new Set(
    Object.values(progressMap)
      .filter((record) => record?.isCompleted)
      .map((record) => record.lessonId),
  ), [progressMap]);

  const contextValue = useMemo(() => ({
    progressMap,
    currentLessonId,
    currentModule,
    syncStatus,
    lastSyncError,
    setCurrentLesson,
    setCurrentModule: setCurrentModuleCompat,
    updateProgress,
    flushNow,
    getLessonProgress,
    getModuleProgress,
    getCurriculumProgress,
    completedLessons,
    markLessonComplete,
    quizScores,
    saveQuizScore,
    timeSpent,
    updateTimeSpent,
    flashcards,
    addFlashcard,
    updateFlashcard,
    flashcardReviews,
    markFlashcardReviewed,
    getFlashcardsDue,
    getFlashcardStats,
    dismissError,
  }), [
    progressMap,
    currentLessonId,
    currentModule,
    syncStatus,
    lastSyncError,
    setCurrentLesson,
    setCurrentModuleCompat,
    updateProgress,
    flushNow,
    getLessonProgress,
    getModuleProgress,
    getCurriculumProgress,
    completedLessons,
    markLessonComplete,
    quizScores,
    saveQuizScore,
    timeSpent,
    updateTimeSpent,
    flashcards,
    addFlashcard,
    updateFlashcard,
    flashcardReviews,
    markFlashcardReviewed,
    getFlashcardsDue,
    getFlashcardStats,
    dismissError,
  ]);

  return (
    <LearningProgressContext.Provider value={contextValue}>
      {children}
    </LearningProgressContext.Provider>
  );
};

export const useLearningProgress = () => {
  const context = useContext(LearningProgressContext);
  if (context === undefined) {
    throw new Error('useLearningProgress debe utilizarse dentro de un LearningProgressProvider');
  }
  return context;
};

const getChipProps = (status, errorMessage) => {
  switch (status) {
    case 'saving':
      return {
        icon: <SyncIcon fontSize="small" className="progress-sync-badge__spin" />,
        color: 'info',
        label: 'Guardando…',
      };
    case 'saved':
      return {
        icon: <CheckCircleIcon fontSize="small" />,
        color: 'success',
        label: 'Guardado',
      };
    case 'offline-queued':
      return {
        icon: <CloudOffIcon fontSize="small" />,
        color: 'warning',
        label: 'Offline: en cola',
      };
    case 'error':
      return {
        icon: <ErrorOutlineIcon fontSize="small" />,
        color: 'error',
        label: errorMessage ? `Error: ${errorMessage}` : 'Error al sincronizar',
      };
    default:
      return null;
  }
};

export const ProgressSyncBadge = () => {
  const { syncStatus, lastSyncError } = useLearningProgress();
  const chipProps = getChipProps(syncStatus, lastSyncError);

  if (!chipProps) {
    return null;
  }

  return (
    <Chip
      size="small"
      variant="filled"
      {...chipProps}
      sx={{
        '& .progress-sync-badge__spin': {
          animation: 'progress-sync-spin 1s linear infinite',
        },
        '@keyframes progress-sync-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      }}
    />
  );
};

export default LearningProgressContext;

