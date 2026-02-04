
# Progress Components - Integration Guide

This guide explains how to integrate the new progress tracking components into your application.

## 📦 Required Dependencies

First, add `react-confetti` to your project:

```bash
npm install react-confetti
# or
yarn add react-confetti
```

## 📁 New Components

### 1. LessonProgressBar

Sticky progress indicator that shows at the top of lesson views.

**Usage:**

```tsx
import LessonProgressBar from '@/components/LessonProgressBar';
import useLessonProgress from '@/hooks/useLessonProgress';

function LessonView({ lessonId, moduleId, lessonTitle }) {
  const contentRef = useRef(null);
  const { localProgress, isSaving } = useLessonProgress({
    lessonId,
    moduleId,
    contentRef,
  });

  return (
    <div>
      <LessonProgressBar
        progress={localProgress}
        isSaving={isSaving}
        lessonTitle={lessonTitle}
      />
      
      <div ref={contentRef} className="lesson-content">
        {/* Your scrollable content */}
      </div>
    </div>
  );
}
```

**Props:**
- `progress: number` - Progress percentage (0-100)
- `isSaving: boolean` - Show saving indicator
- `lessonTitle: string` - Lesson title to display

**Features:**
- Sticky positioning at top
- Color-coded progress (red < 50%, blue < 90%, green >= 90%)
- Animated saving indicator
- Responsive design
- Smooth transitions

---

### 2. CompletionConfetti

Celebration animation when lesson is completed.

**Usage:**

```tsx
import CompletionConfetti from '@/components/CompletionConfetti';
import useLessonProgress from '@/hooks/useLessonProgress';

function LessonView({ lessonId, moduleId }) {
  const contentRef = useRef(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const { isCompleted } = useLessonProgress({
    lessonId,
    moduleId,
    contentRef,
    onComplete: () => {
      setShowConfetti(true);
    },
  });

  return (
    <div>
      <CompletionConfetti
        show={showConfetti}
        onComplete={() => setShowConfetti(false)}
        message="¡Lección completada! ✅"
        duration={3000}
      />
      
      <div ref={contentRef}>{/* Content */}</div>
    </div>
  );
}
```

**Props:**
- `show: boolean` - Show/hide confetti
- `onComplete: () => void` - Callback when animation finishes
- `message?: string` - Success message (default: "¡Lección completada! ✅")
- `duration?: number` - Animation duration in ms (default: 3000)

**Features:**
- 200 confetti pieces with custom colors
- Success message overlay with fade/zoom animation
- Auto-stops after duration
- Non-blocking (pointer-events: none)
- Customizable colors matching theme

---

## 🎨 Utility Functions

### Time Formatting

Located in `src/utils/timeFormat.ts`:

```tsx
import {
  formatRelativeTime,
  formatHours,
  formatDuration,
  formatDateTime,
} from '@/utils/timeFormat';

// Relative time
formatRelativeTime(new Date()); // "Hace un momento"
formatRelativeTime(new Date(Date.now() - 3600000)); // "Hace 1 hora"

// Hours from minutes
formatHours(90); // "1.5 horas"
formatHours(45); // "45 minutos"

// Duration
formatDuration(150); // "2h 30m"
formatDuration(45); // "45m"

// Date/time
formatDateTime(new Date()); // "14 de enero, 2:30 PM"
```

---

## 🔄 Integration with Existing Components

### ModuleCard Integration

See `INTEGRATION_EXAMPLES.tsx` for a complete `ModuleCardEnhanced` component that shows:

1. **Three States:**
   - **Not Started**: Shows lesson count and "Comenzar" button
   - **In Progress**: Shows progress bar, completion stats, and "Continuar estudiando" button
   - **Completed**: Shows checkmark, completion stats, and "Revisar" button

2. **Features:**
   - Fetches progress with `useModuleProgress` hook
   - Handles navigation to resume point
   - Loading and error states
   - Favorite functionality
   - Responsive design

**Key Code:**

```tsx
import useModuleProgress from '@/hooks/useModuleProgress';
import { getModuleResumePoint } from '@/services/progressService';

const { moduleProgress, isLoading, moduleState } = useModuleProgress({ moduleId });

// Navigate to resume point
const handleContinue = async () => {
  const resumePoint = await getModuleResumePoint(moduleId);
  if (resumePoint) {
    router.push(`/lessons/${resumePoint.lessonId}`);
  }
};
```

