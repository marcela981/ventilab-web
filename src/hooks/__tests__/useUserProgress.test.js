/**
 * =============================================================================
 * Tests for useUserProgress Hook
 * =============================================================================
 * Unit tests for user progress tracking in Module 3
 * =============================================================================
 */

import { renderHook, act } from '@testing-library/react-hooks';
import useUserProgress from '../useUserProgress';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};

  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// =============================================================================
// Setup and Teardown
// =============================================================================

beforeEach(() => {
  // Clear localStorage before each test
  localStorage.clear();
  jest.clearAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

// =============================================================================
// Test Suite: Hook Initialization
// =============================================================================

describe('useUserProgress - Initialization', () => {
  test('should initialize with default state when localStorage is empty', () => {
    const { result } = renderHook(() => useUserProgress());

    expect(result.current.progress.completedLessons).toEqual([]);
    expect(result.current.progress.categoryProgress).toBeDefined();
    expect(result.current.progress.categoryProgress.pathologyProtocols).toBeDefined();
    expect(result.current.progress.totalTimeSpent).toBe(0);
  });

  test('should load existing progress from localStorage', () => {
    const mockProgress = {
      completedLessons: ['module-03-configuration-sdra-protocol'],
      categoryProgress: {
        pathologyProtocols: {
          lessonsCompleted: ['sdra-protocol'],
          totalLessons: 4,
          percentComplete: 25,
          lastAccessed: '2025-01-01T00:00:00.000Z',
          checklistsCompleted: [],
          protocolsStudied: ['sdra-protocol'],
          troubleshootingExercisesDone: []
        }
      },
      criticalProtocolsStudied: {
        sdra: true,
        pneumonia: false,
        copd: false,
        asthma: false
      },
      totalTimeSpent: 30
    };

    localStorage.setItem('ventilab_user_progress', JSON.stringify(mockProgress));

    const { result } = renderHook(() => useUserProgress());

    expect(result.current.progress.completedLessons).toContain('module-03-configuration-sdra-protocol');
    expect(result.current.progress.totalTimeSpent).toBe(30);
    expect(result.current.progress.criticalProtocolsStudied.sdra).toBe(true);
  });

  test('should handle corrupted localStorage data gracefully', () => {
    localStorage.setItem('ventilab_user_progress', 'invalid json');

    const { result } = renderHook(() => useUserProgress());

    // Should fall back to initial state
    expect(result.current.progress.completedLessons).toEqual([]);
    expect(result.current.progress.totalTimeSpent).toBe(0);
  });
});

// =============================================================================
// Test Suite: markCategoryLessonComplete
// =============================================================================

describe('useUserProgress - markCategoryLessonComplete', () => {
  test('should mark a lesson as complete', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.markCategoryLessonComplete(
        'module-03-configuration',
        'pathologyProtocols',
        'sdra-protocol'
      );
    });

    expect(result.current.progress.completedLessons).toContain('module-03-configuration-sdra-protocol');
    expect(result.current.progress.categoryProgress.pathologyProtocols.lessonsCompleted).toContain('sdra-protocol');
  });

  test('should not duplicate lesson if marked complete twice', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.markCategoryLessonComplete(
        'module-03-configuration',
        'pathologyProtocols',
        'sdra-protocol'
      );
      result.current.markCategoryLessonComplete(
        'module-03-configuration',
        'pathologyProtocols',
        'sdra-protocol'
      );
    });

    const lessonCount = result.current.progress.completedLessons.filter(
      l => l === 'module-03-configuration-sdra-protocol'
    ).length;

    expect(lessonCount).toBe(1);
  });

  test('should update percentComplete correctly', () => {
    const { result } = renderHook(() => useUserProgress());

    // Pathology protocols has 4 lessons total
    act(() => {
      result.current.markCategoryLessonComplete(
        'module-03-configuration',
        'pathologyProtocols',
        'sdra-protocol'
      );
    });

    expect(result.current.progress.categoryProgress.pathologyProtocols.percentComplete).toBe(25);

    act(() => {
      result.current.markCategoryLessonComplete(
        'module-03-configuration',
        'pathologyProtocols',
        'copd-protocol'
      );
    });

    expect(result.current.progress.categoryProgress.pathologyProtocols.percentComplete).toBe(50);
  });

  test('should update lastAccessed timestamp', () => {
    const { result } = renderHook(() => useUserProgress());

    const beforeTimestamp = new Date().toISOString();

    act(() => {
      result.current.markCategoryLessonComplete(
        'module-03-configuration',
        'pathologyProtocols',
        'sdra-protocol'
      );
    });

    const afterTimestamp = new Date().toISOString();
    const lastAccessed = result.current.progress.categoryProgress.pathologyProtocols.lastAccessed;

    expect(lastAccessed).toBeDefined();
    expect(new Date(lastAccessed).getTime()).toBeGreaterThanOrEqual(new Date(beforeTimestamp).getTime());
    expect(new Date(lastAccessed).getTime()).toBeLessThanOrEqual(new Date(afterTimestamp).getTime());
  });

  test('should mark critical protocols as studied', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.markCategoryLessonComplete(
        'module-03-configuration',
        'pathologyProtocols',
        'sdra-protocol'
      );
    });

    expect(result.current.progress.criticalProtocolsStudied.sdra).toBe(true);

    act(() => {
      result.current.markCategoryLessonComplete(
        'module-03-configuration',
        'pathologyProtocols',
        'pneumonia-protocol'
      );
    });

    expect(result.current.progress.criticalProtocolsStudied.pneumonia).toBe(true);
  });

  test('should persist to localStorage after marking complete', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.markCategoryLessonComplete(
        'module-03-configuration',
        'pathologyProtocols',
        'sdra-protocol'
      );
    });

    const saved = JSON.parse(localStorage.getItem('ventilab_user_progress'));
    expect(saved.completedLessons).toContain('module-03-configuration-sdra-protocol');
  });
});

