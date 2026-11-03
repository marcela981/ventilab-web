/*
* Funcionalidad: E2E helpers of the evaluation area (Bloque 3)
* Descripción: API setup shared by the Block 3 specs: a teacher session signed in through the API (ana.torres, injected into a browser context like the fresh students), a brand-new STUDENT group of that teacher with brand-new students (so every run starts without attempts and without touching the demo groups), an evaluation built through the authoring API (questions with options, hint, explanation, OPEN_TEXT and SIMULATION questions; optional curriculum level and module), marked READY and assigned to the group with an open window, plus its cleanup (assignments closed, evaluation archived). Also the Tiptap document of a plain prompt and the attempt rows of the grading list. The backend URL comes from E2E_API_URL (default http://localhost:4000). Depends on @playwright/test and the learning e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { APIRequestContext } from "@playwright/test";
import type { BackendApi } from "./backend-api";
import { apiOf, apiSignIn, type FreshStudent, registerFreshStudent } from "./learning";

const DAY_MS = 86_400_000;

export const TEACHER_EMAIL = process.env.E2E_TEACHER_EMAIL ?? "ana.torres@ventylab.demo";

export type EvaluationType = "QUIZ" | "WORKSHOP" | "EXAM";

export type QuestionSpec =
  | { type: "SINGLE_CHOICE" | "TRUE_FALSE" | "MULTIPLE_CHOICE", prompt: string, options: { content: string, isCorrect?: boolean }[], points?: number, hint?: string, explanation?: string }
  | { type: "OPEN_TEXT", prompt: string, points?: number, explanation?: string }
  | { type: "SIMULATION", prompt: string, points?: number, clinicalCaseId: string };

export type EvaluationSpec = {
  type: EvaluationType
  title: string
  questions: QuestionSpec[]
  durationMinutes?: number
  maxAttempts?: number
  showResultsImmediately?: boolean
  levelId?: string | undefined
  moduleId?: string | undefined
};

export type TeacherSession = Awaited<ReturnType<typeof apiSignIn>> & { api: BackendApi };

export type SeededEvaluation = { id: string, title: string, assignmentIds: string[], questionIds: string[] };

/** Tiptap document of a one-paragraph prompt (the format the authoring API stores). */
export function promptDoc(text: string): Record<string, unknown> {
  return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
}

/** Unique suffix for titles and names of one run. */
export const runTag = (): string => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/** The demo teacher signed in through the API (fresh tokens, also usable for a browser context). */
export async function signInTeacher(request: APIRequestContext): Promise<TeacherSession> {
  const login = await apiSignIn(request, TEACHER_EMAIL);

  return { ...login, api: apiOf(request, login.accessToken) };
}

/** A new STUDENT group of the teacher with `count` brand-new students. */
export async function freshGroup(request: APIRequestContext, teacher: BackendApi, label: string, count = 1): Promise<{ groupId: string, name: string, students: FreshStudent[] }> {
  const name = `E2E B3 ${label} ${runTag()}`;
  const { id: groupId } = await teacher.call<{ id: string }>("POST", "/api/groups", { name, type: "STUDENT" });
  const students: FreshStudent[] = [];

  for (let index = 0; index < count; index += 1) {
    const student = await registerFreshStudent(request, `b3-${label}`);

    await teacher.call("POST", `/api/groups/${groupId}/members`, { userId: student.user.id });
    students.push(student);
  }

  return { groupId, name, students };
}

/** Creates the evaluation and its questions, marks it READY and assigns it to the group (window open now). */
export async function seedEvaluation(teacher: BackendApi, spec: EvaluationSpec, groupId: string): Promise<SeededEvaluation> {
  const { id } = await teacher.call<{ id: string }>("POST", "/api/evaluations", {
    type: spec.type,
    title: spec.title,
    maxAttempts: spec.maxAttempts ?? 1,
    ...(spec.durationMinutes ? { durationMinutes: spec.durationMinutes } : {}),
    ...(spec.showResultsImmediately === undefined ? {} : { showResultsImmediately: spec.showResultsImmediately }),
    ...(spec.levelId ? { levelId: spec.levelId } : {}),
    ...(spec.moduleId ? { moduleId: spec.moduleId } : {}),
  });
  const questionIds: string[] = [];

  for (const question of spec.questions) {
    const body: Record<string, unknown> = { type: question.type, prompt: promptDoc(question.prompt), points: question.points ?? 1 };

    if ("options" in question) {
      body.options = question.options.map((option) => ({ content: option.content, isCorrect: option.isCorrect === true }));

      if (question.hint) {
        body.hint = question.hint;
      }
    }

    if ("explanation" in question && question.explanation) {
      body.explanation = question.explanation;
    }

    if (question.type === "SIMULATION") {
      body.clinicalCaseId = question.clinicalCaseId;
      body.rubric = { criteria: [{ parameter: "peep", expectedValue: 5, min: 5, max: 8, priority: "IMPORTANTE" }] };
    }

    const created = await teacher.call<{ id: string }>("POST", `/api/evaluations/${id}/questions`, body);

    questionIds.push(created.id);
  }

  await teacher.call("PATCH", `/api/evaluations/${id}/status`, { status: "READY" });
  const now = Date.now();
  const { ids: assignmentIds } = await teacher.call<{ ids: string[] }>("POST", `/api/evaluations/${id}/assignments`, {
    groupIds: [groupId],
    startsAt: new Date(now - 60_000).toISOString(),
    endsAt: new Date(now + DAY_MS).toISOString(),
  });

  return { id, title: spec.title, assignmentIds, questionIds };
}

/** Closes the assignments and archives the evaluation (best effort: the spec result does not depend on it). */
export async function retireEvaluation(teacher: BackendApi, evaluation: SeededEvaluation | null): Promise<void> {
  if (!evaluation) {
    return;
  }

  for (const assignmentId of evaluation.assignmentIds) {
    await teacher.call("POST", `/api/evaluations/${evaluation.id}/assignments/${assignmentId}/close`).catch(() => undefined);
  }

  await teacher.call("PATCH", `/api/evaluations/${evaluation.id}/status`, { status: "ARCHIVED" }).catch(() => undefined);
}

export type MyEvaluationItem = { assignmentId: string, evaluation: { id: string } | null, attempts: { id: string, status: string }[] };

/** The student's assignment of one evaluation (GET /api/my-evaluations). */
export async function myAssignmentOf(student: BackendApi, evaluationId: string): Promise<MyEvaluationItem> {
  const items = await student.call<MyEvaluationItem[]>("GET", "/api/my-evaluations");
  const item = items.find((candidate) => candidate.evaluation?.id === evaluationId);

  if (!item) {
    throw new Error(`Evaluation ${evaluationId} is not assigned to the student`);
  }

  return item;
}

type TreeLevel = { id: string, title: string, order: number, track: string | null, modules: { id: string, title: string }[] };

type StudentTree = { sections: { levels: TreeLevel[] }[], unsectionedLevels: TreeLevel[] };

/** Curriculum levels of the seeded tree (read as the given account), with their track and modules. */
export async function curriculumLevels(api: BackendApi): Promise<TreeLevel[]> {
  const tree = await api.call<StudentTree>("GET", "/api/curriculum/tree");

  return [...tree.sections.flatMap((section) => section.levels), ...tree.unsectionedLevels];
}
