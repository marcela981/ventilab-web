/*
* Funcionalidad: Runtime performance of the staff panel screens
* Descripción: Measures, as the teacher (ana.torres) and as the admin (superadmin) and with CPU throttling ×PERF_CPU_RATE (4) through CDP, the staff screens that exist before Bloque 4 on a production build: /teacher (dashboard of the default group), /teacher?groupId=<load group> (the student list of a PERF_STUDENT_COUNT-student group, the closest thing to a student directory today), /teacher/students/[userId] (student detail), /groups, /profile and, for the admin only, /admin/users. For every navigation it records with the CDP Network domain the requests until the first useful content (API calls and JS chunks, network or HTTP cache) and the request depth (sequential waves: a request belongs to wave 1 + the highest wave among the requests of the same set that had finished before it started), the time from the navigation start to the first useful content measured in the page with a MutationObserver, the long tasks > 50 ms until that moment and until PERF_SETTLE_MS later, every request fired in the settle window and the number of rendered rows of the main list. Cold = new browser context (empty HTTP cache, saved session); warm = second full visit of the same URL in that context. Runs one discarded warm-up round per screen, then PERF_RUNS rounds, and writes <PERF_OUT_DIR>/<PERF_LABEL>-teacher.json with every run, the medians and the first-load JavaScript of each route read from the build output (scripts/perf/bundle-sizes.mjs over .next). The load group and student come from ventylab-server scripts/load/seed-load-data.ts run with LOAD_STUDENT_COUNT=PERF_STUDENT_COUNT (500): their ids are deterministic (same derivation as that seed), and PERF_GROUP_ID / PERF_STUDENT_ID override them. The admin session is signed in once through the form and saved to e2e/.auth/admin.json (reused while younger than E2E_AUTH_MAX_AGE_H); the teacher session comes from the setup project. Depends on @playwright/test, Node and the perf support helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type Browser, type CDPSession, type Page, test } from "@playwright/test";
import { type Credentials, isRecentStorageState, signIn, TEACHER_CREDENTIALS, TEACHER_STORAGE_STATE } from "../support/auth";
import { currentCommit } from "./perf-support";

const LABEL = process.env.PERF_LABEL ?? "baseline";
const OUT_DIR = process.env.PERF_OUT_DIR ?? "docs/bloque4/perf";
const RUNS = Number(process.env.PERF_RUNS ?? 5);
const CPU_RATE = Number(process.env.PERF_CPU_RATE ?? 4);
const SETTLE_MS = Number(process.env.PERF_SETTLE_MS ?? 3000);
const CONTENT_TIMEOUT_MS = Number(process.env.PERF_CONTENT_TIMEOUT_MS ?? 45_000);
const STUDENT_COUNT = Number(process.env.PERF_STUDENT_COUNT ?? 500);
const SELECTED = process.env.PERF_SCREENS?.split(",").map((id) => id.trim()).filter((id) => id.length > 0);
const SELECTED_ROLES = process.env.PERF_ROLES?.split(",").map((id) => id.trim()).filter((id) => id.length > 0);
const ACTION_TIMEOUT_MS = 30_000;

const ADMIN_STORAGE_STATE = "e2e/.auth/admin.json";
// Demo-only superadmin of ventylab-server prisma/demo (public demo password, never a real user).
const ADMIN_CREDENTIALS: Credentials = {
  email: process.env.E2E_ADMIN_EMAIL ?? "superadmin@ventylab.demo",
  password: process.env.E2E_ADMIN_PASSWORD ?? "VentyLab-Demo-2026",
};

function log(message: string): void {
  if (process.env.PERF_DEBUG) {
    console.log(`[teacher-perf] ${new Date().toISOString()} ${message}`);
  }
}

/** Same deterministic UUID derivation as ventylab-server scripts/load/seed-load-data.ts (`loadId`). */
function loadId(name: string): string {
  const hex = createHash("sha256").update(`ventylab-load:${name}`).digest("hex");
  const variant = ((Number.parseInt(hex.charAt(16), 16) & 0x3) | 0x8).toString(16);

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const GROUP_ID = process.env.PERF_GROUP_ID ?? loadId(`group:load-${STUDENT_COUNT}`);
const STUDENT_ID = process.env.PERF_STUDENT_ID ?? loadId("user:student-1");

// Useful content of each screen (pre-Block 4 markup; keep the same definitions for the "after" run).
const DASHBOARD_CONTENT = "section[aria-label=\"Estudiantes\"]";
const DASHBOARD_ROWS = "table[aria-label=\"Estudiantes\"] > tbody > tr[data-risk]";
// Before Bloque 4 a TEACHER only reaches students linked through TeacherStudent (403 for group students): the error alert counts as the
// first useful content so the teacher run measures what the teacher sees today; `blocked` tells both outcomes apart. The shell keeps
// its own role=alert elements, so the alert only counts with the forbidden title.
const DETAIL_CONTENT = "section[aria-label=\"Progreso\"], [role=\"alert\"]";
const DETAIL_TEXT = "Progreso|No tienes acceso";
const BLOCKED_TEXT = "No tienes acceso";
const USERS_CONTENT = "table:has(> caption) > tbody > tr";
const GROUPS_CONTENT = "table[aria-label=\"Grupos\"] > tbody > tr";
const PROFILE_CONTENT = "form[aria-labelledby] input";

type Role = "teacher" | "admin";

type ScreenId = "teacher-dashboard" | "teacher-dashboard-load-group" | "student-detail" | "admin-users" | "groups" | "profile";

type Screen = { id: ScreenId, route: string, url: string, selector: string, text?: string, rows?: string, roles: readonly Role[] };

const SCREENS: readonly Screen[] = [
  { id: "teacher-dashboard", route: "/teacher", url: "/teacher", selector: DASHBOARD_CONTENT, rows: DASHBOARD_ROWS, roles: ["teacher", "admin"] },
  { id: "teacher-dashboard-load-group", route: "/teacher", url: `/teacher?groupId=${GROUP_ID}`, selector: DASHBOARD_CONTENT, rows: DASHBOARD_ROWS, roles: ["teacher", "admin"] },
  { id: "student-detail", route: "/teacher/students/[userId]", url: `/teacher/students/${STUDENT_ID}?groupId=${GROUP_ID}`, selector: DETAIL_CONTENT, text: DETAIL_TEXT, roles: ["teacher", "admin"] },
  { id: "admin-users", route: "/admin/users", url: "/admin/users", selector: USERS_CONTENT, rows: USERS_CONTENT, roles: ["admin"] },
  { id: "groups", route: "/groups", url: "/groups", selector: GROUPS_CONTENT, rows: GROUPS_CONTENT, roles: ["teacher", "admin"] },
  { id: "profile", route: "/profile", url: "/profile", selector: PROFILE_CONTENT, roles: ["teacher", "admin"] },
];

// Bloque 4 routes (DISENO_BLOQUE4 §2): reported by the bundle reader as missing until they exist.
const BLOCK4_ROUTES = ["/teacher/students", "/teacher/lab"] as const;

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

type InPageMarks = { timeOrigin: number, marks: Record<string, number>, longTasks: LongTask[] };

type TeacherPerfWindow = Window & { __teacherPerf?: InPageMarks };

/** Runs inside the page (serialized by Playwright): long-task observer and the content watcher. */
function installTeacherProbe({ selector, text }: { selector: string, text: string | null }): void {
  const target = window as TeacherPerfWindow;

  if (target.__teacherPerf) {
    return;
  }

  const state: InPageMarks = { timeOrigin: performance.timeOrigin, marks: {}, longTasks: [] };

  target.__teacherPerf = state;

  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        state.longTasks.push({ start: entry.startTime, duration: entry.duration });
      }
    }).observe({ type: "longtask", buffered: true });
  } catch {
    // longtask unsupported: the result reports zero tasks.
  }

  const check = (): boolean => {
    if (state.marks.content !== undefined) {
      return true;
    }

    const pattern = text === null ? null : new RegExp(text);
    const found = Array.from(document.querySelectorAll(selector)).some((element) => {
      const box = element.getBoundingClientRect();

      return box.width > 0 && box.height > 0 && (pattern === null || pattern.test(element.textContent ?? ""));
    });

    if (!found) {
      return false;
    }

    state.marks.content = performance.now();

    return true;
  };

  const start = (): void => {
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

  start();
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
  rows: number | null
  blocked: boolean
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
    const probe = (window as TeacherPerfWindow).__teacherPerf;

    return probe
      ? { timeOrigin: probe.timeOrigin, marks: { ...probe.marks }, longTasks: [...probe.longTasks] }
      : { timeOrigin: performance.timeOrigin, marks: {}, longTasks: [] };
  });
}

