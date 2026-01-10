/**
 * =============================================================================
 * Next.js App Router API Route - Progress
 * =============================================================================
 * API endpoints for tracking user learning progress
 * 
 * GET: Returns user progress and statistics
 * POST: Updates lesson progress and checks module completion
 * =============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { 
  recordUpsert, 
  recordP2002Error, 
  getSessionId, 
  logSessionMetrics,
  clearSessionMetrics 
} from '@/lib/db-logger';

/**
 * Helper function to check if all lessons in a module are completed
 * and mark the module as completed if so
 * 
 * @param tx - Prisma transaction client
 * @param userId - User ID
 * @param lessonId - Lesson ID that was just updated
 * @returns Promise<void>
 */
async function checkModuleCompletion(
  tx: any,
  userId: string,
  lessonId: string
): Promise<void> {
  // Get the lesson to find its moduleId
  const lesson = await tx.lesson.findUnique({
    where: { id: lessonId },
    select: { moduleId: true },
  });

  if (!lesson) {
    console.warn(`[checkModuleCompletion] Lesson ${lessonId} not found`);
    return;
  }

  const moduleId = lesson.moduleId;

  // Get all lessons for this module
  const moduleLessons = await tx.lesson.findMany({
    where: { moduleId },
    select: { id: true },
  });

  if (moduleLessons.length === 0) {
    return; // No lessons in module, nothing to check
  }

  // Get progress for all lessons in this module for this user
  const lessonIds = moduleLessons.map(l => l.id);
  const progressRecords = await tx.progress.findMany({
    where: {
      userId,
      lessonId: { in: lessonIds },
    },
    select: {
      lessonId: true,
      completed: true,
    },
  });

  // Check if all lessons are completed
  const allLessonsCompleted = lessonIds.every(lessonId => {
    const progress = progressRecords.find(p => p.lessonId === lessonId);
    return progress?.completed === true;
  });

  if (allLessonsCompleted) {
    // Mark module as completed (upsert)
    await tx.progress.upsert({
      where: {
        progress_user_module_unique: {
          userId,
          moduleId,
        },
      },
      create: {
        userId,
        moduleId,
        lessonId: null,
        completed: true,
        timeSpent: 0,
        lastAccess: new Date(),
      },
      update: {
        completed: true,
        lastAccess: new Date(),
      },
    });
  }
}

/**
 * GET /api/progress
 * Returns user progress and statistics
 */
export async function GET(request: NextRequest) {
  const sessionId = getSessionId();
  
  try {
    // Get user session - in App Router, we need to pass headers
    const headersList = await headers();
    const session = await getServerSession(
      {
        headers: headersList,
      } as any,
      {} as any,
      authOptions
    );

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Debes iniciar sesión para acceder a este recurso',
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get all progress records for the user
    const progressRecords = await prisma.progress.findMany({
      where: { userId },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            moduleId: true,
          },
        },
        module: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Get all lessons and modules for statistics
    const allLessons = await prisma.lesson.findMany({
      select: { id: true },
    });

    const allModules = await prisma.module.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    // Calculate statistics
    const totalLessons = allLessons.length;
    const completedLessons = progressRecords.filter(
      p => p.lessonId && p.completed
    ).length;

    const totalModules = allModules.length;
    const completedModules = progressRecords.filter(
      p => p.moduleId && !p.lessonId && p.completed
    ).length;

    // Calculate average score from completed lessons with scores
    const scoresWithValues = progressRecords
      .filter(p => p.lessonId && p.completed && p.score !== null && p.score !== undefined)
      .map(p => p.score!);
    
    const averageScore = scoresWithValues.length > 0
      ? scoresWithValues.reduce((sum, score) => sum + score, 0) / scoresWithValues.length
      : null;

    const response = NextResponse.json({
      progress: progressRecords,
      stats: {
        totalLessons,
        completedLessons,
        totalModules,
        completedModules,
        averageScore: averageScore !== null ? Math.round(averageScore * 100) / 100 : null,
      },
    });

    // Log métricas al finalizar la request
    logSessionMetrics(sessionId, 'GET /api/progress');
    
    return response;
  } catch (error) {
    console.error('[GET /api/progress] Error:', error);
    
    // Log métricas incluso en caso de error
    logSessionMetrics(sessionId, 'GET /api/progress');
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Error al obtener el progreso',
      },
      { status: 500 }
    );
  } finally {
    // Limpiar métricas después de un delay para permitir logging
    setTimeout(() => {
      clearSessionMetrics(sessionId);
    }, 1000);
  }
}

