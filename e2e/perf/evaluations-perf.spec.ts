/*
* Funcionalidad: Runtime performance of the student evaluation screens
* Descripción: Measures, as the student and with CPU throttling ×PERF_CPU_RATE (4) through CDP, four evaluation screens on a production build: /evaluations (first EvaluationCard), the intro of the active quiz (instructions section, plus one "Continuar intento"/"Comenzar" click that opens the player through the idempotent start endpoint), the attempt player of an IN_PROGRESS attempt (`section[aria-label^="Pregunta 1"]`) and the result of a published attempt (grade summary, or the status card when it is not published; a secondary mark times the overall AI feedback section). For every navigation it records with the CDP Network domain the requests until the first useful content (API calls and JS chunks, network or HTTP cache) and the request depth (sequential waves: a request belongs to wave 1 + the highest wave among the requests of the same set that had finished before it started), the time from the navigation start (or the click) to the first useful content measured in the page with a MutationObserver, the long tasks > 50 ms until that moment and until PERF_SETTLE_MS later, and every request fired in the settle window. In the player it also measures the autosave latency PERF_AUTOSAVE_SAMPLES times per round: picking another option of question 1 → `PUT .../answers/{questionId}` start, PUT duration and the moment the status line shows "guardada"/"Guardado" again. The attempt is never submitted. Cold = new browser context (empty HTTP cache, saved session); warm = second full visit of the same URL in that context. Runs one discarded warm-up round, then PERF_RUNS rounds, and writes <PERF_OUT_DIR>/<PERF_LABEL>-evaluations.json with every run and the medians. The ids come from the backend (PERF_BACKEND_URL, default NEXT_PUBLIC_BACKEND_URL or http://localhost:4000) with one API sign-in of the student: the active quiz, its IN_PROGRESS attempt (started through the idempotent start endpoint when there is none and a start is allowed) and the first published attempt; PERF_INTRO_EVALUATION_ID, PERF_PLAYER_ATTEMPT_ID and PERF_RESULT_EVALUATION_ID/PERF_RESULT_ATTEMPT_ID override them. Depends on @playwright/test, Node and the perf support helpers. v0.2 (Bloque 3): committed in the web repo (W5); the list selector also matches the grouped list (type → track → level). In a QUIZ the single-choice questions are checked on select (no PUT), so the autosave samples need a question that is still autosaved (EXAM or a multiple choice).
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type APIRequestContext, type Browser, type CDPSession, type Page, request as playwrightRequest, test } from "@playwright/test";
import { STUDENT_CREDENTIALS, STUDENT_STORAGE_STATE } from "../support/auth";
import { currentCommit } from "./perf-support";

const LABEL = process.env.PERF_LABEL ?? "baseline";
const OUT_DIR = process.env.PERF_OUT_DIR ?? "docs/bloque3/perf";
const RUNS = Number(process.env.PERF_RUNS ?? 5);
const CPU_RATE = Number(process.env.PERF_CPU_RATE ?? 4);
const SETTLE_MS = Number(process.env.PERF_SETTLE_MS ?? 3000);
const CONTENT_TIMEOUT_MS = Number(process.env.PERF_CONTENT_TIMEOUT_MS ?? 30_000);
const AUTOSAVE_SAMPLES = Number(process.env.PERF_AUTOSAVE_SAMPLES ?? 3);
const BACKEND_URL = (process.env.PERF_BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000").replace(/\/$/, "");
const SELECTED = process.env.PERF_SCREENS?.split(",").map((id) => id.trim()).filter((id) => id.length > 0);
const ACTION_TIMEOUT_MS = 30_000;

function log(message: string): void {
  if (process.env.PERF_DEBUG) {
    console.log(`[evaluations-perf] ${new Date().toISOString()} ${message}`);
  }
}

// Useful content of each screen (pre-Block 3 markup; keep the same definitions for the "after" run).
// Before Bloque 3 the cards were in one list per tab; now they sit in the type → track → level lists of the tab group.
const LIST_CONTENT = "ul[aria-label^=\"Evaluaciones\"] > li article, [role=\"group\"][aria-label^=\"Evaluaciones\"] li article";
const INTRO_CONTENT = "section[aria-label=\"Instrucciones\"]";
const PLAYER_CONTENT = "section[aria-label^=\"Pregunta 1\"]";
const RESULT_CONTENT = "section[aria-label=\"Resultado\"], #attempt-result-status";
// Secondary mark of the result page: the overall AI feedback section (published attempts only; it needs the feedback request).
const RESULT_FEEDBACK = "section[aria-label=\"Retroalimentación general\"]";
const SAVE_STATUS = `${PLAYER_CONTENT} [role="status"]`;
const SAVED_TEXT = /guardad[oa]/i;

type ScreenId = "evaluations-list" | "evaluation-intro" | "attempt-player" | "attempt-result";

type Screen = { id: ScreenId, url: string, selector: string, secondary?: string };

type Ids = { introEvaluationId: string, playerEvaluationId: string, playerAttemptId: string, resultEvaluationId: string, resultAttemptId: string };

type NetRequest = {
  id: string
  url: string
  method: string
  kind: "document" | "api" | "chunk" | "other"
  startMs: number
  endMs: number | null
  fromCache: boolean
  status: number | null
};

type LongTask = { start: number, duration: number };

type InPageMarks = { timeOrigin: number, marks: Record<string, number>, clicks: number[], longTasks: LongTask[] };

type EvalPerfWindow = Window & { __evalPerf?: InPageMarks & { watch: (name: string, selector: string) => void, watchSaved: (name: string, selector: string, pattern: string) => void } };

/** Runs inside the page (serialized by Playwright): long-task observer, click timestamps and content/save watchers. */
function installEvalProbe(initial: { name: string, selector: string }[]): void {
  const target = window as EvalPerfWindow;

  if (target.__evalPerf) {
    return;
  }

  const state: InPageMarks = { timeOrigin: performance.timeOrigin, marks: {}, clicks: [], longTasks: [] };

  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        state.longTasks.push({ start: entry.startTime, duration: entry.duration });
      }
    }).observe({ type: "longtask", buffered: true });
  } catch {
    // longtask unsupported: the result reports zero tasks.
  }

  document.addEventListener("click", () => {
    state.clicks.push(performance.now());
  }, true);

  const visible = (element: Element | null): boolean => {
    if (!element) {
      return false;
    }

    const box = element.getBoundingClientRect();

    return box.width > 0 && box.height > 0;
  };

  const observe = (check: () => boolean): void => {
    if (check()) {
      return;
    }

    const observer = new MutationObserver(() => {
      if (check()) {
        observer.disconnect();
      }
    });

    observer.observe(document, { childList: true, subtree: true, attributes: true, characterData: true });
  };

  const watch = (name: string, selector: string): void => {
    observe(() => {
      if (state.marks[name] !== undefined) {
        return true;
      }

      if (!visible(document.querySelector(selector))) {
        return false;
      }

      state.marks[name] = performance.now();

      return true;
    });
  };

  // Marks the first time the status line shows the saved text after having shown something else (pending/saving).
  const watchSaved = (name: string, selector: string, pattern: string): void => {
    const saved = new RegExp(pattern, "i");
    let leftSaved = false;

    observe(() => {
      if (state.marks[name] !== undefined) {
        return true;
      }

      const text = document.querySelector(selector)?.textContent ?? "";

      if (!saved.test(text)) {
        leftSaved = true;

        return false;
      }

      if (!leftSaved) {
        return false;
      }

      state.marks[name] = performance.now();

      return true;
    });
  };

  target.__evalPerf = { ...state, watch, watchSaved };
  for (const item of initial) {
    watch(item.name, item.selector);
  }
}

