# Progress Service Documentation

## Overview

The Progress Service provides a TypeScript-based API client for tracking user progress through lessons and modules. It includes SWR integration for optimal data fetching and caching.

## Files

- `progressService.ts` - Core service with API functions
- `hooks/useProgress.ts` - React hooks for components
- `progressService.example.tsx` - Usage examples

## Features

- ✅ TypeScript support with full type definitions
- ✅ SWR integration for automatic caching and revalidation
- ✅ Optimistic updates for better UX
- ✅ Automatic cache invalidation
- ✅ Scroll position tracking
- ✅ Time tracking
- ✅ Error handling

## API Functions

### `updateLessonProgress(lessonId, data)`

Update lesson progress with completion percentage, time spent, and scroll position.

```typescript
import { updateLessonProgress } from '@/services/progressService';

await updateLessonProgress('lesson-123', {
  completionPercentage: 75,
  timeSpent: 300, // seconds
  scrollPosition: 1200, // optional
  lastViewedSection: 'section-3', // optional
});
```

### `getLessonProgress(lessonId)`

Get current progress for a lesson.

```typescript
const progress = await getLessonProgress('lesson-123');
// Returns: { completionPercentage, timeSpent, scrollPosition, ... }
```

### `getModuleProgress(moduleId)`

Get aggregate progress for a module.

```typescript
const progress = await getModuleProgress('module-456');
// Returns: { progress, completedLessons, totalLessons, timeSpent, ... }
```

### `getModuleResumePoint(moduleId)`

Get the first incomplete lesson in a module.

```typescript
const resumePoint = await getModuleResumePoint('module-456');
// Returns: { lessonId, lessonTitle, completionPercentage, scrollPosition, ... }
```

### `getUserOverview()`

Get complete user progress overview.

```typescript
const overview = await getUserOverview();
// Returns: { user, overview, modules }
```

### `invalidateProgressCache(moduleId?)`

Manually invalidate SWR cache for progress data.

```typescript
await invalidateProgressCache('module-456');
```

## React Hooks

### `useUserOverview()`

Fetch user progress overview with SWR.

```tsx
import { useUserOverview } from '@/hooks/useProgress';

function Dashboard() {
  const { overview, isLoading, isError } = useUserOverview();
  
  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error</div>;
  
  return (
    <div>
      <p>Progress: {overview.overview.overallProgress}%</p>
    </div>
  );
}
```

### `useModuleProgress(moduleId)`

Fetch module progress with SWR.

```tsx
import { useModuleProgress } from '@/hooks/useProgress';

function ModuleCard({ moduleId }) {
  const { progress, isLoading } = useModuleProgress(moduleId);
  
  return (
    <div>
      <p>{progress?.progress}% Complete</p>
      <p>{progress?.completedLessons} / {progress?.totalLessons} lessons</p>
    </div>
  );
}
```

### `useModuleResumePoint(moduleId)`

Get resume point for a module.

```tsx
import { useModuleResumePoint } from '@/hooks/useProgress';

function ResumeButton({ moduleId }) {
  const { resumePoint } = useModuleResumePoint(moduleId);
  
  if (!resumePoint) return null;
  
  return (
    <button onClick={() => navigate(`/lessons/${resumePoint.lessonId}`)}>
      Continue: {resumePoint.lessonTitle}
    </button>
  );
}
```

### `useLessonProgress(lessonId)`

Fetch lesson progress with SWR.

```tsx
import { useLessonProgress } from '@/hooks/useProgress';

function LessonProgress({ lessonId }) {
  const { progress } = useLessonProgress(lessonId);
  
  return <div>Progress: {progress?.completionPercentage}%</div>;
}
```

### `useUpdateLessonProgress()`

Update lesson progress with optimistic updates.

```tsx
import { useUpdateLessonProgress } from '@/hooks/useProgress';

function LessonViewer({ lessonId, moduleId }) {
  const { updateProgress } = useUpdateLessonProgress();
  
  const handleScroll = async () => {
    const completion = calculateCompletion();
    await updateProgress(lessonId, {
      completionPercentage: completion,
      timeSpent: 300,
    }, moduleId);
  };
  
  return <div onScroll={handleScroll}>...</div>;
}
```

## Progress Tracking Patterns

### Pattern 1: Automatic Scroll Tracking