/**
 * POST /api/progress
 * Updates lesson progress and checks module completion
 * 
 * Body: { lessonId: string, completed: boolean, score?: number, timeSpent?: number }
 */
export async function POST(request: NextRequest) {
  const sessionId = getSessionId();
  
  try {
    // Get user session - in App Router, we need to pass headers
    const headersList = await headers();
    const session = await getServerSession(
      {
        headers: headersList,
      } as any,
      {} as any,
      authOptions
    );

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Debes iniciar sesión para acceder a este recurso',
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Parse request body
    const body = await request.json();
    const { lessonId, completed, score, timeSpent } = body;

    // Validate required fields
    if (!lessonId || typeof completed !== 'boolean') {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'lessonId y completed son requeridos',
        },
        { status: 400 }
      );
    }

    // Verify lesson exists and get moduleId
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, moduleId: true },
    });

    if (!lesson) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message: 'Lección no encontrada',
        },
        { status: 404 }
      );
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get existing progress to increment timeSpent
      const existingProgress = await tx.progress.findUnique({
        where: {
          progress_user_lesson_unique: {
            userId,
            lessonId,
          },
        },
      });

      const currentTimeSpent = existingProgress?.timeSpent || 0;
      const timeSpentToAdd = timeSpent || 0;
      const newTimeSpent = currentTimeSpent + timeSpentToAdd;

      // Build update object - only include score if explicitly provided
      // to avoid overwriting existing values with NULL
      const updateData: {
        completed: boolean;
        timeSpent: number;
        lastAccess: Date;
        score?: number;
      } = {
        completed,
        timeSpent: newTimeSpent,
        lastAccess: new Date(),
      };
      
      if (score !== undefined) {
        updateData.score = score;
      }

      // Upsert progress record
      const updatedProgress = await tx.progress.upsert({
        where: {
          progress_user_lesson_unique: {
            userId,
            lessonId,
          },
        },
        create: {
          userId,
          lessonId,
          moduleId: lesson.moduleId,
          completed,
          score: score !== undefined ? score : null,
          timeSpent: newTimeSpent,
          lastAccess: new Date(),
        },
        update: updateData,
      });

      // Registrar upsert en métricas
      recordUpsert(sessionId);

      // Check module completion if lesson is completed
      if (completed) {
        await checkModuleCompletion(tx, userId, lessonId);
      }

      return updatedProgress;
    });

    const response = NextResponse.json({
      success: true,
      progress: result,
    });

    // Log métricas al finalizar la request
    logSessionMetrics(sessionId, 'POST /api/progress');
    
    return response;
  } catch (error: any) {
    console.error('[POST /api/progress] Error:', error);
    
    // Handle Prisma unique constraint errors (P2002)
    if (error.code === 'P2002') {
      // Registrar error P2002 en métricas
      recordP2002Error(sessionId);
      
      // Log métricas antes de retornar
      logSessionMetrics(sessionId, 'POST /api/progress');
      
      return NextResponse.json(
        {
          error: 'Conflict',
          message: 'El progreso ya existe; se actualizó',
        },
        { status: 409 }
      );
    }

    // Log métricas incluso en caso de error
    logSessionMetrics(sessionId, 'POST /api/progress');

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Error al actualizar el progreso',
      },
      { status: 500 }
    );
  } finally {
    // Limpiar métricas después de un delay para permitir logging
    setTimeout(() => {
      clearSessionMetrics(sessionId);
    }, 1000);
  }
}
