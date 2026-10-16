# Phase 1 audit: simulator + case-editor + shared/ventilator-console

Date: 2026-10-15. Frontend: `ventilab-web`, branch `master`, HEAD `ba3fd88`. Backend: `ventylab-server`, branch `main`, HEAD `52cfa85`. Read-only audit. No source file was modified, nothing was built, and git was used only for reads.

All paths are relative to `ventilab-web/` unless they start with `ventylab-server/`.

## 0. Premises of the request that do NOT hold (verified)

1. **There is no `sim-engine` package.** No folder, package, workspace or alias by that name exists in either repo or anywhere under `C:\Marcela\TESIS` (node_modules, .git, dist, .next and coverage excluded). The engine is the folder `ventylab-server/src/features/simulation/domain/engine/`: 16 non-spec files, about 2.9k lines including specs. It has no package.json and is compiled with the NestJS app. The frontend has **zero** hits for `sim-engine`, `simEngine`, `ENGINE_VERSION` or `new Worker`. See section b.
2. **The legacy screen has no client-side physiological model.** Its curves come from the backend over Socket.io (`ventilator:data`), from the physical ventilator or the backend patient simulation. The only client formulas are algebraic setpoint helpers. See section a.
3. **Pause maneuvers.** The engine has only the `inspiratoryPauseS` setting (0–2 s, which produces the plateau). There is **no inspiratory-hold or expiratory-hold maneuver and no expiratory-pause setting**. Per the request ("ONLY if sim-engine supports them"), the console must not offer a hold button, and the legacy "Pausa espiratoria" field has no engine counterpart.
4. **Patient variables.** The engine produces SpO2, PaO2, PaCO2, pH and MAP. It does **not** produce HR, EtCO2 or systolic/diastolic BP. The patient monitor can show only what the engine returns.
5. **The rubric editor of evaluation-authoring cannot become the case "default rubric" editor.** It edits the *question* rubric, which is a comparison of parameters: `{criteria:[{parameter, expectedValue, min?, max?, priority?}], justification?}`. A case `defaultRubric` is an outcome rubric: `{criteria:[{type: TARGETS_REACHED|TIME_TO_STABILIZE|TIME_IN_RANGE|PLATEAU_PRESSURE_LIMIT|DRIVING_PRESSURE_LIMIT|TIDAL_VOLUME_LIMIT|AUTO_PEEP_LIMIT|AI_ASSIST_USAGE, weight, threshold, windowMinutes?, penaltyPoints?}], assistancePolicy: DISABLED|ALLOWED_WITH_PENALTY, passingScore}` (openapi `ClinicalCaseRubricDTO`, `RubricCriterionDTO`). Session scoring also **skips** the parameter-comparison rubric as "legacy" and falls back to the case default rubric (`ventylab-server/src/features/simulation/domain/sessions/simulation-session-rubric.ts:96-107`, `isParameterComparisonRubric`). See section f.
6. **Missing endpoints.** There is no endpoint for the engine version, for physiological or ventilator ranges, or for the time multipliers. These values exist only in DTO validation and in the engine source. See section e.
7. **No screenshots.** There is no dev server (forbidden by the instructions), so no screenshots were taken. Every view is described from code.

## a) Legacy simulator screen

### Route, navigation and roots
- Page: `pages/simulador/index.js`. Its tree is `LearningProgressProvider > ConexionVentiladorProvider > VentilatorDashboardWrapper isRealVentilator={tieneReserva}` (:31-52). The root has the class `vl-legacy-dark`.
- Feature root: `src/features/simulador/` (about 14.2k lines), barrel `src/features/simulador/index.ts`.
- Nav and route entries:
  - `src/shared/layouts/nav.config.ts:52`: "Simulador", `MonitorHeartIcon`, **STUDENT only**.
  - `src/shared/session/routes.config.ts:44`: `"/simulador": {access:"authenticated"}`.
  - Legacy sidebars: `src/shared/components/Sidebar.jsx:49` and `src/features/admin/components/panel/PanelSidebar.jsx:268`.
  - `src/shared/utils/redirectByRole.js:25-33` uses `/simulador` as a landing route.
- `VentilatorDashboardWrapper.tsx` binds the socket stream. It shows `NoSignalBanner` when a reserved real ventilator goes stale and calls `simulatorApi.saveSession` on unmount (:89-105).

### Views, described from code
**Global frame.**
- Page background is `var(--color-bg-primary)` = `#0a112b` (`src/styles/theme.css:6`). Layout is one flex column (`src/features/simulador/ui/SimuladorPage.module.css`).
- `VentilatorDashboard.jsx` wraps the screen in its own dark MUI theme (`src/styles/mui-overrides`): primary `#10aede`, secondary `#3d98cc`, paper `rgba(255,255,255,0.05)`, success `#4caf50`, warning `#ff9800`, error `#f44336`.
- A fixed bottom navigation, `compartido/navegacion/SimuladorTabs.jsx`, uses `rgba(31,31,31,0.95)` with blur, highlights the selected tab in `#de0b24`, and is offset by the sidebar width (240 or 64 px). Its tabs are "Simular Paciente", "Monitoreo" (default) and "Conexión" (:123-125).
- Fixed overlays at the top right (`VentilatorDashboard.jsx:363-460`): a recording indicator ("Grabando configuraciones (n enviadas)"), a toast, and a TXT/PDF download menu whose trigger is commented out.
- The AI analysis drawer (`AIAnalysisPanel.jsx:32-37`) opens on the right and is 380 px wide.

**Monitoreo** (`dashboard/componentes/MonitoringTab.jsx:174-245`). Three columns in a row; they stack on xs.
1. **`MetricColumn.jsx`, 260 px wide.**
   - Logos (`/images/logo.png`, `/images/logo-univalle.svg`).
   - Switch "Datos Reales / Paciente Simulado"; switch "Simular Gráficas" (simulated mode only).
   - Buttons "Enviar"/"Guardado" and "Detener", "Ajustar/Salir Ajuste" and "Restablecer".
   - 12 metric cards, `DEFAULT_CARD_CONFIG` in `ventilator-limits.ts`:
     - shown by default: Presión Pico, Presión Media, PEEP, Flujo Max, Flujo, Flujo Min, Vol Max, Volumen, and Vol Integrado (with a reset-to-0 button);
     - hidden by default: Compliance, Presión Meseta, Presión Platón.
   - The cards can be dragged, hidden or shown. Each shows a trend arrow (`getTrend`) and a value colour from `VALUE_COLOR_RANGES`: `#4caf50` normal, `#ff9800` warning, `#f44336` danger, `#76c7c0` neutral.
   - Live values are derived from stream stats (`MonitoringTab.jsx:35-96`): Pico = max pressure, Media = mean pressure, PEEP = min pressure, plus flow max/min/current and volume max/current.
2. **Centre column.**
   - `ParameterInputRow.jsx` inputs:
     - FiO2, 21–100 %;
     - volume mode: Volumen 50–2000 mL and Q Max (L/min);
     - pressure mode: PIP 5–60 cmH2O;
     - PEEP, 0–20.
   - `ChartsColumn.jsx` stacks three `Paper` panels (max-width 600, height 190 on xs and 220 on md, background `rgba(141,138,138,0.2)`):
     - Presión cmH2O, `#ef5350`;
     - Flujo L/min, `#42a5f5`;
     - Volumen mL, `#66bb6a`.
   - Status chip: "Conectado (Físico)", "Simulando" or "Sin señal".
   - Zoom in, out and reset with a 10 s default window, clamped to 2–60 s (`useChartCalculations.ts:44-163`). Placeholder text appears when there is no data (:209-215).