```tsx
function LessonWithScrollTracking({ lessonId, moduleId }) {
  const { updateProgress } = useUpdateLessonProgress();
  
  useEffect(() => {
    const handleScroll = debounce(() => {
      const scrollPercent = calculateScrollPercent();
      updateProgress(lessonId, {
        completionPercentage: Math.round(scrollPercent),
        timeSpent: getTimeSpent(),
        scrollPosition: window.scrollY,
      }, moduleId);
    }, 2000);
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lessonId, moduleId]);
}
```

### Pattern 2: Time Tracking

```tsx
function useTimeTracking() {
  const [timeSpent, setTimeSpent] = useState(0);
  
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return timeSpent;
}
```

### Pattern 3: Resume from Last Position

```tsx
function LessonWithResume({ lessonId }) {
  const { progress } = useLessonProgress(lessonId);
  
  useEffect(() => {
    if (progress?.scrollPosition) {
      window.scrollTo({
        top: progress.scrollPosition,
        behavior: 'smooth',
      });
    }
  }, [progress?.scrollPosition]);
}
```

## Type Definitions

```typescript
interface UpdateLessonProgressParams {
  completionPercentage: number;
  timeSpent: number;
  scrollPosition?: number;
  lastViewedSection?: string;
}

interface LessonProgress {
  id: string;
  userId: string;
  lessonId: string;
  moduleId: string | null;
  completed: boolean;
  completionPercentage: number;
  progress: number;
  timeSpent: number;
  scrollPosition: number | null;
  lastViewedSection: string | null;
  lastAccess: string | null;
  updatedAt: string;
}

interface ModuleProgress {
  moduleId: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  timeSpent: number;
  lastAccessedAt: string | null;
  isCompleted: boolean;
}

interface ModuleResumePoint {
  lessonId: string;
  lessonTitle: string;
  lessonOrder: number;
  moduleId: string;
  completionPercentage: number;
  scrollPosition: number | null;
  lastViewedSection: string | null;
}
```

## Backend API Endpoints

The service connects to these backend endpoints:

- `PUT /api/progress/lesson/:lessonId` - Update lesson progress
- `GET /api/progress/lessons/:lessonId` - Get lesson progress
- `GET /api/progress/modules/:moduleId` - Get module progress
- `GET /api/progress/modules/:moduleId/resume` - Get resume point
- `GET /api/progress/overview` - Get user overview

## Caching Strategy

- SWR automatically caches responses
- Cache is invalidated after updates
- Optimistic updates for better UX
- Configurable revalidation intervals
- Deduplication of concurrent requests

## Error Handling

All functions handle errors gracefully:

```typescript
try {
  await updateLessonProgress(lessonId, data);
} catch (error) {
  console.error('Progress update failed:', error);
  // Show user-friendly error message
}
```

Hooks return error states:

```tsx
const { progress, isError, error } = useLessonProgress(lessonId);

if (isError) {
  return <ErrorMessage message={error?.message} />;
}
```

## Best Practices

1. **Use hooks in components** - Prefer hooks over direct API calls
2. **Throttle updates** - Don't update on every scroll event
3. **Handle offline** - Check network status before updates
4. **Validate data** - Ensure completion percentage is 0-100
5. **Clean up** - Remove event listeners in useEffect cleanup
6. **Cache wisely** - Invalidate cache when needed
7. **Optimistic updates** - Update UI before API response

## Migration Guide

If you're using the old progressService.js:

```javascript
// Old way
import { updateLessonProgress } from '@/services/api/progressService';

// New way
import { updateLessonProgress } from '@/services/progressService';
// Or use hooks
import { useUpdateLessonProgress } from '@/hooks/useProgress';
```

## Performance Tips

1. Use `dedupingInterval` to prevent duplicate requests
2. Set `revalidateOnFocus: false` for static data
3. Use optimistic updates for immediate UI feedback
4. Debounce scroll handlers
5. Batch updates when possible

## Troubleshooting

### Progress not updating
- Check auth token is present
- Verify backend endpoint is correct
- Check network tab for errors
- Ensure SWR cache is invalidated

### Scroll position not restoring
- Check if `scrollPosition` is saved
- Verify scroll restoration timing
- Use `useEffect` with proper dependencies

### Hook not fetching data
- Ensure parameter is not `null` or `undefined`
- Check if SWR is configured correctly
- Verify API endpoint returns valid data

## Examples

See `progressService.example.tsx` for complete working examples.
