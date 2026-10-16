# Feature: simulation (simulator + case-editor + shared/ventilator-console)

## Objective
Migrate the simulation features onto the template base:
- `simulator` (all roles): catalog, running console, result, replay and the exam practical slot;
- `case-editor` (teacher/admin): list and sectioned editor.

Both are built on a generic `src/shared/ventilator-console`. The engine runs in a Web Worker. Audit: `odd/simulation-audit.md`.

## Why
The legacy `/simulador` streams backend Socket.io data and has no confirmation pattern, alarms, modes beyond VCV/PCV, replay or exam integration. The backend already exposes the engine-based session and clinical-case API.

## Decisions (orchestrator, 2026-10-15; the author asked to run every phase without stopping or asking)
1. **Folder structure**: `src/features/<name>/{api,application,UI,index.ts}`, with static config in `application/config`, because the ESLint boundaries only accept these layers. This is the same decision as ai-chat.
2. **Engine vendoring**: `scripts/sync-sim-engine.mjs` copies `ventylab-server/src/features/simulation/domain/engine/**` and `common/domain/ventilator/ventilator-limits.ts` into `src/shared/sim-engine/` (generated header + `--check` mode). This is the same model as `scripts/generate-api.mjs`, and `next.config` is not touched.
   - The ventilator limits copied from the backend are the single source for the control limits.
3. **Worker**: `src/shared/sim-engine/runtime/` holds a pure stepping loop (fixed step, wall clock × multiplier, catch-up after a background tab, batches) and a thin `sim.worker.ts` (`new Worker(new URL(...), import.meta.url)`). The loop is unit-tested directly because jsdom has no Worker.
4. **Waveform renderer**: a raw canvas sweep/scroll renderer with freeze and a measurement cursor is added to `shared/waveforms`. Chart.js would cost an estimated 5–10 ms per frame at 50 Hz for three curves. `WaveformChart` (Chart.js) stays for static charts.
5. **Pause maneuvers**: the engine has none (only the `inspiratoryPauseS` setting), so no hold buttons are shown. Reported.
6. **Patient monitor**: shows only what the engine outputs (SpO2, PaO2, PaCO2, pH, MAP). HR, systolic/diastolic BP, temperature and Glasgow are dropped.
7. **Alarm priority**: the engine has no priority. A static map from alarm type to high/medium/low lives in the console config, and the backend gap is reported.
8. **Engine version**: there is no endpoint. The vendored `ENGINE_VERSION` is compared with `engineVersion` returned by `POST /simulation/sessions` (and by the replay endpoint). FREE shows a warning; EXAM blocks the console before the worker starts.
9. **Time multipliers**: there is no endpoint. The allowed values are read from the generated OpenAPI type (`1|2|4`), not hardcoded in the UI.
10. **Rubric editor**: `src/shared/rubric-editor` receives BOTH editors:
    - the promoted parameter rubric editor, which evaluation-authoring re-imports with no behaviour change;
    - a new outcome rubric editor (TARGETS_REACHED, TIME_IN_RANGE, … + assistance policy + passing score), because a case `defaultRubric` uses the outcome schema.
11. **Legacy `/simulador`**: it is the only UI for the physical ventilator (reservations, connection, MQTT). It is NOT redirected until ventilator-lab is migrated, because that would destroy a working capability. Nav keeps it as "Ventilador real", and the new "Simulador" entry points to `/simulator`. Any other legacy simulator route redirects.
12. **Dropped legacy extras (YAGNI)**: draggable metric-card layout, TXT export, PCV auto-adjust. They are listed in the parity checklist.
13. **Git**: the same as previous migrations. Conventional Commits on `master`, no AI attribution, no branches. Each commit is reviewed (consent granted by the standing instruction), with an independent reviewer when native review fails with `lens_context_budget_exceeded`. Push once at the end.
14. **Protected-zone exception (tooling only)**: path additions in the `package.json` lint script, `tsconfig.strict.json`, `eslint.config.mjs` and `vitest.config.ts`, the same as previous migrations.
15. **E2E / profiling / visual**: Playwright is not installed, and there is no browser or servers. These checks are documented as manual and pending; unit tests cover the logic.