3. **`ControlsColumn.jsx`.**
   - `ModeToggle` (volume or pressure) and the AI analysis button.
   - Insp/Esp slider, 0–1 in steps of 0.01, with read-only I:E boxes and a "Ti | Te" readout.
   - "Pausa Inspiratoria" and "Pausa Espiratoria" as plain numeric TextFields with no limits.
   - Frecuencia input limited to 5–60, but its slider runs 0–24 (`ControlsColumn.jsx:160-175`). **This is a bug in the legacy screen.**
   - `ComplianceStatus` and `ValidationAlerts` ("Ver Alertas Detalladas").

**Simular Paciente** (`simuladorPaciente/FormularioPaciente/`). A two-step stepper (`PatientForm.tsx:107,367`).
- Step 1:
  - Nombre, Edad, Sexo, Peso and Estatura.
  - PCI (IBW) by Devine: `50|45.5 + 0.91*(h-152.4)` (`usePatientForm.ts:114`), plus IMC and VT predicho.
  - Condición with 16 options (:59-76) and Dificultad.
  - Diagnóstico, Alergias (chips) and Antecedentes.
- Step 2: FC, FR, SpO2, Temp, Sistólica/Diastólica, Glasgow and Patrón respiratorio.
- Submit calls `POST /simulation/patient/configure`, then `/patient/start` with an initial VCV command (`FormularioPaciente/index.tsx:84-112`). Afterwards a banner reads "Paciente activo · IBW · VT recomendado".

**Conexión** (`conexion/componentes/ConexionVentiladorTab.tsx`, state machine `useConexionVentilador.ts`).
- `PanelReserva` shows "Disponible", "Reservado por X" or "Activa · n min restantes", with Reservar (opens `ReservationDialog`) and Liberar.
- `PanelConexion` offers connect and disconnect with `IndicadorEstadoConexion`.
- A legacy Web Serial path still exists (`useSerialConnection.js:76,116`, 9600 baud), but the page does not import `ConnectionTab.jsx`, `ConnectionTabContent.jsx` or `WhatsAppTransfer.jsx`.

### How curves are computed today
- **Stream.** Socket.io `ventilator:data` (`ventilatorStreamStore.ts:248`) on the authenticated socket of `src/shared/realtime/realtime-provider.tsx:42`.
- **Store.** A module singleton with `BUFFER_SIZE=300` (:33), trimmed with push + splice (:152-153). Every flush builds a full `buffer.slice()` snapshot (:117). Flushes run in an rAF loop throttled to `FLUSH_MS=80`, about 12.5 fps (:168-191), and the store is read through `useSyncExternalStore`.
- **Dev emitter.** `conexion/websocket/dev/syntheticVentilatorEmitter.ts`, behind `NEXT_PUBLIC_DEV_VENT_EMITTER=1`. It runs `setInterval` at 60 Hz by default and produces a piecewise-sine 4 s cycle.
- **Serial path.** `serial/hooks/useVentilatorData.js:155-185`: 700-sample arrays sent to React state about 3 times per second; the integrated volume is a running sum of flow.
- **Client formulas (setpoints only).** `useDashboardState.ts:249-348`:
  - VCV: Ti from the cycle time and I:E; `qMax = 60·V/(1000·Ti)·0.98`; tank pressure is a quadratic.
  - PCV: `VT = 1000·C·(PIP-PEEP)` with `C = 0.02051`.
- **Unused formula code:** `compartido/utils/ventilatorCalculations.js`, and the sine mocks `useMockData.js` and `simulatedRealTimeData.js`.

### Controls, alarms and AI
- **Modes:** VCV and PCV only.
- **Sending.** Edits apply to local state immediately. Nothing is sent until "Enviar" (`handleSendConfiguration`, `useDashboardState.ts:381-413`), which validates, sends a serial frame, records the configuration and auto-downloads a TXT. It also posts `POST {BACKEND}/simulation/command` (`useVentilatorControls.ts:75`) with `{mode, tidalVolume, respiratoryRate, peep, fio2, pressureLimit, inspiratoryTime, ieRatio}`. A mode change sends the command as well (`VentilatorDashboard.jsx:150-193`). There is **no pending→confirm/cancel step**.
- **Limits:** `PARAMETER_SAFE_RANGES` in `ventilator-limits.ts`:

  | Parameter | Legacy range |
  |---|---|
  | Frequency | 5–60 |
  | VT | 50–2000 |
  | PIP | 5–60 |
  | PEEP | 0–20 |
  | FiO2 | 21–100 |
  | Ti | 0.2–3 |
  | Te | 0.2–10 |

  These do **not** match the engine limits (section c).
- **Alarms.**
  - The contract types are in `src/contracts/simulator.contracts.ts:18-28`.
  - The store keeps `activeAlarms` from `ventilator:alarm`, and `acknowledgeAlarm` emits `alarm:acknowledge` (:86-93).
  - **No UI renders alarms, and there is no silence or history.**
  - The only alarm-like logic is client error detection (`useErrorDetection.ts:99-169`): a deviation from the target over 5 % is an error, over 10 % for pressure or 15 % for volume/flow is high severity, and compliance outside 0.015–0.15 is a warning. In PCV, high-severity errors auto-adjust and re-send after 1.5 s (`useDashboardState.ts:210-229`).
- **Patient monitor.** SpO2, HR, BP, Temp and Glasgow exist only as form inputs. No monitor display is rendered.
- **AI.** `useAIAnalysis.js` runs `AIServiceManager.analyzeVentilatorConfiguration`, a client-side provider chain (gemini → openai → claude, `src/features/ai-feedback/services/AIServiceManager.js`). It compares the user's configuration against `generateOptimalConfig` (`useDashboardState.ts:439-456`).
- **Backend calls** (`compartido/api/simulator.api.ts`, all under `/api/simulation`):
  - `GET /status`, `POST|DELETE /reserve`;
  - `POST /session/save`, `GET /sessions`, `POST /session`;
  - `POST /patient/configure|start|stop`, `GET /patient`;
  - `GET /health`;
  - plus `POST /simulation/command`.

  All of these still exist in openapi (section e).

## b) How sim-engine is consumed and whether it can run in a Web Worker

**Where it lives.**
- `ventylab-server/src/features/simulation/domain/engine/` contains `alarms, cycle-metrics, engine.errors, engine.types, engine-math, engine-version, gas-exchange, hemodynamics, index, patient-effort, prng, respiratory-mechanics, simulation, targets, ventilation-modes, ventilator-limits`.
- It is not a monorepo package. There are no workspaces, no package.json or exports of its own, and no dist. The frontend `package.json` has no dependency on it.
- The backend `openapi:client` script emits `packages/api-client/src/schema.d.ts` (types only), not the engine.

**Browser and worker portability.**
- No engine file uses fs, crypto, Buffer, process, the DOM, `Date.now` or `Math.random`.
- The only import from outside the folder is `@/common/domain/ventilator/ventilator-limits` (in `engine/ventilator-limits.ts`), and that file has no imports.
- **The code is pure TypeScript and worker-safe.**

