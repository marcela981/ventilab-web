/*
* Funcionalidad: EvaluationIntroPage tests
* Descripción: Renders /evaluations/[evaluationId] against a mocked backend (msw) with a mocked next/router: the active assignment wins over a closed one, the Tiptap instructions and details are shown with the attempt warnings, "Comenzar" starts the attempt (POST once, even on a double click) and pushes the attempt player URL, "Continuar intento" resumes the attempt in progress, a blocked evaluation disables the button with the reason and links to the last result, a start error shows its Spanish message, and an unknown evaluation shows the not-found state. Depends on vitest, Testing Library, msw and the evaluations test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { MyEvaluationDTO } from "../../api/dtos/evaluations.dto";
import { EVALUATION_ERROR_MESSAGES } from "../entities/evaluations-error-messages";
import { EvaluationIntroPage } from "./evaluation-intro.page";
import { apiUrl, attemptDto, envelope, errorResponse, myEvaluationDto, renderWithSession } from "./evaluations-test-helpers";

const router = vi.hoisted(() => ({
  push: vi.fn(() => Promise.resolve(true)),
  replace: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("next/router", () => ({ useRouter: () => router }));

const server = setupServer();
const instructions = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "Responde con base en el caso clínico." }] }],
};
let myEvaluations: MyEvaluationDTO[] = [];
let startRequests: string[] = [];

function startResponse(assignmentId: string, attemptId: string) {
  return {
    id: attemptId,
    evaluationId: "e1",
    assignmentId,
    attemptNumber: 1,
    status: "IN_PROGRESS",
    startedAt: "2026-10-14T15:00:00.000Z",
    deadlineAt: "2026-10-14T15:30:00.000Z",
    serverNow: "2026-10-14T15:00:00.000Z",
    created: true,
  };
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  router.push.mockClear();
  startRequests = [];
  myEvaluations = [
    myEvaluationDto("as-closed", "e1", { state: "CLOSED", canStart: false }),
    myEvaluationDto("as-active", "e1", {
      evaluation: { title: "Quiz de PEEP", description: instructions as unknown as string, durationMinutes: 30, questionCount: 8 },
    }),
  ];
  server.use(
    http.get(apiUrl("/api/my-evaluations"), () => HttpResponse.json(envelope(myEvaluations))),
    http.get(apiUrl("/api/my-evaluations/grades"), () => HttpResponse.json(envelope([]))),
    http.post(apiUrl("/api/my-evaluations/:assignmentId/attempts"), ({ params }) => {
      const assignmentId = String(params.assignmentId);

      startRequests.push(assignmentId);

      return HttpResponse.json(envelope(startResponse(assignmentId, "at-new")), { status: 201 });
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("EvaluationIntroPage", () => {
  it("shows the active assignment with its instructions, details and warnings", async() => {
    renderWithSession(<EvaluationIntroPage evaluationId="e1" />);

    expect(await screen.findByRole("heading", { level: 1, name: "Quiz de PEEP" })).toBeInTheDocument();
    expect(screen.getByText("Responde con base en el caso clínico.")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Detalles" })).toHaveTextContent("Preguntas8Duración30 minIntentos0 de 2 intentos");
    expect(screen.getByText(/El tiempo lo controla el servidor/)).toBeInTheDocument();
    expect(screen.getByText("Tus respuestas se guardan automáticamente mientras respondes.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a Evaluaciones" })).toHaveAttribute("href", "/evaluations");
  });

  it("starts the attempt once and opens the attempt player", async() => {
    renderWithSession(<EvaluationIntroPage evaluationId="e1" />);

    const button = await screen.findByRole("button", { name: "Comenzar" });

    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith("/evaluations/e1/attempts/at-new");
    });
    expect(startRequests).toEqual(["as-active"]);
  });

  it("continues the attempt in progress", async() => {
    myEvaluations = [myEvaluationDto("as1", "e1", { attempts: [attemptDto("at1", 1, { status: "IN_PROGRESS", submittedAt: null })] })];
    server.use(http.post(apiUrl("/api/my-evaluations/:assignmentId/attempts"), ({ params }) => {
      startRequests.push(String(params.assignmentId));

      return HttpResponse.json(envelope({ ...startResponse("as1", "at1"), created: false }));
    }));
    renderWithSession(<EvaluationIntroPage evaluationId="e1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Continuar intento" }));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith("/evaluations/e1/attempts/at1");
    });
  });

  it("disables the start with the reason and links to the last result when no attempts are left", async() => {
    myEvaluations = [myEvaluationDto("as1", "e1", {
      canStart: false,
      evaluation: { maxAttempts: 1 },
      attempts: [attemptDto("at1", 1, { status: "GRADED", published: true, grade: 4.2, passed: true, score: 9, maxScore: 10 })],
    })];
    renderWithSession(<EvaluationIntroPage evaluationId="e1" />);

    expect(await screen.findByRole("button", { name: "Comenzar" })).toBeDisabled();
    expect(screen.getByText("Ya usaste todos tus intentos.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver resultado" })).toHaveAttribute("href", "/evaluations/e1/attempts/at1/result");
    expect(screen.getByText("4,2")).toBeInTheDocument();
    expect(screen.queryByText(/El tiempo lo controla el servidor/)).not.toBeInTheDocument();
  });

  it("shows the Spanish message when the start fails", async() => {
    server.use(http.post(apiUrl("/api/my-evaluations/:assignmentId/attempts"), () => errorResponse("evaluation.not_open", 403)));
    renderWithSession(<EvaluationIntroPage evaluationId="e1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Comenzar" }));

    expect(await screen.findByText(EVALUATION_ERROR_MESSAGES["evaluation.not_open"])).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("shows the not-found state for an evaluation that is not assigned", async() => {
    renderWithSession(<EvaluationIntroPage evaluationId="missing" />);

    expect(await screen.findByText("Evaluación no disponible")).toBeInTheDocument();
  });
});
