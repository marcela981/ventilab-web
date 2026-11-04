/*
* Funcionalidad: E2E helpers of the staff panel, administration and profile (Bloque 4)
* Descripción: API setup shared by the Block 4 specs: the demo admin (superadmin) and the demo teacher without groups of his own (luis.herrera) signed in through the API once per worker and reused for ten minutes (the backend allows 5 sign-ins per minute; apiSignIn waits out a 429), brand-new students registered with a unique name (optionally signed in), a brand-new STUDENT group of the E2E teacher (ana.torres, saved session of the setup project) with given members, a viewed lesson page that gives a student recent activity, and the cancellation of the reservation in progress so the ventilator is free. The backend URL comes from E2E_API_URL (default http://localhost:4000). Depends on @playwright/test and the backend API, auth and learning e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { APIRequestContext } from "@playwright/test";
import { API_URL, type BackendApi } from "./backend-api";
import { apiOf, apiSignIn, LESSON_1, pagesOf } from "./learning";

// Demo-only accounts of ventylab-server prisma/demo (public demo password, never real users).
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "superadmin@ventylab.demo";
/** Demo teacher who neither created nor supervises the groups of the E2E teacher. */
export const OTHER_TEACHER_EMAIL = process.env.E2E_OTHER_TEACHER_EMAIL ?? "luis.herrera@ventylab.demo";
export const DEMO_PASSWORD = "VentyLab-Demo-2026";

const SESSION_REUSE_MS = 10 * 60_000;

export type LoginData = Awaited<ReturnType<typeof apiSignIn>>;

export type ApiSession = LoginData & { api: BackendApi };

const sessions = new Map<string, { login: LoginData, at: number }>();

/** Signs a demo account in through the API, reusing the tokens of this worker while they are fresh (access tokens last 15 min). */
export async function staffSession(request: APIRequestContext, email: string): Promise<ApiSession> {
  const cached = sessions.get(email);
  const login = cached && Date.now() - cached.at < SESSION_REUSE_MS ? cached.login : await apiSignIn(request, email);

  if (login !== cached?.login) {
    sessions.set(email, { login, at: Date.now() });
  }

  return { ...login, api: apiOf(request, login.accessToken) };
}

/** Unique suffix for names of one run. */
export const runTag = (): string => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export type RegisteredStudent = { email: string, name: string };

/** Registers a brand-new student with the given display name (not signed in). */
export async function registerStudent(request: APIRequestContext, name: string): Promise<RegisteredStudent> {
  const email = `e2e-b4-${runTag()}@ventylab.test`;
  const response = await request.post(`${API_URL}/api/auth/register`, { data: { name, email, password: DEMO_PASSWORD } });

  if (!response.ok()) {
    throw new Error(`Registration failed (${response.status()}): ${await response.text()}`);
  }

  return { email, name };
}

/** Registers a brand-new student and signs it in through the API. */
export async function freshStudentSession(request: APIRequestContext, name: string): Promise<ApiSession & RegisteredStudent> {
  const student = await registerStudent(request, name);
  const login = await apiSignIn(request, student.email);

  return { ...student, ...login, api: apiOf(request, login.accessToken) };
}

/** Id of a user found by exact email through the admin users search. */
export async function userIdByEmail(admin: BackendApi, email: string): Promise<string> {
  const page = await admin.call<{ items?: { id: string, email: string }[] } | { id: string, email: string }[]>("GET", `/api/users?search=${encodeURIComponent(email)}&limit=5`);
  const items = Array.isArray(page) ? page : page.items ?? [];
  const user = items.find((candidate) => candidate.email === email);

  if (!user) {
    throw new Error(`No user ${email}`);
  }

  return user.id;
}

/** A new STUDENT group of the teacher with the given members (user ids). */
export async function groupWith(teacher: BackendApi, name: string, memberIds: readonly string[]): Promise<string> {
  const { id } = await teacher.call<{ id: string }>("POST", "/api/groups", { name, type: "STUDENT" });

  for (const userId of memberIds) {
    await teacher.call("POST", `/api/groups/${id}/members`, { userId });
  }

  return id;
}

/** The student views page 1 of lesson 1 of the demo module: recent activity for the "Estudiantes recientes" list. */
export async function viewFirstLessonPage(student: BackendApi): Promise<void> {
  const [first] = await pagesOf(student, LESSON_1.id);

  if (!first) {
    throw new Error("The demo lesson has no pages: run npm run demo:seed in ventylab-server");
  }

  await student.call("POST", `/api/progress/pages/${first.id}/view`);
}

/** Cancels the reservation in progress (if any) so the ventilator is free for the scenario. */
export async function freeVentilator(admin: BackendApi): Promise<void> {
  const current = await admin.call<{ id: string } | { reservation: { id: string } | null } | null>("GET", "/api/reservations/current");
  const id = current && ("reservation" in current ? current.reservation?.id : current.id);

  if (id) {
    await admin.call("POST", `/api/reservations/${id}/cancel`);
  }
}