function classify(url: string, type: string | undefined): NetRequest["kind"] {
  if (type === "Document") {
    return "document";
  }

  if (url.includes("/api/")) {
    return "api";
  }

  if (type === "Script" || /\/_next\/static\/.*\.js(\?|$)/.test(url)) {
    return "chunk";
  }

  return "other";
}

/** Records every request of the page through CDP (start and end in epoch ms, cache hits included). */
function recordNetwork(cdp: CDPSession): { requests: NetRequest[], reset: () => void } {
  const byId = new Map<string, NetRequest & { monoStart: number }>();
  let requests: NetRequest[] = [];

  cdp.on("Network.requestWillBeSent", (event) => {
    if (event.request.url.startsWith("data:")) {
      return;
    }

    const entry = {
      id: event.requestId,
      url: event.request.url,
      method: event.request.method,
      kind: classify(event.request.url, event.type),
      startMs: event.wallTime * 1000,
      monoStart: event.timestamp,
      endMs: null,
      fromCache: false,
      status: null,
    };

    byId.set(event.requestId, entry);
    requests.push(entry);
  });
  cdp.on("Network.requestServedFromCache", (event) => {
    const entry = byId.get(event.requestId);

    if (entry) {
      entry.fromCache = true;
    }
  });
  cdp.on("Network.responseReceived", (event) => {
    const entry = byId.get(event.requestId);

    if (entry) {
      entry.status = event.response.status;
      entry.fromCache ||= Boolean(event.response.fromDiskCache) || Boolean(event.response.fromPrefetchCache);
    }
  });
  const finish = (event: { requestId: string, timestamp: number }): void => {
    const entry = byId.get(event.requestId);

    if (entry && entry.endMs === null) {
      entry.endMs = entry.startMs + (event.timestamp - entry.monoStart) * 1000;
    }
  };

  cdp.on("Network.loadingFinished", finish);
  cdp.on("Network.loadingFailed", finish);

  return {
    get requests() {
      return requests;
    },
    reset() {
      requests = [];
    },
  };
}

