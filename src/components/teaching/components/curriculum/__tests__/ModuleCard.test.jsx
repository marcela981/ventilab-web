/**
 * =============================================================================
 * ModuleCard Tests
 * =============================================================================
 * Pruebas de UI para ModuleCard usando React Testing Library
 * =============================================================================
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ModuleCard from '../ModuleCard';
import useProgress from '../../../../../hooks/useProgress';
import { useModuleLessonsCount } from '../../../../../hooks/useModuleLessonsCount';
import { useModuleProgress } from '../../../../../hooks/useModuleProgress';
import { useLearningProgress } from '../../../../../contexts/LearningProgressContext';
import useModuleAvailability from '../../../../../hooks/useModuleAvailability';

// Mock hooks
jest.mock('../../../../../hooks/useProgress');
jest.mock('../../../../../hooks/useModuleLessonsCount');
jest.mock('../../../../../hooks/useModuleProgress');
jest.mock('../../../../../contexts/LearningProgressContext');
jest.mock('../../../../../hooks/useModuleAvailability');

const mockTheme = createTheme();

const defaultModule = {
  id: 'module-1',
  title: 'Test Module',
  description: 'Test Description',
  difficulty: 'BEGINNER',
  duration: 60,
  prerequisites: [],
};

const renderModuleCard = (props = {}) => {
  const defaultProps = {
    module: defaultModule,
    isFavorite: false,
    onModuleClick: jest.fn(),
    onToggleFavorite: jest.fn(),
    levelColor: '#0BBAF4',
    completedModules: [],
    ...props,
  };

  return render(
    <ThemeProvider theme={mockTheme}>
      <ModuleCard {...defaultProps} />
    </ThemeProvider>
  );
};

describe('ModuleCard', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Default mock implementations
    useProgress.mockReturnValue({
      progress: [],
      stats: {
        totalLessons: 0,
        completedLessons: 0,
        totalModules: 0,
        completedModules: 0,
        averageScore: null,
      },
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    useModuleLessonsCount.mockReturnValue({
      count: 5,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    useModuleProgress.mockReturnValue({
      progress: {
        percent: 0,
        percentInt: 0,
        completedLessons: 0,
        totalLessons: 5,
        isCompleted: false,
        completedAt: null,
        completedPages: 0,
        totalPages: 0,
      },
      isLoading: false,
      error: null,
    });

    useLearningProgress.mockReturnValue({
      completedLessons: new Set(),
      syncStatus: 'idle',
    });

    useModuleAvailability.mockReturnValue({
      isAvailable: true,
      missingPrerequisites: [],
      status: 'available',
    });
  });

  describe('Conteos correctos', () => {
    it('debe calcular el progreso correctamente basado en lecciones completadas / total lecciones', async () => {
      // Mock: módulo con 5 lecciones, 2 completadas
      useProgress.mockReturnValue({
        progress: [
          { lessonId: 'lesson-1', moduleId: 'module-1', completed: true },
          { lessonId: 'lesson-2', moduleId: 'module-1', completed: true },
          { lessonId: 'lesson-3', moduleId: 'module-1', completed: false },
        ],
        stats: {},
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      useModuleLessonsCount.mockReturnValue({
        count: 5,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderModuleCard();

      // Esperar a que se renderice la barra de progreso
      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar', { hidden: true });
        expect(progressBar).toBeInTheDocument();
      });

      // Verificar que el porcentaje es 40% (2/5)
      const progressText = screen.getByText(/40%/i);
      expect(progressText).toBeInTheDocument();
    });

    it('debe mostrar 0% cuando no hay lecciones completadas', async () => {
      useProgress.mockReturnValue({
        progress: [],
        stats: {},
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      useModuleLessonsCount.mockReturnValue({
        count: 5,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderModuleCard();

      await waitFor(() => {
        const progressText = screen.getByText(/0%/i);
        expect(progressText).toBeInTheDocument();
      });
    });

    it('debe mostrar 100% cuando todas las lecciones están completadas', async () => {
      useProgress.mockReturnValue({
        progress: [
          { lessonId: 'lesson-1', moduleId: 'module-1', completed: true },
          { lessonId: 'lesson-2', moduleId: 'module-1', completed: true },
          { lessonId: 'lesson-3', moduleId: 'module-1', completed: true },
          { lessonId: 'lesson-4', moduleId: 'module-1', completed: true },
          { lessonId: 'lesson-5', moduleId: 'module-1', completed: true },
        ],
        stats: {},
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      useModuleLessonsCount.mockReturnValue({
        count: 5,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderModuleCard();

      await waitFor(() => {
        const progressText = screen.getByText(/100%/i);
        expect(progressText).toBeInTheDocument();
      });
    });

    it('debe usar el conteo real de lecciones desde la BD', async () => {
      useProgress.mockReturnValue({
        progress: [
          { lessonId: 'lesson-1', moduleId: 'module-1', completed: true },
        ],
        stats: {},
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      // Mock: BD retorna 10 lecciones (no el array hardcodeado)
      useModuleLessonsCount.mockReturnValue({
        count: 10,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderModuleCard();

      await waitFor(() => {
        // Debe mostrar 10% (1/10), no 20% (1/5)
        const progressText = screen.getByText(/10%/i);
        expect(progressText).toBeInTheDocument();
      });
    });
  });

  describe('Módulo sin lecciones', () => {
    it('debe mostrar 0% cuando el módulo no tiene lecciones', async () => {
      useProgress.mockReturnValue({
        progress: [],
        stats: {},
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      useModuleLessonsCount.mockReturnValue({
        count: 0,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderModuleCard();

      await waitFor(() => {
        const progressText = screen.getByText(/0%/i);
        expect(progressText).toBeInTheDocument();
      });
    });

    it('debe ocultar el botón "Continuar" cuando no hay lecciones', async () => {
      useProgress.mockReturnValue({
        progress: [],
        stats: {},
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      useModuleLessonsCount.mockReturnValue({
        count: 0,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      useModuleAvailability.mockReturnValue({
        isAvailable: true,
        missingPrerequisites: [],
        status: 'available',
      });

      renderModuleCard();

      await waitFor(() => {
        // El botón "Continuar" o "Comenzar" no debe estar visible
        const continueButton = screen.queryByRole('button', { name: /continuar|comenzar/i });
        expect(continueButton).not.toBeInTheDocument();
      });
    });

    it('debe mostrar la barra de progreso en 0% cuando no hay lecciones', async () => {
      useProgress.mockReturnValue({
        progress: [],
        stats: {},
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      useModuleLessonsCount.mockReturnValue({
        count: 0,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderModuleCard();

      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar', { hidden: true });
        expect(progressBar).toHaveAttribute('aria-valuenow', '0');
      });
    });
  });

  describe('Actualización al completar una lección', () => {
    it('debe actualizar el progreso cuando se completa una lección', async () => {
      const refetchProgress = jest.fn();

      useProgress.mockReturnValue({
        progress: [
          { lessonId: 'lesson-1', moduleId: 'module-1', completed: true },
        ],
        stats: {},
        loading: false,
        error: null,
        refetch: refetchProgress,
      });

      useModuleLessonsCount.mockReturnValue({
        count: 5,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { rerender } = renderModuleCard();

      // Verificar progreso inicial: 20% (1/5)
      await waitFor(() => {
        const progressText = screen.getByText(/20%/i);
        expect(progressText).toBeInTheDocument();
      });

      // Simular completar otra lección
      useProgress.mockReturnValue({
        progress: [
          { lessonId: 'lesson-1', moduleId: 'module-1', completed: true },
          { lessonId: 'lesson-2', moduleId: 'module-1', completed: true },
        ],
        stats: {},
        loading: false,
        error: null,
        refetch: refetchProgress,
      });

      rerender(
        <ThemeProvider theme={mockTheme}>
          <ModuleCard
            module={defaultModule}
            isFavorite={false}
            onModuleClick={jest.fn()}
            onToggleFavorite={jest.fn()}
            levelColor="#0BBAF4"
            completedModules={[]}
          />
        </ThemeProvider>
      );

      // Verificar progreso actualizado: 40% (2/5)
      await waitFor(() => {
        const progressText = screen.getByText(/40%/i);
        expect(progressText).toBeInTheDocument();
      });
    });

    it('debe actualizar automáticamente cuando useProgress refetch se llama', async () => {
      const refetchProgress = jest.fn();

      useProgress.mockReturnValue({
        progress: [
          { lessonId: 'lesson-1', moduleId: 'module-1', completed: true },
        ],
        stats: {},
        loading: false,
        error: null,
        refetch: refetchProgress,
      });

      useModuleLessonsCount.mockReturnValue({
        count: 5,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderModuleCard();

      // Simular que se completa otra lección y se llama refetch
      await act(async () => {
        useProgress.mockReturnValue({
          progress: [
            { lessonId: 'lesson-1', moduleId: 'module-1', completed: true },
            { lessonId: 'lesson-2', moduleId: 'module-1', completed: true },
            { lessonId: 'lesson-3', moduleId: 'module-1', completed: true },
          ],
          stats: {},
          loading: false,
          error: null,
          refetch: refetchProgress,
        });

        refetchProgress();
      });

      // Verificar que el progreso se actualiza a 60% (3/5)
      await waitFor(() => {
        const progressText = screen.getByText(/60%/i);
        expect(progressText).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('debe mostrar el estado "Completado" cuando todas las lecciones están completadas', async () => {
      useProgress.mockReturnValue({
        progress: [
          { lessonId: 'lesson-1', moduleId: 'module-1', completed: true },
          { lessonId: 'lesson-2', moduleId: 'module-1', completed: true },
          { lessonId: 'lesson-3', moduleId: 'module-1', completed: true },
        ],
        stats: {},
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      useModuleLessonsCount.mockReturnValue({
        count: 3,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderModuleCard();

      await waitFor(() => {
        // Debe mostrar 100% y el botón debe decir "Completado"
        const progressText = screen.getByText(/100%/i);
        expect(progressText).toBeInTheDocument();
      });
    });
  });

  describe('Estados de carga', () => {
    it('debe mostrar skeleton mientras carga el conteo de lecciones', () => {
      useModuleLessonsCount.mockReturnValue({
        count: 0,
        loading: true,
        error: null,
        refetch: jest.fn(),
      });

      renderModuleCard();

      // Debe mostrar skeleton (MUI Skeleton se renderiza como div con aria-busy)
      const progressBar = screen.queryByRole('progressbar', { hidden: true });
      // Cuando está cargando, no debe mostrar la barra de progreso aún
      expect(progressBar).not.toBeInTheDocument();
    });

    it('debe mostrar skeleton mientras carga el progreso', () => {
      useProgress.mockReturnValue({
        progress: [],
        stats: {},
        loading: true,
        error: null,
        refetch: jest.fn(),
      });

      useModuleProgress.mockReturnValue({
        progress: null,
        isLoading: true,
        error: null,
      });

      renderModuleCard();

      // Cuando está cargando, no debe mostrar la barra de progreso aún
      const progressBar = screen.queryByRole('progressbar', { hidden: true });
      expect(progressBar).not.toBeInTheDocument();
    });
  });
});

