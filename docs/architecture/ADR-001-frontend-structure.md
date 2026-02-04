# ADR-001: Frontend Architecture Standardization

**Status**: Accepted  
**Date**: 2025-01-27  
**Deciders**: Frontend Architecture Team  
**Tags**: architecture, refactoring, structure

## Context

The VentyLab Next.js application (using Pages Router) has grown organically, resulting in:

1. **Multiple service layers**: `src/service/*` vs `src/services/*` vs `lib/*` causing confusion about where API clients belong
2. **Scattered Teaching UI**: Components spread across `src/components/teaching/**`, `src/view-components/teaching/**`, and `src/features/**`
3. **Unclear ownership**: Duplicate folders with unclear boundaries
4. **Import confusion**: Deep relative paths (`../../../../`) and inconsistent aliases

This makes it difficult for new contributors to navigate and understand the codebase.

## Decision

We will standardize the frontend architecture following a **feature-based structure** with clear separation of concerns:

### Target Structure

```
ventilab-web/
├── pages/                    # Next.js Pages Router entry points only
│   ├── _app.js
│   ├── api/
│   ├── teaching/
│   └── ...
│
├── lib/                      # Server-side utilities ONLY
│   ├── auth.ts              # NextAuth configuration
│   ├── prisma.ts            # Prisma client (server-side)
│   └── db-logger.ts
│
└── src/
    ├── features/            # Domain modules (feature-based)
    │   ├── teaching/        # Teaching module (consolidated)
    │   │   ├── components/  # Teaching-specific components
    │   │   ├── hooks/       # Teaching-specific hooks
    │   │   ├── contexts/    # Teaching-specific contexts
    │   │   ├── services/    # Teaching-specific services (if any)
    │   │   └── types.ts      # Teaching-specific types
    │   ├── dashboard/        # Dashboard feature
    │   ├── progress/         # Progress tracking feature
    │   └── auth/             # Auth feature (if needed)
    │
    ├── components/          # Truly shared UI components
    │   ├── layout/          # Layout components (Navbar, Sidebar, etc.)
    │   ├── common/         # Common UI (buttons, cards, etc.)
    │   └── ...
    │
    ├── services/            # API clients + AI clients (ONE location)
    │   ├── api/             # HTTP client + API services
    │   │   ├── http.ts      # Single HTTP client
    │   │   ├── progressService.js
    │   │   └── ...
    │   ├── ai/              # AI services
    │   │   ├── chatService.js
    │   │   ├── sharedAI.ts
    │   │   └── ...
    │   ├── authService.js
    │   └── ...
    │
    ├── contexts/            # Global React contexts/providers
    │   ├── AuthContext.jsx
    │   ├── LearningProgressContext.jsx
    │   └── ...
    │
    ├── hooks/               # Shared hooks (or feature-local hooks)
    │   └── ...
    │
    ├── data/                # Static lesson/curriculum content
    │   └── ...
    │
    ├── utils/               # Shared helpers
    │   └── ...
    │
    ├── types/               # Shared TypeScript types
    │   └── ...
    │
    ├── styles/              # Global styles
    │   └── ...
    │
    └── theme/               # Theme configuration
        └── ...
```

## What Belongs Where

### `pages/`
- **Only** Next.js route entry points
- Should be thin wrappers that import from `src/`
- No business logic, only routing and page-level composition

### `lib/`
- **Server-side only** utilities
- NextAuth configuration (`auth.ts`)
- Prisma client initialization (`prisma.ts`)
- Server-side database utilities
- **NOT** client-side code

### `src/features/[feature-name]/`
- **Domain modules** - self-contained feature areas
- Each feature can have:
  - `components/` - Feature-specific UI components
  - `hooks/` - Feature-specific hooks
  - `contexts/` - Feature-specific contexts
  - `services/` - Feature-specific services (if not shared)
  - `types.ts` - Feature-specific types
  - `utils/` - Feature-specific utilities
- Features should be **loosely coupled** - minimal dependencies between features

### `src/components/`
- **Truly shared** UI components used across multiple features
- Layout components (Navbar, Sidebar, Layout)
- Common UI primitives (Button, Card, Modal, etc.)
- **NOT** feature-specific components

