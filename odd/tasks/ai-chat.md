# Feature: ai-chat

## Objective
Migrate the AI assistant: a free chat limited to medicine and the respiratory system, plus the management of the user's own conversations. It has two entry points that share the same components and state:
- the full page `/assistant` and `/assistant/[conversationId]`;
- a global launcher in the AppShell top bar that opens a drawer, loaded with a dynamic import.

The streaming UI of the learning panels ("Profundizar", "Preguntas") is extracted into a generic `src/shared/ai-conversation`, without changing what those panels do.

## Why
The learning panels and the assistant need the same streaming conversation UI (DRY). The legacy AI chat (`ensenanza/shared/components/ai`) cannot be reached. It called Gemini from the browser and used endpoints that no longer exist. Audit: `odd/ai-chat-audit.md`.

## Decisions (orchestrator, 2026-10-15; the author asked to run all phases without stopping)
1. **Folder structure follows the existing features**: `src/features/ai-chat/{api,application,UI,index.ts}`, plus `config/` for static configuration. The prompt asks for `{components,hooks,services,types}`, but the ESLint boundary rule only treats `{api,application,UI}` as feature layers (`eslint.config.mjs:184-190`). The continuity rule ("follow exactly the patterns of the migrated features") wins. Mapping: services and types → `api/`, hooks → `application/`, components → `UI/`.
2. **Free chat** = one streamed `POST /api/tutor/conversations {scope:"FREE", message}`, which creates the conversation and streams the first answer (the id arrives only in `done`). Follow-ups use `POST /api/tutor/conversations/{id}/messages`. Messages are limited to 4000 characters, the same limit as the backend and the questions panel.
3. **Off topic**: the backend sends no dedicated signal. It returns HTTP 200 with a fixed `delta` text (`OFF_TOPIC_REPLY`) and a normal `done`. The front detects it by an exact match of the final text against a mirrored constant. This is reported as a backend gap.
4. **Quota usage**: no endpoint exists, so nothing is shown and nothing is computed on the client. Reported as a gap. A 429 shows the reset time taken from `Retry-After` or `resetAt`.
5. **Sources**: `done` carries no `sources`. A citation component renders only when sources exist, so with today's backend nothing is shown.
6. **Search by title**: no backend search exists, so the list filters the pages already loaded on the client. This is labelled in the UI as a filter of loaded conversations and reported as a gap.
7. **Legacy**: no legacy route is reachable, so there is nothing to redirect. Legacy files stay until the author approves deletion (P2).
8. **Git**: the same as the previous migrations: Conventional Commits on `master`, NO AI attribution, no branches. Review each commit natively (consent granted per the standing instruction) and push once at the end.
9. **Protected-zone exception (tooling only)**: the same as the previous migrations. Path additions are allowed in the `package.json` `lint` script, `tsconfig.strict.json`, `eslint.config.mjs` and `vitest.config.ts`.
10. **E2E**: Playwright is not installed and the backend has no runtime fake AI provider. The E2E scenarios are documented as pending/manual, and unit tests (vitest + msw) cover the logic.

## Backend gaps to report
- No quota usage or remaining-quota endpoint.
- No search by title.
- No `refId` filter.
- No explicit off-topic signal (HTTP 200 + fixed text).
- `done` has no `sources`.
- The title and `conversationId` of a new FREE conversation arrive only in `done`. If the first turn is aborted, the client re-reads the list.

## Checklist
Route per task: D = delegated writer, I = inline.