**Options to bring it into the frontend:**
1. **Vendored copy plus a sync script (recommended).** Add `scripts/sync-sim-engine.mjs`, modelled on `scripts/generate-api.mjs`, which already copies `../ventylab-server/openapi/openapi.json`. It copies the engine folder and `common/domain/ventilator/ventilator-limits.ts` into, for example, `src/shared/sim-engine/`, rewrites the one `@/` import, and adds a header noting that the file is generated. Add a `--check` mode, as in `openapi:check`, to detect drift.
   - Risk: medium (the copies can drift; the check mitigates it).
   - The ESLint, tsconfig.strict and vitest lists need a new shared module entry.
   - The vendored code must satisfy `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` and `verbatimModuleSyntax` (`tsconfig.json`, `tsconfig.strict.json`). **These are not verified.** Run `npx tsc -p tsconfig.strict.json --noEmit` after the first copy.
2. **Import across the repo boundary** through a tsconfig path to `../ventylab-server/src/...`. Next's webpack does not compile files outside the project root without `experimental.externalDir`. `next.config.mjs` and `tsconfig*` are protected zones (CLAUDE.md), so **this is not recommended**.
3. **Publish an npm package.** Too heavy for the thesis.

**Worker with the current bundler.**
- `next.config.mjs` has no custom `webpack` function. It sets only `turbopack.rules` for `.md`, `transpilePackages`, `serverExternalPackages` and rewrites `/backend/:path*` to `localhost:4000/api`.
- The `dev` and `build` scripts use `--webpack` (`package.json`). Webpack 5 natively bundles `new Worker(new URL("./engine.worker.ts", import.meta.url))`, and Next documents that pattern. **No config change is required.**
- Constraints:
  - Create the worker only in the browser (inside `useEffect`), never during SSR.
  - The tsconfig `lib` is `["DOM","DOM.Iterable","ES6"]` (`tsconfig.json`) with no `WebWorker` lib. The worker file should declare its global as `self as unknown as DedicatedWorkerGlobalScope`-style typing, or use a local `/// <reference lib="webworker" />` (the triple-slash reference is the least invasive).
  - Vitest/jsdom has no `Worker`. Put the stepping loop in a pure module (`engine-runner.ts`) that can be tested without a worker, keep the worker file a thin adapter, and inject a fake worker in hook tests.
- **This is unproven in this repo.** No Worker exists yet, and nothing was built. The first task should include a build smoke test that the author runs.

## c) Real engine capabilities (`ventylab-server/src/features/simulation/domain/engine/`)

| Topic | Fact | Evidence |
|---|---|---|
| `ENGINE_VERSION` | `"1.0.0"` | `engine-version.ts:11` |
| Public API | `createSimulation(engineCase, seed, options?) → EngineState`; `applyEvent(state, event)`; `step(state, dtMs)`; `getWaveformBuffer(state) → {samples, droppedSamples}` (**drains** the ring buffer: resets head and count); `getMetrics(state) → EngineMetrics`; `replay(engineCase, seed, events, untilMs, options?) → {metricsTimeline, final}`. Also exported: `INTERNAL_STEP_MS`, `DEFAULT_ALARM_THRESHOLDS`, `predictedBodyWeightKg`, `mechanicalPowerJPerMin`, the gas-exchange helpers, the types, the errors and the limits | `index.ts:1-33`; `simulation.ts:75,154,173,186-201,203,256` |
| Step and sampling | `INTERNAL_STEP_MS = 1`; `DEFAULT_SAMPLE_RATE_HZ = 50` (max 1000); `DEFAULT_WAVEFORM_CAPACITY = 3000` with a `droppedSamples` counter; metrics every 1000 ms; slow update every 100 ms | `simulation.ts:65-73` |
| Waveform sample | `{simTimeMs, pressureCmH2O, flowLpm, volumeMl}` | `engine.types.ts:256-261` |
| Modes | VCV, PCV, PSV, CPAP, SIMV (SIMV mandatory breath VCV or PCV); flow pattern SQUARE or DECELERATING; trigger FLOW or PRESSURE | `engine.types.ts`; `ventilator-limits.ts:61` |
| Pauses | only the `inspiratoryPauseS` setting, 0–2 s, with breath phases INSPIRATION, PAUSE, EXPIRATION. **No inspiratory or expiratory hold maneuver.** Auto-PEEP is reported in the cycle metrics | `engine.types.ts` |
| Patient outputs | PaO2, PaCO2 and their equilibrium values, SpO2 (Severinghaus), pH, alveolar PO2, shunt fraction, alveolar ventilation, **MAP only** for hemodynamics. Cycle metrics: Ppeak, Pplat, total PEEP, auto-PEEP, driving pressure, mean airway pressure, inspired and exhaled VT, VT/kg PBW, Ti, Te, I:E, total/mandatory/spontaneous rate, minute volume, mechanical power. Also conditions, alarms, and target status MET, UNMET or UNKNOWN. **No HR, no EtCO2 and no systolic/diastolic BP** | `engine.types.ts` (`EngineMetrics`) |
| Alarms | HIGH_PRESSURE, LOW_TIDAL_VOLUME, HIGH_TIDAL_VOLUME, APNEA, HIGH_RESPIRATORY_RATE, AUTO_PEEP, DISCONNECTION. Defaults: pressure 40, VT 4–10 mL/kg PBW, RR 35, auto-PEEP 5. A case can override them. **The engine assigns no high/medium/low priority**, so the front needs a mapping table | `alarms.ts:13-19` |
| Ventilator limits | VT 200–800 mL, RR 5–40, PEEP 0–20, FiO2 0.21–1.0, Ti 0.5–3 s, pause 0–2 s, Pinsp 5–40, PS 0–30, flow trigger 0.5–10, pressure trigger 0.5–10, cycle-off 5–80 %, apnea time 10–60 s; caps: max airway pressure 50, peak flow 100 L/min, min Te 0.3 s | `ventylab-server/src/common/domain/ventilator/ventilator-limits.ts:34-52` |
| Physiological ranges | Per case only (`EngineTargets`: ranges for SpO2, PaCO2 and pH, max Pplat and ΔP, VT/kg, max auto-PEEP). **No global constant**, so editor validation ranges for mechanics such as compliance and resistance must be defined on the front (gap) | `engine.types.ts`, openapi `ClinicalCaseTargetsDTO` |
| Engine events | `PARAM_CHANGE {simTimeMs, changes: Partial<VentilatorSettings>}` and `RECONNECT`. Case events scheduled in the case: BRONCHOSPASM, SECRETIONS, DERECRUITMENT, DISCONNECTION, RECONNECTION, EFFORT_CHANGE | `engine.types.ts`; openapi `ClinicalCaseEventDTO` |
| Session events (backend) | PARAM_CHANGE, AI_HELP, CASE_EVENT, ALARM_ACK, START, END. **The client may send only PARAM_CHANGE and ALARM_ACK** | `ventylab-server/src/features/simulation/domain/value-objects/simulation-session-values.ts:32-42` |
| Time multiplier | `1 \| 2 \| 4`. It is mapped to `slowDynamicsMultiplier`, so it accelerates **slow dynamics only** (gas exchange and deterioration). Waveforms still run in real time | engine options; `simulation-session-values.ts:44` (`TIME_MULTIPLIER_VALUES`) |
| Determinism | Seeded Mulberry32 PRNG whose state lives in `EngineState`. Noise is on by default (`simulation.ts:579`). No wall-clock time and no `Math.random`. The backend issues the seed (`StartedSimulationSessionDTO.seed`) | `prng.ts`; `engine-math.ts` |