## Backend gaps to report
- No endpoints for engine version, ventilator ranges, physiological ranges or time multipliers.
- No pause maneuvers in the engine, and no alarm priority.
- The case list has no status or validated flags (only `/definition` has them).
- There is no test-run for an unsaved draft and no revert of expert validation.
- Teacher replay access is enforced only by the backend, and is unverified from the spec.

## Checklist (D = delegated writer, I = inline)
- [x] T1 (D) Console tokens in the design-system + engine vendoring script + `shared/sim-engine` runtime (pure loop + worker) + tests.
- [ ] T2 (D) `shared/waveforms` canvas sweep/scroll renderer, freeze + measurement cursor + tests.
- [ ] T3 (D) `shared/ventilator-console` part 1: adapter contract, curves zone, numeric monitoring, patient monitor, responsive layout.
- [ ] T4 (D) `shared/ventilator-console` part 2: mode selector, pending→confirm/cancel controls, alarms bar/history/limits/silence/sound + tests.
- [ ] T5 (D) simulator: api services, catalog with filters, "Mis sesiones" history, routes + nav.
- [ ] T6 (D) simulator: session console page, worker adapter, event queue (batch/retry/idempotent), case panel, time controls, end session.
- [ ] T7 (D) simulator: AI assist panel.
- [ ] T8 (D) simulator: result + replay.
- [ ] T9 (D) simulator: PracticalQuestionSlot renderer registration + EXAM flow (deadline, no pause).
- [ ] T10 (D) `shared/rubric-editor` promotion + outcome rubric editor.
- [ ] T11 (D) case-editor: list + sectioned editor + save/dirty guard.
- [ ] T12 (D) case-editor: test-run, local preview, expert validation, delete 409 → archive.
- [ ] T13 (D) legacy redirects, nav, parity doc, final verification (typecheck, lint, test, greps, build + bundle).
- [ ] P2 Legacy removal: ONLY with the author's approval.

## Progress / evidence
- Phase 1 audit: `odd/simulation-audit.md` (2026-10-15).
- T1 (delegated writer, 2026-10-15): `--vl-console-*` tokens in `design-system/UI/tokens.css` (v1.1, contrast computed: text 18.6:1, curves 6.7–8.6:1, alarm fills ≥5.1:1); `scripts/sync-sim-engine.mjs` (+ `--check`) vendors 17 files into `src/shared/sim-engine/engine/` (shared limits at `engine/common/ventilator-limits.ts`); runtime `sim-loop.ts` (fixed 10 ms step, accumulator, max 2000 sim ms per tick), `protocol.ts`, `sim-worker-host.ts` (testable worker logic), `sim.worker.ts`, `create-sim-worker.ts`, barrel `index.ts`; registered in eslint/lint script/tsconfig.strict/vitest; preventive ESLint rule forbids `@shared/sim-engine` and `@features/*` in `src/shared/ventilator-console/**` (probed with eslint --stdin: 2 errors as expected).
  - Checks: `npm run typecheck` 0 errors; `npm run lint` 0 errors; `npx vitest run src/shared/sim-engine` 4 files / 28 tests green (a 60 s gap at ×2 catches up to exactly 120 000 ms in 60 ticks with 6000 samples and 0 dropped; a scheduled PARAM_CHANGE gives metrics identical to the engine `replay`); `node scripts/sync-sim-engine.mjs --check` exit 0.
  - Deviations: the script adds `// @ts-nocheck` to vendored files because the front compiles with `noUncheckedIndexedAccess` and the backend does not (13 indexed-access errors); it also marks type-only imports with `type` (verbatimModuleSyntax). The vendored folder is ESLint-ignored like the generated api-client. Worker logic lives in `sim-worker-host.ts` so it is unit-tested; `sim.worker.ts` is a thin entry. `setMultiplier` changes only the wall→sim rate; the engine `timeMultiplier` (slow dynamics) is fixed at init. Finding: the engine already emits `Alarm.severity` HIGH|MEDIUM (audit section c said no priority) — relevant to decision 7 in T4.
  - Pending (manual): a `next build` smoke test of the Worker bundle (not run: forbidden without the author).

## Next step
T2.
