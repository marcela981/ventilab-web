'use strict';

const { HTTP_STATUS } = require('../config/constants');
const { config } = require('../config/config');
const progressModel = require('../models/UserProgress');

const METADATA_MAX_BYTES = 8 * 1024; // 8KB safety limit
const MAX_SYNC_BATCH = 100;

const formatRecord = (record) => {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    userId: record.userId,
    moduleId: record.moduleId,
    lessonId: record.lessonId,
    positionSeconds: record.positionSeconds,
    progress: record.progress,
    isCompleted: record.isCompleted,
    attempts: record.attempts,
    score: record.score,
    metadata: record.metadata,
    clientUpdatedAt: record.clientUpdatedAt,
    serverUpdatedAt: record.serverUpdatedAt,
    createdAt: record.createdAt,
  };
};

const resolveUserId = (req, res) => {
  if (req.user && req.user.id) {
    return req.user.id;
  }

  const fallbackId = req.headers['x-user-id'] || req.headers['X-User-Id'];
  if (fallbackId && config.nodeEnv !== 'production') {
    req.user = {
      ...(req.user || {}),
      id: fallbackId,
    };
    return fallbackId;
  }

  res.status(HTTP_STATUS.UNAUTHORIZED).json({
    error: {
      code: 'AUTH_REQUIRED',
      message: 'Authentication required to access progress records',
    },
    data: null,
  });
  return null;
};

const parseClientTimestamp = (value) => {
  if (!value) {
    return new Date();
  }

  const dateValue = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(dateValue.getTime())) {
    return null;
  }

  return dateValue;
};

const coerceNumber = (value, { allowNull = false, min, max, integer = false } = {}) => {
  if (value === undefined || value === null) {
    return allowNull ? null : undefined;
  }

  const coerced = Number(value);

  if (Number.isNaN(coerced)) {
    return null;
  }

  if (min !== undefined && coerced < min) {
    return null;
  }

  if (max !== undefined && coerced > max) {
    return null;
  }

  if (integer && !Number.isInteger(coerced)) {
    return null;
  }

  return coerced;
};

const isValidModuleId = (value) => typeof value === 'string' && value.trim().length >= 3 && value.trim().length <= 128;
const isValidLessonId = (value) => typeof value === 'string' && value.trim().length >= 3 && value.trim().length <= 128;

const sanitizeMetadata = (metadata) => {
  if (metadata === undefined) {
    return { ok: true, value: undefined };
  }

  if (metadata === null) {
    return { ok: true, value: null };
  }

  if (typeof metadata !== 'object') {
    return { ok: false, code: 'invalid' };
  }

  try {
    const serialized = JSON.stringify(metadata);
    if (Buffer.byteLength(serialized, 'utf8') > METADATA_MAX_BYTES) {
      return { ok: false, code: 'too_large' };
    }
    return { ok: true, value: JSON.parse(serialized) };
  } catch (error) {
    return { ok: false, code: 'invalid' };
  }
};

const mergePayload = (existing, incoming) => {
  if (!existing) {
    return incoming;
  }

  return {
    moduleId: incoming.moduleId ?? existing.moduleId,
    lessonId: incoming.lessonId ?? existing.lessonId,
    positionSeconds: incoming.positionSeconds ?? existing.positionSeconds,
    progress: incoming.progress ?? existing.progress,
    isCompleted: incoming.isCompleted ?? existing.isCompleted,
    attempts: incoming.attempts ?? existing.attempts,
    score: incoming.score !== undefined ? incoming.score : existing.score,
    metadata: incoming.metadata !== undefined ? incoming.metadata : existing.metadata,
    clientUpdatedAt: incoming.clientUpdatedAt ?? existing.clientUpdatedAt,
    serverUpdatedAt: incoming.serverUpdatedAt ?? existing.serverUpdatedAt,
  };
};

const handleUnexpectedError = (res, error) => {
  console.error('[ProgressController] Unexpected error', error);
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred while processing progress data',
    },
    data: null,
  });
};

/**
 * GET /api/progress
 * Obtiene los registros de progreso del usuario autenticado.
 * Query opcional: moduleId, lessonId
 * Response ejemplo:
 * {
 *   "data": [
 *     {
 *       "lessonId": "lesson-123",
 *       "moduleId": "module-1",
 *       "progress": 0.75,
 *       "positionSeconds": 430,
 *       "isCompleted": false,
 *       "clientUpdatedAt": "2025-11-07T02:15:23.001Z",
 *       "serverUpdatedAt": "2025-11-07T02:15:23.234Z"
 *     }
 *   ],
 *   "meta": { "count": 1 }
 * }
 */