/** Waves: wave(r) = 1 + max wave of the requests (same set) that finished before r started; 1 when none had. */
function waves(requests: readonly NetRequest[]): number {
  const sorted = [...requests].sort((a, b) => a.startMs - b.startMs);
  const assigned: { end: number, wave: number }[] = [];
  let depth = 0;

  for (const request of sorted) {
    const previous = assigned.filter((item) => item.end <= request.startMs).map((item) => item.wave);
    const wave = previous.length === 0 ? 1 : Math.max(...previous) + 1;

    assigned.push({ end: request.endMs ?? Number.POSITIVE_INFINITY, wave });
    depth = Math.max(depth, wave);
  }

  return depth;
}

function apiPath(url: string): string {
  const parsed = new URL(url);

  return `${parsed.pathname}${parsed.search}`;
}

type TaskSummary = { count: number, totalMs: number, maxMs: number };

type NavigationResult = {
  contentMs: number | null
  untilContent: {
    api: number
    apiDepth: number
    chunksNetwork: number
    chunksFromCache: number
    depthWithChunks: number
    apiCalls: string[]
    apiErrors: string[]
  }
  settle: { apiAfterContent: string[], chunksAfterContent: number }
  longTasks: { untilContent: TaskSummary, untilSettle: TaskSummary }
};

type AutosaveSample = { clickToPutStartMs: number | null, putMs: number | null, putStatus: number | null, clickToSavedMs: number | null, putEndToSavedMs: number | null };

function summarizeTasks(tasks: readonly LongTask[], from: number, to: number): TaskSummary {
  const inside = tasks.filter((task) => task.start >= from && task.start <= to);

  return {
    count: inside.length,
    totalMs: Math.round(inside.reduce((sum, task) => sum + task.duration, 0)),
    maxMs: Math.round(Math.max(0, ...inside.map((task) => task.duration))),
  };
}

async function readMarks(page: Page): Promise<InPageMarks> {
  return page.evaluate(() => {
    const probe = (window as EvalPerfWindow).__evalPerf;

    return probe
      ? { timeOrigin: probe.timeOrigin, marks: { ...probe.marks }, clicks: [...probe.clicks], longTasks: [...probe.longTasks] }
      : { timeOrigin: performance.timeOrigin, marks: {}, clicks: [], longTasks: [] };
  });
}