function buildResult(requests: readonly NetRequest[], marks: InPageMarks, rows: number | null, blocked: boolean): NavigationResult {
  const contentPerf = marks.marks.content;
  const contentEpoch = contentPerf === undefined ? Number.POSITIVE_INFINITY : marks.timeOrigin + contentPerf;
  const before = requests.filter((request) => request.startMs <= contentEpoch);
  const after = requests.filter((request) => request.startMs > contentEpoch);
  const api = before.filter((request) => request.kind === "api" && request.method !== "OPTIONS");
  const chunks = before.filter((request) => request.kind === "chunk");
  // Cache hits finish almost instantly and would chain into artificial waves: the depth with chunks counts network requests only.
  const critical = before.filter((request) => request.kind !== "other" && request.method !== "OPTIONS" && !request.fromCache);
  const settleEnd = contentPerf === undefined ? Number.POSITIVE_INFINITY : contentPerf + SETTLE_MS;

  return {
    contentMs: contentPerf === undefined ? null : Math.round(contentPerf),
    rows,
    blocked,
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
      untilContent: summarizeTasks(marks.longTasks, 0, contentPerf ?? Number.POSITIVE_INFINITY),
      untilSettle: summarizeTasks(marks.longTasks, 0, settleEnd),
    },
  };
}

