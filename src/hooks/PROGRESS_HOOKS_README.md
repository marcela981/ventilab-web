# Progress Tracking Hooks

Complete React hooks for automatic progress tracking in lessons and modules.

## Overview

This package provides two main hooks:

1. **`useLessonProgress`** - Automatic progress tracking within a lesson
2. **`useModuleProgress`** - Module progress fetching with SWR

## Installation

These hooks are already integrated into the project. Import them like this:

```typescript
import useLessonProgress from '@/hooks/useLessonProgress';
import useModuleProgress from '@/hooks/useModuleProgress';
```

## useLessonProgress

Manages automatic progress tracking for a lesson including scroll tracking, auto-save, resume functionality, and auto-completion.

### Basic Usage

```tsx
import { useRef } from 'react';
import useLessonProgress from '@/hooks/useLessonProgress';

function LessonViewer({ lessonId, moduleId }) {
  const contentRef = useRef<HTMLDivElement>(null);

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
      console.log('Lesson completed! 🎉');
    },
  });

  return (
    <div>
      {showResumeAlert && (
        <div className="alert">
          Continuando desde {localProgress}%
          <button onClick={dismissResumeAlert}>OK</button>
        </div>
      )}

      <div className="progress-bar">
        <div style={{ width: `${localProgress}%` }}>
          {localProgress}%
        </div>
      </div>

      <div ref={contentRef} className="lesson-content">
        {/* Your lesson content here */}
      </div>
    </div>
  );
}
```

### Parameters

```typescript
interface UseLessonProgressOptions {
  lessonId: string;                    // Unique lesson ID
  moduleId: string;                    // Parent module ID
  contentRef: RefObject<HTMLElement>;  // Ref to scrollable content
  onComplete?: () => void;             // Callback when auto-complete triggers
  autoSaveThreshold?: number;          // Progress % increase to trigger save (default: 10)
  autoCompleteThreshold?: number;      // Progress % to trigger auto-complete (default: 90)
}
```

### Return Value

```typescript
interface UseLessonProgressReturn {
  localProgress: number;              // Current progress (0-100)
  isSaving: boolean;                  // True while saving
  isCompleted: boolean;               // True when lesson completed
  showResumeAlert: boolean;           // True to show "resume from X%" message
  saveProgress: () => Promise<void>;  // Manually trigger save
  dismissResumeAlert: () => void;     // Dismiss resume alert
}
```

### Features

#### 1. **Automatic Scroll Tracking**
- Calculates progress based on scroll position
- Updates in real-time as user scrolls
- Supports both element scrolling and window scrolling

#### 2. **Smart Auto-Save**
- Debounced saves (waits 2 seconds after last scroll)
- Only saves when progress increases by threshold (default: 10%)
- Saves on unmount (cleanup)
- Automatic retry on failure

#### 3. **Resume Functionality**
- Loads previous progress on mount
- Restores scroll position
- Shows resume alert if progress > 5%
- Auto-dismisses alert after 5 seconds

#### 4. **Auto-Completion**
- Automatically completes lesson at 90% (configurable)
- Triggers onComplete callback
- Prevents duplicate completions

#### 5. **Offline Support**
- Falls back to localStorage on save failure
- Syncs failed saves when reconnecting
- Caches progress locally

#### 6. **Time Tracking**
- Automatically tracks time spent
- Sends time with each save
- Measures from component mount

### Advanced Examples

#### Example 1: Custom Auto-Complete Threshold

```tsx
const progress = useLessonProgress({
  lessonId,
  moduleId,
  contentRef,
  autoCompleteThreshold: 95, // Complete at 95% instead of 90%
});
```

#### Example 2: With Confetti Animation

```tsx
import confetti from 'canvas-confetti';

const progress = useLessonProgress({
  lessonId,
  moduleId,
  contentRef,
  onComplete: () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  },
});
```

#### Example 3: Manual Save Button

```tsx
function LessonWithManualSave({ lessonId, moduleId }) {
  const contentRef = useRef(null);
  const { saveProgress, isSaving } = useLessonProgress({
    lessonId,
    moduleId,
    contentRef,
  });

  return (
    <div>
      <button onClick={saveProgress} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Progress'}
      </button>
      <div ref={contentRef}>{/* Content */}</div>
    </div>
  );
}
```

## useModuleProgress

Fetches module progress using SWR with automatic caching and revalidation.