// =============================================================================
// Test Suite: markChecklistComplete
// =============================================================================

describe('useUserProgress - markChecklistComplete', () => {
  test('should mark a checklist as complete', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.markChecklistComplete('protocols', 'pre-extubation-checklist');
    });

    expect(result.current.progress.categoryProgress.protocols.checklistsCompleted)
      .toContain('pre-extubation-checklist');
  });

  test('should allow checklist to be completed multiple times', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.markChecklistComplete('protocols', 'pre-extubation-checklist');
      result.current.markChecklistComplete('protocols', 'pre-extubation-checklist');
      result.current.markChecklistComplete('protocols', 'pre-extubation-checklist');
    });

    const count = result.current.progress.categoryProgress.protocols.checklistsCompleted
      .filter(id => id === 'pre-extubation-checklist').length;

    expect(count).toBe(3);
  });

  test('should award mastery achievement after 3 completions', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.markChecklistComplete('protocols', 'pre-extubation-checklist');
      result.current.markChecklistComplete('protocols', 'pre-extubation-checklist');
    });

    expect(result.current.progress.achievements.preExtubationChecklistMastery).toBe(false);

    act(() => {
      result.current.markChecklistComplete('protocols', 'pre-extubation-checklist');
    });

    expect(result.current.progress.achievements.preExtubationChecklistMastery).toBe(true);
  });
});

// =============================================================================
// Test Suite: markProtocolStudied
// =============================================================================

describe('useUserProgress - markProtocolStudied', () => {
  test('should mark a protocol as studied', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.markProtocolStudied('pathologyProtocols', 'sdra-protocol');
    });

    expect(result.current.progress.categoryProgress.pathologyProtocols.protocolsStudied)
      .toContain('sdra-protocol');
  });

  test('should not duplicate protocol if studied twice', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.markProtocolStudied('pathologyProtocols', 'sdra-protocol');
      result.current.markProtocolStudied('pathologyProtocols', 'sdra-protocol');
    });

    const count = result.current.progress.categoryProgress.pathologyProtocols.protocolsStudied
      .filter(id => id === 'sdra-protocol').length;

    expect(count).toBe(1);
  });
});

// =============================================================================
// Test Suite: markTroubleshootingExerciseDone
// =============================================================================

describe('useUserProgress - markTroubleshootingExerciseDone', () => {
  test('should mark troubleshooting exercise as done', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.markTroubleshootingExerciseDone('troubleshooting', 'high-pressure-alarm');
    });

    expect(result.current.progress.categoryProgress.troubleshooting.troubleshootingExercisesDone)
      .toContain('high-pressure-alarm');
  });

  test('should not duplicate exercise if done twice', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.markTroubleshootingExerciseDone('troubleshooting', 'high-pressure-alarm');
      result.current.markTroubleshootingExerciseDone('troubleshooting', 'high-pressure-alarm');
    });

    const count = result.current.progress.categoryProgress.troubleshooting.troubleshootingExercisesDone
      .filter(id => id === 'high-pressure-alarm').length;

    expect(count).toBe(1);
  });
});

// =============================================================================
// Test Suite: getCategoryProgress
// =============================================================================

