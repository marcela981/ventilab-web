/*
* Funcionalidad: StudentPreviewDialog tests
* Descripción: Through MSW: the preview renders the saved evaluation with the student components (QuestionView in read-only mode: disabled choices, no correct-answer marker, no explanation or option feedback), the clinical scenario of the current question, the SIMULATION placeholder, Anterior/Siguiente and the navigator, and the unsaved-changes notice. Depends on vitest, Testing Library, MSW, the authoring test helpers and the dialog.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  apiUrl,
  envelope,
  evaluationDetailDto,
  optionDto,
  paragraphDoc,
  questionDto,
  renderWithProviders,
  scenarioDto,
} from "../../pages/authoring-test-helpers";
import { PREVIEW_COPY, StudentPreviewDialog } from "./student-preview-dialog";

vi.setConfig({ testTimeout: 20_000 });

const server = setupServer();

const detail = evaluationDetailDto("e1", {
  title: "Quiz de PEEP",
  scenarios: [scenarioDto("s1", 1, { content: paragraphDoc("Paciente de 60 años con SDRA") })],
  questions: [
    questionDto("q1", 1, {
      type: "SINGLE_CHOICE",
      scenarioId: "s1",
      prompt: paragraphDoc("¿Qué PEEP inicial elegirías?"),
      explanation: "EXPLICACION-SECRETA",
      options: [
        optionDto("o1", 1, { content: "5 cmH2O", isCorrect: false, feedback: "FEEDBACK-SECRETO" }),
        optionDto("o2", 2, { content: "10 cmH2O", isCorrect: true, feedback: "FEEDBACK-SECRETO" }),
      ],
    }),
    questionDto("q2", 2, { type: "SIMULATION", prompt: paragraphDoc("Ventila al paciente"), clinicalCaseId: "case-1", points: 3 }),
  ],
});

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

function renderPreview(dirty = false) {
  server.use(http.get(apiUrl("/api/evaluations/:id"), () => HttpResponse.json(envelope(detail))));

  return renderWithProviders(<StudentPreviewDialog evaluationId="e1" dirty={dirty} onClose={vi.fn()} />);
}

describe("StudentPreviewDialog", () => {
  it("renders the question read-only with its scenario and no correct-answer markers", async() => {
    renderPreview();

    const dialog = await screen.findByRole("dialog", { name: PREVIEW_COPY.title("Quiz de PEEP") });

    expect(within(dialog).getByText("¿Qué PEEP inicial elegirías?")).toBeInTheDocument();
    expect(within(dialog).getByText("Paciente de 60 años con SDRA")).toBeInTheDocument();

    const choices = within(dialog).getAllByRole("radio");

    expect(choices).toHaveLength(2);

    for (const choice of choices) {
      expect(choice).toBeDisabled();
      expect(choice).not.toBeChecked();
    }

    expect(dialog.textContent).not.toMatch(/EXPLICACION-SECRETA|FEEDBACK-SECRETO|Correcta|Respuesta correcta/);
    expect(within(dialog).queryByRole("button", { name: /Enviar/ })).not.toBeInTheDocument();
  });

  it("navigates to the SIMULATION question and shows the simulator placeholder", async() => {
    renderPreview();

    const dialog = await screen.findByRole("dialog", { name: PREVIEW_COPY.title("Quiz de PEEP") });

    expect(within(dialog).getByRole("button", { name: PREVIEW_COPY.previous })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button", { name: PREVIEW_COPY.next }));

    expect(await within(dialog).findByText("Ventila al paciente")).toBeInTheDocument();
    expect(within(dialog).getByRole("group", { name: "Pregunta práctica en el simulador" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: PREVIEW_COPY.next })).toBeDisabled();
    // The SIMULATION question has no scenario.
    expect(within(dialog).queryByText("Paciente de 60 años con SDRA")).not.toBeInTheDocument();
  });

  it("warns that unsaved changes are not in the preview", async() => {
    renderPreview(true);

    expect(await screen.findByText(PREVIEW_COPY.unsavedNotice)).toBeInTheDocument();
  });
});