### Basic Usage

```tsx
import useModuleProgress from '@/hooks/useModuleProgress';

function ModuleCard({ moduleId }) {
  const {
    moduleProgress,
    isLoading,
    isError,
    moduleState,
    mutate,
  } = useModuleProgress({
    moduleId,
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading module</div>;

  return (
    <div className={`module-card ${moduleState}`}>
      <h3>Module Progress</h3>
      <p>Progress: {moduleProgress.progress}%</p>
      <p>Lessons: {moduleProgress.completedLessons} / {moduleProgress.totalLessons}</p>
      <p>Time: {moduleProgress.timeSpent} minutes</p>
      
      {moduleState === 'completed' && <span>✅ Completed</span>}
      {moduleState === 'in-progress' && <button>Continue</button>}
      {moduleState === 'not-started' && <button>Start</button>}
    </div>
  );
}
```

### Parameters

```typescript
interface UseModuleProgressOptions {
  moduleId: string | null | undefined; // Module ID (null disables fetching)
  refreshInterval?: number;            // Auto-refresh interval in ms (default: 0)
  revalidateOnFocus?: boolean;         // Revalidate when window gains focus (default: true)
}
```

### Return Value

```typescript
interface UseModuleProgressReturn {
  moduleProgress: ModuleProgress | null; // Progress data
  isLoading: boolean;                    // True while loading
  isError: boolean;                      // True if error occurred
  error: Error | null;                   // Error object if failed
  mutate: () => void;                    // Manually trigger revalidation
  moduleState: ModuleState;              // 'not-started' | 'in-progress' | 'completed'
}

interface ModuleProgress {
  moduleId: string;
  progress: number;              // 0-100
  completedLessons: number;
  totalLessons: number;
  timeSpent: number;             // in minutes
  lastAccessedAt: string | null;
  isCompleted: boolean;
}
```

### Helper Functions

```typescript
// Get module state
import { getModuleState } from '@/hooks/useModuleProgress';
const state = getModuleState(moduleProgress);
// Returns: 'not-started' | 'in-progress' | 'completed'

// Get state color for UI
import { getModuleStateColor } from '@/hooks/useModuleProgress';
const color = getModuleStateColor(state);
// Returns: 'gray' | 'blue' | 'green'

// Get state label
import { getModuleStateLabel } from '@/hooks/useModuleProgress';
const label = getModuleStateLabel(state);
// Returns: 'Sin comenzar' | 'En progreso' | 'Completado'

// Get progress text
import { getProgressText } from '@/hooks/useModuleProgress';
const text = getProgressText(moduleProgress);
// Returns: '75%'

// Get lessons completion text
import { getLessonsCompletionText } from '@/hooks/useModuleProgress';
const text = getLessonsCompletionText(moduleProgress);
// Returns: '5 / 10'
```

### Advanced Hooks

#### useMultipleModulesProgress

Fetch progress for multiple modules at once:

```tsx
import { useMultipleModulesProgress } from '@/hooks/useModuleProgress';

function Dashboard() {
  const moduleIds = ['module-1', 'module-2', 'module-3'];
  const { results, isLoading, mutateAll } = useMultipleModulesProgress(moduleIds);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {results.map((result, i) => (
        <div key={moduleIds[i]}>
          Module {i + 1}: {result.moduleProgress?.progress}%
        </div>
      ))}
      <button onClick={mutateAll}>Refresh All</button>
    </div>
  );
}
```

#### useProgressComparison

Compare progress between two modules:

```tsx
import { useProgressComparison } from '@/hooks/useModuleProgress';

function ProgressComparison() {
  const { module1, module2, comparison } = useProgressComparison(
    'module-1',
    'module-2'
  );

  return (
    <div>
      <p>Module 1: {comparison.module1Progress}%</p>
      <p>Module 2: {comparison.module2Progress}%</p>
      <p>Difference: {comparison.difference}%</p>
      <p>Ahead: {comparison.ahead()}</p>
    </div>
  );
}
```

## Data Flow

```
User scrolls
    ↓
calculateScrollPercentage()
    ↓
Update localProgress state
    ↓
debouncedSave() (2 second wait)
    ↓
Check if progress increased by threshold
    ↓
saveProgress() → API call
    ↓
Update backend + localStorage
    ↓
Invalidate SWR cache
    ↓
Re-fetch module progress
```