describe('useUserProgress - getCategoryProgress', () => {
  test('should return progress for valid category', () => {
    const { result } = renderHook(() => useUserProgress());

    const progress = result.current.getCategoryProgress('pathologyProtocols');

    expect(progress).toBeDefined();
    expect(progress.totalLessons).toBe(4);
    expect(progress.lessonsCompleted).toEqual([]);
    expect(progress.percentComplete).toBe(0);
  });

  test('should return null for invalid category', () => {
    const { result } = renderHook(() => useUserProgress());

    const progress = result.current.getCategoryProgress('invalidCategory');

    expect(progress).toBeNull();
  });

  test('should reflect updated progress after lesson completion', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.markCategoryLessonComplete(
        'module-03-configuration',
        'pathologyProtocols',
        'sdra-protocol'
      );
    });

    const progress = result.current.getCategoryProgress('pathologyProtocols');

    expect(progress.lessonsCompleted).toContain('sdra-protocol');
    expect(progress.percentComplete).toBe(25);
  });
});

// =============================================================================
// Test Suite: getModuleThreeProgress
// =============================================================================

describe('useUserProgress - getModuleThreeProgress', () => {
  test('should return overall module statistics', () => {
    const { result } = renderHook(() => useUserProgress());

    const stats = result.current.getModuleThreeProgress();

    expect(stats).toBeDefined();
    expect(stats.overallPercent).toBe(0);
    expect(stats.totalLessons).toBe(21); // 4+4+4+6+3
    expect(stats.completedLessons).toBe(0);
    expect(stats.totalCategories).toBe(5);
  });

  test('should calculate overall percent correctly', () => {
    const { result } = renderHook(() => useUserProgress());

    // Complete 1 lesson in pathologyProtocols (4 lessons) = 1/21 = ~4.76%
    act(() => {
      result.current.markCategoryLessonComplete(
        'module-03-configuration',
        'pathologyProtocols',
        'sdra-protocol'
      );
    });

    const stats = result.current.getModuleThreeProgress();

    expect(stats.overallPercent).toBeCloseTo(4.76, 1);
    expect(stats.completedLessons).toBe(1);
  });

  test('should count complete categories', () => {
    const { result } = renderHook(() => useUserProgress());

    // Complete all 4 lessons in pathologyProtocols
    act(() => {
      result.current.markCategoryLessonComplete(
        'module-03-configuration',
        'pathologyProtocols',
        'sdra-protocol'
      );
      result.current.markCategoryLessonComplete(
        'module-03-configuration',
        'pathologyProtocols',
        'copd-protocol'
      );
      result.current.markCategoryLessonComplete(
        'module-03-configuration',
        'pathologyProtocols',
        'asthma-protocol'
      );
      result.current.markCategoryLessonComplete(
        'module-03-configuration',
        'pathologyProtocols',
        'pneumonia-protocol'
      );
    });

    const stats = result.current.getModuleThreeProgress();

    expect(stats.categoriesComplete).toBe(1);
  });

  test('should track critical protocols', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.markCategoryLessonComplete(
        'module-03-configuration',
        'pathologyProtocols',
        'sdra-protocol'
      );
      result.current.markCategoryLessonComplete(
        'module-03-configuration',
        'pathologyProtocols',
        'pneumonia-protocol'
      );
    });

    const stats = result.current.getModuleThreeProgress();

    expect(stats.criticalProtocolsCount).toBe(2);
    expect(stats.allCriticalProtocolsStudied).toBe(false);
  });

  test('should detect all critical protocols studied', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.markCategoryLessonComplete(
        'module-03-configuration',
        'pathologyProtocols',
        'sdra-protocol'
      );
      result.current.markCategoryLessonComplete(
        'module-03-configuration',
        'pathologyProtocols',
        'pneumonia-protocol'
      );
      result.current.markCategoryLessonComplete(
        'module-03-configuration',
        'pathologyProtocols',
        'copd-protocol'
      );
      result.current.markCategoryLessonComplete(
        'module-03-configuration',
        'pathologyProtocols',
        'asthma-protocol'
      );
    });

    const stats = result.current.getModuleThreeProgress();

    expect(stats.allCriticalProtocolsStudied).toBe(true);
  });
});

// =============================================================================
// Test Suite: getReadinessStatus
// =============================================================================