**Implication for the console.** The worker runs `step(state, 1)` in a loop until wall time × 1 is reached, then calls `getWaveformBuffer` (50 Hz samples) and posts a batch. It posts `getMetrics` about once per second, or on a cycle change, and applies `PARAM_CHANGE` with the current `simTimeMs`. One real second costs 1000 `step` calls, a cost that **has not been measured**; benchmark it in a vitest micro-test before committing to the 30 fps budget. Catch-up after a background tab means stepping the missed `simTimeMs` in chunks, bounded by the ring capacity of 3000 samples, which is 60 s at 50 Hz. Beyond that, samples are dropped (`droppedSamples`) and the curve shows a gap.

## d) shared/waveforms performance with 3 curves at 50 Hz (analysis, not profiled)

**Implementation.**
- Files: `src/shared/waveforms/{index.ts, load-chart.ts, waveform.entity.ts, waveform-data.ts, waveform-chart.tsx, waveform-chart.test.tsx, UI/waveform-chart.module.css}`.
- Exports: `WaveformChart`, `WaveformChartProps`, `formatSeriesLabel`, `resolveTimeRange`, `resolveTone`, `sliceToWindow`, `toChartDatasets`, `WAVEFORM_TONES`, and the types `WaveformPoint{t,v}`, `WaveformSeries{key,label,unit,points,tone?}` and `WaveformRange`.
- Chart.js is lazy-loaded (`load-chart.ts`) and registers only Line, Point, LinearScale, Tooltip, Legend and Decimation.
- One `type:"line"` chart per mount (`waveform-chart.tsx:139`) with `animation:false`, `parsing:false`, `normalized:true`, LTTB decimation at `samples:200` (:58), point radius 0 and tension 0.15.
- On every props change `applyInput` rebuilds the dataset arrays, sets the x bounds and calls `chart.update("none")` (:85-108).
- `waveform-data.ts`: each update runs `sliceToWindow`, a full `filter` over all points, plus a `map` to `{x,y}`. The x axis is a scrolling window `[last-window, last]`.
- There is **no sweep mode, no freeze and no cursor**. Updates are driven by React renders with no internal cadence.
- **No consumers** outside the module.

**Estimate.**
- At 50 Hz with a 10 s window, each series holds 500 points, so 1500 points in total.
- At 30 fps, three charts mean 3 × (filter + map + new array of 500 objects) + 3 `update("none")` per frame.
- Chart.js `update` re-runs scale fitting, LTTB and a full canvas redraw (grid, ticks, line). Typical cost is roughly 1–3 ms per small chart on a desktop, so about 5–10 ms per frame for three. That is acceptable on a desktop but tight on low-end laptops and tablets.
- The React re-render of the parent at 30 fps, plus allocating about 45k objects per second, adds GC pressure.
- Tooltip and Legend event handlers also cost something on each pointer move.
- Freeze and a measurement cursor are awkward in Chart.js (custom plugin plus interaction hacks), and Chart.js cannot do a sweep (erase bar) without a custom dataset-splitting trick.

**Recommendation.** Write a raw canvas sweep renderer in `shared/waveforms`, for example `sweep-canvas.tsx` together with a pure `sweep-buffer.ts` (a Float32Array ring per channel).
- It is driven by its own `requestAnimationFrame`, reads from a ref (not React state), and draws only the new segment plus the erase gap each frame. That is O(new samples) instead of O(window).
- Grid and axes are drawn once on an offscreen layer. Freeze stops the copy step; the cursor is a pointer-move overlay layer reading the frozen buffer.
- Benefit: an order-of-magnitude cheaper frame (well under 1 ms for three channels), no Chart.js in the console chunk (saves the lazy Chart.js chunk, roughly 60–70 KiB gzip, **estimated, not measured**), and native sweep, freeze and cursor.
- Cost: about 300–400 lines plus tests, and HiDPI scaling and resize handling done by hand. Tests must stay on the pure buffer and geometry modules, because jsdom has no canvas without the `canvas` package.
- Keep `WaveformChart` (Chart.js) for static uses such as result and replay overview charts.
- Risk: medium.

## e) OpenAPI contract

- The frontend copy is `openapi/openapi.json`, md5 `9f84a7ce…`, **identical** to `ventylab-server/openapi/openapi.json` (last changed in backend commit `c632d95`, 2026-10-13; backend HEAD `52cfa85` touches only an e2e spec).
- Generation: `scripts/generate-api.mjs` (`npm run generate:api`) copies the backend spec and runs openapi-typescript, producing `src/shared/api-client/generated/schema.d.ts`. The backend regenerates its spec with `npm run openapi:generate` (`ventylab-server/package.json:38-40`, `scripts/openapi/generate.mjs`).
- The generated types **already contain** every endpoint below, so no regeneration is needed.
- Every success response uses the `APIResponseEnvelope` `{success, data, message, code, pagination, timestamp, traceId}`.

### Simulation sessions (new engine-based API)

| Method and path | Request | Response `data` |
|---|---|---|
| POST `/api/simulation/sessions` (startSimulationSession) | `{mode: FREE\|EXAM, caseId?, attemptId?, questionId?, timeMultiplier?: 1\|2\|4}` | `{id, seed, engineVersion, startedAt, expiresAt\|null, timeMultiplier, case: object}`; errors 404 and 409 |
| GET `/api/simulation/sessions/history` (getSimulationSessions) | query: page, limit, ids, createdAtFrom/To, sortOrder, userId, caseId, mode, status (ACTIVE\|ENDED\|ABANDONED) | `SimulationSessionDTO[]`: `{id, userId, caseId, mode, status, engineVersion, timeMultiplier, startedAt, endedAt, lastEventAt, lastSimTimeMs, score\|null, attemptId, questionId}` + pagination |
| POST `/api/simulation/sessions/{id}/events` (appendSimulationEvents) | `{events: [{id (≤64, client id), simTimeMs ≥0, type: PARAM_CHANGE\|ALARM_ACK, payload}]}` | `{accepted, duplicates, lastSimTimeMs}`; errors 409 and 422. Duplicate ids are counted, not rejected, so retries are safe |
| GET `/api/simulation/sessions/{id}/state` | — | `{id, status, simTimeMs, expiresAt, settings, metrics, alarms[], targets[]}`, replayed on the server (usable to resume) |
| POST `/api/simulation/sessions/{id}/end` | `{simTimeMs?}` | `SimulationSessionSummaryDTO {id, status, score, durationMs, simTimeMs, engineVersion, aiHelpCount, finalMetrics, targets[], breakdown[]}` |
| GET `/api/simulation/sessions/{id}/summary` | — | same summary |
| GET `/api/simulation/sessions/{id}/replay` | — | `{id, seed, timeMultiplier, case, engineVersion, currentEngineVersion, engineVersionMismatch, warning\|null, events: [{id, type, simTimeMs, payload, receivedAt}]}` |
| POST `/api/simulation/sessions/{id}/assist` (assist) | `{question? (≤1000), language?: es\|en}` | SSE. `delta {text}`, then `done {aiHelpEventId, aiCallId, source: LLM\|DETERMINISTIC}`, or `error {code, message}`. Errors before the stream (400, 403, 404, 409, 429 with Retry-After) come as the JSON envelope. EXAM is allowed only with `assistancePolicy=ALLOWED_WITH_PENALTY`. Rating: `PUT /api/ai-ratings` with targetType `SIM_ASSIST` and targetId = `aiHelpEventId`; `SIM_ASSIST` is already in `UpsertAiRatingDTO`, as `schema.d.ts:5441` shows |

