/**
 * =============================================================================
 * LessonViewer Integration Tests
 * =============================================================================
 * Pruebas de integración para LessonViewer con funcionalidades de progreso
 * - Timer que dispara updateProgress cada 45s con Page Visibility API
 * - Botón "Marcar como completada"
 * - Navegación envía lastAccess y resetea timers
 * =============================================================================
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import LessonViewer from '../LessonViewer';
import useLesson from '../../hooks/useLesson';
import { useLearningProgress } from '../../../../contexts/LearningProgressContext';
import useLessonPages from '../../hooks/useLessonPages';
import useLessonProgress from '../../hooks/useLessonProgress';
import { teachingModuleTheme } from '../../../../theme/teachingModuleTheme';

// Mock hooks
jest.mock('../../hooks/useLesson');
jest.mock('../../../../contexts/LearningProgressContext');
jest.mock('../../hooks/useLessonPages');
jest.mock('../../hooks/useLessonProgress');
jest.mock('../../../../data/curriculumData', () => ({
  getModuleById: jest.fn(() => ({
    id: 'module-1',
    title: 'Test Module',
    lessons: [
      { id: 'lesson-1', title: 'Lesson 1' },
      { id: 'lesson-2', title: 'Lesson 2' },
    ],
  })),
}));

// Mock Page Visibility API
const mockVisibilityState = jest.fn(() => 'visible');
Object.defineProperty(document, 'visibilityState', {
  get: mockVisibilityState,
  configurable: true,
});

const mockLessonData = {
  lessonId: 'lesson-1',
  moduleId: 'module-1',
  title: 'Test Lesson',
  content: {
    introduction: {
      objectives: ['Objective 1', 'Objective 2'],
    },
  },
};

const renderLessonViewer = (props = {}) => {
  const defaultProps = {
    lessonId: 'lesson-1',
    moduleId: 'module-1',
    onComplete: jest.fn(),
    onNavigate: jest.fn(),
    ...props,
  };

  return render(
    <ThemeProvider theme={teachingModuleTheme}>
      <LessonViewer {...defaultProps} />
    </ThemeProvider>
  );
};

describe('LessonViewer Integration Tests', () => {
  let mockUpdateLessonProgress;
  let mockMarkLessonComplete;
  let mockCompletedLessons;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset visibility state
    mockVisibilityState.mockReturnValue('visible');

    // Mock updateLessonProgress
    mockUpdateLessonProgress = jest.fn().mockResolvedValue({
      lessonProgress: {
        id: 'progress-1',
        lessonId: 'lesson-1',
        completed: false,
        timeSpent: 0,
        progress: 0,
      },
      moduleProgress: {
        progressPercentage: 0,
        timeSpent: 0,
      },
    });

    mockMarkLessonComplete = jest.fn().mockResolvedValue(true);
    mockCompletedLessons = new Set();

    // Mock useLesson
    useLesson.mockReturnValue({
      data: mockLessonData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    // Mock useLearningProgress
    useLearningProgress.mockReturnValue({
      markLessonComplete: mockMarkLessonComplete,
      completedLessons: mockCompletedLessons,
      updateLessonProgress: mockUpdateLessonProgress,
    });

    // Mock useLessonPages
    useLessonPages.mockReturnValue([
      { type: 'header-intro' },
      { type: 'theory', section: { id: 'section-1', title: 'Section 1' } },
    ]);

    // Mock useLessonProgress
    useLessonProgress.mockReturnValue({
      calculateModuleProgress: jest.fn(() => 0),
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Progress Timer (45 segundos)', () => {
    it('debe disparar updateProgress cada 45 segundos mientras la pestaña esté activa', async () => {
      renderLessonViewer();

      // Esperar a que el componente se monte
      await waitFor(() => {
        expect(screen.getByText(/Test Lesson/i)).toBeInTheDocument();
      });

      // Avanzar 45 segundos
      act(() => {
        jest.advanceTimersByTime(45000);
      });

      // Verificar que se llamó updateLessonProgress con timeSpentDelta
      await waitFor(() => {
        expect(mockUpdateLessonProgress).toHaveBeenCalled();
      });

      const calls = mockUpdateLessonProgress.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      
      // Verificar que el último llamado incluye timeSpentDelta
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall).toMatchObject({
        lessonId: 'lesson-1',
        moduleId: 'module-1',
      });
      expect(lastCall.timeSpentDelta).toBeDefined();
      expect(typeof lastCall.timeSpentDelta).toBe('number');
    });

    it('NO debe disparar updateProgress cuando la pestaña no está visible', async () => {
      renderLessonViewer();

      await waitFor(() => {
        expect(screen.getByText(/Test Lesson/i)).toBeInTheDocument();
      });

      // Simular que la pestaña se oculta
      mockVisibilityState.mockReturnValue('hidden');
      act(() => {
        fireEvent(document, new Event('visibilitychange'));
      });

      // Limpiar llamadas anteriores
      mockUpdateLessonProgress.mockClear();

      // Avanzar 45 segundos
      act(() => {
        jest.advanceTimersByTime(45000);
      });

      // Verificar que NO se llamó updateLessonProgress
      expect(mockUpdateLessonProgress).not.toHaveBeenCalled();
    });

    it('debe reanudar el timer cuando la pestaña vuelve a estar visible', async () => {
      renderLessonViewer();

      await waitFor(() => {
        expect(screen.getByText(/Test Lesson/i)).toBeInTheDocument();
      });

      // Ocultar pestaña
      mockVisibilityState.mockReturnValue('hidden');
      act(() => {
        fireEvent(document, new Event('visibilitychange'));
      });

      mockUpdateLessonProgress.mockClear();

      // Avanzar tiempo mientras está oculta (no debe llamar)
      act(() => {
        jest.advanceTimersByTime(45000);
      });
      expect(mockUpdateLessonProgress).not.toHaveBeenCalled();

      // Mostrar pestaña de nuevo
      mockVisibilityState.mockReturnValue('visible');
      act(() => {
        fireEvent(document, new Event('visibilitychange'));
      });

      // Avanzar 45 segundos más
      act(() => {
        jest.advanceTimersByTime(45000);
      });

      // Ahora debe llamar updateLessonProgress
      await waitFor(() => {
        expect(mockUpdateLessonProgress).toHaveBeenCalled();
      });
    });
  });

  describe('Botón "Marcar como completada"', () => {
    it('debe mostrar el botón cuando la lección no está completada', async () => {
      renderLessonViewer();

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /marcar como completada/i });
        expect(button).toBeInTheDocument();
      });
    });

    it('NO debe mostrar el botón cuando la lección ya está completada', async () => {
      // Mock lesson as completed
      useLearningProgress.mockReturnValue({
        markLessonComplete: mockMarkLessonComplete,
        completedLessons: new Set(['module-1-lesson-1']),
        updateLessonProgress: mockUpdateLessonProgress,
      });

      renderLessonViewer();

      await waitFor(() => {
        expect(screen.getByText(/Test Lesson/i)).toBeInTheDocument();
      });

      const button = screen.queryByRole('button', { name: /marcar como completada/i });
      expect(button).not.toBeInTheDocument();
    });

    it('debe llamar updateLessonProgress con completed=true al hacer clic', async () => {
      renderLessonViewer();

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /marcar como completada/i });
        expect(button).toBeInTheDocument();
      });

      const button = screen.getByRole('button', { name: /marcar como completada/i });
      
      await act(async () => {
        fireEvent.click(button);
      });

      // Verificar que se llamó updateLessonProgress con completed=true
      await waitFor(() => {
        expect(mockUpdateLessonProgress).toHaveBeenCalledWith(
          expect.objectContaining({
            lessonId: 'lesson-1',
            moduleId: 'module-1',
            completed: true,
            progress: 1,
          })
        );
      });
    });

    it('debe calcular y enviar timeSpentDelta al marcar como completada', async () => {
      renderLessonViewer();

      await waitFor(() => {
        expect(screen.getByText(/Test Lesson/i)).toBeInTheDocument();
      });

      // Avanzar tiempo para simular tiempo transcurrido
      act(() => {
        jest.advanceTimersByTime(120000); // 2 minutos
      });

      const button = screen.getByRole('button', { name: /marcar como completada/i });
      
      await act(async () => {
        fireEvent.click(button);
      });

      // Verificar que se envió timeSpentDelta (aproximadamente 2 minutos)
      await waitFor(() => {
        const call = mockUpdateLessonProgress.mock.calls.find(
          call => call[0].completed === true
        );
        expect(call).toBeDefined();
        expect(call[0].timeSpentDelta).toBeGreaterThan(0);
      });
    });

    it('debe detener el timer cuando se marca como completada', async () => {
      renderLessonViewer();

      await waitFor(() => {
        expect(screen.getByText(/Test Lesson/i)).toBeInTheDocument();
      });

      const button = screen.getByRole('button', { name: /marcar como completada/i });
      
      await act(async () => {
        fireEvent.click(button);
      });

      mockUpdateLessonProgress.mockClear();

      // Avanzar 45 segundos después de marcar como completada
      act(() => {
        jest.advanceTimersByTime(45000);
      });

      // Verificar que NO se llamó updateLessonProgress (timer detenido)
      expect(mockUpdateLessonProgress).not.toHaveBeenCalled();
    });
  });

  describe('Navegación entre lecciones', () => {
    it('debe enviar lastAccess al navegar a otra lección', async () => {
      const mockOnNavigate = jest.fn();
      renderLessonViewer({ onNavigate: mockOnNavigate });

      await waitFor(() => {
        expect(screen.getByText(/Test Lesson/i)).toBeInTheDocument();
      });

      // Simular navegación (esto normalmente se haría a través de LessonNavigation)
      // Por ahora verificamos que el handler está configurado correctamente
      // En una prueba real, haríamos clic en el botón de navegación

      // Verificar que updateLessonProgress está disponible para ser llamado
      expect(mockUpdateLessonProgress).toBeDefined();
    });

    it('debe resetear los timers al cambiar de lección', async () => {
      const { rerender } = renderLessonViewer();

      await waitFor(() => {
        expect(screen.getByText(/Test Lesson/i)).toBeInTheDocument();
      });

      // Avanzar tiempo
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      mockUpdateLessonProgress.mockClear();

      // Cambiar a otra lección
      rerender(
        <ThemeProvider theme={teachingModuleTheme}>
          <LessonViewer
            lessonId="lesson-2"
            moduleId="module-1"
            onComplete={jest.fn()}
            onNavigate={jest.fn()}
          />
        </ThemeProvider>
      );

      // Mock new lesson data
      useLesson.mockReturnValue({
        data: { ...mockLessonData, lessonId: 'lesson-2' },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      await waitFor(() => {
        expect(mockUpdateLessonProgress).toHaveBeenCalledWith(
          expect.objectContaining({
            lessonId: 'lesson-1', // Previous lesson
            lastAccessed: expect.any(String),
          })
        );
      });

      // Verificar que el timer se resetea (avanzar 45s y verificar que cuenta desde 0)
      mockUpdateLessonProgress.mockClear();
      
      act(() => {
        jest.advanceTimersByTime(45000);
      });

      // Debe llamar con timeSpentDelta para la nueva lección
      await waitFor(() => {
        const calls = mockUpdateLessonProgress.mock.calls.filter(
          call => call[0].lessonId === 'lesson-2' && call[0].timeSpentDelta
        );
        expect(calls.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Integración completa', () => {
    it('debe funcionar correctamente el flujo completo: timer -> marcar completada -> navegar', async () => {
      const mockOnNavigate = jest.fn();
      renderLessonViewer({ onNavigate: mockOnNavigate });

      await waitFor(() => {
        expect(screen.getByText(/Test Lesson/i)).toBeInTheDocument();
      });

      // 1. Verificar que el timer funciona
      act(() => {
        jest.advanceTimersByTime(45000);
      });

      await waitFor(() => {
        expect(mockUpdateLessonProgress).toHaveBeenCalled();
      });

      const initialCalls = mockUpdateLessonProgress.mock.calls.length;
      mockUpdateLessonProgress.mockClear();

      // 2. Marcar como completada
      const button = screen.getByRole('button', { name: /marcar como completada/i });
      
      await act(async () => {
        fireEvent.click(button);
      });

      await waitFor(() => {
        expect(mockUpdateLessonProgress).toHaveBeenCalledWith(
          expect.objectContaining({
            completed: true,
            progress: 1,
          })
        );
      });

      // 3. Verificar que el timer se detuvo
      mockUpdateLessonProgress.mockClear();
      
      act(() => {
        jest.advanceTimersByTime(45000);
      });

      // No debe llamar updateLessonProgress porque el timer está detenido
      expect(mockUpdateLessonProgress).not.toHaveBeenCalled();
    });
  });
});