## Best Practices

### 1. Always Use contentRef

```tsx
// ✅ Good
const contentRef = useRef<HTMLDivElement>(null);
const progress = useLessonProgress({ lessonId, moduleId, contentRef });

<div ref={contentRef}>{/* content */}</div>

// ❌ Bad - contentRef is null
const progress = useLessonProgress({ lessonId, moduleId, contentRef: { current: null } });
```

### 2. Handle Completion Events

```tsx
// ✅ Good
const progress = useLessonProgress({
  lessonId,
  moduleId,
  contentRef,
  onComplete: () => {
    // Show success message
    toast.success('Lesson completed!');
    // Navigate to next lesson
    navigate(`/lessons/${nextLessonId}`);
  },
});

// ❌ Bad - No completion handling
const progress = useLessonProgress({ lessonId, moduleId, contentRef });
```

### 3. Provide Module ID for Cache Invalidation

```tsx
// ✅ Good - Module progress updates automatically
useLessonProgress({ lessonId, moduleId, contentRef });

// ❌ Bad - Module progress won't update
useLessonProgress({ lessonId, moduleId: '', contentRef });
```

### 4. Use SWR Features Wisely

```tsx
// ✅ Good - For real-time dashboard
const { moduleProgress } = useModuleProgress({
  moduleId,
  refreshInterval: 30000, // Refresh every 30 seconds
});

// ✅ Good - For static card
const { moduleProgress } = useModuleProgress({
  moduleId,
  revalidateOnFocus: false, // Don't revalidate on focus
});
```

## Performance Tips

1. **Debounce scroll handlers** - Already done internally (2 seconds)
2. **Use SWR deduplication** - Automatically enabled
3. **Batch multiple saves** - Use threshold-based saving
4. **Memoize callbacks** - useCallback for onComplete
5. **Lazy load heavy components** - Split confetti/animations

## Troubleshooting

### Progress not saving

**Check:**
- Is `contentRef.current` valid?
- Is the content actually scrollable?
- Check network tab for API errors
- Check localStorage for fallback data

**Solution:**
```tsx
useEffect(() => {
  console.log('contentRef:', contentRef.current);
  console.log('scrollHeight:', contentRef.current?.scrollHeight);
}, [contentRef]);
```

### Resume not working

**Check:**
- Is previous progress > 0?
- Is scroll position being saved?
- Check timing of scroll restoration

**Solution:**
```tsx
useEffect(() => {
  const progress = await getLessonProgress(lessonId);
  console.log('Loaded progress:', progress);
}, []);
```

### Auto-complete not triggering

**Check:**
- Is progress reaching threshold (90%)?
- Is content long enough to scroll?
- Check if already completed

**Solution:**
```tsx
// Lower threshold for testing
useLessonProgress({
  ...props,
  autoCompleteThreshold: 50, // Test with 50%
});
```

## Examples

See `PROGRESS_HOOKS_EXAMPLES.tsx` for complete working examples including:

- Lesson viewer with tracking
- Module progress cards
- Dashboard with multiple modules
- Section tracking
- Progress analytics
- Resume functionality

## Migration Guide

### From old progress tracking:

```tsx
// Old way
const [progress, setProgress] = useState(0);
useEffect(() => {
  const handleScroll = () => {
    const percent = calculatePercent();
    setProgress(percent);
    saveToBackend(percent);
  };
  window.addEventListener('scroll', handleScroll);
}, []);

// New way
const { localProgress } = useLessonProgress({
  lessonId,
  moduleId,
  contentRef,
});
```

## TypeScript Support

All hooks are fully typed with TypeScript. Import types like this:

```typescript
import type {
  UseLessonProgressOptions,
  UseLessonProgressReturn,
  UseModuleProgressOptions,
  UseModuleProgressReturn,
  ModuleState,
  ModuleProgress,
} from '@/hooks/useModuleProgress';
```

## Testing

```tsx
import { renderHook } from '@testing-library/react-hooks';
import useLessonProgress from '@/hooks/useLessonProgress';

test('tracks progress', () => {
  const contentRef = { current: document.createElement('div') };
  const { result } = renderHook(() =>
    useLessonProgress({ lessonId: '1', moduleId: '1', contentRef })
  );

  expect(result.current.localProgress).toBe(0);
});
```

## License

MIT - Part of VentiLab Learning Platform