### Clinical cases (also aliased at `/api/cases/**`)

| Method and path | Notes |
|---|---|
| GET `/api/clinical-cases` | query: page, limit, ids, createdAt range, sortOrder, difficulty, pathology, status. Returns `[{clinicalCase: ClinicalCaseSummaryDTO, userAttempts: {hasAttempted, bestScore, isSuccessful, lastAttempt}}]`. **The summary has no `status`, `simulationReady` or `validatedByExpert`** |
| POST `/api/clinical-cases` | `UpsertClinicalCaseDTO`: title, description, educationalGoal, mainDiagnosis, pathology (14 values), difficulty, patientAge, patientWeight, patientHeightCm?, patientSex?, comorbidities[], summary?, history? `{presentIllness, relevantHistory[]}`, labData?, initialState? `{paco2MmHg, pao2MmHg}`, mechanics? `{complianceMlPerCmH2O, resistanceCmH2OPerLps, deadSpaceMl, vco2MlPerMin, hemoglobinGPerDl, bicarbonateMmolPerL, basalShuntFraction, arteriovenousO2DifferenceMlPerDl, recruitmentCurve[{peepCmH2O, shuntFraction}], patientEffort, gasTimeConstants, hemodynamics, deterioration}`, initialVentilatorSettings? `{mode, tidalVolumeMl?, respiratoryRateBpm?, peepCmH2O?, fio2?, inspiratoryTimeS?, inspiratoryPauseS?, inspiratoryPressureCmH2O?, pressureSupportCmH2O?, flowPattern?, triggerType?, flowTriggerLpm?, pressureTriggerCmH2O?, cycleOffPercent?, apneaTimeS?, simvMandatoryType?}`, events? `[{type, simTimeMs, complianceFactor?, resistanceFactor?, shuntIncrease?, effortAmplitudeCmH2O?, effortRateBpm?}]`, targets? `{spo2Percent?, paco2MmHg?, ph?, plateauPressureMaxCmH2O?, drivingPressureMaxCmH2O?, tidalVolumePerKgPbw?, autoPeepMaxCmH2O?}`, defaultRubric? `ClinicalCaseRubricDTO`. Returns 201 `{id}` or 422 |
| GET `/api/clinical-cases/{caseId}` | `{clinicalCase: ClinicalCaseDTO (basic fields only), userAttempts}` |
| GET `/api/clinical-cases/{caseId}/definition` | the full definition, including `status`, `simulationReady`, `validatedByExpert`, `validatedById`, `isActive`, mechanics, events, targets and defaultRubric. This is what the editor loads |
| PUT `/api/clinical-cases/{caseId}` | full replace, same DTO. Errors 409 and 422 |
| DELETE `/api/clinical-cases/{caseId}` | **409 when the case is in use**, so the front falls back to archiving with PATCH `/status {status: ARCHIVED}` |
| PATCH `/api/clinical-cases/{caseId}/status` | `{status: DRAFT\|PUBLISHED\|ARCHIVED}` |
| PATCH `/api/clinical-cases/{caseId}/expert-validation` | no body. This is "Marcar como validado" |
| POST `/api/clinical-cases/{caseId}/test-run` | `{seconds? 1–1800, seed? ≥0}` returns `{engineVersion, seed, seconds, metricsTimeline[]}`; errors 409 and 404. This is "Probar caso" (server side; it needs a saved case) |
| POST `/api/clinical-cases/{caseId}/duplicate` | returns `{id}` |
| GET `/api/clinical-cases/{caseId}/attempts`, POST `/{caseId}/evaluate` | the old configuration-comparison flow (`EvaluateClinicalCaseDTO {configuration}`). Not needed by the new simulator |

### Older and other endpoints, still present
- `/api/simulation/{health, status, command, reserve (POST/DELETE), session, session/save, sessions}`
- `/api/simulation/patient/{configure, start, stop, ""}`
- `/api/reservations/**`, `/api/ventilator/{control, commands, telemetry}/**` (physical ventilator)
- `/api/platform-settings/**`, which has a `simulation` category (`schema.d.ts:16309`; admin settings, not a public ranges endpoint)

### Exam linkage
- Start a session with `{mode: EXAM, attemptId, questionId}`. The backend reads the attempt through `exam-attempt-reader.interface.ts`.
- The answer stores `simulationSessionId` (`AttemptAnswer.simulationSessionId`, `src/features/evaluations/application/entities/evaluation.entity.ts:102-106`; backend `student-evaluations.controller.ts:186,221`).
- Grading recomputes the practical breakdown (`evaluation-grading.controller.ts:98`).

### Endpoints the request needs that are MISSING

| Need | Status |
|---|---|
| Engine version endpoint (`ENGINE_VERSION` check) | **MISSING.** Workaround: compare the bundled `ENGINE_VERSION` with `engineVersion` returned by start and replay (and `engineVersionMismatch` in replay) |
| Ventilator ranges endpoint | **MISSING.** They exist only in the engine source; the vendored copy of `ventilator-limits.ts` is the shared source |
| Physiological ranges (mechanics and targets for editor validation) | **MISSING** everywhere, backend included. The front must define them and report them as a gap |
| Time multipliers endpoint | **MISSING.** A constant `[1,2,4]` mirrored from the DTO enum |
| "Validate case" (dry validation without saving) | **MISSING.** Only 422 on PUT/POST and `simulationReady` on the definition |
| Test-run of an unsaved draft | **MISSING.** test-run needs `caseId`; the local preview must run the bundled engine in the worker |
| Un-validate (revert expert validation) | **MISSING** (PATCH has no body) |
| Replay access for teachers to other users' sessions | **Not verifiable from openapi** (no roles in the spec). `history` accepts `userId`, which suggests staff access. Check the backend guard before building a teacher replay link |
| Case list with status, validation and readiness | **MISSING** from the summary DTO. The editor list must use the `status` filter, or call `/definition` per row (N+1) |
| Alarm priority (high/medium/low) | **MISSING** in the engine and the API; it needs a front mapping table |

## f) Rubric editor in evaluation-authoring

**Files.**
- `src/features/evaluation-authoring/application/components/builder/rubric-editor.tsx` (150 lines). Props `{rubric: RubricDraft, issues, disabled, newKey, onChange}`. It imports MUI, `@shared/design-system/components/form-field`, `@shared/lib/class-names`, `../../entities/builder-copy` (`BUILDER_COPY.rubric*`, `builder-copy.ts:129-137`), `../../entities/simulation-rubric.entity` and `../../../UI/simulation.module.css` (classes `.group`, `.pager`, `.criteria` :49, `.criterion` :58).
- `application/entities/simulation-rubric.entity.ts` (341 lines, pure): parameter rubric types, labels, `validateSimulationRubric`, `parseBackendRubricError`, and the draft helpers (`emptyRubricDraft`, `rubricDraftFrom`, `toRubricValue`, `sameRubric`, `rubricDraftIssues`, `add/update/removeCriterionDraft`).
- `simulation-question-fields.tsx` (43 lines), the only renderer of `RubricEditor` (:17).
- Entity importers: `builder-question.entity.ts:16-17` and `evaluation-readiness.entity.ts:13-14`.

