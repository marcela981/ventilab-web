<!--
* Funcionalidad: Legacy coexistence report
* Descripción: T8 inventory of how the legacy frontend coexists with the new template code: adapters done, pending swaps (gap + owning task), legacy allowlist counts, NextAuth uses that must stay, the profile/ui vs profile/UI case collision and the files the author still has to git rm. Source of truth for T9–T12 legacy work.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
-->

# Legacy coexistence (T8, 2026-10-13)

Rule: legacy may import new shared code through adapters only when the swap is 1:1. New code never imports legacy (ESLint boundaries).

## Adapters done

| Legacy file | New module | What it does |
|---|---|---|
| `src/shared/services/api/http.ts` (T3, v3.3) | `@shared/api-client/token-refresh`, `token-storage` | 401 refresh uses the shared single-flight when a backend refresh token exists (else the NextAuth bridge); 403 no longer logs out. T8: the duplicate `clearTokens()` moved into `handleSessionExpired`. |
| `src/shared/services/authService.js` (v1.1) | `@shared/api-client/token-storage` | `removeAuthToken()` clears BOTH backend tokens through `clearTokens()` (notifies the new session and RealtimeProvider) plus `ventilab_user_data`. Covers every caller: `handleSessionExpired`, `logout()`, `refreshToken()` failure, `progressService` 401. |
| `src/shared/services/sessionExpired.ts` (v1.1) | (through `removeAuthToken`) | Every legacy session expiry now ends the backend session too, once (idempotent `inProgress` flag, one `auth:logout`, one signOut, one redirect). |
| `src/shared/contexts/SocketContext.tsx` (v1.1) | `@shared/realtime/realtime-context`, `@shared/api-client/token-storage` | One socket per tab: with a backend session (both tokens) the legacy provider creates no `io()` and exposes the RealtimeProvider socket (`socket`; `isConnected` = status `connecting`/`authenticated`; `isAuthenticated` = `authenticated`). Bridge-only users keep the legacy socket unchanged. Re-auth after refresh comes from the new provider. `RealtimeProvider` is already an ancestor of `SocketProvider` in `pages/_app.js` (no change). |

Legacy consumers unchanged: `useVentilatorData.ts` (`socket`, `isConnected`, `bindSocket(socket)`), `useRemoteVentilator.ts` (`socket.on/off` of `ventilator:*`, `isConnected`).

## Pending swaps (not 1:1)

| Legacy | Target | Gap | Owner |
|---|---|---|---|
| `MarkdownRenderer` / `MathMarkdown` (lessons) | `@shared/rich-content` `RichContent` | Lesson pages are dark-scoped (legacy `sx`/`styled` colors) while RichContent uses light tokens; MedicalCodeBlock/StyledTable/ZoomableImage not reproduced; legacy SSRs non-math blocks (RichContent renders a lazy fallback on SSR); `className/sx` passthrough. | Lesson migration (outside this refactor) |
| Simulator `ChartsColumn`, lesson `WaveformVisualization` | `@shared/waveforms` `WaveformChart` | Points `{x,y}` -> series `{t,v}`; zoom actions vs `windowSeconds`; legacy serial path; `ChartRegistry` side-effect import still needed by other legacy charts. | Simulator migration (outside this refactor) |
| AI tutor / grade feedback / notes / simulation assist | `@shared/ai-rating` `AiRatingWidget` | No consumer in scope; candidates are legacy features. | Feature migrations |
| `authService.refreshToken()` | `@shared/api-client` refresh | POSTs `/auth/refresh` without the `refreshToken` body the contract requires; no callers (only the unused default export). Delete with the auth feature. | T9 |
| `authService` login/register/`logout()`, legacy `AuthContext`, `useAuth.js` | `@shared/session` `establishSession`/`signOut` | Different flow (NextAuth credentials + bridge token). | T9 |
| `SocketContext` with a backend session but `/me` failing (5xx/network, tokens kept) | — | Legacy context is idle and RealtimeProvider has no socket until the session recovers (before T8 legacy would have connected with that token). Backend is unreachable in that state anyway. | Accepted; revisit in T12 |
| Legacy `useSocket` consumers -> `useSocketEvent` | `@shared/realtime` | `ventilator:*` events are not typed in the realtime contract yet. | Simulator migration |
| `httpClient.ts` | — | No own refresh/logout logic (delegates to `http.ts`); nothing to change. | — |

Hydration note: `SocketContext` reads token storage with `useSyncExternalStore` (server snapshot `false`) plus a fresh read when memoizing the legacy socket, so a backend-session tab never creates the legacy `io()` instance, even during hydration.

## Legacy allowlist inventory (measured 2026-10-13)

Scope: `src/**` minus the new-code folders (`src/shared/{api-client,realtime,session,design-system,layouts,rich-content,waveforms,ai-rating,lib}`, `src/features/groups`, `src/features/{auth,profile}/{api,application}`), and all of `pages/**` (no thin route rewritten yet). Header = `Funcionalidad` in the first 2000 bytes.

| Area | JS/TS files | `sx=` | `style={` | `styled(` | Files without header |
|---|---|---|---|---|---|
| `src/` legacy | 489 | 3218 (214 files) | 73 | 89 | 433 |
| `pages/` | 36 | 195 (10 files) | 12 | 0 | 23 |
| Legacy `.css` | 29 | — | — | — | 18 |

Other legacy baselines: `tsc -p tsconfig.json` 278 `error TS` (279 before T8; one TS7030 fixed in `SocketContext.tsx`); `npm run lint:legacy` 234 errors (pre-existing).

## NextAuth uses that must stay

- `pages/api/curriculum/levels/[levelId].js` (server session check; decision 1 of the feature doc).
- `pages/api/auth/[...nextauth].js`, `pages/api/auth/backend-token.js` (the bridge token used by legacy HTTP/socket), `lib/auth.ts`, `src/lib/apiAuth.js`, `src/shared/utils/serverAuth.js` (server helpers).
- Client: `pages/_app.js` (`SessionProvider`), `pages/auth/login/index.jsx`, `pages/auth/register/index.jsx`, `src/shared/hooks/useAuth.js`, `src/shared/components/Navbar.jsx`, `src/shared/contexts/SocketContext.tsx`, `src/shared/services/sessionExpired.ts` (signOut), `src/features/ensenanza/shared/hooks/useProgress.ts`, `src/features/progress/hooks/useTokenManager.js` (protected zone).
- The login/register pages and `useAuth` go away with T9; the API routes and progress hooks stay while legacy needs them.

## Windows case collision

`src/features/profile/ui/` (legacy, `profile.module.css`) and the template `src/features/profile/UI/` are the SAME folder on Windows (case-insensitive). Resolve in T10 (move the legacy file or rename before adding `UI/`).

## Files the author still has to `git rm`

The feature doc records 14 unreferenced files (command already given to the author). Tracked candidates still present: `jsconfig.json`, `ARQUITECTURA.md`, `public/{file,globe,next,vercel,window}.svg`, `public/index.html`, `public/test-db-fetch.html`, `docs/README.md`, `docs/architecture/ADR-001-frontend-structure.md`, `docs/setup/INSTRUCCIONES_ACTUALIZAR_ENV.md`, `docs/setup/README_ENV.md` (13; the 14th is in the command given to the author).