---

### Dashboard Integration

See `INTEGRATION_EXAMPLES.tsx` for a complete `DashboardProgressSection` component that shows:

1. **Progress Stats:**
   - Total lessons completed
   - Modules in progress
   - Time studied

2. **Continue Studying:**
   - Last accessed module
   - Progress bar
   - Quick continue button

3. **Recent Modules:**
   - 3 most recent modules in progress
   - Progress bars
   - Continue buttons

**Key Code:**

```tsx
import useSWR from 'swr';
import { progressFetcher } from '@/services/progressService';

const { data: overview, isLoading } = useSWR(
  '/progress/overview',
  progressFetcher,
  { refreshInterval: 30000 } // Refresh every 30s
);
```

---

## 🚀 Complete Lesson Page Example

```tsx
import { useRef, useState } from 'react';
import { Container, Box } from '@mui/material';
import LessonProgressBar from '@/components/LessonProgressBar';
import CompletionConfetti from '@/components/CompletionConfetti';
import useLessonProgress from '@/hooks/useLessonProgress';

function LessonPage({ lessonId, moduleId, lessonTitle, lessonContent }) {
  const contentRef = useRef(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const {
    localProgress,
    isSaving,
    isCompleted,
    showResumeAlert,
    dismissResumeAlert,
  } = useLessonProgress({
    lessonId,
    moduleId,
    contentRef,
    onComplete: () => {
      setShowConfetti(true);
    },
  });

  return (
    <>
      {/* Progress bar */}
      <LessonProgressBar
        progress={localProgress}
        isSaving={isSaving}
        lessonTitle={lessonTitle}
      />

      {/* Confetti */}
      <CompletionConfetti
        show={showConfetti}
        onComplete={() => {
          setShowConfetti(false);
          // Navigate to next lesson or module overview
          router.push(`/modules/${moduleId}`);
        }}
      />

      {/* Resume alert */}
      {showResumeAlert && (
        <Box
          sx={{
            position: 'fixed',
            top: 80,
            right: 20,
            zIndex: 1000,
            p: 2,
            bgcolor: 'background.paper',
            boxShadow: 3,
            borderRadius: 2,
          }}
        >
          Continuando desde {Math.round(localProgress)}%
          <button onClick={dismissResumeAlert}>Cerrar</button>
        </Box>
      )}

      {/* Lesson content */}
      <Container maxWidth="lg" sx={{ mt: 10, mb: 4 }}>
        <div
          ref={contentRef}
          style={{ maxHeight: '80vh', overflow: 'auto' }}
        >
          <h1>{lessonTitle}</h1>
          <div dangerouslySetInnerHTML={{ __html: lessonContent }} />
        </div>
      </Container>
    </>
  );
}
```

---

## 📊 Dashboard Stats Example

```tsx
import { Card, CardContent, Grid, Typography } from '@mui/material';
import useSWR from 'swr';
import { progressFetcher } from '@/services/progressService';
import { formatHours } from '@/utils/timeFormat';

function ProgressStats() {
  const { data: overview } = useSWR('/progress/overview', progressFetcher);

  if (!overview) return null;

  const stats = [
    {
      label: 'Lecciones completadas',
      value: `${overview.overview.completedLessons} / ${overview.overview.totalLessons}`,
    },
    {
      label: 'Módulos en progreso',
      value: overview.modules.filter(m => m.progress > 0 && m.progress < 100).length,
    },
    {
      label: 'Tiempo estudiado',
      value: formatHours(
        overview.modules.reduce((sum, m) => sum + (m.timeSpent || 0), 0)
      ),
    },
  ];

  return (
    <Grid container spacing={3}>
      {stats.map((stat, index) => (
        <Grid item xs={12} md={4} key={index}>
          <Card>
            <CardContent>
              <Typography variant="h4" fontWeight="bold">
                {stat.value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stat.label}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
```

---

## 🎨 Styling Tips

### Custom Progress Bar Colors