type ThrottledPage = { page: Page, net: ReturnType<typeof recordNetwork>, saveSession: () => Promise<void>, close: () => Promise<void> };

async function openThrottledPage(browser: Browser, storageState: string, screen: Screen): Promise<ThrottledPage> {
  const context = await browser.newContext({ storageState, viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  await page.addInitScript(installTeacherProbe, { selector: screen.selector, text: screen.text ?? null });
  const cdp = await context.newCDPSession(page);

  await cdp.send("Network.enable");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_RATE });

  return {
    page,
    net: recordNetwork(cdp),
    // Writes back the tokens the app refreshed, so the next cold context starts with a valid access token (it lives 15 min).
    saveSession: async () => {
      await context.storageState({ path: storageState });
    },
    close: () => context.close(),
  };
}

async function visit(page: Page, net: ReturnType<typeof recordNetwork>, screen: Screen): Promise<NavigationResult> {
  net.reset();
  log(`goto ${screen.url}`);
  await page.goto(screen.url, { waitUntil: "commit", timeout: ACTION_TIMEOUT_MS });
  await page.waitForFunction(() => (window as TeacherPerfWindow).__teacherPerf?.marks.content !== undefined, undefined, { timeout: CONTENT_TIMEOUT_MS });
  await page.waitForTimeout(SETTLE_MS);
  const marks = await readMarks(page);
  const rows = screen.rows ? await page.locator(screen.rows).count() : null;
  const blocked = await page.getByRole("alert").filter({ hasText: BLOCKED_TEXT }).count() > 0;

  return buildResult(net.requests, marks, rows, blocked);
}

type RoundResult = { cold: NavigationResult, warm: NavigationResult };

async function round(browser: Browser, storageState: string, screen: Screen): Promise<RoundResult> {
  const { page, net, saveSession, close } = await openThrottledPage(browser, storageState, screen);

  try {
    const cold = await visit(page, net, screen);
    const warm = await visit(page, net, screen);

    await saveSession();

    return { cold, warm };
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
    rows: median(results.map((result) => result.rows)),
    blockedRuns: results.filter((result) => result.blocked).length,
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

/** First-load JavaScript per route from the build output (.next/build-manifest.json), through scripts/perf/bundle-sizes.mjs. */
function readBundleSizes(routes: readonly string[]): unknown {
  const out = join(OUT_DIR, `${LABEL}-teacher-bundles.tmp.json`);

  try {
    execFileSync(process.execPath, ["scripts/perf/bundle-sizes.mjs", "--json", out, ...routes], { stdio: "ignore" });

    return JSON.parse(readFileSync(out, "utf8"));
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  } finally {
    rmSync(out, { force: true });
  }
}

async function ensureAdminSession(browser: Browser): Promise<void> {
  if (isRecentStorageState(ADMIN_STORAGE_STATE)) {
    return;
  }

  // Empty state: browser.newContext() inherits the perf project storageState (the student), and /auth/login would redirect away.
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });

  try {
    const page = await context.newPage();

    await signIn(page, ADMIN_CREDENTIALS);
    await context.storageState({ path: ADMIN_STORAGE_STATE });
  } finally {
    await context.close();
  }
}

