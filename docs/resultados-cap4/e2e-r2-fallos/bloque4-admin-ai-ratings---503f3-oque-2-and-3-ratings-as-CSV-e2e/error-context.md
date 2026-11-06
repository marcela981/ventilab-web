# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: bloque4\admin-ai-ratings.spec.ts >> (8) /admin/ai filters the ratings by surface and exports Bloque 2 and 3 ratings as CSV
- Location: e2e\bloque4\admin-ai-ratings.spec.ts:81:5

# Error details

```
Error: GET /api/evaluation-attempts/01a1b2f9-050c-764a-b371-fdaa18427d31/feedback → 404 evaluation.grade_feedback_not_available Feedback is available once the grade is published
```

# Test source

```ts
  1   | /*
  2   | * Funcionalidad: E2E helpers of the learning area (Bloque 2)
  3   | * Descripción: Shared pieces of the /learn, lesson viewer and TutorAI specs: the deterministic ids of the ventylab-server demo seed (demo module "Mecánica respiratoria aplicada" with two lessons of two Pages each), a brand-new student per scenario (POST /api/auth/register + /api/auth/login, retried after a 429 of the sign-in limit) injected into a browser context through its localStorage tokens so every run starts without progress, an API client for that student, a superadmin API client for /admin endpoints, the Bogotá calendar date and its es-CO label as the activity calendar writes it, and the lesson viewer locators and the WCAG text contrast of an element (curriculum badges). The backend URL comes from E2E_API_URL (default http://localhost:4000). Depends on @playwright/test and the backend API helper.
  4   | * Versión: 0.1
  5   | * Autor: Marcela Mazo Castro
  6   | * Proyecto: VentyLab
  7   | * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
  8   | * Institución: Universidad del Valle
  9   | * Contacto: marcela.mazo@correounivalle.edu.co
  10  | */
  11  | 
  12  | import { type APIRequestContext, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
  13  | import { API_URL, type BackendApi } from "./backend-api";
  14  | 
  15  | // Deterministic ids of the demo seed (ventylab-server prisma/demo): the only lessons with Pages in a local database.
  16  | export const DEMO_MODULE_ID = "5e81b2d5-4fb2-52e7-ad9f-44a281266323";
  17  | export const DEMO_MODULE_TITLE = "Mecánica respiratoria aplicada";
  18  | export const LESSON_1 = { id: "ebdf6985-39a6-59c7-b94d-f5127dcb53a4", title: "La ecuación del movimiento" };
  19  | export const LESSON_2 = { id: "b0ffaa43-4416-536a-916c-d43924725236", title: "Compliance y resistencia" };
  20  | 
  21  | const DEMO_PASSWORD = "VentyLab-Demo-2026";
  22  | const ACCESS_TOKEN_KEY = "ventilab_auth_token";
  23  | const REFRESH_TOKEN_KEY = "ventilab_refresh_token";
  24  | const SESSION_USER_KEY = "ventilab_session_user";
  25  | const SIGN_IN_ATTEMPTS = 4;
  26  | 
  27  | type Envelope<T> = { success: boolean, data: T, code: string | null, message: string };
  28  | 
  29  | type LoginData = { accessToken: string, refreshToken: string, user: { id: string, email: string, name: string, role: string } };
  30  | 
  31  | export type FreshStudent = LoginData & { email: string, api: BackendApi };
  32  | 
  33  | export const lessonPageUrl = (lessonId: string, pageNumber: number, moduleId = DEMO_MODULE_ID): string =>
  34  |   `/learn/modules/${moduleId}/lessons/${lessonId}/${pageNumber}`;
  35  | 
  36  | function apiFor(request: APIRequestContext, accessToken: string): BackendApi {
  37  |   return {
  38  |     async call<T>(method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", path: string, body?: unknown): Promise<T> {
  39  |       const response = await request.fetch(`${API_URL}${path}`, { method, headers: { authorization: `Bearer ${accessToken}` }, data: body });
  40  |       const payload = (await response.json().catch(() => null)) as Envelope<T> | null;
  41  | 
  42  |       if (!response.ok()) {
> 43  |         throw new Error(`${method} ${path} → ${response.status()} ${payload?.code ?? ""} ${payload?.message ?? ""}`);
      |               ^ Error: GET /api/evaluation-attempts/01a1b2f9-050c-764a-b371-fdaa18427d31/feedback → 404 evaluation.grade_feedback_not_available Feedback is available once the grade is published
  44  |       }
  45  | 
  46  |       return payload?.data as T;
  47  |     },
  48  |   };
  49  | }
  50  | 
  51  | /** Status code of an authenticated call, without throwing (for 403 checks). */
  52  | export async function statusOf(request: APIRequestContext, accessToken: string, method: "GET" | "POST", path: string): Promise<{ status: number, code: string | null }> {
  53  |   const response = await request.fetch(`${API_URL}${path}`, { method, headers: { authorization: `Bearer ${accessToken}` } });
  54  |   const payload = (await response.json().catch(() => null)) as Envelope<unknown> | null;
  55  | 
  56  |   return { status: response.status(), code: payload?.code ?? null };
  57  | }
  58  | 
  59  | /** Signs in through the API; waits out the sign-in limit (5/min) when it answers 429. */
  60  | export async function apiSignIn(request: APIRequestContext, email: string, password = DEMO_PASSWORD): Promise<LoginData> {
  61  |   for (let attempt = 1; attempt <= SIGN_IN_ATTEMPTS; attempt += 1) {
  62  |     const response = await request.post(`${API_URL}/api/auth/login`, { data: { email, password } });
  63  | 
  64  |     if (response.status() === 429 && attempt < SIGN_IN_ATTEMPTS) {
  65  |       const retryAfter = Number(response.headers()["retry-after"] ?? 60);
  66  | 
  67  |       await new Promise((resolveWait) => setTimeout(resolveWait, (Number.isFinite(retryAfter) ? retryAfter : 60) * 1000 + 1000));
  68  |       continue;
  69  |     }
  70  | 
  71  |     if (!response.ok()) {
  72  |       throw new Error(`Sign-in of ${email} failed (${response.status()})`);
  73  |     }
  74  | 
  75  |     return ((await response.json()) as Envelope<LoginData>).data;
  76  |   }
  77  | 
  78  |   throw new Error(`Sign-in of ${email} kept answering 429`);
  79  | }
  80  | 
  81  | /** Registers a new student (no progress at all) and signs it in. */
  82  | export async function registerFreshStudent(request: APIRequestContext, label: string): Promise<FreshStudent> {
  83  |   const email = `e2e-b2-${label}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@ventylab.test`;
  84  |   const registered = await request.post(`${API_URL}/api/auth/register`, { data: { name: `E2E ${label}`, email, password: DEMO_PASSWORD } });
  85  | 
  86  |   if (!registered.ok()) {
  87  |     throw new Error(`Registration failed (${registered.status()}): ${await registered.text()}`);
  88  |   }
  89  | 
  90  |   const login = await apiSignIn(request, email);
  91  | 
  92  |   return { ...login, email, api: apiFor(request, login.accessToken) };
  93  | }
  94  | 
  95  | /** API client of an already signed-in account. */
  96  | export function apiOf(request: APIRequestContext, accessToken: string): BackendApi {
  97  |   return apiFor(request, accessToken);
  98  | }
  99  | 
  100 | /** Browser context whose localStorage already holds the student session (same keys the app writes on sign-in). */
  101 | export async function contextFor(browser: Browser, baseURL: string, login: LoginData, options: Parameters<Browser["newContext"]>[0] = {}): Promise<BrowserContext> {
  102 |   return browser.newContext({
  103 |     ...options,
  104 |     storageState: {
  105 |       cookies: [],
  106 |       origins: [{
  107 |         origin: new URL(baseURL).origin,
  108 |         localStorage: [
  109 |           { name: ACCESS_TOKEN_KEY, value: login.accessToken },
  110 |           { name: REFRESH_TOKEN_KEY, value: login.refreshToken },
  111 |           { name: SESSION_USER_KEY, value: JSON.stringify(login.user) },
  112 |         ],
  113 |       }],
  114 |     },
  115 |   });
  116 | }
  117 | 
  118 | /** Today in America/Bogota as YYYY-MM-DD (the server's activity day). */
  119 | export function bogotaToday(now = new Date()): string {
  120 |   return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  121 | }
  122 | 
  123 | /** Label prefix of a calendar day, as the activity calendar writes it (es-CO long date of the UTC day). */
  124 | export function calendarDayLabel(isoDay: string): string {
  125 |   return new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${isoDay}T00:00:00Z`));
  126 | }
  127 | 
  128 | /** Article of the visible lesson page with at least one content block. */
  129 | export function lessonArticle(page: Page): Locator {
  130 |   return page.locator("article[aria-labelledby=\"lesson-page-title\"]");
  131 | }
  132 | 
  133 | export function pageNav(page: Page): Locator {
  134 |   return page.getByRole("navigation", { name: "Navegación entre páginas" });
  135 | }
  136 | 
  137 | /** Waits until the viewer painted the page title and a content block. */
  138 | export async function waitForLessonContent(page: Page, pageTitle?: string | RegExp): Promise<void> {
  139 |   const article = lessonArticle(page);
  140 | 
  141 |   await article.locator("section[data-block-type]").first().waitFor({ state: "visible", timeout: 30_000 });
  142 | 
  143 |   if (pageTitle !== undefined) {
```