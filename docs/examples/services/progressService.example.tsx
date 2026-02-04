/**
 * Progress Service Usage Examples
 * 
 * This file demonstrates how to use the progress service and hooks
 * in your React components.
 */

import React, { useEffect } from 'react';
import {
  useUserOverview,
  useModuleProgress,
  useModuleResumePoint,
  useLessonProgress,
  useUpdateLessonProgress,
} from '@/hooks/useProgress';

// ============================================
// Example 1: Display User Progress Overview
// ============================================

export function UserProgressDashboard() {
  const { overview, isLoading, isError, error } = useUserOverview();

  if (isLoading) return <div>Cargando...</div>;
  if (isError) return <div>Error: {error?.message}</div>;
  if (!overview) return null;

  return (
    <div>
      <h2>Tu Progreso</h2>
      <p>Progreso general: {overview.overview.overallProgress}%</p>
      <p>Módulos completados: {overview.overview.completedModules} / {overview.overview.totalModules}</p>
      
      <h3>Módulos</h3>
      {overview.modules.map((module) => (
        <div key={module.id}>
          <h4>{module.title}</h4>
          <p>Progreso: {module.progress}%</p>
          <p>Lecciones: {module.completedLessons} / {module.totalLessons}</p>
          {module.nextLesson && (
            <p>Siguiente: {module.nextLesson.title}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================
// Example 2: Module Progress with Resume
// ============================================

export function ModuleProgressCard({ moduleId }: { moduleId: string }) {
  const { progress, isLoading: progressLoading } = useModuleProgress(moduleId);
  const { resumePoint, isLoading: resumeLoading } = useModuleResumePoint(moduleId);

  if (progressLoading || resumeLoading) return <div>Cargando...</div>;

  return (
    <div>
      <h3>Progreso del Módulo</h3>
      {progress && (
        <>
          <p>Completado: {progress.progress}%</p>
          <p>Lecciones: {progress.completedLessons} / {progress.totalLessons}</p>
          <p>Tiempo: {progress.timeSpent} minutos</p>
        </>
      )}

      {resumePoint && (
        <div>
          <h4>Continuar desde:</h4>
          <p>{resumePoint.lessonTitle}</p>
          <p>Progreso en lección: {resumePoint.completionPercentage}%</p>
          <button onClick={() => {
            // Navigate to lesson
            window.location.href = `/lessons/${resumePoint.lessonId}`;
          }}>
            Continuar
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// Example 3: Lesson with Progress Tracking
// ============================================

export function LessonViewer({ lessonId, moduleId }: { lessonId: string; moduleId: string }) {
  const { progress } = useLessonProgress(lessonId);
  const { updateProgress } = useUpdateLessonProgress();
  const [scrollPosition, setScrollPosition] = React.useState(0);
  const [timeSpent, setTimeSpent] = React.useState(0);

  // Track time spent
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setTimeSpent(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / scrollHeight) * 100;
      setScrollPosition(scrollTop);
      
      // Update progress based on scroll
      const completionPercentage = Math.min(100, Math.round(scrollPercent));
      
      // Debounce updates
      if (completionPercentage > (progress?.completionPercentage || 0)) {
        updateProgress(lessonId, {
          completionPercentage,
          timeSpent,
          scrollPosition: scrollTop,
        }, moduleId);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lessonId, moduleId, timeSpent, progress, updateProgress]);

  // Restore scroll position
  useEffect(() => {
    if (progress?.scrollPosition) {
      window.scrollTo(0, progress.scrollPosition);
    }
  }, [progress?.scrollPosition]);

  return (
    <div>
      <h2>Lección</h2>
      <div>Progreso: {progress?.completionPercentage || 0}%</div>
      <div>Tiempo: {Math.floor(timeSpent / 60)} minutos</div>
      {/* Lesson content here */}
    </div>
  );
}

// ============================================
// Example 4: Direct API Usage (without hooks)
// ============================================

import {
  updateLessonProgress,
  getLessonProgress,
  getModuleProgress,
  invalidateProgressCache,
} from '@/services/progressService';

async function handleLessonComplete(lessonId: string, moduleId: string) {
  try {
    // Update to 100% completion
    const result = await updateLessonProgress(lessonId, {
      completionPercentage: 100,
      timeSpent: 300, // 5 minutes in seconds
    });

    console.log('Lesson completed:', result);

    // Manually invalidate cache if needed
    await invalidateProgressCache(moduleId);

    // Show success message
    alert('¡Lección completada!');
  } catch (error) {
    console.error('Error completing lesson:', error);
    alert('Error al completar la lección');
  }
}

async function checkProgress(lessonId: string) {
  try {
    const progress = await getLessonProgress(lessonId);
    
    if (progress) {
      console.log('Current progress:', progress.completionPercentage);
      console.log('Time spent:', progress.timeSpent);
      console.log('Completed:', progress.completed);
    } else {
      console.log('No progress yet');
    }
  } catch (error) {
    console.error('Error fetching progress:', error);
  }
}

// ============================================
// Example 5: Progress Tracking Utility
// ============================================

export class ProgressTracker {
  private lessonId: string;
  private moduleId: string;
  private startTime: number;
  private lastUpdateTime: number;
  private updateInterval: number = 10000; // Update every 10 seconds

  constructor(lessonId: string, moduleId: string) {
    this.lessonId = lessonId;
    this.moduleId = moduleId;
    this.startTime = Date.now();
    this.lastUpdateTime = Date.now();
  }

  async updateProgress(completionPercentage: number, scrollPosition?: number) {
    const now = Date.now();
    
    // Throttle updates
    if (now - this.lastUpdateTime < this.updateInterval) {
      return;
    }

    const timeSpent = Math.floor((now - this.startTime) / 1000);
    
    try {
      await updateLessonProgress(this.lessonId, {
        completionPercentage,
        timeSpent,
        scrollPosition,
      });
      
      this.lastUpdateTime = now;
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  }

  async complete() {
    const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);
    
    try {
      await updateLessonProgress(this.lessonId, {
        completionPercentage: 100,
        timeSpent,
      });
      
      await invalidateProgressCache(this.moduleId);
    } catch (error) {
      console.error('Error completing lesson:', error);
      throw error;
    }
  }
}

// Usage:
// const tracker = new ProgressTracker('lesson-123', 'module-456');
// tracker.updateProgress(50, 1200);
// tracker.complete();