describe('useUserProgress - getReadinessStatus', () => {
  test('should return readiness criteria', () => {
    const { result } = renderHook(() => useUserProgress());

    const status = result.current.getReadinessStatus();

    expect(status).toBeDefined();
    expect(status.isReady).toBe(false);
    expect(status.criteria).toHaveLength(4);
    expect(status.metCount).toBe(0);
    expect(status.totalCriteria).toBe(4);
  });

  test('should detect when ready for evaluation', () => {
    const { result } = renderHook(() => useUserProgress());

    // Satisfy 3 out of 4 criteria (minimum for readiness)
    act(() => {
      // Criterio 1: 80% de pathology protocols (4 * 0.8 = 3.2, necesita 4 para 100%)
      result.current.markCategoryLessonComplete('module-03-configuration', 'pathologyProtocols', 'sdra-protocol');
      result.current.markCategoryLessonComplete('module-03-configuration', 'pathologyProtocols', 'copd-protocol');
      result.current.markCategoryLessonComplete('module-03-configuration', 'pathologyProtocols', 'asthma-protocol');
      result.current.markCategoryLessonComplete('module-03-configuration', 'pathologyProtocols', 'pneumonia-protocol');

      // Criterio 2: Todos los críticos
      // Ya cubierto con lo anterior

      // Criterio 3: Protective strategies 100%
      result.current.markCategoryLessonComplete('module-03-configuration', 'protectiveStrategies', 'low-tidal-volume');
      result.current.markCategoryLessonComplete('module-03-configuration', 'protectiveStrategies', 'permissive-hypercapnia');
      result.current.markCategoryLessonComplete('module-03-configuration', 'protectiveStrategies', 'peep-strategies');
      result.current.markCategoryLessonComplete('module-03-configuration', 'protectiveStrategies', 'lung-protective-ventilation');
    });

    const status = result.current.getReadinessStatus();

    expect(status.metCount).toBeGreaterThanOrEqual(3);
    expect(status.isReady).toBe(true);
  });

  test('should show progress for each criterion', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.markCategoryLessonComplete('module-03-configuration', 'pathologyProtocols', 'sdra-protocol');
    });

    const status = result.current.getReadinessStatus();
    const pathologyCriterion = status.criteria.find(c => c.id === 'pathology-protocols');

    expect(pathologyCriterion.progress).toBe(25); // 1 out of 4
    expect(pathologyCriterion.met).toBe(false);
  });
});

// =============================================================================
// Test Suite: updateTimeSpent
// =============================================================================

describe('useUserProgress - updateTimeSpent', () => {
  test('should update total time spent', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.updateTimeSpent(30);
    });

    expect(result.current.progress.totalTimeSpent).toBe(30);

    act(() => {
      result.current.updateTimeSpent(15);
    });

    expect(result.current.progress.totalTimeSpent).toBe(45);
  });

  test('should persist time spent to localStorage', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.updateTimeSpent(60);
    });

    const saved = JSON.parse(localStorage.getItem('ventilab_user_progress'));
    expect(saved.totalTimeSpent).toBe(60);
  });
});

// =============================================================================
// Test Suite: initializeModuleThree
// =============================================================================

describe('useUserProgress - initializeModuleThree', () => {
  test('should set start date when initialized', () => {
    const { result } = renderHook(() => useUserProgress());

    expect(result.current.progress.moduleThreeStartDate).toBeNull();

    act(() => {
      result.current.initializeModuleThree();
    });

    expect(result.current.progress.moduleThreeStartDate).toBeDefined();
    expect(typeof result.current.progress.moduleThreeStartDate).toBe('string');
  });

  test('should not overwrite existing start date', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.initializeModuleThree();
    });

    const firstDate = result.current.progress.moduleThreeStartDate;

    act(() => {
      result.current.initializeModuleThree();
    });

    const secondDate = result.current.progress.moduleThreeStartDate;

    expect(firstDate).toBe(secondDate);
  });
});

// =============================================================================
// Test Suite: resetProgress
// =============================================================================

describe('useUserProgress - resetProgress', () => {
  test('should reset all progress to initial state', () => {
    const { result } = renderHook(() => useUserProgress());

    // Add some progress
    act(() => {
      result.current.markCategoryLessonComplete('module-03-configuration', 'pathologyProtocols', 'sdra-protocol');
      result.current.updateTimeSpent(60);
    });

    expect(result.current.progress.completedLessons.length).toBe(1);
    expect(result.current.progress.totalTimeSpent).toBe(60);

    // Reset
    act(() => {
      result.current.resetProgress();
    });

    expect(result.current.progress.completedLessons).toEqual([]);
    expect(result.current.progress.totalTimeSpent).toBe(0);
  });

  test('should clear localStorage', () => {
    const { result } = renderHook(() => useUserProgress());

    act(() => {
      result.current.markCategoryLessonComplete('module-03-configuration', 'pathologyProtocols', 'sdra-protocol');
    });

    expect(localStorage.getItem('ventilab_user_progress')).toBeTruthy();

    act(() => {
      result.current.resetProgress();
    });

    expect(localStorage.getItem('ventilab_user_progress')).toBeNull();
  });
});