**Tests.**
- `simulation-rubric.entity.test.ts` (157 lines, 44 rubric mentions)
- `builder-question.entity.test.ts`
- `evaluation-readiness.entity.test.ts` (uses `emptyRubricDraft`)
- `evaluation-builder.page.test.tsx` (18 rubric mentions, through the UI)
- There is no standalone `rubric-editor.test.tsx`.

**Schema mismatch.** See premise 5. The question rubric is parameter-based and is treated by session scoring as legacy. The case `defaultRubric` is outcome-based, with `weight`, `threshold`, `assistancePolicy` and `passingScore`.

**Promotion plan** (two options; the author or orchestrator decides):
- **Option A, recommended (KISS/YAGNI).** Do not move the parameter rubric editor. Create a new `src/shared/rubric-editor/` containing only the **outcome** rubric:
  - `application/outcome-rubric.entity.ts`: types mirroring `RubricCriterionDTO`, draft helpers, and client validation mirroring `ventylab-server/src/features/simulation/domain/scoring/simulation-rubric.ts`;
  - `application/outcome-rubric-editor.tsx`;
  - `UI/rubric-editor.module.css`;
  - `index.ts`;
  - tests.

  The case-editor uses it for `defaultRubric`. Evaluation-authoring could later adopt it if the backend question rubric moves to the outcome schema, but today it does not, so evaluation-authoring stays unchanged. Risk: low.
- **Option B (the literal request).** Move `rubric-editor.tsx`, `simulation-rubric.entity.ts`, its test, the `rubric*` copy keys and the `.group/.pager/.criteria/.criterion` CSS to `src/shared/rubric-editor/{application,UI}`. Re-point the imports in `simulation-question-fields.tsx`, `builder-question.entity.ts`, `evaluation-readiness.entity.ts` and its test to `@shared/rubric-editor`. The copy must stop depending on `BUILDER_COPY`: pass the labels as props, or move them into the module. Existing tests must stay green. This **still does not serve the case default rubric** (wrong schema), so it adds work without a consumer. Risk: medium, because it touches a reviewed feature.

**Boundary impact (either option).**
- Add `rubric-editor` to `NEW_SHARED_MODULES` (`eslint.config.mjs:64`), the `lint` script paths (`package.json`), the `tsconfig.strict.json` include list and `NEW_SHARED` in `vitest.config.ts`.
- shared may import only shared (`eslint.config.mjs:205`), so the module must not import `@features/*`.

## g) PARITY CHECKLIST (legacy `/simulador`, every user-visible capability)

| # | Capability | Proposed new location or note |
|---|---|---|
| 1 | Bottom tab navigation (Simular Paciente / Monitoreo / Conexión) | replaced by routes: catalog → console → result |
| 2 | Two-step patient form (name, age, sex, weight, height; IBW by Devine, BMI, predicted VT; 16 conditions; difficulty; diagnosis; allergies; history; FC, FR, SpO2, Temp, BP, Glasgow; breathing pattern) | case-editor "patient" section (PBW; the engine uses `predictedBodyWeightKg`). FC, Temp, BP and Glasgow have **no engine counterpart**: stored as text or labData, or dropped (needs a decision) |
| 3 | "Paciente activo · IBW · VT recomendado" banner | console header: case + PBW + 6–8 mL/kg VT hint |
| 4 | VCV/PCV mode toggle | mode selector VCV, PCV, PSV, CPAP, SIMV (superset) |
| 5 | FiO2, VT, Qmax, PIP and PEEP inputs with validation | parameter controls pending→confirm/cancel using the engine limits. Qmax has no engine setting (engine uses flow pattern + Ti) |
| 6 | I:E slider + I:E boxes + Ti/Te readout | Ti control + computed I:E/Te readout (engine `inspiratoryTimeS`) |
| 7 | Inspiratory pause input | `inspiratoryPauseS`, 0–2 s |
| 8 | Expiratory pause input | **No engine support; drop** (documented) |
| 9 | Frequency input + slider (slider bug 0–24) | RR control 5–40 (engine limits) |
| 10 | "Enviar" (validate, send, record config, auto-download TXT) and "Detener" | confirm sends PARAM_CHANGE (batched); "Terminar sesión" ends the session. The TXT download is dropped or replaced by result + replay (decision) |
| 11 | Real/simulated data-source switch, "Simular Gráficas" switch | out of scope: the physical ventilator stays on the legacy route or a later feature (decision, see below) |
| 12 | Three live curves (pressure, flow, volume) with colours | shared/ventilator-console curves (sweep) |
| 13 | Zoom in/out/reset (2–60 s window) | window selector + freeze + measurement cursor |
| 14 | Connection status chip (Físico / Simulando / Sin señal) | console status: running, paused, engine mismatch, sync state |
| 15 | 12 metric cards, colour-coded and with trend arrows | numeric monitoring panel from `getMetrics` (Ppeak, Pplat, PEEP total, auto-PEEP, ΔP, Pmean, VTi/VTe, VT/kg, RR, VE, I:E, mechanical power) |
| 16 | Card drag-reorder, hide/show, reset layout | **Not planned** (YAGNI); list as a dropped feature, or keep per-viewer localStorage (decision) |
| 17 | Integrated-volume reset | not needed (the engine gives volume) |
| 18 | Compliance status panel | derived compliance display (VT/ΔP) in monitoring |
| 19 | Validation alerts panel + client error detection + PCV auto-adjust | replaced by engine alarms + alarms bar (priority mapping, silence 2 min, history, limits). The auto-adjust is dropped (it hides learning) |
| 20 | AI analysis drawer (client-side Gemini/OpenAI/Claude chain) | `POST /simulation/sessions/{id}/assist` (SSE) with shared/ai-conversation + ai-rating (`SIM_ASSIST`). Removes the browser-side keys |
| 21 | Ventilator reservation (availability, countdown, reserve dialog, release), connect/disconnect, "Sin señal" banner | **out of scope** of the simulator spec; the physical-ventilator features (`/api/reservations`, `/api/ventilator/**`) need their own migration (decision) |
| 22 | Session saved on unmount (`/simulation/session/save`) | events are persisted continuously; `end` on leave. `state` allows resume |
| 23 | Recording indicator ("Grabando configuraciones (n enviadas)") and toasts | sync indicator (pending, sent, retrying) + toasts |
| 24 | Web Serial connection (legacy, not mounted by the page) | not reachable today; drop |
| 25 | Patient monitor values | new SpO2, PaO2, PaCO2, pH and MAP panel (no HR, EtCO2 or BP) |
| 26 | Dark-themed screen | "console" design-system tokens (dark console scope) |

**Physical ventilator.** The legacy `/simulador` is also the only UI for the physical ventilator: reservation, connection and live data over Socket.io and MQTT. Redirecting `/simulador` to `/simulator` would **remove that path**. Before redirecting, the author must decide whether to:
- keep `/simulador` for the real ventilator (renaming its nav entry);
- add a "Ventilador físico" route to the new feature; or
- accept losing it.

## h) Bundle baseline

All values are gzip First Load JS.

**`odd/baseline-bundle.md`** (2026-10-13, master `62c9d68`; method: build-manifest polyfills + `_app` + route, .NET gzip): `/_app` 273 kB, `/simulador` **464 kB** (raw 1463).

