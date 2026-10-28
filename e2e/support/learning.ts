/*
* Funcionalidad: E2E helpers of the learning area (Bloque 2)
* Descripción: Shared pieces of the /learn, lesson viewer and TutorAI specs: the deterministic ids of the ventylab-server demo seed (demo module "Mecánica respiratoria aplicada" with two lessons of two Pages each), a brand-new student per scenario (POST /api/auth/register + /api/auth/login, retried after a 429 of the sign-in limit) injected into a browser context through its localStorage tokens so every run starts without progress, an API client for that student, a superadmin API client for /admin endpoints, the Bogotá calendar date and its es-CO label as the activity calendar writes it, and the lesson viewer locators. The backend URL comes from E2E_API_URL (default http://localhost:4000). Depends on @playwright/test and the backend API helper.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { type APIRequestContext, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { API_URL, type BackendApi } from "./backend-api";

// Deterministic ids of the demo seed (ventylab-server prisma/demo): the only lessons with Pages in a local database.
export const DEMO_MODULE_ID = "5e81b2d5-4fb2-52e7-ad9f-44a281266323";
export const DEMO_MODULE_TITLE = "Mecánica respiratoria aplicada";
export const LESSON_1 = { id: "ebdf6985-39a6-59c7-b94d-f5127dcb53a4", title: "La ecuación del movimiento" };
export const LESSON_2 = { id: "b0ffaa43-4416-536a-916c-d43924725236", title: "Compliance y resistencia" };

const DEMO_PASSWORD = "VentyLab-Demo-2026";
const ACCESS_TOKEN_KEY = "ventilab_auth_token";
const REFRESH_TOKEN_KEY = "ventilab_refresh_token";
const SESSION_USER_KEY = "ventilab_session_user";
const SIGN_IN_ATTEMPTS = 4;

type Envelope<T> = { success: boolean, data: T, code: string | null, message: string };

type LoginData = { accessToken: string, refreshToken: string, user: { id: string, email: string, name: string, role: string } };

export type FreshStudent = LoginData & { email: string, api: BackendApi };

export const lessonPageUrl = (lessonId: string, pageNumber: number, moduleId = DEMO_MODULE_ID): string =>
  `/learn/modules/${moduleId}/lessons/${lessonId}/${pageNumber}`;

function apiFor(request: APIRequestContext, accessToken: string): BackendApi {
  return {
    async call<T>(method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", path: string, body?: unknown): Promise<T> {
      const response = await request.fetch(`${API_URL}${path}`, { method, headers: { authorization: `Bearer ${accessToken}` }, data: body });
      const payload = (await response.json().catch(() => null)) as Envelope<T> | null;

      if (!response.ok()) {
        throw new Error(`${method} ${path} → ${response.status()} ${payload?.code ?? ""} ${payload?.message ?? ""}`);
      }

      return payload?.data as T;
    },
  };
}

/** Status code of an authenticated call, without throwing (for 403 checks). */
export async function statusOf(request: APIRequestContext, accessToken: string, method: "GET" | "POST", path: string): Promise<{ status: number, code: string | null }> {
  const response = await request.fetch(`${API_URL}${path}`, { method, headers: { authorization: `Bearer ${accessToken}` } });
  const payload = (await response.json().catch(() => null)) as Envelope<unknown> | null;

  return { status: response.status(), code: payload?.code ?? null };
}

/** Signs in through the API; waits out the sign-in limit (5/min) when it answers 429. */
export async function apiSignIn(request: APIRequestContext, email: string, password = DEMO_PASSWORD): Promise<LoginData> {
  for (let attempt = 1; attempt <= SIGN_IN_ATTEMPTS; attempt += 1) {
    const response = await request.post(`${API_URL}/api/auth/login`, { data: { email, password } });

    if (response.status() === 429 && attempt < SIGN_IN_ATTEMPTS) {
      const retryAfter = Number(response.headers()["retry-after"] ?? 60);

      await new Promise((resolveWait) => setTimeout(resolveWait, (Number.isFinite(retryAfter) ? retryAfter : 60) * 1000 + 1000));
      continue;
    }

    if (!response.ok()) {
      throw new Error(`Sign-in of ${email} failed (${response.status()})`);
    }

    return ((await response.json()) as Envelope<LoginData>).data;
  }

  throw new Error(`Sign-in of ${email} kept answering 429`);
}

