# Repository Cleanup Inventory

**Generated:** 2026-01-21
**Project:** ventilab-web (Next.js Pages Router)

## Summary

This document inventories all artifacts identified for cleanup or relocation.

---

## 1. Build Artifacts Present

| Path | Size | Status |
|------|------|--------|
| `.next/` | 442 MB | Present locally, NOT tracked in git (correctly ignored) |
| `ventilab-web.zip` | 301 MB | Present locally, NOT tracked in git - DELETE |

**Note:** No `out/` or `dist/` directories found.

---

## 2. Temporary Reports & Analysis Files

### At Repository Root

| File | Type | Action |
|------|------|--------|
| `analysis-report.json` | Analysis output | Move to docs/analysis/ |
| `cognitive-overload-report.txt` | Analysis output | Move to docs/analysis/ |
| `lesson-analysis-semantic.json` | Analysis output | Move to docs/analysis/ |
| `split-proposals.md` | Analysis doc | Move to docs/analysis/ |

### Implementation Guides at Root

| File | Type | Action |
|------|------|--------|
| `ANALISIS_COMPONENTES_TEACHING.md` | Dev notes | Move to docs/dev-notes/ |
| `COMPLETE_IMPLEMENTATION_GUIDE.md` | Dev guide | Move to docs/guides/ |
| `CORS_AND_AUTH_FIXES.md` | Fix notes | Move to docs/dev-notes/ |
| `diagnostico-nextauth.md` | Debug notes | Move to docs/dev-notes/ |
| `frontend-fixes.ts` | Code instructions | Move to docs/dev-notes/ |
| `INSTRUCCIONES_ACTUALIZAR_ENV.md` | Setup guide | Move to docs/setup/ |
| `LESSON_VIEWER_INTEGRATION.md` | Integration guide | Move to docs/guides/ |
| `PROGRESS_TRACKING_FIX.md` | Fix notes | Move to docs/dev-notes/ |
| `PROGRESS_TRACKING_SUMMARY.md` | Dev summary | Move to docs/dev-notes/ |
| `README_ENV.md` | Setup guide | Move to docs/setup/ |
| `SOLUCION_URL_BACKEND.md` | Fix notes | Move to docs/dev-notes/ |
| `UI_COMPONENTS_SUMMARY.md` | Component docs | Move to docs/dev-notes/ |

### README Files Inside src/

| File | Action |
|------|--------|
| `src/components/PROGRESS_COMPONENTS_README.md` | Move to docs/components/ |
| `src/hooks/PROGRESS_HOOKS_README.md` | Move to docs/hooks/ |
| `src/services/PROGRESS_SERVICE_README.md` | Move to docs/services/ |

---

## 3. PowerShell Scripts at Root

| Script | Purpose | Action |
|--------|---------|--------|
| `actualizar-env.ps1` | Env update script | Move to scripts/ |
| `crear-env-local.ps1` | Env setup script | Move to scripts/ |
| `test-nextauth.ps1` | Auth testing | Move to scripts/ |
| `verificar-url-backend.ps1` | URL verification | Move to scripts/ |

---

## 4. Empty Directories

| Path | Action |
|------|--------|
| `docs/backups/lessons/` | DELETE (empty) |
| `docs/cleanup/` | KEEP (will contain this file) |
| `docs/examples/` | DELETE (empty, examples moving elsewhere) |
| `src/constants/` | DELETE (empty) |
| `src/data/lessons/module-01-fundamentals/beginner/` | DELETE (empty) |

---

## 5. Backup Folders Under src/data/lessons

| Path | Contents | Action |
|------|----------|--------|
| `src/data/lessons/.backup/` | 6 JSON files (~623KB) | Move to docs/backups/lessons/ |
| `src/data/lessons/.backup-splits/` | 22 JSON files (~924KB) | Move to docs/backups/lessons/ |
| `src/data/lessons/module-01-fundamentals/backup/` | 3 JSON files (~55KB) | Move to docs/backups/lessons/ |