const listProgress = async (req, res) => {
  try {
    const userId = resolveUserId(req, res);
    if (!userId) {
      return;
    }

    const { moduleId, lessonId } = req.query;

    let records;

    if (lessonId) {
      const record = await progressModel.getProgressByUserAndLesson(userId, String(lessonId), moduleId ? String(moduleId) : undefined);
      records = record ? [record] : [];
    } else if (moduleId) {
      records = await progressModel.getProgressByUserAndModule(userId, String(moduleId));
    } else {
      records = await progressModel.getAllProgressByUser(userId);
    }

    res.status(HTTP_STATUS.OK).json({
      data: records.map(formatRecord).filter(Boolean),
      meta: { count: records.length },
    });
  } catch (error) {
    handleUnexpectedError(res, error);
  }
};

/**
 * PUT /api/progress
 * Upsert de un registro individual con política LWW.
 * Request ejemplo:
 * {
 *   "moduleId": "module-1",
 *   "lessonId": "lesson-123",
 *   "positionSeconds": 120,
 *   "progress": 0.45,
 *   "clientUpdatedAt": "2025-11-07T02:10:00.000Z"
 * }
 * Response ejemplo (merge aplicado):
 * {
 *   "data": { ...registroFinal },
 *   "meta": { "merged": true }
 * }
 */
const upsertProgress = async (req, res) => {
  try {
    const userId = resolveUserId(req, res);
    if (!userId) {
      return;
    }

    const {
      moduleId,
      lessonId,
      positionSeconds,
      progress,
      isCompleted,
      attempts,
      score,
      metadata,
      clientUpdatedAt,
    } = req.body || {};

    const normalizedModuleId = typeof moduleId === 'string' ? moduleId.trim() : '';
    if (!isValidModuleId(normalizedModuleId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: 'INVALID_MODULE_ID',
          message: 'moduleId is required and must be a string',
        },
        data: null,
      });
    }

    const normalizedLessonId = typeof lessonId === 'string' ? lessonId.trim() : '';
    if (!isValidLessonId(normalizedLessonId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: 'INVALID_LESSON_ID',
          message: 'lessonId is required and must be a string',
        },
        data: null,
      });
    }

    const metadataResult = sanitizeMetadata(metadata);
    if (!metadataResult.ok) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: metadataResult.code === 'too_large' ? 'METADATA_TOO_LARGE' : 'INVALID_METADATA',
          message: metadataResult.code === 'too_large'
            ? 'metadata exceeds the maximum allowed size (8KB)'
            : 'metadata must be a valid JSON object',
        },
        data: null,
      });
    }

    const existing = await progressModel.getProgressByUserAndLesson(userId, normalizedLessonId, normalizedModuleId);

    const incomingClientUpdatedAt = parseClientTimestamp(clientUpdatedAt);
    if (!incomingClientUpdatedAt) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: 'INVALID_TIMESTAMP',
          message: 'clientUpdatedAt must be a valid ISO date string or millisecond timestamp',
        },
        data: null,
      });
    }

    const serverGate = existing?.serverUpdatedAt ? new Date(existing.serverUpdatedAt) : null;
    const shouldMerge = !serverGate || incomingClientUpdatedAt > serverGate;

    if (!shouldMerge) {
      return res.status(HTTP_STATUS.OK).json({
        data: formatRecord(existing),
        meta: { merged: false },
      });
    }

    const parsedPosition = coerceNumber(positionSeconds, { min: 0, integer: true });
    if (parsedPosition === null) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: 'INVALID_POSITION',
          message: 'positionSeconds must be a non-negative integer',
        },
        data: null,
      });
    }

    const parsedAttempts = coerceNumber(attempts, { min: 0, integer: true });
    if (parsedAttempts === null) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: 'INVALID_ATTEMPTS',
          message: 'attempts must be a non-negative integer',
        },
        data: null,
      });
    }

    const parsedProgress = coerceNumber(progress, { min: 0, max: 1 });
    if (parsedProgress === null && progress !== undefined && progress !== null) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: 'INVALID_PROGRESS',
          message: 'progress must be a number between 0 and 1',
        },
        data: null,
      });
    }

    const parsedScore = coerceNumber(score, { allowNull: true });
    if (parsedScore === null && score !== undefined && score !== null) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: 'INVALID_SCORE',
          message: 'score must be a number when provided',
        },
        data: null,
      });
    }

    const payload = {
      moduleId: normalizedModuleId,
      lessonId: normalizedLessonId,
      positionSeconds: parsedPosition ?? existing?.positionSeconds ?? 0,
      progress: parsedProgress ?? existing?.progress ?? 0,
      isCompleted: typeof isCompleted === 'boolean' ? isCompleted : existing?.isCompleted ?? false,
      attempts: parsedAttempts ?? existing?.attempts ?? 0,
      score: parsedScore !== undefined ? parsedScore : existing?.score ?? null,
      metadata: metadata !== undefined ? metadataResult.value : existing?.metadata ?? null,
      clientUpdatedAt: incomingClientUpdatedAt,
      serverUpdatedAt: new Date(),
    };

    const mergedPayload = mergePayload(existing, payload);

    const result = await progressModel.upsertProgress(userId, mergedPayload);
    const serverRecord = formatRecord(result);
    const { record: mergedRecord, shouldRequeue } = resolveLWWConflict(mergedPayload, serverRecord);

    if (shouldRequeue) {
      console.debug('[ProgressController] Upsert conflict detected', {
        lessonId: mergedRecord.lessonId,
        clientUpdatedAt: mergedPayload.clientUpdatedAt?.toISOString?.() ?? mergedPayload.clientUpdatedAt,
        serverUpdatedAt: serverRecord.serverUpdatedAt,
      });
    }

    res.status(HTTP_STATUS.OK).json({
      data: mergedRecord,
      meta: { merged: !shouldRequeue },
    });
  } catch (error) {
    handleUnexpectedError(res, error);
  }
};