/** Registers a new student (no progress at all) and signs it in. */
export async function registerFreshStudent(request: APIRequestContext, label: string): Promise<FreshStudent> {
  const email = `e2e-b2-${label}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@ventylab.test`;
  const registered = await request.post(`${API_URL}/api/auth/register`, { data: { name: `E2E ${label}`, email, password: DEMO_PASSWORD } });

  if (!registered.ok()) {
    throw new Error(`Registration failed (${registered.status()}): ${await registered.text()}`);
  }

  const login = await apiSignIn(request, email);

  return { ...login, email, api: apiFor(request, login.accessToken) };
}

/** API client of an already signed-in account. */
export function apiOf(request: APIRequestContext, accessToken: string): BackendApi {
  return apiFor(request, accessToken);
}

/** Browser context whose localStorage already holds the student session (same keys the app writes on sign-in). */
export async function contextFor(browser: Browser, baseURL: string, login: LoginData, options: Parameters<Browser["newContext"]>[0] = {}): Promise<BrowserContext> {
  return browser.newContext({
    ...options,
    storageState: {
      cookies: [],
      origins: [{
        origin: new URL(baseURL).origin,
        localStorage: [
          { name: ACCESS_TOKEN_KEY, value: login.accessToken },
          { name: REFRESH_TOKEN_KEY, value: login.refreshToken },
          { name: SESSION_USER_KEY, value: JSON.stringify(login.user) },
        ],
      }],
    },
  });
}

/** Today in America/Bogota as YYYY-MM-DD (the server's activity day). */
export function bogotaToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Label prefix of a calendar day, as the activity calendar writes it (es-CO long date of the UTC day). */
export function calendarDayLabel(isoDay: string): string {
  return new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${isoDay}T00:00:00Z`));
}

/** Article of the visible lesson page with at least one content block. */
export function lessonArticle(page: Page): Locator {
  return page.locator("article[aria-labelledby=\"lesson-page-title\"]");
}

export function pageNav(page: Page): Locator {
  return page.getByRole("navigation", { name: "Navegación entre páginas" });
}

/** Waits until the viewer painted the page title and a content block. */
export async function waitForLessonContent(page: Page, pageTitle?: string | RegExp): Promise<void> {
  const article = lessonArticle(page);

  await article.locator("section[data-block-type]").first().waitFor({ state: "visible", timeout: 30_000 });

  if (pageTitle !== undefined) {
    await page.locator("#lesson-page-title").filter({ hasText: pageTitle }).waitFor({ timeout: 30_000 });
  }
}

type ModuleProgress = { lessons: { lessonId: string, viewedPages: number, totalPages: number, completed: boolean }[] };

/** Pages viewed by the student in one lesson, read from the server. */
export async function viewedPagesOf(api: BackendApi, lessonId: string, moduleId = DEMO_MODULE_ID): Promise<number> {
  const progress = await api.call<ModuleProgress>("GET", `/api/progress/modules/${moduleId}`);

  return progress.lessons.find((lesson) => lesson.lessonId === lessonId)?.viewedPages ?? 0;
}

export type Gamification = { xpTotal: number, level: number, streakDays: number, longestStreak: number, xpToday: number };

export const gamificationOf = (api: BackendApi): Promise<Gamification> => api.call<Gamification>("GET", "/api/progress/gamification");

type LessonPage = { id: string, order: number, title: string };

/** Published Pages of a lesson in order. */
export async function pagesOf(api: BackendApi, lessonId: string): Promise<LessonPage[]> {
  const pages = await api.call<LessonPage[] | { items: LessonPage[] }>("GET", `/api/pages?lessonId=${lessonId}`);
  const list = Array.isArray(pages) ? pages : pages.items;

  return [...list].sort((a, b) => a.order - b.order);
}
