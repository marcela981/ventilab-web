/*
* Funcionalidad: AttemptReviewPane tests
* Descripción: v2.0 (Bloque 3, W7): tests of the review pane of the unified grading screen (former grade-attempt page): the pane title carries the student and attempt number, a 409 or 429 on "Regenerar" stays visible in the feedback panel. Before: page tests of /grading/attempts/[attemptId] through MSW: the header (status, publication, passing grade from the API, grade with pass/fail from `passed`), the correct answer and the server rubric breakdown of a SIMULATION answer; overriding an automatic score without a comment shows the client error on the comment field and sends nothing, with a comment the PUT carries {manualScore, comment}; a score out of range is rejected on the client; the backend 422 codes land on their fields (manual_score_invalid on the score, grade_override_comment_required on the comment); a failed save keeps that draft while the saved one is refreshed from the server; "Publicar" is disabled until the attempt is GRADED and posts only after confirmation; "Regenerar retroalimentación IA" turns the feedback PENDING and it becomes READY through the spaced polling. Depends on vitest, Testing Library, msw, the grading page, copy, entities, error messages and test helpers. v1.1 (G2 review W1/W2/S3/S4): changing the score of a commented answer starts an empty comment, shows the previous one read-only and requires a new one; a comment-only edit of an automatic score shows the override hint; a failed read of the attempt after a successful save keeps the drafts and shows the reload alert until a reload succeeds; "Volver a cargar" after the polling stopped restarts it; the results link. The FEEDBACK_READY socket test is gone (staff never receive it). v2.1 (ajustes C1): the release state in the summary and the two releases: "Liberar nota" sends scope GRADE and leaves only "Liberar nota y respuestas", which sends GRADE_AND_ANSWERS and leaves none; both disabled until GRADED, each with its confirmation (cancel sends nothing).
* Versión: 2.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { GradeFeedbackDTO, GradingAttemptDTO } from "../../../api/dtos/grading.dto";
import { FEEDBACK_STATUS_LABELS, GRADE_COPY } from "../../entities/grade-attempt-copy";
import { GRADE_DRAFT_ERRORS } from "../../entities/grading-attempt.entity";
import { GRADING_ERROR_MESSAGES } from "../../entities/grading-error-messages";
import { AttemptReviewPane } from "./attempt-review-pane";
import {
  apiUrl,
  envelope,
  errorResponse,
  feedbackDto,
  feedbackItemDto,
  gradingAnswerDto,
  gradingAttemptDto,
  gradingOptionDto,
  gradingQuestionDto,
  renderGradingPage,
} from "../../pages/grading-test-helpers";

vi.setConfig({ testTimeout: 20_000 });

const router = vi.hoisted(() => ({
  pathname: "/grading/attempts/[attemptId]",
  asPath: "/grading/attempts/at1",
  query: { attemptId: "at1" },
  events: { on: () => undefined, off: () => undefined, emit: () => undefined },
  push: () => Promise.resolve(true),
  prefetch: () => Promise.resolve(),
}));

vi.mock("next/router", () => ({ useRouter: () => router }));

const server = setupServer();
let attempt: GradingAttemptDTO;
let feedback: GradeFeedbackDTO;
let putBodies: { questionId: string, body: unknown }[];
let putFailures: Record<string, { code: string, status: number }>;
let publishCalls: number;
let publishBodies: unknown[];
let regenerateCalls: number;
let attemptReadFails: boolean;

function baseAttempt(): GradingAttemptDTO {
  return gradingAttemptDto("at1", {
    questions: [
      gradingQuestionDto("q1", 1, {
        type: "SINGLE_CHOICE",
        points: 1,
        options: [gradingOptionDto("o1", 1, { content: "Subir la PEEP", isCorrect: true }), gradingOptionDto("o2", 2, { content: "Bajar la FiO2" })],
      }),
      gradingQuestionDto("q2", 2, { type: "OPEN_TEXT", points: 2 }),
      gradingQuestionDto("q3", 3, { type: "SIMULATION", points: 2 }),
    ],
    answers: [
      gradingAnswerDto("q1", { selectedOptionIds: ["o2"], autoScore: 0, earnedScore: 0 }),
      gradingAnswerDto("q2", { textAnswer: "Aumentaría la PEEP a 8", pending: true }),
      gradingAnswerDto("q3", {
        simulationSessionId: "s1",
        pending: true,
        practicalScore: {
          available: true,
          score: 0.75,
          reason: null,
          breakdown: [
            { criterion: "TIME_IN_RANGE", weight: 2, value: 80, threshold: 70, points: 1, weightedPoints: 0.5, justification: "Se mantuvo en rango" },
            { criterion: "SAFETY_VIOLATIONS", weight: 1, value: 1, threshold: 0, points: 0.5, weightedPoints: 0.25, justification: "Una alarma de presión" },
          ] as never[],
        },
      }),
    ],
  });
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  attempt = baseAttempt();
  feedback = feedbackDto("at1");
  putBodies = [];
  putFailures = {};
  publishCalls = 0;
  publishBodies = [];
  regenerateCalls = 0;
  attemptReadFails = false;
  server.use(
    http.get(apiUrl("/api/evaluation-grading/attempts/:attemptId"), () => (attemptReadFails ? errorResponse("INTERNAL", 500) : HttpResponse.json(envelope(attempt)))),
    http.get(apiUrl("/api/evaluation-grading/attempts/:attemptId/feedback"), () => HttpResponse.json(envelope(feedback))),
    http.put(apiUrl("/api/evaluation-grading/attempts/:attemptId/answers/:questionId"), async({ params, request }) => {
      const questionId = String(params.questionId);
      const body = await request.json() as { manualScore: number, comment?: string };

      putBodies.push({ questionId, body });

      const failure = putFailures[questionId];

      if (failure) {
        return errorResponse(failure.code, failure.status);
      }

      attempt = {
        ...attempt,
        answers: attempt.answers.map((answer) => (answer.questionId === questionId
          ? { ...answer, manualScore: body.manualScore, earnedScore: body.manualScore, pending: false, teacherComment: body.comment ?? answer.teacherComment }
          : answer)),
      };

      return HttpResponse.json(envelope({ attemptId: "at1", questionId, override: false, published: false, grade: null, maxScore: 5, score: null, status: "PENDING_REVIEW" }));
    }),
    http.post(apiUrl("/api/evaluation-grading/attempts/:attemptId/publish"), async({ request }) => {
      const body = await request.json() as { scope: "GRADE" | "GRADE_AND_ANSWERS" };
      const now = "2026-10-12T16:00:00.000Z";

      publishCalls += 1;
      publishBodies.push(body);
      attempt = { ...attempt, gradePublishedAt: now, answersReleasedAt: body.scope === "GRADE_AND_ANSWERS" ? now : attempt.answersReleasedAt };

      return HttpResponse.json(envelope({ attemptId: "at1", alreadyPublished: false, publishedAt: now, answersReleasedAt: attempt.answersReleasedAt }));
    }),
    http.post(apiUrl("/api/evaluation-grading/attempts/:attemptId/feedback/regenerate"), () => {
      regenerateCalls += 1;
      feedback = feedbackDto("at1", { overall: feedbackItemDto("f-new", { status: "PENDING", source: null, content: "", provider: null, model: null }) });

      return HttpResponse.json(envelope({ attemptId: "at1", status: "PENDING" }), { status: 202 });
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
});

afterAll(() => {
  server.close();
});

function renderPage() {
  return renderGradingPage(<AttemptReviewPane attemptId="at1" studentLabel="Ana Gómez" />);
}

const card = (position: number) => screen.getByRole("article", { name: new RegExp(`^Pregunta ${position} `) });
const scoreField = (position: number) => within(card(position)).getByLabelText(/^Puntaje/);
const commentField = (position: number) => within(card(position)).getByLabelText(/^Comentario para el estudiante/);
const saveButton = () => screen.getByRole("button", { name: GRADE_COPY.save });

async function loaded() {
  await screen.findByRole("article", { name: /^Pregunta 1 / });
}

function markGraded() {
  attempt = {
    ...attempt,
    status: "GRADED",
    grade: 3.5,
    passed: true,
    score: 3,
    answers: attempt.answers.map((answer) => ({ ...answer, pending: false, manualScore: answer.manualScore ?? 1, earnedScore: 1 })),
  };
}

describe("AttemptReviewPane — layout", () => {
  it("shows the header, the correct answer and the server rubric breakdown", async() => {
    renderPage();
    await loaded();

    expect(screen.getByRole("heading", { level: 2, name: GRADE_COPY.paneTitle("Ana Gómez", 2) })).toBeInTheDocument();
    expect(screen.getByText("Pendiente de calificación")).toBeInTheDocument();
    expect(screen.getByTestId("release-state")).toHaveTextContent("Sin liberar");
    expect(screen.getByText(GRADE_COPY.passingGrade("3,0"))).toBeInTheDocument();
    expect(screen.getByText(GRADE_COPY.noGrade)).toBeInTheDocument();

    expect(within(card(1)).getByText(GRADE_COPY.correctAnswer)).toBeInTheDocument();
    expect(within(card(1)).getAllByText("Subir la PEEP").length).toBeGreaterThan(0);
    expect(within(card(1)).getByText(new RegExp(`^${GRADE_COPY.autoScore("0")} ·`))).toBeInTheDocument();

    const rubric = within(card(3)).getByRole("table", { name: GRADE_COPY.rubricTableLabel });
    const rows = within(rubric).getAllByRole("row").slice(1);

    expect(within(rows[0] as HTMLElement).getByText("Tiempo en rango")).toBeInTheDocument();
    expect(rows[0]).toHaveTextContent("Se mantuvo en rango");
    expect(within(rows[1] as HTMLElement).getByText("Violaciones de seguridad")).toBeInTheDocument();
    expect(within(card(3)).getByText(GRADE_COPY.rubricScore(new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 1 }).format(0.75)))).toBeInTheDocument();

    const navigator = screen.getByRole("navigation", { name: GRADE_COPY.navigatorLabel });

    expect(within(navigator).getByRole("link", { name: GRADE_COPY.navigatorItem(2, true) })).toHaveAttribute("href", "#grade-question-q2");
  });

  it("shows the grade with pass/fail from the API", async() => {
    markGraded();
    attempt = { ...attempt, grade: 2.5, passed: false, gradePublishedAt: "2026-10-12T16:00:00.000Z" };
    renderPage();
    await loaded();

    expect(screen.getByText("2,5")).toBeInTheDocument();
    expect(screen.getByText(`· ${GRADE_COPY.failed}`)).toBeInTheDocument();
    expect(screen.getByTestId("release-state")).toHaveTextContent("Nota liberada");
  });
});

describe("AttemptReviewPane — grading", () => {
  it("requires a comment to override an automatic score and sends nothing without it", async() => {
    renderPage();
    await loaded();

    fireEvent.change(scoreField(1), { target: { value: "1" } });
    expect(screen.getByText(GRADE_COPY.dirty(1))).toBeInTheDocument();
    fireEvent.click(saveButton());

    expect(await within(card(1)).findByText(GRADE_DRAFT_ERRORS.commentRequired)).toBeInTheDocument();
    expect(putBodies).toEqual([]);
  });

  it("sends the override with its comment and the other changed answers, one at a time", async() => {
    renderPage();
    await loaded();

    fireEvent.change(scoreField(1), { target: { value: "1" } });
    fireEvent.change(commentField(1), { target: { value: "Justificaste bien la PEEP" } });
    fireEvent.change(scoreField(2), { target: { value: "1,5" } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(putBodies).toHaveLength(2));
    expect(putBodies).toEqual([
      { questionId: "q1", body: { manualScore: 1, comment: "Justificaste bien la PEEP" } },
      { questionId: "q2", body: { manualScore: 1.5 } },
    ]);
    expect(await screen.findByText(GRADE_COPY.saved(2))).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(GRADE_COPY.dirty(2))).not.toBeInTheDocument());
  });

  it("rejects a score out of range on the client", async() => {
    renderPage();
    await loaded();

    fireEvent.change(scoreField(2), { target: { value: "3" } });
    fireEvent.click(saveButton());

    expect(await within(card(2)).findByText(GRADE_DRAFT_ERRORS.scoreRange(2))).toBeInTheDocument();
    expect(putBodies).toEqual([]);
  });

  it("puts the backend 422 codes on their fields", async() => {
    putFailures = {
      q2: { code: "evaluation.manual_score_invalid", status: 422 },
      q3: { code: "evaluation.grade_override_comment_required", status: 422 },
    };
    renderPage();
    await loaded();

    fireEvent.change(scoreField(2), { target: { value: "2" } });
    fireEvent.change(scoreField(3), { target: { value: "1" } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(putBodies).toHaveLength(2));

    const scoreHelp = await within(card(2)).findByText(GRADING_ERROR_MESSAGES["evaluation.manual_score_invalid"]);
    const commentHelp = await within(card(3)).findByText(GRADING_ERROR_MESSAGES["evaluation.grade_override_comment_required"]);

    expect(scoreField(2)).toHaveAttribute("aria-invalid", "true");
    expect(scoreField(2).getAttribute("aria-describedby")).toContain(scoreHelp.id);
    expect(commentField(3)).toHaveAttribute("aria-invalid", "true");
    expect(commentField(3).getAttribute("aria-describedby")).toContain(commentHelp.id);
  });

  it("keeps the draft of a failed save while the saved one is refreshed", async() => {
    putFailures = { q2: { code: "INTERNAL", status: 500 } };
    renderPage();
    await loaded();

    fireEvent.change(scoreField(2), { target: { value: "1" } });
    fireEvent.change(scoreField(3), { target: { value: "1,5" } });
    fireEvent.click(saveButton());

    expect(await within(card(2)).findByText(/error en el servidor/)).toBeInTheDocument();
    expect(scoreField(2)).toHaveValue("1");
    expect(screen.getByText(GRADE_COPY.saveFailed)).toBeInTheDocument();
    // The saved answer now shows the server value.
    await waitFor(() => expect(within(card(3)).getByText(new RegExp(GRADE_COPY.manualScore("1,5")))).toBeInTheDocument());
    expect(screen.getByText(GRADE_COPY.dirty(1))).toBeInTheDocument();
  });
});

describe("AttemptReviewPane — review fixes", () => {
  it("starts an empty override comment, shows the previous one and requires a new one", async() => {
    attempt = {
      ...attempt,
      answers: attempt.answers.map((answer) => (answer.questionId === "q2"
        ? { ...answer, manualScore: 1, earnedScore: 1, pending: false, teacherComment: "Faltó la meseta" }
        : answer)),
    };
    renderPage();
    await loaded();

    expect(commentField(2)).toHaveValue("Faltó la meseta");
    fireEvent.change(scoreField(2), { target: { value: "1,5" } });

    expect(commentField(2)).toHaveValue("");
    expect(within(card(2)).getByText(GRADE_COPY.previousComment)).toBeInTheDocument();
    expect(within(card(2)).getByText("Faltó la meseta")).toBeInTheDocument();

    fireEvent.change(commentField(2), { target: { value: "Faltó la meseta" } });
    fireEvent.click(saveButton());
    expect(await within(card(2)).findByText(GRADE_DRAFT_ERRORS.commentNotNew)).toBeInTheDocument();
    expect(putBodies).toEqual([]);

    fireEvent.change(commentField(2), { target: { value: "Justificó la meseta en la revisión" } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(putBodies).toEqual([
      { questionId: "q2", body: { manualScore: 1.5, comment: "Justificó la meseta en la revisión" } },
    ]));
  });

  it("explains that a comment-only edit of an automatic score is an override", async() => {
    renderPage();
    await loaded();

    expect(within(card(1)).queryByText(GRADE_COPY.commentOnlyOverrideHint)).not.toBeInTheDocument();
    fireEvent.change(commentField(1), { target: { value: "Revisa la PEEP" } });

    expect(within(card(1)).getByText(GRADE_COPY.commentOnlyOverrideHint)).toBeInTheDocument();
  });

  it("keeps the drafts and asks to reload when the attempt cannot be read after a save", async() => {
    renderPage();
    await loaded();

    fireEvent.change(scoreField(2), { target: { value: "1,5" } });
    attemptReadFails = true;
    fireEvent.click(saveButton());

    expect(await screen.findByText(GRADE_COPY.refreshFailed)).toBeInTheDocument();
    expect(putBodies).toHaveLength(1);
    expect(scoreField(2)).toHaveValue("1,5");
    expect(screen.getByText(GRADE_COPY.dirty(1))).toBeInTheDocument();

    attemptReadFails = false;
    fireEvent.click(screen.getByRole("button", { name: GRADE_COPY.reloadAttempt }));

    await waitFor(() => expect(screen.queryByText(GRADE_COPY.refreshFailed)).not.toBeInTheDocument());
    expect(within(card(2)).getByText(new RegExp(GRADE_COPY.manualScore("1,5")))).toBeInTheDocument();
    expect(screen.queryByText(GRADE_COPY.dirty(1))).not.toBeInTheDocument();
  });

});

describe("AttemptReviewPane — release", () => {
  it("disables both releases until the attempt is GRADED", async() => {
    renderPage();
    await loaded();

    expect(screen.getByRole("button", { name: GRADE_COPY.releaseGrade })).toBeDisabled();
    expect(screen.getByRole("button", { name: GRADE_COPY.releaseAll })).toBeDisabled();
    expect(screen.getByText(GRADE_COPY.releaseNeedsGraded)).toBeInTheDocument();
  });

  it("releases the grade alone with scope GRADE after confirmation, then offers only the answers", async() => {
    markGraded();
    renderPage();
    await loaded();

    const releaseGrade = screen.getByRole("button", { name: GRADE_COPY.releaseGrade });

    await waitFor(() => expect(releaseGrade).toBeEnabled());
    fireEvent.click(releaseGrade);

    const dialog = await screen.findByRole("dialog", { name: GRADE_COPY.releaseGradeTitle });

    expect(within(dialog).getByText(GRADE_COPY.releaseGradeDescription)).toBeInTheDocument();
    expect(publishCalls).toBe(0);
    fireEvent.click(within(dialog).getByRole("button", { name: GRADE_COPY.releaseConfirm }));

    await waitFor(() => expect(publishBodies).toEqual([{ scope: "GRADE" }]));
    expect(await screen.findByText(GRADE_COPY.releasedGradeToast)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("release-state")).toHaveTextContent("Nota liberada"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: GRADE_COPY.releaseGrade })).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: GRADE_COPY.releaseAll })).toBeEnabled();
  });

  it("releases the grade and the answers with scope GRADE_AND_ANSWERS after confirmation", async() => {
    markGraded();
    renderPage();
    await loaded();

    const releaseAll = screen.getByRole("button", { name: GRADE_COPY.releaseAll });

    await waitFor(() => expect(releaseAll).toBeEnabled());
    fireEvent.click(releaseAll);

    const dialog = await screen.findByRole("dialog", { name: GRADE_COPY.releaseAllTitle });

    expect(within(dialog).getByText(GRADE_COPY.releaseAllDescription)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: GRADE_COPY.releaseConfirm }));

    await waitFor(() => expect(publishBodies).toEqual([{ scope: "GRADE_AND_ANSWERS" }]));
    expect(await screen.findByText(GRADE_COPY.releasedAllToast)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("release-state")).toHaveTextContent("Nota y respuestas liberadas"));
    expect(screen.queryByRole("button", { name: GRADE_COPY.releaseGrade })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: GRADE_COPY.releaseAll })).not.toBeInTheDocument();
  });

  it("cancels a release without calling the API", async() => {
    markGraded();
    renderPage();
    await loaded();

    const releaseGrade = screen.getByRole("button", { name: GRADE_COPY.releaseGrade });

    await waitFor(() => expect(releaseGrade).toBeEnabled());
    fireEvent.click(releaseGrade);
    fireEvent.click(within(await screen.findByRole("dialog", { name: GRADE_COPY.releaseGradeTitle })).getByRole("button", { name: GRADE_COPY.cancel }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(publishCalls).toBe(0);
  });
});

describe("AttemptReviewPane — AI feedback", () => {
  it("regenerates and follows the PENDING feedback to READY by polling", async() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    markGraded();
    feedback = feedbackDto("at1", { overall: feedbackItemDto("f-old") });
    renderPage();
    await loaded();

    expect(await screen.findByText("Buen manejo de la PEEP.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: GRADE_COPY.regenerate }));

    expect(await screen.findByText(FEEDBACK_STATUS_LABELS.PENDING)).toBeInTheDocument();
    expect(regenerateCalls).toBe(1);

    feedback = feedbackDto("at1", { overall: feedbackItemDto("f-new", { content: "Nueva retroalimentación." }) });
    await vi.advanceTimersByTimeAsync(3_100);

    expect(await screen.findByText("Nueva retroalimentación.")).toBeInTheDocument();
    expect(screen.getByText(FEEDBACK_STATUS_LABELS.READY)).toBeInTheDocument();
  });

  it("restarts the stopped polling when the feedback is reloaded", async() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    markGraded();
    feedback = feedbackDto("at1", { overall: feedbackItemDto("f-p", { status: "PENDING", source: null, content: "", provider: null, model: null }) });
    renderPage();
    await loaded();

    expect(await screen.findByText(FEEDBACK_STATUS_LABELS.PENDING)).toBeInTheDocument();

    for (let step = 0; step < 24 && !screen.queryByText(GRADE_COPY.feedbackPollingStopped); step += 1) {
      await vi.advanceTimersByTimeAsync(30_000);
    }

    expect(await screen.findByText(GRADE_COPY.feedbackPollingStopped)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: GRADE_COPY.feedbackReload }));
    await waitFor(() => expect(screen.queryByText(GRADE_COPY.feedbackPollingStopped)).not.toBeInTheDocument());

    feedback = feedbackDto("at1", { overall: feedbackItemDto("f-p", { content: "Lista tras recargar." }) });
    await vi.advanceTimersByTimeAsync(3_100);

    expect(await screen.findByText("Lista tras recargar.")).toBeInTheDocument();
  });

  it("does not offer regeneration before the attempt is GRADED", async() => {
    renderPage();
    await loaded();

    expect(screen.getByRole("button", { name: GRADE_COPY.regenerate })).toBeDisabled();
    expect(screen.getByText(GRADE_COPY.regenerateNeedsGraded)).toBeInTheDocument();
  });
});

describe("AttemptReviewPane — regeneration refused", () => {
  it.each([
    ["evaluation.grade_feedback_generation_in_progress", 409],
    ["common.too_many_requests", 429],
  ])("keeps the %s refusal visible in the feedback panel", async(code, status) => {
    markGraded();
    server.use(http.post(apiUrl("/api/evaluation-grading/attempts/:attemptId/feedback/regenerate"), () => errorResponse(code, status)));
    renderPage();
    await loaded();

    fireEvent.click(await screen.findByRole("button", { name: GRADE_COPY.regenerate }));

    const alert = await screen.findByRole("alert");

    expect(alert.textContent).not.toBe("");
    if (status === 409) {
      expect(alert).toHaveTextContent(GRADING_ERROR_MESSAGES["evaluation.grade_feedback_generation_in_progress"]);
    }
  });
});
