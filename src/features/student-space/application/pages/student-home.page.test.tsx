/*
* Funcionalidad: Student home page tests
* Descripción: /me with msw: the whole page comes from ONE `GET /api/me/summary` request (any other request fails the test); progress bars carry the API percentage and lesson counts; evaluations, grades (es-CO grade with its passed/failed text), notes, conversations, simulation sessions (result and replay of ended sessions, resume of active ones), reservations and the unread counter link to their routes; every block shows its empty state; a failed load shows a retryable error. Depends on vitest, msw, Testing Library and the student space test helpers. v1.1 (B1 closure): the empty overall progress carries the new title field. v1.2 (B2 closure): section titles from the API (fallback "Sección N"), grades linking to the attempt result with their module, notes linking to the lesson page with lesson and page titles (plain text without module), session case titles (fallback label). v1.3 (W3, Bloque 2): a section links to the Currículo tab of /learn. v1.4 (W8, Bloque 2): "Continuar donde quedaste" (shared with the Inicio tab) shows with continueLearning and links to the module resolver; hidden without it.
* Versión: 1.4
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { MySummaryDTO } from "../../api/dtos/student-space.dto";
import { SUMMARY_COPY } from "../components/summary-blocks";
import { apiUrl, envelope, errorResponse, renderStudentSpace, summaryDto } from "./student-space-test-helpers";
import { STUDENT_HOME_COPY, StudentHomePage } from "./student-home.page";

const server = setupServer();
const NOW = new Date("2026-10-16T14:00:00.000Z");

vi.setConfig({ testTimeout: 20_000 });

let summary: MySummaryDTO;
let requests: number;
let fail: boolean;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  summary = summaryDto();
  requests = 0;
  fail = false;
  server.use(
    http.get(apiUrl("/api/me/summary"), () => {
      requests += 1;

      return fail ? errorResponse("internal_error", 500) : HttpResponse.json(envelope(summary));
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

function block(title: string): HTMLElement {
  return screen.getByRole("region", { name: title });
}

describe("StudentHomePage", () => {
  it("renders every block from one summary request", async() => {
    renderStudentSpace(<StudentHomePage now={NOW} />);

    await screen.findByRole("region", { name: SUMMARY_COPY.progressTitle });
    expect(requests).toBe(1);

    const progress = block(SUMMARY_COPY.progressTitle);

    expect(within(progress).getByRole("progressbar", { name: SUMMARY_COPY.progressAria("Fundamentos") })).toHaveAttribute("aria-valuenow", "75");
    expect(within(progress).getByRole("progressbar", { name: SUMMARY_COPY.progressAria("Sección 2") })).toHaveAttribute("aria-valuenow", "17");
    expect(within(progress).getByText(SUMMARY_COPY.progressValue(40, 4, 10))).toBeInTheDocument();
    expect(within(progress).getAllByRole("link", { name: SUMMARY_COPY.openSection })[0]).toHaveAttribute("href", "/learn?tab=curriculo&section=s1");

    const evaluations = block(SUMMARY_COPY.evaluationsTitle);

    expect(within(evaluations).getByRole("link", { name: "Parcial de ventilación" })).toHaveAttribute("href", "/evaluations/ev-1");
    expect(within(evaluations).getByRole("link", { name: "Quiz de PEEP" })).toHaveAttribute("href", "/evaluations/ev-2");

    const grades = block(SUMMARY_COPY.gradesTitle);

    expect(within(grades).getByText(/Nota 4,2/)).toBeInTheDocument();
    expect(within(grades).getByRole("link", { name: SUMMARY_COPY.openResult("Taller de curvas") })).toHaveAttribute("href", "/evaluations/ev-3/attempts/at-3/result");
    expect(within(grades).getByRole("link", { name: SUMMARY_COPY.openResult("Quiz de volúmenes") })).toHaveAttribute("href", "/evaluations/ev-4/attempts/at-4/result");
    expect(within(grades).getByText(/^Fisiología · Taller/)).toBeInTheDocument();
    expect(within(grades).getByText("Aprobada")).toBeInTheDocument();
    expect(within(grades).getByText("No aprobada")).toBeInTheDocument();
    expect(within(grades).getByRole("link", { name: SUMMARY_COPY.gradesLink })).toHaveAttribute("href", "/me/grades");

    const notes = block(SUMMARY_COPY.notesTitle);

    expect(within(notes).getByText("La PEEP mantiene los alvéolos abiertos")).toBeInTheDocument();
    expect(within(notes).getByText("hace 2 horas")).toBeInTheDocument();
    expect(within(notes).getByRole("link", { name: SUMMARY_COPY.openLesson("Presión positiva") })).toHaveAttribute("href", "/learn/modules/m2/lessons/l1/1");
    expect(within(notes).getByRole("link", { name: SUMMARY_COPY.notesLink })).toHaveAttribute("href", "/me/notes");

    expect(within(block(SUMMARY_COPY.conversationsTitle)).getByRole("link", { name: "Dudas sobre compliance" })).toHaveAttribute("href", "/assistant/c1");

    const simulations = block(SUMMARY_COPY.simulationsTitle);

    expect(within(simulations).getByRole("link", { name: SUMMARY_COPY.result })).toHaveAttribute("href", "/simulator/sessions/ss-1/result");
    expect(within(simulations).getByRole("link", { name: SUMMARY_COPY.replay })).toHaveAttribute("href", "/simulator/sessions/ss-1/replay");
    expect(within(simulations).getByRole("link", { name: SUMMARY_COPY.resume })).toHaveAttribute("href", "/simulator/sessions/ss-2");
    expect(within(simulations).getByText(/Puntaje 82/)).toBeInTheDocument();
    expect(within(simulations).getByText("SDRA moderado")).toBeInTheDocument();
    expect(within(simulations).getByText(SUMMARY_COPY.unknownCase)).toBeInTheDocument();

    expect(within(block(SUMMARY_COPY.reservationsTitle)).getByText("Práctica de PEEP")).toBeInTheDocument();

    const notifications = block(SUMMARY_COPY.notificationsTitle);

    expect(within(notifications).getByText("3")).toBeInTheDocument();
    expect(within(notifications).getByRole("link", { name: SUMMARY_COPY.notificationsLink })).toHaveAttribute("href", "/notifications");
  });

  it("shows Continuar donde quedaste only when the API has a lesson to resume", async() => {
    const { unmount } = renderStudentSpace(<StudentHomePage now={NOW} />);

    await screen.findByRole("region", { name: SUMMARY_COPY.progressTitle });
    expect(screen.queryByRole("region", { name: SUMMARY_COPY.continueTitle })).not.toBeInTheDocument();
    unmount();

    summary = summaryDto({
      continueLearning: { moduleId: "m 1", moduleTitle: "Inversión fisiológica", lessonId: "l1", lessonTitle: "Ecuación del movimiento", percent: 40.4 },
    });
    renderStudentSpace(<StudentHomePage now={NOW} />);

    const resume = await screen.findByRole("region", { name: SUMMARY_COPY.continueTitle });

    expect(within(resume).getByText("Ecuación del movimiento")).toBeInTheDocument();
    expect(within(resume).getByText(SUMMARY_COPY.continueValue(40))).toBeInTheDocument();
    expect(within(resume).getByRole("progressbar", { name: SUMMARY_COPY.continueAria("Inversión fisiológica") })).toHaveAttribute("aria-valuenow", "40");
    expect(within(resume).getByRole("link", { name: SUMMARY_COPY.continueActionAria("Ecuación del movimiento") })).toHaveAttribute("href", "/learn/modules/m%201");
  });

  it("shows the empty state of every block", async() => {
    summary = summaryDto({
      progress: { overall: { id: null, title: null, percentage: 0, completedLessons: 0, totalLessons: 0, completed: false }, sections: [] },
      activeEvaluations: [],
      upcomingEvaluations: [],
      grades: [],
      latestNotes: [],
      latestConversations: [],
      latestSimulationSessions: [],
      upcomingReservations: [],
      unreadNotifications: 0,
    });
    renderStudentSpace(<StudentHomePage now={NOW} />);

    for (const title of [
      SUMMARY_COPY.progressEmptyTitle,
      SUMMARY_COPY.evaluationsEmptyTitle,
      SUMMARY_COPY.gradesEmptyTitle,
      SUMMARY_COPY.notesEmptyTitle,
      SUMMARY_COPY.conversationsEmptyTitle,
      SUMMARY_COPY.simulationsEmptyTitle,
      SUMMARY_COPY.reservationsEmptyTitle,
    ]) {
      expect(await screen.findByText(title)).toBeInTheDocument();
    }

    expect(within(block(SUMMARY_COPY.notificationsTitle)).getByText("0")).toBeInTheDocument();
  });

  it("shows a retryable load error", async() => {
    fail = true;
    renderStudentSpace(<StudentHomePage now={NOW} />);

    expect(await screen.findByText(STUDENT_HOME_COPY.loadErrorTitle)).toBeInTheDocument();

    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("region", { name: SUMMARY_COPY.progressTitle })).toBeInTheDocument();
  });
});
