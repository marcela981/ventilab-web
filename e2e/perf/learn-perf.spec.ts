/*
* Funcionalidad: Runtime performance of /learn and the lesson viewer
* Descripción: Measures, as the student and with CPU throttling ×PERF_CPU_RATE (4) through CDP, three learning screens on a production build: /learn (section cards), /learn/[sectionId] (level cards with their modules) and the lesson viewer (article + first content block), plus PERF_NEXT_CLICKS (1) "Siguiente" clicks inside the viewer (next Page of the same lesson; PERF_SCREENS limits the screens, PERF_DEBUG=1 logs each step). For every navigation it records with the CDP Network domain the requests until the first useful content (API calls and JS chunks, from the network or from the HTTP cache) and the request depth (sequential waves: a request belongs to wave 1 + the highest wave among the requests of the same kind that had finished before it started), the time from the navigation start (or the click) to the first useful content measured in the page with a MutationObserver, the long tasks > 50 ms (PerformanceObserver) until that moment and until PERF_SETTLE_MS later, and every request fired in the settle window (e.g. the progress POST and a curriculum tree re-fetch after "Siguiente"). Cold = new browser context (empty HTTP cache, saved session); warm = second full visit of the same URL in that context. Runs one discarded warm-up round, then PERF_RUNS rounds, and writes <PERF_OUT_DIR>/<PERF_LABEL>-learn.json with every run and the medians. Depends on @playwright/test, Node and the perf support helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type Browser, type CDPSession, type Page, test } from "@playwright/test";
import { STUDENT_STORAGE_STATE } from "../support/auth";
import { currentCommit } from "./perf-support";

const LABEL = process.env.PERF_LABEL ?? "baseline";
const OUT_DIR = process.env.PERF_OUT_DIR ?? "docs/bloque2/perf";
const RUNS = Number(process.env.PERF_RUNS ?? 5);
const CPU_RATE = Number(process.env.PERF_CPU_RATE ?? 4);
const SETTLE_MS = Number(process.env.PERF_SETTLE_MS ?? 3000);
const CONTENT_TIMEOUT_MS = Number(process.env.PERF_CONTENT_TIMEOUT_MS ?? 30_000);
// Defaults: deterministic ids of the ventylab-server demo seed (prisma/demo): section "mecanica" and the first lesson of the demo module with Pages.
const SECTION_ID = process.env.PERF_SECTION_ID ?? "section-mecanica";
const MODULE_ID = process.env.PERF_MODULE_ID ?? "5e81b2d5-4fb2-52e7-ad9f-44a281266323";
const LESSON_ID = process.env.PERF_LESSON_ID ?? "ebdf6985-39a6-59c7-b94d-f5127dcb53a4";
// One click by default: Page 1 → Page 2 of the same lesson. In the pre-Block 2 code the next click (last Page of the lesson) opens the module completion screen instead of the next lesson, because /api/modules/:id/lessons reports pageCount 0.
const NEXT_CLICKS = Number(process.env.PERF_NEXT_CLICKS ?? 1);
const SELECTED = process.env.PERF_SCREENS?.split(",").map((id) => id.trim()).filter((id) => id.length > 0);
const ACTION_TIMEOUT_MS = 30_000;

function log(message: string): void {
  if (process.env.PERF_DEBUG) {
    console.log(`[learn-perf] ${new Date().toISOString()} ${message}`);
  }
}

const VIEWER_CONTENT = "article[aria-labelledby=\"lesson-page-title\"] section[data-block-type]";

type Screen = { id: string, url: string, selector: string, nextClicks: number };

const SCREENS: readonly Screen[] = [
  { id: "learn-home", url: "/learn", selector: "ul[aria-label=\"Secciones\"] > li", nextClicks: 0 },
  { id: "learn-section", url: `/learn/${SECTION_ID}`, selector: "ul[aria-label^=\"Módulos de\"] > li", nextClicks: 0 },
  { id: "lesson-viewer", url: `/learn/modules/${MODULE_ID}/lessons/${LESSON_ID}/1`, selector: VIEWER_CONTENT, nextClicks: NEXT_CLICKS },
];

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

type LearnPerfWindow = Window & { __learnPerf?: InPageMarks & { watch: (name: string, selector: string, notTitle?: string) => void } };

/** Runs inside the page (serialized by Playwright): long-task observer, click timestamps and content watchers. */
function installLearnProbe(initial: { name: string, selector: string }): void {
  const target = window as LearnPerfWindow;

  if (target.__learnPerf) {
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

  const watch = (name: string, selector: string, notTitle?: string): void => {
    const check = (): boolean => {
      if (state.marks[name] !== undefined) {
        return true;
      }

      const element = document.querySelector(selector);

      if (!visible(element)) {
        return false;
      }

      if (notTitle !== undefined && document.getElementById("lesson-page-title")?.textContent === notTitle) {
        return false;
      }

      state.marks[name] = performance.now();

      return true;
    };

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

  target.__learnPerf = { ...state, watch };
  // Keep the shared arrays/objects: the spread copied references, so later pushes are visible through __learnPerf.
  watch(initial.name, initial.selector);
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

type NavigationResult = {
  contentMs: number | null
  untilContent: {
    api: number
    apiDepth: number
    chunksNetwork: number
    chunksFromCache: number
    depthWithChunks: number
    apiCalls: string[]
  }
  settle: { apiAfterContent: string[], chunksAfterContent: number }
  longTasks: { untilContent: { count: number, totalMs: number, maxMs: number }, untilSettle: { count: number, totalMs: number, maxMs: number } }
};

function summarizeTasks(tasks: readonly LongTask[], from: number, to: number): { count: number, totalMs: number, maxMs: number } {
  const inside = tasks.filter((task) => task.start >= from && task.start <= to);

  return {
    count: inside.length,
    totalMs: Math.round(inside.reduce((sum, task) => sum + task.duration, 0)),
    maxMs: Math.round(Math.max(0, ...inside.map((task) => task.duration))),
  };
}

async function readMarks(page: Page): Promise<InPageMarks> {
  return page.evaluate(() => {
    const probe = (window as LearnPerfWindow).__learnPerf;

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

async function openThrottledPage(browser: Browser, screen: Screen): Promise<{ page: Page, cdp: CDPSession, net: ReturnType<typeof recordNetwork>, close: () => Promise<void> }> {
  const context = await browser.newContext({ storageState: STUDENT_STORAGE_STATE, viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  await page.addInitScript(installLearnProbe, { name: "content", selector: screen.selector });
  const cdp = await context.newCDPSession(page);

  await cdp.send("Network.enable");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_RATE });

  return { page, cdp, net: recordNetwork(cdp), close: () => context.close() };
}

async function visit(page: Page, net: ReturnType<typeof recordNetwork>, screen: Screen): Promise<NavigationResult> {
  net.reset();
  log(`goto ${screen.url}`);
  await page.goto(screen.url, { waitUntil: "commit", timeout: ACTION_TIMEOUT_MS });
  await page.waitForFunction(() => (window as LearnPerfWindow).__learnPerf?.marks.content !== undefined, undefined, { timeout: CONTENT_TIMEOUT_MS });
  await page.waitForTimeout(SETTLE_MS);

  return buildResult(net.requests, await readMarks(page), 0, "content");
}

async function clickNext(page: Page, net: ReturnType<typeof recordNetwork>, index: number): Promise<NavigationResult & { from: string, to: string }> {
  const name = `next-${index}`;
  const from = page.url();
  const title = await page.locator("#lesson-page-title").textContent({ timeout: ACTION_TIMEOUT_MS });

  await page.evaluate(({ markName, selector, previousTitle }) => {
    (window as LearnPerfWindow).__learnPerf?.watch(markName, selector, previousTitle);
  }, { markName: name, selector: VIEWER_CONTENT, previousTitle: title ?? "" });
  net.reset();
  log(`click ${index} from ${from} (title: ${title})`);
  await page.getByRole("navigation", { name: "Navegación entre páginas" }).getByRole("button").last().click({ timeout: ACTION_TIMEOUT_MS });
  log(`clicked ${index}`);
  await page.waitForFunction((markName) => (window as LearnPerfWindow).__learnPerf?.marks[markName] !== undefined, name, { timeout: CONTENT_TIMEOUT_MS });
  await page.waitForTimeout(SETTLE_MS);
  const marks = await readMarks(page);
  const clickPerf = marks.clicks.at(-1) ?? 0;

  return { from: new URL(from).pathname, to: new URL(page.url()).pathname, ...buildResult(net.requests, marks, clickPerf, name) };
}

type RoundResult = { cold: NavigationResult, warm: NavigationResult, next: (NavigationResult & { from: string, to: string })[] };

async function round(browser: Browser, screen: Screen): Promise<RoundResult> {
  const { page, net, close } = await openThrottledPage(browser, screen);

  try {
    const cold = await visit(page, net, screen);
    const warm = await visit(page, net, screen);
    const next: RoundResult["next"] = [];

    for (let index = 1; index <= screen.nextClicks; index += 1) {
      next.push(await clickNext(page, net, index));
    }

    return { cold, warm, next };
  } finally {
    await close();
  }
}

function median(values: readonly (number | null)[]): number | null {
  const numbers = values.filter((value): value is number => value !== null).sort((a, b) => a - b);

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

test.describe.configure({ mode: "serial" });

test("learn · runtime baseline (CPU throttled)", async ({ browser }) => {
  test.setTimeout((RUNS + 1) * SCREENS.length * 90_000);

  const screens: Record<string, unknown> = {};

  for (const screen of SCREENS.filter((item) => SELECTED === undefined || SELECTED.includes(item.id))) {
    log(`screen ${screen.id}: warm-up`);
    await round(browser, screen); // Warm-up round (server caches, Next.js lazy compilation of nothing in prod, DNS): discarded.
    const rounds: RoundResult[] = [];

    for (let run = 0; run < RUNS; run += 1) {
      rounds.push(await round(browser, screen));
    }

    const nextMedians = Array.from({ length: screen.nextClicks }, (_, index) => ({
      click: index + 1,
      from: rounds[0]?.next[index]?.from ?? null,
      to: rounds[0]?.next[index]?.to ?? null,
      ...medians(rounds.map((item) => item.next[index]).filter((item): item is NavigationResult & { from: string, to: string } => item !== undefined)),
    }));

    screens[screen.id] = {
      url: screen.url,
      contentSelector: screen.selector,
      median: { cold: medians(rounds.map((item) => item.cold)), warm: medians(rounds.map((item) => item.warm)), next: nextMedians },
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
      network: "localhost, no network throttling",
      storageState: STUDENT_STORAGE_STATE,
      webCommit: currentCommit(),
      browser: `chromium ${browser.version()}`,
      viewport: { width: 1920, height: 1080 },
      measuredAt: new Date().toISOString(),
      definitions: {
        contentMs: "page performance.now() at the first visible match of the content selector (MutationObserver); 0 = navigation start (cold/warm) or the click (next)",
        apiDepth: "sequential waves among API requests until the content: wave = 1 + highest wave of the API requests that had finished before it started",
        depthWithChunks: "same rule over document + JS chunks + API requests served from the network (cache hits excluded) until the content; an upper bound, since a request started later for an unrelated reason also counts as a new wave",
        warm: "second full visit (page.goto) of the same URL in the same browser context: HTTP cache warm, SWR memory cache empty",
        next: "client-side navigation by clicking Siguiente in the viewer",
      },
    },
    screens,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, `${LABEL}-learn.json`), `${JSON.stringify(result, null, 2)}\n`);
});