**`odd/final-verification.md:74`:** `/simulador` 464 → 473.9 (+9.9, `_app` delta only).

**`odd/ai-chat-verification.md:59-66`** (master `e64b306`):

| Route | gzip KiB |
|---|---|
| `/_app` | 285.5 |
| `/learn` | 340.7 |
| lesson | 340.8 |
| `/profile` | 335.6 |
| `/assistant` | 339.5 |

**Re-measured in this audit** without building, from the existing `.next/build-manifest.json` (2026-10-15 19:31, same method, Node zlib level 9, which matches .NET within about 0.1):

| Route | raw KiB | gzip KiB |
|---|---|---|
| `/_app` | 882.9 | 285.6 |
| `/simulador` | 1496.8 | **477.3** |
| `/assistant` | 1038.9 | 339.6 |
| `/evaluations` | 1126.1 | 366.8 |
| `/learn` | 1045.8 | 340.8 |
| `/evaluations/manage/[evaluationId]/edit` | 1060.3 | 345.8 |

**Target for the new routes.** The console page should stay below the legacy `/simulador` (477 KiB) and close to `/assistant` (about 340 KiB). The worker and engine go in a separate worker chunk, which is not First Load JS. Chart.js should not ship in the console if the canvas renderer is adopted.

## i) File-by-file plan for the new code

### Conventions verified
- **Feature layout.** ESLint `feature` elements are only `src/features/{auth,profile,learning,content-editor,evaluations,evaluation-authoring,grading,ai-chat}/{api,application,UI}/**/*` (`eslint.config.mjs:184-190`), plus `feature-index` = `src/features/{NEW_FEATURES}/index.ts` (:177-181).
  - ai-chat put its config in `application/config/` (`src/features/ai-chat/index.ts`, `application/config/ai-chat.config.ts`), **not** a top-level `config/`. A top-level `config/` would be typed `legacy`, and a feature may not import legacy. The ai-chat task doc's "plus `config/`" wording is inaccurate; the code uses `application/config`.
  - Each new feature must be added to `NEW_FEATURES` (:65), to `LEGACY_FREE_FEATURES` (:70), to the `feature` pattern (:186), to the `lint` script, to `tsconfig.strict.json` and to `vitest.config.ts` `NEW_FEATURES`.
  - Each new thin page goes into `NEW_PAGE_FILES` (:79-113), with brackets escaped as `[[]x[]]`.
- **Sub-folders:** `api/{dtos,services,mappers}`, `application/{entities,hooks,components,pages,config}`, `UI/*.module.css`, `index.ts`. A file header is mandatory. `sx`, `style` and `styled` are banned (`STYLE_BAN_SYNTAX`).
- **Tokens:**
  - `src/shared/design-system/UI/tokens.css` (98 lines; `--vl-color-*` 17, `--vl-space-*`, `--vl-radius-*`, `--vl-shadow-*`, `--vl-z-*`, `--vl-focus-*`, motion tokens);
  - the MUI theme in `src/shared/design-system/theme/{palette.ts,theme.ts}`;
  - CSS Modules read `var(--vl-*)` and `var(--mui-palette-*)`.
  - **No console or dark tokens exist yet.** Add a `--vl-console-*` block (background, grid, trace colours per channel, alarm high/medium/low, text) scoped under a `.vl-console` class or `[data-surface="console"]` in tokens.css. The legacy uses the global class `vl-legacy-dark` (`src/index.css`).
- **API consumption:**
  - `@shared/api-client` exports `apiGet`, `apiPost`, `apiPut`, `apiPatch` and `apiDelete` (`api-request.ts`), `useApiQuery`, `useApiMutation`, `invalidateApiQueries` and `apiQueryKey` (`use-api-query.ts`), `postEventStream` and `runEventStream` (SSE: fetch + ReadableStream, bearer, single 401 refresh, `ApiError` with `retryAfter`), plus the generated types `paths` and `components` (`index.ts:12-54`).
  - Features define DTO types from `components["schemas"][...]` in `api/dtos`, path builders in `api/services`, and mappers to entities.
  - SSE UI: `@shared/ai-conversation` (`useStreamingResponse`, `MessageList`, `MessageBubble`, `StreamingMessage`, `Composer`, `AiMarkdown`, error messages) and `@shared/ai-rating` (`targetType` typed from `UpsertAiRatingDTO`, which includes `SIM_ASSIST`).
- **PracticalQuestionSlot:**
  - `src/features/evaluations/application/components/questions/practical-question-slot.tsx:54` renders the registered renderer or a disabled placeholder card.
  - Registry: `application/entities/practical-question-renderer.ts`, with `registerPracticalQuestionRenderer(Component|null)` and `getPracticalQuestionRenderer()`.
  - Props contract `PracticalQuestionRendererProps = QuestionViewProps = {question: AttemptQuestion, answer: AttemptAnswer|null, onChange(answer: AttemptAnswer), readOnly?: boolean}`.
    - `AttemptQuestion` has `id`, `type`, `points`, `clinicalCaseId`, `prompt` and `media`.
    - `AttemptAnswer` is `{selectedOptionIds, textAnswer, simulationSessionId}` (`evaluation.entity.ts:102-125`).
  - Exported from `@features/evaluations` (`index.ts:19,47-48`). It is used by `QuestionView` (attempt player and authoring preview, `question-view.tsx:37`).
  - **Integration without modifying evaluations:** the simulator exports a `SimulationPracticalQuestion` and calls `registerPracticalQuestionRenderer` once.
    - The call must sit somewhere that runs before an attempt renders, and pages may import only `shared` and `feature-index`. The cleanest place is a side-effect module imported by `pages/_app.js` (legacy type, so it may import a feature index). That puts the registration plus a lazy wrapper in `/_app`, about 0.3 KiB if the component is `React.lazy`.
    - Alternative: register from the evaluations attempt pages. That is not possible without modifying evaluations, so the `_app` route is the only one that leaves evaluations unchanged.
    - The registered component reads `attemptId`, which is **not in its props**. It must come from the route (`useRouter().query.attemptId` on `/evaluations/[evaluationId]/attempts/[attemptId]`). In read-only preview there is no attempt, so it renders a static card.
    - It starts `POST /simulation/sessions {mode: EXAM, attemptId, questionId: question.id}` and calls `onChange({...answer, simulationSessionId})`.
- **Navigation and routes:**
  - `src/shared/layouts/nav.config.ts:48-67` (`NAV_ITEMS`; a test asserts that each href exists in ROUTES and admits its roles, `nav.config.test.ts`).
  - `src/shared/session/routes.config.ts:29-80` (`ROUTES`, `STAFF`).
  - URL builders live per feature in `application/entities/*-urls.ts` (for example `evaluations-urls.ts`).
- **Legacy redirects:** two precedents.
  - Server-side: `pages/teaching/index.js` `getServerSideProps → {redirect:{destination, permanent:false}}` using `resolveLegacyLessonUrl` from `@features/learning`.
  - Client-side: `pages/evaluation/index.tsx` renders `<LegacyEvaluationRedirect from="/evaluation"/>` (`router.replace` once, `getLayout = page => page`, mapping table in `evaluations/application/entities/legacy-redirects.ts`, tests in `legacy-evaluation-redirect.test.tsx`).
  - Redirected legacy pages stay in `ROUTES` with their roles and are added to `NEW_PAGE_FILES`.
