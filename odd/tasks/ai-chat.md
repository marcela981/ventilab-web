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
- [ ] A2 (D) `/assistant` and `/assistant/[conversationId]` pages: list (filter, search, inline rename, delete confirm, origin + "Ir a la lección" link), conversation view (streaming, stop, interrupted + retry, auto-scroll + "Ir al final", copy, ai-rating, empty state with suggestions, disclaimer, error/off-topic states), mobile split, 404 view.
- [ ] A3 (D) AiChatProvider in the layout + launcher button in the AppShell top bar + dynamic drawer (full screen on mobile), persists across navigation, expand to `/assistant/[id]`, focus management.
- [ ] V1 (I) Verification: typecheck, lint, tests, greps, build + bundle comparison; parity notes; docs.
- [ ] P2 Remove legacy AI chat components — ONLY with the author's approval.

## Progress / evidence
- Phase 1 audit: `odd/ai-chat-audit.md` (2026-10-15).