/** Builds the result of one navigation: startPerf/markName are in page performance.now() ms. */
function buildResult(requests: readonly NetRequest[], marks: InPageMarks, startPerf: number, markName: string): NavigationResult {
  const contentPerf = marks.marks[markName];
  const contentEpoch = contentPerf === undefined ? Number.POSITIVE_INFINITY : marks.timeOrigin + contentPerf;
  const before = requests.filter((request) => request.startMs <= contentEpoch);
  const after = requests.filter((request) => request.startMs > contentEpoch);
  const api = before.filter((request) => request.kind === "api" && request.method !== "OPTIONS");
  const chunks = before.filter((request) => request.kind === "chunk");
  // Cache hits finish almost instantly and would chain into artificial waves: the depth with chunks counts network requests only.
  const critical = before.filter((request) => request.kind !== "other" && request.method !== "OPTIONS" && !request.fromCache);
  const settleEnd = contentPerf === undefined ? Number.POSITIVE_INFINITY : contentPerf + SETTLE_MS;

  return {
    contentMs: contentPerf === undefined ? null : Math.round(contentPerf - startPerf),
    untilContent: {
      api: api.length,
      apiDepth: waves(api),
      chunksNetwork: chunks.filter((request) => !request.fromCache).length,
      chunksFromCache: chunks.filter((request) => request.fromCache).length,
      depthWithChunks: waves(critical),
      apiCalls: api.map((request) => `${request.method} ${apiPath(request.url)}`),
      apiErrors: requests.filter((request) => request.kind === "api" && (request.status ?? 0) >= 400).map((request) => `${request.status} ${request.method} ${apiPath(request.url)}`),
    },
    settle: {
      apiAfterContent: after.filter((request) => request.kind === "api" && request.method !== "OPTIONS").map((request) => `${request.method} ${apiPath(request.url)}`),
      chunksAfterContent: after.filter((request) => request.kind === "chunk").length,
    },
    longTasks: {
      untilContent: summarizeTasks(marks.longTasks, startPerf, contentPerf ?? Number.POSITIVE_INFINITY),
      untilSettle: summarizeTasks(marks.longTasks, startPerf, settleEnd),
    },
  };
}

type ThrottledPage = { page: Page, cdp: CDPSession, net: ReturnType<typeof recordNetwork>, close: () => Promise<void> };

async function openThrottledPage(browser: Browser, screen: Screen): Promise<ThrottledPage> {
  const context = await browser.newContext({ storageState: STUDENT_STORAGE_STATE, viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  await page.addInitScript(installEvalProbe, [{ name: "content", selector: screen.selector }, ...(screen.secondary ? [{ name: "secondary", selector: screen.secondary }] : [])]);
  const cdp = await context.newCDPSession(page);

  await cdp.send("Network.enable");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_RATE });

  return { page, cdp, net: recordNetwork(cdp), close: () => context.close() };
}

type VisitResult = NavigationResult & { secondary?: NavigationResult };

async function visit(page: Page, net: ReturnType<typeof recordNetwork>, screen: Screen): Promise<VisitResult> {
  net.reset();
  log(`goto ${screen.url}`);
  await page.goto(screen.url, { waitUntil: "commit", timeout: ACTION_TIMEOUT_MS });
  await page.waitForFunction(() => (window as EvalPerfWindow).__evalPerf?.marks.content !== undefined, undefined, { timeout: CONTENT_TIMEOUT_MS });
  if (screen.secondary) {
    await page.waitForFunction(() => (window as EvalPerfWindow).__evalPerf?.marks.secondary !== undefined, undefined, { timeout: CONTENT_TIMEOUT_MS });
  }

  await page.waitForTimeout(SETTLE_MS);
  const marks = await readMarks(page);
  const result: VisitResult = buildResult(net.requests, marks, 0, "content");

  if (screen.secondary) {
    result.secondary = buildResult(net.requests, marks, 0, "secondary");
  }

  return result;
}

/** Intro → player: clicks "Continuar intento" (or "Comenzar"), which calls the idempotent start endpoint and pushes the player route. */
async function clickStart(page: Page, net: ReturnType<typeof recordNetwork>): Promise<NavigationResult & { to: string }> {
  const name = "start";

  await page.evaluate(({ markName, selector }) => {
    (window as EvalPerfWindow).__evalPerf?.watch(markName, selector);
  }, { markName: name, selector: PLAYER_CONTENT });
  net.reset();
  await page.getByRole("button", { name: /^(Continuar intento|Comenzar)$/ }).click({ timeout: ACTION_TIMEOUT_MS });
  await page.waitForFunction((markName) => (window as EvalPerfWindow).__evalPerf?.marks[markName] !== undefined, name, { timeout: CONTENT_TIMEOUT_MS });
  await page.waitForTimeout(SETTLE_MS);
  const marks = await readMarks(page);

  return { to: new URL(page.url()).pathname, ...buildResult(net.requests, marks, marks.clicks.at(-1) ?? 0, name) };
}