```tsx
<LinearProgress
  variant="determinate"
  value={progress}
  sx={{
    height: 8,
    borderRadius: 4,
    bgcolor: 'grey.200',
    '& .MuiLinearProgress-bar': {
      borderRadius: 4,
      bgcolor: progress >= 90 ? 'success.main' : 'primary.main',
    },
  }}
/>
```

### Custom Confetti Colors

Edit `CompletionConfetti.tsx`:

```tsx
colors={[
  theme.palette.primary.main,
  theme.palette.secondary.main,
  '#FFD700', // Gold
  '#FF6B6B', // Coral
  '#4ECDC4', // Turquoise
]}
```

---

## 🧪 Testing

### Test Progress Bar

```tsx
import { render, screen } from '@testing-library/react';
import LessonProgressBar from '@/components/LessonProgressBar';

test('shows progress percentage', () => {
  render(
    <LessonProgressBar
      progress={75}
      isSaving={false}
      lessonTitle="Test Lesson"
    />
  );
  
  expect(screen.getByText('75% completado')).toBeInTheDocument();
});

test('shows saving indicator', () => {
  render(
    <LessonProgressBar
      progress={50}
      isSaving={true}
      lessonTitle="Test Lesson"
    />
  );
  
  expect(screen.getByText(/Guardando/i)).toBeInTheDocument();
});
```

---

## 🐛 Troubleshooting

### Confetti Not Showing

**Problem:** Confetti doesn't appear when lesson completes.

**Solution:**
1. Check if `react-confetti` is installed
2. Verify `show` prop is true
3. Check z-index conflicts
4. Ensure window dimensions are calculated

```tsx
// Add debug logging
useEffect(() => {
  console.log('Confetti show:', show);
  console.log('Window dimensions:', dimensions);
}, [show, dimensions]);
```

### Progress Bar Not Sticky

**Problem:** Progress bar scrolls with content.

**Solution:**
1. Ensure parent has no `position: relative` that might interfere
2. Check z-index is higher than content
3. Verify `position: sticky` is supported

```tsx
sx={{
  position: 'sticky',
  top: 0,
  zIndex: 1100, // Higher than content
}}
```

### Time Format Issues

**Problem:** Time shows incorrectly.

**Solution:**
1. Check if date is valid
2. Verify locale settings
3. Use `formatHours` for minutes to hours conversion

```tsx
// Debug time formatting
const minutes = 150;
console.log('Minutes:', minutes);
console.log('Formatted:', formatHours(minutes)); // "2.5 horas"
```

---

## 📚 Related Documentation

- [Progress Hooks README](../hooks/PROGRESS_HOOKS_README.md)
- [Progress Service README](../services/PROGRESS_SERVICE_README.md)
- [Integration Examples](./INTEGRATION_EXAMPLES.tsx)
- [Progress Tracking Summary](../../PROGRESS_TRACKING_SUMMARY.md)

---

## 🎯 Best Practices

1. **Always use refs for scrollable content**
   ```tsx
   const contentRef = useRef(null);
   <div ref={contentRef}>{/* content */}</div>
   ```

2. **Handle confetti cleanup**
   ```tsx
   useEffect(() => {
     return () => {
       setShowConfetti(false);
     };
   }, []);
   ```

3. **Cache progress data with SWR**
   ```tsx
   const { data } = useSWR('/progress/overview', progressFetcher, {
     refreshInterval: 30000,
   });
   ```

4. **Format time consistently**
   ```tsx
   import { formatHours, formatRelativeTime } from '@/utils/timeFormat';
   ```

5. **Test responsive design**
   - Check mobile view
   - Verify sticky positioning
   - Test touch interactions

---

## ✅ Integration Checklist

- [ ] Install `react-confetti` package
- [ ] Add `LessonProgressBar` to lesson pages
- [ ] Add `CompletionConfetti` with proper callbacks
- [ ] Update `ModuleCard` to use new progress hooks
- [ ] Add progress stats to Dashboard
- [ ] Import time formatting utilities
- [ ] Test on different screen sizes
- [ ] Verify progress saves correctly
- [ ] Test resume functionality
- [ ] Check confetti animation
- [ ] Test error states
- [ ] Verify loading states

---

**Status:** ✅ Ready for integration

**Last Updated:** 2026-01-14
