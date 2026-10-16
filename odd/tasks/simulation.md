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
   - The backlog has no cap, by design: no simulated time is lost or invented. The loop steps only while running; a backlog owed before a pause is kept and caught up after resume. A long hidden tab therefore fast-forwards on return, in chunks of at most 2000 simulated ms per tick (`maxCatchUpMsPerTick`).
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
- [x] T2 (D) `shared/waveforms` canvas sweep/scroll renderer, freeze + measurement cursor + tests.
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
- T1-fix (delegated writer, 2026-10-15; independent review of 872cf81): `src/shared/ventilator-console` joins `NEW_SHARED_MODULES` (style-ban syntax, shared boundaries, vitest + tsconfig.strict + lint script); its override keeps the style-ban import paths/patterns and adds the sim-engine/features bans (no barrel needed: lint uses `--no-error-on-unmatched-pattern`); `sim-loop.ts` v1.1 steps only while running (paused backlog kept, caught up after resume) and rejects non-finite event times; `protocol.ts` v1.1 requires finite non-negative event times, a finite seed, an allowed multiplier and finite numeric init options; `sim-worker-host.ts` v1.1 posts a typed error for start after stop (no timer re-armed) and clears timer + loop on re-init; `sync-sim-engine.mjs` v1.1 lists every file under `engine/` for the stale check and writes a deterministic `engine/SOURCE.json` (per-file SHA-256 + combined hash).
  - Checks: RED observed first (8 failing tests: pause backlog ×2, non-finite events ×3, protocol ×2, start after stop); `npx eslint --print-config src/shared/ventilator-console/x.tsx` shows 5 syntax selectors + 5 paths/3 patterns; stdin probe (`style={{}}` + `@shared/sim-engine` + `@emotion/styled`) gives 3 errors; `npm run typecheck` 0 errors; `npm run lint` 0 errors; `npx vitest run src/shared/sim-engine` 4 files / 38 tests green; `node scripts/sync-sim-engine.mjs --check` exit 0 (18 files; a leftover `engine/leftover.md` probe was reported stale, exit 1, then removed).
- T2 (delegated writer, 2026-10-15): `shared/waveforms` v1.1 adds `waveform-ring-buffer.ts` (Float32 ring per channel + Float64 time, push/pushBatch, readAll/readWindow/readSince, clear + generation), `waveform-geometry.ts` (pure: sweep ratio/x, scroll x, value→x/y, erase spans with wrap, pixel→time for sweep/scroll, nearest-sample binary search, auto-range, 1/2/5 ticks, lanes, loop extraction, cursor readout text), `use-waveform-renderer.ts` (rAF loop throttled to 30 fps, DPR backing store + ResizeObserver + DPR-change check, `full` repaint flag, colors/font read from CSS custom properties of the canvas), `sweep-painter.ts` (stacked lanes, grid + tick values + label with units; sweep paints only the new segment plus a 12 px erase bar, clipped to the erase spans; full repaint on resize/clear/auto-range wrap/catch-up; scroll repaints when data changes), `sweep-canvas.tsx` (`SweepCanvas`: sweep|scroll, window, fixed or auto ranges, `frozen` snapshot; the frozen canvas becomes a `slider` with pointer, arrows, Shift×10, Home/End and an aria-live readout placed via `style.setProperty('--vl-waveform-cursor-x')`), `loop-painter.ts` + `loop-canvas.tsx` (`LoopCanvas` x vs y over the last window; the consumer switches P-V/F-V by axes), `UI/sweep-canvas.module.css` (console tokens only). `WaveformChart` untouched. Waveforms does not import sim-engine.
  - Checks: `npm run typecheck` 0 errors (exit 0); `npm run lint` 0 errors (exit 0); `npx vitest run src/shared/waveforms` 4 files / 45 tests green (ring 10, geometry 22, canvas components 9 with a Proxy 2D-context mock and a manual rAF, existing chart 4). RED observed for geometry (module missing) before GREEN.
  - Deviations: about 1 400 authored lines without tests (about 530 test lines) (over the 400 advisory heuristic: buffer, geometry, hook, two painters and two components are the minimum coherent set). Canvas colors resolve through `ctx.fillStyle` (a `color-mix()` token the canvas cannot parse falls back to the canvas computed `color`). In sweep mode the frozen snapshot keeps the full window, so keyboard steps can land on samples hidden under the erase gap. Freeze snapshots are captured with the "adjust state during render" pattern (react-hooks v7 forbids setState in effects).
  - Pending (manual): visual check in a browser (sweep bar, HiDPI, cursor readout placement) and frame-time profiling; no browser available.
- T2-fix (delegated writer, 2026-10-15; review findings on 9d893cb): ring buffer v1.1 (binary-search window bounds, `createWindow` + `readWindowInto`/`readSinceInto` into a reused window); `extractLoop` v1.1 keeps one NaN gap marker per run of missing samples (pen lift, no false chord) and writes into scratch buffers returned via `subarray`; loop painter v1.1 caches its palette (re-read only on full repaint) and reuses window + scratch; sweep painter v1.1 renders the chrome once per full repaint (or range change) into an offscreen canvas and incremental frames `clearRect` + `drawImage` only the erase spans (direct-paint fallback when no offscreen 2D context), scroll mode reads into the reused window, the last point is copied in place; renderer hook v1.1 forces a full repaint on `data-theme` (MutationObserver on `<html>`) or `prefers-color-scheme` changes and reports `onResize`; SweepCanvas v1.1 drops `aria-live` (kept `aria-valuetext` + `aria-describedby`), adds PageUp/PageDown (10 % of the window), re-places the readout on resize while frozen, and captures a sweep snapshot from `latest - window + gap`.
  - Checks: RED first for the ring/geometry additions (4 failing); `npm run typecheck` exit 0; `npm run lint` exit 0; `npx vitest run src/shared/waveforms` 4 files / 55 tests green (new: binary search across wraps, read-into without allocation, small-target RangeError, NaN gap marker, scratch views, PageUp/PageDown, span copy, two spans across the wrap, palette re-read only on full repaint/theme change, sweep snapshot after the gap, unmount cancels rAF + disconnects ResizeObserver, loop pen lift).
  - Deviations: canvas component tests were written alongside the fix (not strictly RED first). Per-frame allocation is removed for sample arrays; small per-frame objects (erase span tuples, the range array, trace closures) remain.

## Next step
T3.