/**
 * POST /api/progress/sync
 * Sincroniza múltiples registros aplicando LWW entrada por entrada.
 * Request ejemplo:
 * [
 *   {
 *     "moduleId": "module-1",
 *     "lessonId": "lesson-123",
 *     "progress": 1,
 *     "isCompleted": true,
 *     "clientUpdatedAt": "2025-11-07T02:20:00.000Z"
 *   }
 * ]
 * Response ejemplo:
 * [
 *   {
 *     "data": { ...registroFinal },
 *     "merged": true
 *   }
 * ]
 */
const syncProgress = async (req, res) => {
  try {
    const userId = resolveUserId(req, res);
    if (!userId) {
      return;
    }

    const rawPayload = Array.isArray(req.body)
      ? req.body
      : Array.isArray(req.body?.items)
        ? req.body.items
        : null;

    if (!Array.isArray(rawPayload)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'Request body must be an array of progress items or { items: [] }',
        },
        data: null,
      });
    }

    const effectivePayload = rawPayload.slice(0, MAX_SYNC_BATCH);
    const truncatedCount = rawPayload.length > MAX_SYNC_BATCH ? rawPayload.length - MAX_SYNC_BATCH : 0;

    const mergeCandidates = [];
    const mergeContexts = [];
    const mergeResults = [];
    const serverRecords = [];
    const debugMergeSummary = [];

    for (const item of effectivePayload) {
      if (!item || typeof item !== 'object') {
        mergeResults.push({ lessonId: null, merged: false, error: 'INVALID_ITEM' });
        continue;
      }

      const normalizedModuleId = typeof item.moduleId === 'string' ? item.moduleId.trim() : '';
      const normalizedLessonId = typeof item.lessonId === 'string' ? item.lessonId.trim() : '';

      if (!isValidModuleId(normalizedModuleId) || !isValidLessonId(normalizedLessonId)) {
        mergeResults.push({ lessonId: normalizedLessonId || null, merged: false, error: 'INVALID_IDENTIFIERS' });
        continue;
      }

      const metadataResult = sanitizeMetadata(item.metadata);
      if (!metadataResult.ok) {
        mergeResults.push({
          lessonId: normalizedLessonId,
          merged: false,
          error: metadataResult.code === 'too_large' ? 'METADATA_TOO_LARGE' : 'INVALID_METADATA',
        });
        continue;
      }

      const existing = await progressModel.getProgressByUserAndLesson(userId, normalizedLessonId, normalizedModuleId);
      const incomingClientUpdatedAt = parseClientTimestamp(item.clientUpdatedAt);
      if (!incomingClientUpdatedAt) {
        mergeResults.push({ lessonId: normalizedLessonId, merged: false, error: 'INVALID_TIMESTAMP' });
        continue;
      }

      const serverGate = existing?.serverUpdatedAt ? new Date(existing.serverUpdatedAt) : null;
      const shouldMerge = !serverGate || incomingClientUpdatedAt > serverGate;
      if (!shouldMerge) {
        mergeResults.push({ lessonId: normalizedLessonId, merged: false });
        continue;
      }

      const parsedPosition = coerceNumber(item.positionSeconds, { min: 0, integer: true });
      if (parsedPosition === null && item.positionSeconds !== undefined && item.positionSeconds !== null) {
        mergeResults.push({ lessonId: normalizedLessonId, merged: false, error: 'INVALID_POSITION' });
        continue;
      }

      const parsedAttempts = coerceNumber(item.attempts, { min: 0, integer: true });
      if (parsedAttempts === null && item.attempts !== undefined && item.attempts !== null) {
        mergeResults.push({ lessonId: normalizedLessonId, merged: false, error: 'INVALID_ATTEMPTS' });
        continue;
      }

      const parsedProgress = coerceNumber(item.progress, { min: 0, max: 1 });
      if (parsedProgress === null && item.progress !== undefined && item.progress !== null) {
        mergeResults.push({ lessonId: normalizedLessonId, merged: false, error: 'INVALID_PROGRESS' });
        continue;
      }

      const parsedScore = coerceNumber(item.score, { allowNull: true });
      if (parsedScore === null && item.score !== undefined && item.score !== null) {
        mergeResults.push({ lessonId: normalizedLessonId, merged: false, error: 'INVALID_SCORE' });
        continue;
      }

      const normalizedItem = {
        moduleId: normalizedModuleId,
        lessonId: normalizedLessonId,
        positionSeconds: parsedPosition ?? existing?.positionSeconds ?? 0,
        progress: parsedProgress ?? existing?.progress ?? 0,
        isCompleted: typeof item.isCompleted === 'boolean' ? item.isCompleted : existing?.isCompleted ?? false,
        attempts: parsedAttempts ?? existing?.attempts ?? 0,
        score: parsedScore !== undefined ? parsedScore : existing?.score ?? null,
        metadata: item.metadata !== undefined ? metadataResult.value : existing?.metadata ?? null,
        clientUpdatedAt: incomingClientUpdatedAt,
        serverUpdatedAt: new Date(),
      };

      mergeCandidates.push(normalizedItem);
      mergeContexts.push({ incoming: normalizedItem, resultIndex: mergeResults.length });
      mergeResults.push({ lessonId: normalizedLessonId, merged: false });
    }

    if (mergeCandidates.length > 0) {
      const records = await progressModel.bulkUpsertProgress(userId, mergeCandidates);

      records.forEach((record, index) => {
        const context = mergeContexts[index];
        if (!context) {
          return;
        }

        const serverRecord = formatRecord(record);
        const { record: mergedRecord, shouldRequeue } = resolveLWWConflict(context.incoming, serverRecord);

        mergeResults[context.resultIndex] = {
          lessonId: context.incoming.lessonId,
          merged: !shouldRequeue,
          ...(shouldRequeue ? { conflict: true } : {}),
        };

        serverRecords.push(serverRecord);
        debugMergeSummary.push({
          lessonId: context.incoming.lessonId,
          merged: !shouldRequeue,
          conflict: shouldRequeue,
        });

        if (shouldRequeue) {
          console.debug('[ProgressController] Sync conflict detected', {
            lessonId: context.incoming.lessonId,
            clientUpdatedAt: context.incoming.clientUpdatedAt?.toISOString?.() ?? context.incoming.clientUpdatedAt,
            serverUpdatedAt: serverRecord.serverUpdatedAt,
          });
        }
      });
    }

    if (debugMergeSummary.length > 0) {
      console.debug('[ProgressController] Sync merge summary', debugMergeSummary);
    }

    res.status(HTTP_STATUS.OK).json({
      data: {
        merged: mergeResults,
        records: serverRecords,
      },
      meta: {
        processed: mergeCandidates.length,
        totalReceived: rawPayload.length,
        truncated: truncatedCount,
        errors: mergeResults.filter((entry) => entry.error).length,
      },
    });
  } catch (error) {
    handleUnexpectedError(res, error);
  }
};

module.exports = {
  listProgress,
  upsertProgress,
  syncProgress,
};