---

## 6. Example/Demo Files

### Example Files Exported in index.js (but not imported elsewhere)

| File | Exported In | Action |
|------|-------------|--------|
| `src/components/common/SearchBar.examples.jsx` | common/index.js | Move to docs/examples/components/ |
| `src/components/search/SearchFilters.examples.jsx` | search/index.js | Move to docs/examples/components/ |
| `src/components/common/RoleGuardExamples.jsx` | common/index.js | Move to docs/examples/components/ |

### Standalone Example Files (not imported anywhere)

| File | Action |
|------|--------|
| `src/components/teaching/components/media/ImageGallery.example.jsx` | Move to docs/examples/components/ |
| `src/components/teaching/components/media/InteractiveDiagram.example.jsx` | Move to docs/examples/components/ |
| `src/components/teaching/components/media/VideoPlayer.example.jsx` | Move to docs/examples/components/ |
| `src/contexts/AuthContext.example._app.js` | Move to docs/examples/contexts/ |
| `src/data/helpers/lessonLoader.example.js` | Move to docs/examples/data/ |
| `src/services/progressService.example.tsx` | Move to docs/examples/services/ |
| `src/components/INTEGRATION_EXAMPLES.tsx` | Move to docs/examples/components/ |
| `src/components/examples/ThemeExample.jsx` | Move to docs/examples/components/ |
| `src/components/search/SearchExample.jsx` | Move to docs/examples/components/ |

---

## 7. Placeholder Files

| File | Action |
|------|--------|
| `lib/services/.gitkeep` | DELETE (folder has no other content needing preservation) |

---

## 8. Files to Keep at Root

| File | Reason |
|------|--------|
| `README.md` | Main project readme |
| `package.json` | NPM config |
| `package-lock.json` | NPM lockfile |
| `tsconfig.json` | TypeScript config |
| `jsconfig.json` | JS module config |
| `next.config.ts` | Next.js config |
| `next-env.d.ts` | Next.js TypeScript defs |
| `eslint.config.mjs` | ESLint config |
| `postcss.config.mjs` | PostCSS config |
| `vercel.json` | Vercel config |
| `middleware.js` | Next.js middleware |
| `.gitignore` | Git ignore rules |
| `.nvmrc` | Node version |
| `.node-version` | Node version |

---

## 9. .gitignore Issues to Address

1. **.github is NOT ignored** - Correct, no changes needed
2. **.vercel/ is ignored** - Correct
3. **.env files are ignored** - Correct (with .env.example allowed)
4. **Consider adding:**
   - `*.zip` (to prevent large archives)
   - PowerShell scripts could stay at root OR move to scripts/

---

## Actions Required

### Phase 1: Delete
- [ ] `ventilab-web.zip`
- [ ] Empty directories (listed above)
- [ ] `lib/services/.gitkeep`

### Phase 2: Move Backups
- [ ] Move lesson backups from `src/data/lessons/` to `docs/backups/lessons/`

### Phase 3: Relocate Documentation
- [ ] Create `docs/` subdirectories: analysis/, dev-notes/, guides/, setup/, components/, hooks/, services/, examples/
- [ ] Move all .md files from root to appropriate docs/ subdirectories
- [ ] Move README files from src/ to docs/

### Phase 4: Handle Examples
- [ ] Move example files to `docs/examples/`
- [ ] Remove exports from index.js files (SearchBar.examples, SearchFilters.examples, RoleGuardExamples)

### Phase 5: Move Scripts
- [ ] Move PowerShell scripts from root to scripts/

### Phase 6: Update .gitignore
- [ ] Add `*.zip` pattern
- [ ] Verify all patterns are correct

### Phase 7: Verify Build
- [ ] Run `npm install`
- [ ] Run `npm run lint`
- [ ] Run `npm run build`
