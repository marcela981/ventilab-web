/**
 * Progress Hooks - Usage Examples
 * 
 * Complete examples showing how to use useLessonProgress and useModuleProgress
 * in real components.
 */

import React, { useRef, useState } from 'react';
import useLessonProgress from './useLessonProgress';
import useModuleProgress, {
  useMultipleModulesProgress,
  getModuleState,
  getModuleStateLabel,
  getProgressText,
  getLessonsCompletionText,
} from './useModuleProgress';

// ============================================
// Example 1: Lesson Viewer with Auto-Tracking
// ============================================

export function LessonViewerWithTracking({
  lessonId,
  moduleId,
}: {
  lessonId: string;
  moduleId: string;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const {
    localProgress,
    isSaving,
    isCompleted,
    showResumeAlert,
    saveProgress,
    dismissResumeAlert,
  } = useLessonProgress({
    lessonId,
    moduleId,
    contentRef,
    onComplete: () => {
      // Trigger confetti or celebration animation
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      console.log('🎉 Lesson completed!');
    },
    autoSaveThreshold: 10,
    autoCompleteThreshold: 90,
  });

  return (
    <div className="lesson-viewer">
      {/* Resume Alert */}
      {showResumeAlert && (
        <div className="resume-alert">
          <p>Continuando desde {Math.round(localProgress)}%</p>
          <button onClick={dismissResumeAlert}>Cerrar</button>
        </div>
      )}

      {/* Progress Bar */}
      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${localProgress}%` }}>
          {Math.round(localProgress)}%
        </div>
        {isSaving && <span className="saving-indicator">Guardando...</span>}
      </div>

      {/* Completion Badge */}
      {isCompleted && (
        <div className="completion-badge">
          ✅ Lección completada
        </div>
      )}

      {/* Confetti */}
      {showConfetti && <div className="confetti-animation">🎉</div>}

      {/* Scrollable Content */}
      <div ref={contentRef} className="lesson-content" style={{ maxHeight: '80vh', overflow: 'auto' }}>
        <h1>Lesson Content</h1>
        <p>Scroll down to track progress automatically...</p>
        {/* Your lesson content here */}
        <div style={{ height: '2000px' }}>
          <p>Long content...</p>
        </div>
      </div>

      {/* Manual Save Button */}
      <button onClick={() => saveProgress()} disabled={isSaving}>
        {isSaving ? 'Guardando...' : 'Guardar progreso'}
      </button>
    </div>
  );
}

// ============================================
// Example 2: Module Progress Card
// ============================================

export function ModuleProgressCard({ moduleId }: { moduleId: string }) {
  const { moduleProgress, isLoading, isError, moduleState, mutate } = useModuleProgress({
    moduleId,
    revalidateOnFocus: true,
  });

  if (isLoading) {
    return <div className="module-card loading">Cargando...</div>;
  }

  if (isError) {
    return (
      <div className="module-card error">
        <p>Error al cargar progreso</p>
        <button onClick={() => mutate()}>Reintentar</button>
      </div>
    );
  }

  const stateLabel = getModuleStateLabel(moduleState);
  const progressText = getProgressText(moduleProgress);
  const lessonsText = getLessonsCompletionText(moduleProgress);

  return (
    <div className={`module-card ${moduleState}`}>
      <div className="module-header">
        <h3>Módulo {moduleId}</h3>
        <span className={`state-badge ${moduleState}`}>{stateLabel}</span>
      </div>

      <div className="progress-section">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: progressText }}
          />
        </div>
        <p className="progress-text">{progressText}</p>
      </div>

      <div className="lessons-section">
        <p>Lecciones completadas: {lessonsText}</p>
        <p>Tiempo dedicado: {moduleProgress?.timeSpent || 0} minutos</p>
      </div>

      {moduleState === 'completed' && (
        <div className="completion-badge">
          ✅ Módulo completado
        </div>
      )}

      {moduleState === 'in-progress' && (
        <button onClick={() => window.location.href = `/modules/${moduleId}/resume`}>
          Continuar
        </button>
      )}

      {moduleState === 'not-started' && (
        <button onClick={() => window.location.href = `/modules/${moduleId}/lessons`}>
          Comenzar
        </button>
      )}
    </div>
  );
}

// ============================================
// Example 3: Dashboard with Multiple Modules
// ============================================

export function ModulesDashboard({ moduleIds }: { moduleIds: string[] }) {
  const { results, isLoading, hasError, mutateAll } = useMultipleModulesProgress(moduleIds);

  if (isLoading) {
    return <div>Cargando módulos...</div>;
  }

  if (hasError) {
    return (
      <div>
        <p>Error al cargar algunos módulos</p>
        <button onClick={mutateAll}>Reintentar</button>
      </div>
    );
  }

  // Calculate overall statistics
  const totalProgress = results.reduce(
    (sum, r) => sum + (r.moduleProgress?.progress || 0),
    0
  );
  const avgProgress = totalProgress / results.length;

  const completedModules = results.filter(
    (r) => r.moduleState === 'completed'
  ).length;

  return (
    <div className="modules-dashboard">
      <div className="dashboard-header">
        <h2>Mi Progreso</h2>
        <div className="stats">
          <p>Progreso promedio: {Math.round(avgProgress)}%</p>
          <p>Módulos completados: {completedModules} / {results.length}</p>
        </div>
        <button onClick={mutateAll}>Actualizar</button>
      </div>

      <div className="modules-grid">
        {results.map((result, index) => (
          <ModuleProgressCard key={moduleIds[index]} moduleId={moduleIds[index]} />
        ))}
      </div>
    </div>
  );
}

// ============================================
// Example 4: Lesson with Section Tracking
// ============================================

export function LessonWithSections({
  lessonId,
  moduleId,
  sections,
}: {
  lessonId: string;
  moduleId: string;
  sections: Array<{ id: string; title: string }>;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [currentSection, setCurrentSection] = useState<string | null>(null);

  const { localProgress, isCompleted } = useLessonProgress({
    lessonId,
    moduleId,
    contentRef,
    onComplete: () => {
      alert('🎉 Lección completada!');
    },
  });

  // Track which section is currently visible
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.getAttribute('data-section-id');
            if (sectionId) {
              setCurrentSection(sectionId);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    // Observe all sections
    const sectionElements = document.querySelectorAll('[data-section-id]');
    sectionElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="lesson-with-sections">
      {/* Table of Contents */}
      <aside className="toc">
        <h3>Contenido</h3>
        <ul>
          {sections.map((section) => (
            <li
              key={section.id}
              className={currentSection === section.id ? 'active' : ''}
            >
              <a href={`#${section.id}`}>{section.title}</a>
            </li>
          ))}
        </ul>
        <div className="progress-indicator">
          Progreso: {Math.round(localProgress)}%
        </div>
      </aside>

      {/* Content */}
      <div ref={contentRef} className="content">
        {sections.map((section) => (
          <section key={section.id} id={section.id} data-section-id={section.id}>
            <h2>{section.title}</h2>
            <p>Section content...</p>
          </section>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Example 5: Progress Bar Component
// ============================================

export function ProgressBar({
  current,
  total,
  showPercentage = true,
  height = 20,
}: {
  current: number;
  total: number;
  showPercentage?: boolean;
  height?: number;
}) {
  const percentage = Math.min(100, Math.max(0, (current / total) * 100));

  return (
    <div className="progress-bar-wrapper">
      <div
        className="progress-bar-container"
        style={{ height: `${height}px`, position: 'relative', overflow: 'hidden' }}
      >
        <div
          className="progress-bar-fill"
          style={{
            width: `${percentage}%`,
            height: '100%',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      {showPercentage && (
        <span className="progress-percentage">{Math.round(percentage)}%</span>
      )}
    </div>
  );
}

// ============================================
// Example 6: Resume from Last Position
// ============================================

export function ResumeLesson({
  lessonId,
  moduleId,
}: {
  lessonId: string;
  moduleId: string;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { localProgress, showResumeAlert, dismissResumeAlert } = useLessonProgress({
    lessonId,
    moduleId,
    contentRef,
  });

  return (
    <div>
      {showResumeAlert && (
        <div className="resume-notification">
          <p>
            📖 Continuando desde donde lo dejaste ({Math.round(localProgress)}%)
          </p>
          <button onClick={dismissResumeAlert}>Entendido</button>
        </div>
      )}

      <div ref={contentRef} className="lesson-content">
        {/* Lesson content */}
      </div>
    </div>
  );
}

// ============================================
// Example 7: Advanced Progress Analytics
// ============================================

export function ProgressAnalytics({ userId }: { userId: string }) {
  const moduleIds = ['module-1', 'module-2', 'module-3'];
  const { results } = useMultipleModulesProgress(moduleIds);

  const analytics = {
    totalLessons: results.reduce(
      (sum, r) => sum + (r.moduleProgress?.totalLessons || 0),
      0
    ),
    completedLessons: results.reduce(
      (sum, r) => sum + (r.moduleProgress?.completedLessons || 0),
      0
    ),
    totalTimeSpent: results.reduce(
      (sum, r) => sum + (r.moduleProgress?.timeSpent || 0),
      0
    ),
    avgProgress: results.reduce(
      (sum, r) => sum + (r.moduleProgress?.progress || 0),
      0
    ) / results.length,
  };

  return (
    <div className="analytics-dashboard">
      <h2>Estadísticas de Progreso</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Lecciones Completadas</h3>
          <p className="stat-value">
            {analytics.completedLessons} / {analytics.totalLessons}
          </p>
        </div>

        <div className="stat-card">
          <h3>Tiempo Total</h3>
          <p className="stat-value">{Math.round(analytics.totalTimeSpent / 60)}h</p>
        </div>

        <div className="stat-card">
          <h3>Progreso Promedio</h3>
          <p className="stat-value">{Math.round(analytics.avgProgress)}%</p>
        </div>
      </div>

      <div className="modules-breakdown">
        <h3>Desglose por Módulo</h3>
        {results.map((result, i) => (
          <div key={moduleIds[i]} className="module-stat">
            <span>Módulo {i + 1}</span>
            <ProgressBar
              current={result.moduleProgress?.completedLessons || 0}
              total={result.moduleProgress?.totalLessons || 1}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default {
  LessonViewerWithTracking,
  ModuleProgressCard,
  ModulesDashboard,
  LessonWithSections,
  ProgressBar,
  ResumeLesson,
  ProgressAnalytics,
};