- **Tests:**
  - Vitest 3 + jsdom + Testing Library + msw 2 (`setupServer` from `msw/node`, for example `src/features/ai-chat/api/services/ai-chat.service.test.ts:13,25`).
  - Setup: `vitest.setup.ts` (jest-dom, cleanup). Tests are colocated as `*.test.ts(x)`.
  - CSS modules are non-scoped in tests (`vitest.config.ts`).
  - Single file: `npx vitest run src/features/ai-chat/api/services/ai-chat.service.test.ts`.

### Verification commands (`package.json` scripts)
| Script | Command |
|---|---|
| `typecheck` | `tsc -p tsconfig.strict.json --noEmit` (new code only; strict). Last recorded: **0 errors** (`odd/ai-chat-verification.md:16`, master e64b306) |
| `lint` | `eslint` over an explicit list of new-code paths. Last recorded: **0 errors, 0 warnings** (`odd/ai-chat-verification.md:20-22`) |
| `lint:legacy` | `eslint .` |
| `test` | `vitest run`. Last recorded **1193/1196**: 3 load-timeout flakes that pass alone |
| `build` | `next build --webpack` (prebuild runs validate:curriculum + prisma generate). **Forbidden without the author's request** |
| `dev` | `next dev --webpack` |
| `generate:api` | copy spec + openapi-typescript |

CLAUDE.md states that full `npx tsc --noEmit` on ventilab-web has about 280–291 pre-existing errors. `npm run typecheck` (strict, new code only) is the green baseline.

### Proposed files (risk: L low, M medium, H high)

**Tooling (S0)**
- `eslint.config.mjs`, `package.json` (`lint` paths only), `tsconfig.strict.json`, `vitest.config.ts`: register `simulator`, `case-editor`, `ventilator-console`, `sim-engine` and `rubric-editor`, plus the new pages. This is the same protected-zone tooling exception as earlier migrations. — L
- `scripts/sync-sim-engine.mjs` (copy + `--check`). — M
- `src/shared/sim-engine/**`: vendored engine, generated header, `index.ts`, no edits by hand. — M (strict-tsconfig compatibility not verified)
- `src/shared/design-system/UI/tokens.css`: `--vl-console-*` tokens. — L

**shared/ventilator-console** (generic; no case or session knowledge)
- `application/console-limits.ts`: re-exports the engine limits plus alarm priority mapping. — L
- `application/parameter-draft.entity.ts`: pending → confirm/cancel state, clamping, per-mode visible parameters, Ti→I:E derivation. — M
- `application/alarm-state.entity.ts`: priority mapping, silence 2 min (clock injected), history, acknowledgement. — M
- `application/{mode-selector,parameter-control,parameter-panel,alarms-bar,alarm-history,numeric-monitor,patient-monitor,console-layout}.tsx` + tests. — M
- `UI/*.module.css`. — L

**shared/waveforms** (extend, keep `WaveformChart`)
- `sweep-buffer.ts` (Float32Array ring, pure) + tests. — L
- `sweep-canvas.tsx` (rAF renderer, sweep, freeze, cursor) + geometry helpers + tests on the pure parts. — M/H (manual visual check needed)

**shared/rubric-editor** (option A: outcome rubric)
- `application/outcome-rubric.entity.ts` + test, `application/outcome-rubric-editor.tsx` + test, `UI/rubric-editor.module.css`, `index.ts`. — L/M

**features/simulator**
- `api/dtos/simulation.dto.ts`, `api/services/{sessions,cases,assist}.service.ts`, `api/mappers/*.ts` + msw tests. — L
- `application/engine/engine-runner.ts`: pure fixed-step loop, batch builder, catch-up cap. Must live under `application/` to stay a feature layer. — M
- `application/engine/engine.worker.ts`: thin `self.onmessage` adapter, `new Worker(new URL(..., import.meta.url))`. — **H** (first worker in the repo, untestable in jsdom, build behaviour unverified)
- `application/hooks/use-engine-worker.ts` (fake worker injectable). — M
- `application/hooks/use-event-sync.ts`: PARAM_CHANGE and ALARM_ACK batching, client ids (`crypto.randomUUID`), retry queue, flush on end, `duplicates` tolerated. — M
- `application/hooks/use-simulation-session.ts`: start, resume via `/state`, end, engine-version check. — M
- `application/hooks/use-sim-assist.ts`: built on `useStreamingResponse`. — L
- `application/pages/{simulator-catalog,simulation-console,simulation-result,simulation-replay}.page.tsx` + lazy wrappers + tests. — M
- `application/components/simulation-practical-question.tsx` + `register-practical-question.ts`. — M
- `application/entities/{simulator-urls,legacy-redirects,...}.ts`, `application/config/simulator.config.ts` (time multipliers `[1,2,4]`). — L
- `UI/*.module.css`, `index.ts`. — L

**features/case-editor**
- `api/**` (cases CRUD, definition, status, expert-validation, test-run, duplicate) + tests. — L
- `application/entities/case-draft.entity.ts`: PBW, the physiological ranges defined on the front (gap), validation mirroring the DTO, timeline ordering. — M
- `application/components/{general,patient,mechanics,initial-settings (console in config mode),events-timeline,targets,default-rubric}-section.tsx`. — M
- `application/hooks/{use-case-editor,use-case-list,use-local-preview,use-test-run}.ts`. Local preview reuses the simulator engine runner **via `@features/simulator` index** (feature → feature-index is allowed). — M
- `application/pages/{case-list,case-editor}.page.tsx`. Delete flow: DELETE → 409 → confirm archive → PATCH status. — M
- `UI/*.module.css`, `index.ts`. — L

**Pages (thin)**
- `pages/simulator/index.tsx`, `pages/simulator/sessions/[sessionId]/index.tsx`, `pages/simulator/sessions/[sessionId]/result.tsx`, `pages/simulator/sessions/[sessionId]/replay.tsx`, `pages/simulator/cases/index.tsx`, `pages/simulator/cases/new.tsx`, `pages/simulator/cases/[id]/edit.tsx`. — L

**Routes, nav and legacy**
- `routes.config.ts` (+7 routes; cases routes use STAFF) and `nav.config.ts` ("Simulador" → `/simulator` for EVERYONE; "Casos clínicos" → `/simulator/cases` for STAFF) + the tests. — L
- `pages/simulador/index.js` → redirect: **blocked on the physical-ventilator decision** (section g). — H
- `pages/_app.js`: import the practical-question registration module. — M (touches `/_app`; measure the bundle)

**Order and work units.** S0 tooling + engine vendoring → waveforms sweep → ventilator-console → simulator api + worker + console page → result/replay/assist → practical question → rubric-editor + case-editor → routes/nav/redirect → verification and bundle. The total is far beyond 400 lines, so a chained-PR / slice strategy applies.

## Key open decisions for the author
1. What happens to the physical ventilator UI (reservations, connection, live MQTT data) when `/simulador` is redirected.
2. Rubric editor: option A (new outcome-rubric shared module; evaluation-authoring untouched) or option B (move the parameter rubric editor as requested; it does not fit the case schema).
3. How to vendor the engine: copy plus a `--check` script, or any other option.
4. Patient fields with no engine counterpart (HR, BP, Temp, Glasgow): drop them, or store them as labData or text.
5. Card layout customisation and the TXT export: drop them, or keep them.