test.describe.configure({ mode: "serial" });

test("teacher panel · runtime baseline (CPU throttled)", async ({ browser }) => {
  test.setTimeout((RUNS + 1) * SCREENS.length * 2 * 120_000);

  const roles: { role: Role, storageState: string, email: string }[] = [
    { role: "teacher" as const, storageState: TEACHER_STORAGE_STATE, email: TEACHER_CREDENTIALS.email },
    { role: "admin" as const, storageState: ADMIN_STORAGE_STATE, email: ADMIN_CREDENTIALS.email },
  ].filter((item) => SELECTED_ROLES === undefined || SELECTED_ROLES.includes(item.role));

  if (roles.some((item) => item.role === "admin")) {
    await ensureAdminSession(browser);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const results: Record<string, Record<string, unknown>> = {};

  for (const { role, storageState } of roles) {
    results[role] = {};

    for (const screen of SCREENS.filter((item) => item.roles.includes(role) && (SELECTED === undefined || SELECTED.includes(item.id)))) {
      log(`${role} ${screen.id}: warm-up`);
      await round(browser, storageState, screen); // Warm-up round (server caches, DNS): discarded.
      const rounds: RoundResult[] = [];

      for (let run = 0; run < RUNS; run += 1) {
        log(`${role} ${screen.id}: run ${run + 1}`);
        rounds.push(await round(browser, storageState, screen));
      }

      results[role][screen.id] = {
        route: screen.route,
        url: screen.url,
        contentSelector: screen.selector,
        rowsSelector: screen.rows ?? null,
        median: { cold: medians(rounds.map((item) => item.cold)), warm: medians(rounds.map((item) => item.warm)) },
        runs: rounds,
      };
    }
  }

  const bundles = readBundleSizes([...new Set(SCREENS.map((screen) => screen.route)), ...BLOCK4_ROUTES]);

  const result = {
    meta: {
      label: LABEL,
      runs: RUNS,
      warmupRoundsDiscarded: 1,
      cpuThrottlingRate: CPU_RATE,
      settleMs: SETTLE_MS,
      network: "localhost, no network throttling",
      roles: roles.map((item) => ({ role: item.role, email: item.email, storageState: item.storageState })),
      loadStudentCount: STUDENT_COUNT,
      loadGroupId: GROUP_ID,
      loadStudentId: STUDENT_ID,
      webCommit: currentCommit(),
      browser: `chromium ${browser.version()}`,
      viewport: { width: 1920, height: 1080 },
      measuredAt: new Date().toISOString(),
      definitions: {
        contentMs: "page performance.now() at the first visible match of the content selector (MutationObserver); 0 = navigation start",
        rows: "rendered rows of the main list (rows selector) at the end of the settle window",
        blocked: "a role=alert with \"No tienes acceso\" is shown at the end of the settle window (student detail: the 403 error state instead of the student); blockedRuns counts them",
        apiDepth: "sequential waves among API requests until the content: wave = 1 + highest wave of the API requests that had finished before it started",
        depthWithChunks: "same rule over document + JS chunks + API requests served from the network (cache hits excluded) until the content; an upper bound",
        warm: "second full visit (page.goto) of the same URL in the same browser context: HTTP cache warm, SWR memory cache empty",
        session: "each round writes the context storage state back to the role file, so cold visits start with a fresh access token (the warm-up round absorbs the first refresh)",
        firstLoad: "scripts/perf/bundle-sizes.mjs over .next/build-manifest.json: shared (_app + main + polyfills) + route files, gzip level default",
      },
    },
    bundles,
    screens: results,
  };

  writeFileSync(join(OUT_DIR, `${LABEL}-teacher.json`), `${JSON.stringify(result, null, 2)}\n`);
});
