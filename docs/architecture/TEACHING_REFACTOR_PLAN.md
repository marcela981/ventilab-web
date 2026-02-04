# Teaching Feature Refactor Plan

## Status: In Progress

## Phase 1: Fix Routing ✅

- [x] Created `LessonViewerRouteAdapter` to bridge old route interface with canonical LessonViewer
- [x] Updated `pages/teaching/[moduleId]/[lessonId].js` to use adapter
- [x] Both route page and TeachingModule now use the same LessonViewer component

## Phase 2: Consolidate to features/teaching (In Progress)

### Current State
- Canonical LessonViewer: `src/components/teaching/components/LessonViewer.jsx` (1263 lines)
- Old LessonViewer: `src/components/teaching/LessonViewer.jsx` (1270 lines) - DEPRECATED
- TeachingModule: `src/components/teaching/TeachingModule.jsx` (1474 lines)
- Dashboard components duplicated across:
  - `src/components/teaching/components/dashboard/`
  - `src/features/teaching/components/dashboard/`
  - `src/view-components/teaching/components/dashboard/`

### Target Structure
```
src/features/teaching/
├── pages/
│   ├── LessonViewerRouteAdapter.jsx ✅
│   ├── TeachingPage.jsx (extracted from TeachingModule)
│   └── LessonPage.jsx (if needed)
├── components/
│   ├── LessonViewer/ (split into subcomponents)
│   │   ├── LessonViewer.jsx (main)
│   │   ├── LessonHeader/
│   │   ├── ObjectivesBlock/
│   │   ├── TheorySectionRenderer/
│   │   ├── MediaRenderer/
│   │   ├── ClinicalCaseRenderer/
│   │   ├── SummaryKeyPoints/
│   │   ├── AssessmentRenderer/
│   │   ├── ReferencesRenderer/
│   │   └── NavigationFooter/
│   ├── TeachingShell/ (extracted from TeachingModule)
│   │   ├── TeachingShell.jsx
│   │   ├── TeachingTabs.jsx
│   │   └── TeachingBreadcrumbs.jsx
│   ├── TeachingDashboardTab/ (extracted from TeachingModule)
│   ├── TeachingLessonTab/ (extracted from TeachingModule)
│   ├── dashboard/ (consolidated)
│   ├── curriculum/ (already in features/teaching)
│   ├── ai/ (AITopicExpander split)
│   └── clinical/ (ClinicalCase split)
├── hooks/ (move from components/teaching/hooks)
├── utils/
└── types.ts
```

## Phase 3: Deduplicate Components

### Duplicates to Remove
1. **LessonViewer**: 
   - Keep: `src/components/teaching/components/LessonViewer.jsx` → move to `features/teaching/components/LessonViewer/`
   - Remove: `src/components/teaching/LessonViewer.jsx` (after verifying not used)

2. **QuickAccessLessons**:
   - Keep: `src/features/teaching/components/dashboard/QuickAccessLessons/` (newer structure)
   - Remove: `src/components/teaching/components/dashboard/QuickAccessLessons.jsx`
   - Remove: `src/view-components/teaching/components/dashboard/QuickAccessLessons/` (if shim only)

3. **DashboardHeader, ContinueLearningSection, ProgressOverview, etc.**:
   - Keep: `src/features/teaching/components/dashboard/` (canonical)
   - Remove: `src/components/teaching/components/dashboard/` (old location)
   - Update: `src/view-components/teaching/components/dashboard/` (keep as shims temporarily)

## Phase 4: Split Large Files

### TeachingModule.jsx (1474 lines) → Split into:
- `TeachingShell.jsx` - Layout, tabs, breadcrumbs (~200 lines)
- `TeachingDashboardTab.jsx` - Dashboard content (~400 lines)
- `TeachingLessonTab.jsx` - Lesson viewer wrapper (~300 lines)
- `TeachingProgressTab.jsx` - Progress content (~200 lines)
- `shared/` - Loading states, error states (~100 lines)
- `TeachingModule.jsx` - Main orchestrator (~300 lines)

### LessonViewer.jsx (1263 lines) → Split into:
- `LessonViewer.jsx` - Main component (~300 lines)
- `LessonHeader/` - Header with objectives (~150 lines)
- `TheorySectionRenderer/` - Theory content (~200 lines)
- `MediaRenderer/` - Videos, images, diagrams (~200 lines)
- `ClinicalCaseRenderer/` - Clinical cases (~150 lines)
- `SummaryKeyPoints/` - Key points section (~100 lines)
- `AssessmentRenderer/` - Assessment section (~150 lines)
- `ReferencesRenderer/` - References section (~100 lines)
- `NavigationFooter/` - Navigation controls (~100 lines)

### AITopicExpander.jsx (~1600 lines) → Split into:
- `services/aiExpandService.js` - API calls (~200 lines)
- `hooks/useAITopicExpanderState.js` - State management (~300 lines)
- `components/ai/PromptPanel.jsx` - Prompt UI (~200 lines)
- `components/ai/ResultPanel.jsx` - Result display (~300 lines)
- `components/ai/LoadingState.jsx` - Loading UI (~100 lines)
- `components/ai/ErrorState.jsx` - Error UI (~100 lines)
- `components/ai/AITopicExpander.jsx` - Main orchestrator (~200 lines)

### ClinicalCaseViewer.jsx (~1400 lines) → Split into:
- `components/clinical/ClinicalCaseViewer.jsx` - Main (~300 lines)
- `components/clinical/CaseHeader/` - Case header (~150 lines)
- `components/clinical/PatientDataPanel/` - Patient info (~200 lines)
- `components/clinical/ConfigurationPanel/` - Ventilator config (~300 lines)
- `components/clinical/ResultsPanel/` - Results display (~200 lines)
- `components/clinical/ExpertComparison/` - Expert comparison (~150 lines)
- `components/clinical/DecisionPoint/` - Decision points (~100 lines)

## Phase 5: Clean Exports

Create `src/features/teaching/index.ts`:
```typescript
// Pages
export { default as TeachingPage } from './pages/TeachingPage';
export { default as LessonViewerRouteAdapter } from './pages/LessonViewerRouteAdapter';

// Components
export { default as LessonViewer } from './components/LessonViewer/LessonViewer';
export { default as TeachingModule } from './components/TeachingModule';

// Dashboard
export * from './components/dashboard';

// Curriculum
export * from './components/curriculum';

// Hooks
export * from './hooks';
```

## Verification Checklist

- [ ] `/teaching` route works (curriculum/dashboard)
- [ ] `/teaching/[moduleId]/[lessonId]` route works (lesson view)
- [ ] Both routes use same LessonViewer component
- [ ] No duplicate components remain
- [ ] Large files split into maintainable subcomponents
- [ ] All imports use `@/features/teaching/...` paths
- [ ] `npm run build` passes
- [ ] `npm run lint` passes (or no new errors)

## Migration Order

1. ✅ Fix routing (use same LessonViewer)
2. Move canonical LessonViewer to features/teaching
3. Update all imports
4. Remove old LessonViewer
5. Deduplicate dashboard components
6. Split TeachingModule
7. Split LessonViewer
8. Split AITopicExpander
9. Split ClinicalCaseViewer
10. Create clean exports
11. Update remaining imports
12. Verify build/lint