/** Picks an unchecked option of question 1 and times the autosave: click → PUT start → PUT end → saved text visible. Never submits. */
async function autosaveSample(page: Page, net: ReturnType<typeof recordNetwork>, index: number): Promise<AutosaveSample> {
  const name = `saved-${index}`;
  const question = page.locator(PLAYER_CONTENT);

  await page.evaluate(({ markName, selector, pattern }) => {
    (window as EvalPerfWindow).__evalPerf?.watchSaved(markName, selector, pattern);
  }, { markName: name, selector: SAVE_STATUS, pattern: SAVED_TEXT.source });
  net.reset();
  await question.locator("input[type=radio]:not(:checked), input[type=checkbox]").first().check({ timeout: ACTION_TIMEOUT_MS, force: true });
  await page.waitForFunction((markName) => (window as EvalPerfWindow).__evalPerf?.marks[markName] !== undefined, name, { timeout: CONTENT_TIMEOUT_MS });
  await page.waitForTimeout(500);
  const marks = await readMarks(page);
  const clickPerf = marks.clicks.at(-1);
  const savedPerf = marks.marks[name];
  const put = net.requests.find((request) => request.method === "PUT" && /\/answers\//.test(request.url));
  const toPerf = (epochMs: number): number => epochMs - marks.timeOrigin;
  const round1 = (value: number): number => Math.round(value * 10) / 10;

  if (clickPerf === undefined || savedPerf === undefined || !put) {
    return { clickToPutStartMs: null, putMs: null, putStatus: put?.status ?? null, clickToSavedMs: null, putEndToSavedMs: null };
  }

  return {
    clickToPutStartMs: round1(toPerf(put.startMs) - clickPerf),
    putMs: put.endMs === null ? null : round1(put.endMs - put.startMs),
    putStatus: put.status,
    clickToSavedMs: round1(savedPerf - clickPerf),
    putEndToSavedMs: put.endMs === null ? null : round1(savedPerf - toPerf(put.endMs)),
  };
}

type RoundResult = { cold: VisitResult, warm: VisitResult, start?: NavigationResult & { to: string }, autosave?: AutosaveSample[] };

async function round(browser: Browser, screen: Screen): Promise<RoundResult> {
  const { page, net, close } = await openThrottledPage(browser, screen);

  try {
    const cold = await visit(page, net, screen);
    const warm = await visit(page, net, screen);
    const result: RoundResult = { cold, warm };

    if (screen.id === "evaluation-intro") {
      result.start = await clickStart(page, net);
    }

    if (screen.id === "attempt-player") {
      result.autosave = [];

      for (let index = 1; index <= AUTOSAVE_SAMPLES; index += 1) {
        result.autosave.push(await autosaveSample(page, net, index));
      }
    }

    return result;
  } finally {
    await close();
  }
}

function median(values: readonly (number | null | undefined)[]): number | null {
  const numbers = values.filter((value): value is number => typeof value === "number").sort((a, b) => a - b);

  if (numbers.length === 0) {
    return null;
  }

  const middle = Math.floor(numbers.length / 2);

  return numbers.length % 2 === 1 ? numbers[middle] ?? null : Math.round((((numbers[middle - 1] ?? 0) + (numbers[middle] ?? 0)) / 2) * 10) / 10;
}

function medians(results: readonly NavigationResult[]): Record<string, number | null> {
  return {
    contentMs: median(results.map((result) => result.contentMs)),
    api: median(results.map((result) => result.untilContent.api)),
    apiDepth: median(results.map((result) => result.untilContent.apiDepth)),
    chunksNetwork: median(results.map((result) => result.untilContent.chunksNetwork)),
    chunksFromCache: median(results.map((result) => result.untilContent.chunksFromCache)),
    depthWithChunks: median(results.map((result) => result.untilContent.depthWithChunks)),
    apiAfterContent: median(results.map((result) => result.settle.apiAfterContent.length)),
    longTasksUntilContent: median(results.map((result) => result.longTasks.untilContent.count)),
    longTasksMsUntilContent: median(results.map((result) => result.longTasks.untilContent.totalMs)),
    longTasksUntilSettle: median(results.map((result) => result.longTasks.untilSettle.count)),
    longTasksMsUntilSettle: median(results.map((result) => result.longTasks.untilSettle.totalMs)),
    longTaskMaxMs: median(results.map((result) => result.longTasks.untilSettle.maxMs)),
  };
}

function autosaveMedians(samples: readonly AutosaveSample[]): Record<string, number | null> {
  return {
    samples: samples.length,
    clickToPutStartMs: median(samples.map((sample) => sample.clickToPutStartMs)),
    putMs: median(samples.map((sample) => sample.putMs)),
    putEndToSavedMs: median(samples.map((sample) => sample.putEndToSavedMs)),
    clickToSavedMs: median(samples.map((sample) => sample.clickToSavedMs)),
  };
}

type Envelope<T> = { data?: T } & Record<string, unknown>;

type MyEvaluationDto = {
  assignmentId: string
  state: string
  canStart: boolean
  evaluation: { id: string, type: string } | null
  attempts: { id: string, attemptNumber: number, status: string, published: boolean }[]
};

function unwrap<T>(body: Envelope<T> | T): T {
  return (body && typeof body === "object" && "data" in body ? (body as Envelope<T>).data : body) as T;
}

/** Resolves the evaluation and attempt ids through the backend (one API sign-in of the student). */
async function resolveIds(): Promise<Ids> {
  const api: APIRequestContext = await playwrightRequest.newContext({ baseURL: BACKEND_URL });

  try {
    const login = await api.post("/api/auth/login", { data: { email: STUDENT_CREDENTIALS.email, password: STUDENT_CREDENTIALS.password } });

    if (!login.ok()) {
      throw new Error(`API sign-in failed: ${login.status()} ${await login.text()}`);
    }

    const { accessToken } = unwrap<{ accessToken: string }>(await login.json());
    const headers = { Authorization: `Bearer ${accessToken}` };
    const list = unwrap<MyEvaluationDto[]>(await (await api.get("/api/my-evaluations", { headers })).json());
    const active = list.filter((item) => item.evaluation && item.state === "ACTIVE");
    const intro = active.find((item) => item.evaluation?.type === "QUIZ") ?? active[0];
    let playerItem = active.find((item) => item.attempts.some((attempt) => attempt.status === "IN_PROGRESS"));
    let playerAttemptId = process.env.PERF_PLAYER_ATTEMPT_ID ?? playerItem?.attempts.find((attempt) => attempt.status === "IN_PROGRESS")?.id;

    if (!playerAttemptId) {
      const startable = intro?.canStart ? intro : active.find((item) => item.canStart);

      if (!startable) {
        throw new Error("No IN_PROGRESS attempt and no startable active evaluation: set PERF_PLAYER_ATTEMPT_ID");
      }

      const started = await api.post(`/api/my-evaluations/${startable.assignmentId}/attempts`, { headers });

      if (!started.ok()) {
        throw new Error(`Attempt start failed: ${started.status()} ${await started.text()}`);
      }

      playerAttemptId = unwrap<{ attemptId: string }>(await started.json()).attemptId;
      playerItem = startable;
    }

    const published = list.flatMap((item) => item.attempts.filter((attempt) => attempt.published).map((attempt) => ({ evaluationId: item.evaluation?.id ?? "", attemptId: attempt.id, state: item.state })));
    const result = published.find((item) => item.state !== "ACTIVE") ?? published[0];

    return {
      introEvaluationId: process.env.PERF_INTRO_EVALUATION_ID ?? intro?.evaluation?.id ?? "",
      playerEvaluationId: process.env.PERF_PLAYER_EVALUATION_ID ?? playerItem?.evaluation?.id ?? "",
      playerAttemptId,
      resultEvaluationId: process.env.PERF_RESULT_EVALUATION_ID ?? result?.evaluationId ?? "",
      resultAttemptId: process.env.PERF_RESULT_ATTEMPT_ID ?? result?.attemptId ?? "",
    };
  } finally {
    await api.dispose();
  }
}

test.describe.configure({ mode: "serial" });

test("evaluations · runtime baseline (CPU throttled)", async ({ browser }) => {
  test.setTimeout((RUNS + 1) * 4 * 120_000);

  const ids = await resolveIds();

  log(`ids ${JSON.stringify(ids)}`);

  const screensToRun: readonly Screen[] = [
    { id: "evaluations-list", url: "/evaluations", selector: LIST_CONTENT },
    { id: "evaluation-intro", url: `/evaluations/${ids.introEvaluationId}`, selector: INTRO_CONTENT },
    { id: "attempt-player", url: `/evaluations/${ids.playerEvaluationId}/attempts/${ids.playerAttemptId}`, selector: PLAYER_CONTENT },
    { id: "attempt-result", url: `/evaluations/${ids.resultEvaluationId}/attempts/${ids.resultAttemptId}/result`, selector: RESULT_CONTENT, secondary: RESULT_FEEDBACK },
  ];
  const screens: Record<string, unknown> = {};

  for (const screen of screensToRun.filter((item) => SELECTED === undefined || SELECTED.includes(item.id))) {
    log(`screen ${screen.id}: warm-up`);
    await round(browser, screen); // Warm-up round (server caches, DNS): discarded.
    const rounds: RoundResult[] = [];

    for (let run = 0; run < RUNS; run += 1) {
      log(`screen ${screen.id}: run ${run + 1}`);
      rounds.push(await round(browser, screen));
    }

    const starts = rounds.map((item) => item.start).filter((item): item is NavigationResult & { to: string } => item !== undefined);
    const samples = rounds.flatMap((item) => item.autosave ?? []);
    const secondary = (pick: (item: RoundResult) => VisitResult): NavigationResult[] => rounds.map((item) => pick(item).secondary).filter((item): item is NavigationResult => item !== undefined);

    screens[screen.id] = {
      url: screen.url,
      contentSelector: screen.selector,
      secondarySelector: screen.secondary ?? null,
      median: {
        cold: medians(rounds.map((item) => item.cold)),
        warm: medians(rounds.map((item) => item.warm)),
        ...(screen.secondary ? { coldSecondary: medians(secondary((item) => item.cold)), warmSecondary: medians(secondary((item) => item.warm)) } : {}),
        ...(starts.length > 0 ? { start: { to: starts[0]?.to ?? null, ...medians(starts) } } : {}),
        ...(samples.length > 0 ? { autosave: autosaveMedians(samples) } : {}),
      },
      runs: rounds,
    };
  }

  const result = {
    meta: {
      label: LABEL,
      runs: RUNS,
      warmupRoundsDiscarded: 1,
      cpuThrottlingRate: CPU_RATE,
      settleMs: SETTLE_MS,
      autosaveSamplesPerRound: AUTOSAVE_SAMPLES,
      network: "localhost, no network throttling",
      storageState: STUDENT_STORAGE_STATE,
      student: STUDENT_CREDENTIALS.email,
      ids,
      webCommit: currentCommit(),
      browser: `chromium ${browser.version()}`,
      viewport: { width: 1920, height: 1080 },
      measuredAt: new Date().toISOString(),
      definitions: {
        contentMs: "page performance.now() at the first visible match of the content selector (MutationObserver); 0 = navigation start (cold/warm) or the click (start)",
        apiDepth: "sequential waves among API requests until the content: wave = 1 + highest wave of the API requests that had finished before it started",
        depthWithChunks: "same rule over document + JS chunks + API requests served from the network (cache hits excluded) until the content; an upper bound",
        secondary: "attempt-result only: same metrics until the overall AI feedback section is visible (full useful content of a published result)",
        warm: "second full visit (page.goto) of the same URL in the same browser context: HTTP cache warm, SWR memory cache empty",
        start: "client-side navigation intro → player by clicking Continuar intento/Comenzar (idempotent start endpoint), measured to the first question",
        autosave: "pick another option of question 1: clickToPutStartMs includes the client debounce; putMs = PUT duration on the network; clickToSavedMs = click → status line shows the saved text again",
      },
    },
    screens,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, `${LABEL}-evaluations.json`), `${JSON.stringify(result, null, 2)}\n`);
});