// =============================================================================
// Integration Tests: Real-World Scenarios
// =============================================================================

describe('Integration: Real-world scenarios', () => {
  test('Scenario 1: Student completes entire pathology protocols category', () => {
    const { result } = renderHook(() => useUserProgress());

    // Complete all 4 pathology protocol lessons
    act(() => {
      result.current.markCategoryLessonComplete('module-03-configuration', 'pathologyProtocols', 'sdra-protocol');
      result.current.markCategoryLessonComplete('module-03-configuration', 'pathologyProtocols', 'copd-protocol');
      result.current.markCategoryLessonComplete('module-03-configuration', 'pathologyProtocols', 'asthma-protocol');
      result.current.markCategoryLessonComplete('module-03-configuration', 'pathologyProtocols', 'pneumonia-protocol');
    });

    const categoryProgress = result.current.getCategoryProgress('pathologyProtocols');
    const moduleStats = result.current.getModuleThreeProgress();

    // Category should be 100% complete
    expect(categoryProgress.percentComplete).toBe(100);

    // All critical protocols should be studied
    expect(moduleStats.allCriticalProtocolsStudied).toBe(true);

    // Achievement should be awarded
    expect(result.current.progress.achievements.allPathologyProtocolsComplete).toBe(true);
  });

  test('Scenario 2: Student works toward evaluation readiness', () => {
    const { result } = renderHook(() => useUserProgress());

    // Initially not ready
    let readiness = result.current.getReadinessStatus();
    expect(readiness.isReady).toBe(false);

    // Complete pathology protocols (100%)
    act(() => {
      result.current.markCategoryLessonComplete('module-03-configuration', 'pathologyProtocols', 'sdra-protocol');
      result.current.markCategoryLessonComplete('module-03-configuration', 'pathologyProtocols', 'copd-protocol');
      result.current.markCategoryLessonComplete('module-03-configuration', 'pathologyProtocols', 'asthma-protocol');
      result.current.markCategoryLessonComplete('module-03-configuration', 'pathologyProtocols', 'pneumonia-protocol');
    });

    readiness = result.current.getReadinessStatus();
    // Should meet criteria 1 and 2 (80% pathology, all critical)
    expect(readiness.metCount).toBeGreaterThanOrEqual(2);

    // Complete protective strategies
    act(() => {
      result.current.markCategoryLessonComplete('module-03-configuration', 'protectiveStrategies', 'low-tidal-volume');
      result.current.markCategoryLessonComplete('module-03-configuration', 'protectiveStrategies', 'permissive-hypercapnia');
      result.current.markCategoryLessonComplete('module-03-configuration', 'protectiveStrategies', 'peep-strategies');
      result.current.markCategoryLessonComplete('module-03-configuration', 'protectiveStrategies', 'lung-protective-ventilation');
    });

    readiness = result.current.getReadinessStatus();
    // Should now meet 3 criteria and be ready
    expect(readiness.metCount).toBeGreaterThanOrEqual(3);
    expect(readiness.isReady).toBe(true);
  });

  test('Scenario 3: Student masters pre-extubation checklist', () => {
    const { result } = renderHook(() => useUserProgress());

    // Complete checklist 3 times
    act(() => {
      result.current.markChecklistComplete('protocols', 'pre-extubation-checklist');
      result.current.markChecklistComplete('protocols', 'pre-extubation-checklist');
      result.current.markChecklistComplete('protocols', 'pre-extubation-checklist');
    });

    // Should earn mastery achievement
    expect(result.current.progress.achievements.preExtubationChecklistMastery).toBe(true);

    const stats = result.current.getModuleThreeProgress();
    expect(stats.achievements.preExtubationChecklistMastery).toBe(true);
  });

  test('Scenario 4: Progress persists across hook instances', () => {
    // First instance: add progress
    const { result: result1, unmount } = renderHook(() => useUserProgress());

    act(() => {
      result1.current.markCategoryLessonComplete('module-03-configuration', 'pathologyProtocols', 'sdra-protocol');
      result1.current.updateTimeSpent(30);
    });

    // Unmount first instance
    unmount();

    // Second instance: should load saved progress
    const { result: result2 } = renderHook(() => useUserProgress());

    expect(result2.current.progress.completedLessons).toContain('module-03-configuration-sdra-protocol');
    expect(result2.current.progress.totalTimeSpent).toBe(30);
  });
});