### `src/services/`
- **API clients and external service integrations**
- Single HTTP client (`api/http.ts`)
- API service modules (progress, auth, evaluation, etc.)
- AI service clients
- **One canonical location** - no duplicates

### `src/contexts/`
- **Global React contexts** used across the app
- Auth context, Progress context, Notification context
- Feature-specific contexts should live in `src/features/[feature]/contexts/`

### `src/hooks/`
- **Shared hooks** used across multiple features
- Feature-specific hooks should live in `src/features/[feature]/hooks/`

### `src/data/`
- **Static content** (lessons, curriculum JSON files)
- Not dynamic data from APIs

### `src/utils/`
- **Shared utility functions**
- Formatting, validation, helpers
- Feature-specific utilities should live in `src/features/[feature]/utils/`

### `src/types/`
- **Shared TypeScript types** used across features
- Feature-specific types should live in `src/features/[feature]/types.ts`

## Naming Conventions

### Feature Folders
- Use **kebab-case**: `teaching`, `student-dashboard`, `progress-tracking`
- Keep names **short and descriptive**

### Component Folders
- Use **PascalCase** for component files: `LessonViewer.jsx`, `ModuleCard.jsx`
- Use **kebab-case** for folders: `lesson-viewer/`, `module-card/`
- Prefer **index barrels** for cleaner imports:
  ```typescript
  // src/features/teaching/components/index.ts
  export { LessonViewer } from './LessonViewer';
  export { ModuleCard } from './ModuleCard';
  ```

### Service Files
- Use **camelCase** for service files: `progressService.js`, `authService.js`
- Group related services in subdirectories: `services/api/`, `services/ai/`

### Import Paths
- Prefer **alias imports** over relative paths:
  ```typescript
  // ✅ Good
  import { LessonViewer } from '@/features/teaching/components';
  import { http } from '@/services/api/http';
  
  // ❌ Bad
  import { LessonViewer } from '../../../features/teaching/components/LessonViewer';
  ```

## Migration Strategy

### Phase 1: Consolidate Services
1. Choose `src/services/` as canonical location
2. Migrate useful code from `src/service/*` to `src/services/*`
3. Merge HTTP clients (keep best features from both)
4. Update all imports
5. Add compatibility shims for old paths
6. Remove `src/service/` directory

### Phase 2: Consolidate Teaching UI
1. Create `src/features/teaching/` structure
2. Move `src/view-components/teaching/*` → `src/features/teaching/`
3. Move `src/components/teaching/*` → `src/features/teaching/components/`
4. Update all imports
5. Add compatibility shims
6. Remove old directories

### Phase 3: Clean Up lib/
1. Ensure `lib/` contains only server-side code
2. Move client-side configs from `src/lib/` to appropriate locations
3. Update imports

### Phase 4: Update TypeScript Paths
1. Update `tsconfig.json` paths to reflect new structure
2. Remove obsolete paths
3. Ensure all aliases are consistent

### Phase 5: Remove Shims
1. Verify all imports updated
2. Remove compatibility shims
3. Clean up old directories

## Consequences

### Positive
- ✅ Clear structure - easy to find code
- ✅ Reduced duplication
- ✅ Better separation of concerns
- ✅ Easier onboarding for new contributors
- ✅ Consistent import paths

### Negative
- ⚠️ Large refactoring effort (mitigated by shims)
- ⚠️ Temporary import confusion during migration
- ⚠️ Risk of breaking changes (mitigated by testing)

### Risks
- Breaking existing functionality during migration
- **Mitigation**: Use compatibility shims, test thoroughly, migrate incrementally

## Implementation Notes

1. **Compatibility Shims**: Create re-export files at old paths that import from new paths:
   ```typescript
   // src/service/api/progressService.js (shim)
   export * from '@/services/api/progressService';
   ```

2. **Incremental Migration**: Migrate one module at a time, test, then move to next

3. **Testing**: Run `npm run build` and `npm run lint` after each phase

4. **Documentation**: Update README and any architecture docs

## References

- Next.js Pages Router: https://nextjs.org/docs/pages
- Feature-based architecture: https://kentcdodds.com/blog/colocation
- TypeScript path mapping: https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping
