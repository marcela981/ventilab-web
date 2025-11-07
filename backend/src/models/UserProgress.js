'use strict';

const { default: prisma } = require('../config/database');

const mapRecord = (record) => {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    userId: record.userId,
    moduleId: record.moduleId,
    lessonId: record.lessonId,
    positionSeconds: record.positionSeconds,
    progress: Number(record.progress),
    isCompleted: record.isCompleted,
    attempts: record.attempts,
    score: record.score === null ? null : Number(record.score),
    metadata: record.metadata ?? null,
    clientUpdatedAt: record.clientUpdatedAt?.toISOString?.() ?? null,
    serverUpdatedAt: record.serverUpdatedAt?.toISOString?.() ?? null,
    createdAt: record.createdAt?.toISOString?.() ?? null,
  };
};

const buildUpdatePayload = (data = {}) => {
  const payload = {
    positionSeconds: data.positionSeconds ?? 0,
    progress: data.progress ?? 0,
    isCompleted: data.isCompleted ?? false,
    attempts: data.attempts ?? 0,
    score: data.score ?? null,
    metadata: data.metadata ?? null,
    clientUpdatedAt: data.clientUpdatedAt ?? new Date(),
    serverUpdatedAt: data.serverUpdatedAt ?? new Date(),
  };

  return payload;
};

async function upsertProgress(userId, data) {
  const now = new Date();
  const clientUpdatedAt = data.clientUpdatedAt ? new Date(data.clientUpdatedAt) : now;
  const serverUpdatedAt = data.serverUpdatedAt ? new Date(data.serverUpdatedAt) : now;

  const record = await prisma.userProgress.upsert({
    where: {
      userId_moduleId_lessonId: {
        userId,
        moduleId: data.moduleId,
        lessonId: data.lessonId,
      },
    },
    create: {
      userId,
      moduleId: data.moduleId,
      lessonId: data.lessonId,
      positionSeconds: data.positionSeconds ?? 0,
      progress: data.progress ?? 0,
      isCompleted: data.isCompleted ?? false,
      attempts: data.attempts ?? 0,
      score: data.score ?? null,
      metadata: data.metadata ?? null,
      clientUpdatedAt,
      serverUpdatedAt,
    },
    update: {
      ...buildUpdatePayload({ ...data, clientUpdatedAt, serverUpdatedAt }),
    },
  });

  return mapRecord(record);
}

async function getProgressByUserAndModule(userId, moduleId) {
  const records = await prisma.userProgress.findMany({
    where: {
      userId,
      moduleId,
    },
    orderBy: {
      serverUpdatedAt: 'desc',
    },
  });

  return records.map(mapRecord).filter(Boolean);
}

async function getProgressByUserAndLesson(userId, lessonId, moduleId) {
  if (moduleId) {
    const record = await prisma.userProgress.findUnique({
      where: {
        userId_moduleId_lessonId: {
          userId,
          moduleId,
          lessonId,
        },
      },
    });

    if (record) {
      return mapRecord(record);
    }
  }

  const fallback = await prisma.userProgress.findFirst({
    where: {
      userId,
      lessonId,
      ...(moduleId ? { moduleId } : {}),
    },
    orderBy: {
      serverUpdatedAt: 'desc',
    },
  });

  return mapRecord(fallback);
}

async function getAllProgressByUser(userId) {
  const records = await prisma.userProgress.findMany({
    where: {
      userId,
    },
    orderBy: {
      serverUpdatedAt: 'desc',
    },
  });

  return records.map(mapRecord).filter(Boolean);
}

async function bulkUpsertProgress(userId, items) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const operations = items.map((item) => {
    const now = new Date();
    const clientUpdatedAt = item.clientUpdatedAt ? new Date(item.clientUpdatedAt) : now;
    const serverUpdatedAt = item.serverUpdatedAt ? new Date(item.serverUpdatedAt) : now;

    return prisma.userProgress.upsert({
      where: {
        userId_moduleId_lessonId: {
          userId,
          moduleId: item.moduleId,
          lessonId: item.lessonId,
        },
      },
      create: {
        userId,
        moduleId: item.moduleId,
        lessonId: item.lessonId,
        positionSeconds: item.positionSeconds ?? 0,
        progress: item.progress ?? 0,
        isCompleted: item.isCompleted ?? false,
        attempts: item.attempts ?? 0,
        score: item.score ?? null,
        metadata: item.metadata ?? null,
        clientUpdatedAt,
        serverUpdatedAt,
      },
      update: {
        ...buildUpdatePayload({ ...item, clientUpdatedAt, serverUpdatedAt }),
      },
    });
  });

  const results = await prisma.$transaction(operations);
  return results.map(mapRecord).filter(Boolean);
}

module.exports = {
  upsertProgress,
  getProgressByUserAndModule,
  getProgressByUserAndLesson,
  bulkUpsertProgress,
  getAllProgressByUser,
};