- [x] S1 (D) `src/shared/ai-conversation`: useStreamingResponse (rAF delta batching, states, abort, done metadata), AiMarkdown (safe markdown, lazy KaTeX), MessageList, MessageBubble, StreamingMessage, Composer, TypingIndicator, SourceCitations, generic error-message core; registrations; unit tests. Commit 34a2180. Native review: medium, granted, reliability lens APPROVED, acknowledged; its 3 advisory findings were fixed in S2.
- [x] S2 (D) Refactor the learning deepen and questions panels onto S1 pieces with no behaviour change; all existing learning tests green (34 files / 223 tests). Commit 3edc4ca. Review: medium, granted, APPROVED and acknowledged. Its WARNING "rating remounts on a follow-up question" was fixed in b113e10; assess returned under_budget, so b113e10 is pending in the next slice. The questions panel keeps Enter as a newline and shows no counter through the Composer opt-in props `submitOnEnter={false}` and `showCounter={false}`. Deepen keeps its own form because it allows an empty question.
- [x] A1 (D) [commit 293b66a; review slice 3edc4ca..293b66a (incl. b113e10), medium, granted, APPROVED + acknowledged; 3 WARNINGs (recover wrong conversation, stale text ref on stop, non-404 load error stuck loading) fixed in A2] ai-chat api + application: conversations service (list/detail/rename/delete/create FREE/send), hooks (conversation list with scope filter + pagination + client title filter, chat session with retry/abort/off-topic/quota), suggestions config, nav + routes entries.
- [x] A2 (D) [commit f1d51bf; review slice 293b66a..f1d51bf medium, granted, APPROVED + acknowledged; WARNINGs new-chat no-op, page not clamped + SUGGESTION copy timer after unmount fixed in A3] `/assistant` and `/assistant/[conversationId]` pages: list (filter, search, inline rename, delete confirm, origin + "Ir a la lección" link), conversation view (streaming, stop, interrupted + retry, auto-scroll + "Ir al final", copy, ai-rating, empty state with suggestions, disclaimer, error/off-topic states), mobile split, 404 view.
- [x] A3 (D) [commit 16d5def; review slice f1d51bf..16d5def medium, granted, APPROVED + acknowledged; WARNING drawer load-failure silent → follow-up fix] AiChatProvider in the layout + launcher button in the AppShell top bar + dynamic drawer (full screen on mobile), persists across navigation, expand to `/assistant/[id]`, focus management.
- [x] A3-fix (D) Drawer import/render failure closes the drawer, shows a toast and allows a retry. Commit e64b306 (assess under_budget; reviewed in the closing slice).
- [x] V1 (I) Evidence in `odd/ai-chat-verification.md`, master e64b306:
  - typecheck 0 errors and lint 0 errors;
  - vitest 1193/1196, where the 3 failures are load-timeout flakes that pass when run alone;
  - greps clean;
  - build OK.
  - Bundle (gzip KiB, compared with the audit baseline):

    | Route | Now | Baseline | Delta |
    |---|---|---|---|
    | /_app | 285.5 | 282.9 | +2.6 |
    | /learn | 340.7 | 336.7 | +4.0 |
    | lesson | 340.8 | 336.8 | +4.0 |
    | /assistant | 339.5 | new | |

    Of the delta, about 1.8 KiB is ai-chat: provider, launcher, top-bar slot and route constant, which the launcher requirement makes unavoidable. The rest comes from shared chunks that also changed with the evaluations commits made after the baseline build. The drawer, ChatPanel, react-markdown and KaTeX sit only in async chunks. **The strict "≤ baseline" check is NOT met** for `/_app` and `/learn*`; the author has to accept the launcher's cost.
- [ ] E2E (Playwright not installed; no fake-AI runtime), the manual keyboard walk-through and the visual review (no dev server): PENDING, done manually by the author.
- [ ] P2 Remove legacy AI chat components (`src/features/ensenanza/shared/components/ai/*`, `TutorAIPopup`, `AITopicExpander`, GeminiProvider) — ONLY with the author's approval. None of them can be reached today, so no redirect was needed. The parity checklist is in `odd/ai-chat-audit.md` section f. `AIServiceManager` stays because the simulator still uses it.

## Progress / evidence
- Phase 1 audit: `odd/ai-chat-audit.md` (2026-10-15).
- Commits on master: 34a2180 (S1), 3edc4ca (S2), b113e10, 293b66a (A1), f1d51bf (A2), 16d5def (A3), e64b306, 903a31d (docs), 5401359, and the ready-flag fix.
- Closing review slice 16d5def..903a31d: APPROVED and acknowledged. Its WARNING (a failure after load showed "No se pudo abrir") was fixed in 5401359, which was reviewed, APPROVED and acknowledged. Its own WARNING (the ready flag is not cleared when the drawer unmounts for another reason, such as a session change) and its SUGGESTION were fixed in the last commit. That last commit was not re-reviewed: it is a 10-line follow-up, under the slice budget. Its tests pass, but the session-change path is covered only by code reasoning.

## Next step
The author:
1. accepts or rejects the launcher's +~1.8 KiB gzip on `/_app`;
2. runs the manual E2E, keyboard and visual checks (scenarios listed in the original prompt);
3. approves P2 (legacy removal).
