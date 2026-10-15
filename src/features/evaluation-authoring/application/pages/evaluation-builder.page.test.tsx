/*
* Funcionalidad: EvaluationBuilderPage tests
* Descripción: Renders the evaluation builder against a mocked backend (msw) with a mocked next/router (with route events), a textarea standing in for the lazy Tiptap editor and a pass-through @hello-pangea/dnd that exposes onDragEnd: creating validates, applies the type defaults, posts the evaluation and replaces the route with its editor; editing tracks "Cambios sin guardar", arms beforeunload and the route-change confirmation, and saves only the changed metadata with PATCH; a choice question saves its prompt and points with PATCH and its correct answer with option PATCHes (radio semantics); questions are added and deleted; a drag sends the batch `PUT .../questions/order` (and `.../scenarios/order`) and a refused reorder restores the previous order with a toast; structureLocked and a 409 has_submitted_attempts show the banner whose "Duplicar" opens the copy; a 422 shows its message and the reloaded readiness issues on the question. Depends on vitest, Testing Library, msw and the authoring test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { EvaluationDetailDTO } from "../../api/dtos/evaluation-authoring.dto";
import { BUILDER_COPY } from "../entities/builder-copy";
import { AUTHORING_ERROR_MESSAGES } from "../entities/evaluation-authoring-error-messages";
import {
  apiUrl,
  envelope,
  errorResponse,
  evaluationDetailDto,
  optionDto,
  paragraphDoc,
  questionDto,
  renderWithProviders,
  scenarioDto,
} from "./authoring-test-helpers";
import { EvaluationBuilderPage } from "./evaluation-builder.page";

type Handler = (...args: unknown[]) => void;

const router = vi.hoisted(() => {
  const handlers = new Map<string, Set<(...args: unknown[]) => void>>();

  return {
    handlers,
    push: vi.fn(() => Promise.resolve(true)),
    replace: vi.fn(() => Promise.resolve(true)),
    events: {
      on: (event: string, handler: (...args: unknown[]) => void) => {
        handlers.set(event, (handlers.get(event) ?? new Set()).add(handler));
      },
      off: (event: string, handler: (...args: unknown[]) => void) => {
        handlers.get(event)?.delete(handler);
      },
      emit: vi.fn(),
    },
  };
});

const dnd = vi.hoisted(() => ({ onDragEnd: null as ((result: unknown) => void) | null }));

vi.mock("next/router", () => ({ useRouter: () => router }));

vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children, onDragEnd }: { children: ReactNode, onDragEnd: (result: unknown) => void }) => {
    dnd.onDragEnd = onDragEnd;

    return <>{children}</>;
  },
  Droppable: ({ children }: { children: (provided: unknown, snapshot: unknown) => ReactNode }) =>
    children({ innerRef: () => undefined, droppableProps: {}, placeholder: null }, { isDraggingOver: false }),
  Draggable: ({ children }: { children: (provided: unknown, snapshot: unknown) => ReactNode }) =>
    children({ innerRef: () => undefined, draggableProps: {}, dragHandleProps: null }, { isDragging: false }),
}));

type DocLike = { content?: Array<{ content?: Array<{ text?: string }> }> };

vi.mock("../components/builder/rich-text-editor", () => ({
  RichTextEditor: ({ label, initialValue, onChange }: { label: string, initialValue: unknown, onChange: (doc: unknown) => void }) => (
    <textarea
      aria-label={label}
      defaultValue={typeof initialValue === "string" ? initialValue : ((initialValue as DocLike | null)?.content?.[0]?.content?.[0]?.text ?? "")}
      onChange={(event) => onChange({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: event.target.value }] }] })}
    />
  ),
}));

const LAZY_WAIT = { timeout: 10_000 };
const server = setupServer();
let detail: EvaluationDetailDTO;
let requests: Array<{ method: string, path: string, body: unknown }>;

const curriculumTree = {
  sections: [],
  unsectionedLevels: [{
    id: "level-1",
    title: "Nivel básico",
    description: null,
    order: 0,
    sectionId: null,
    locked: false,
    completed: false,
    missingPrerequisites: [],
    modules: [{ id: "module-1", title: "Fisiología", description: null, order: 0, lessonCount: 2, locked: false, completed: false, missingPrerequisites: [] }],
  }],
};

function record(method: string) {
  return async({ request }: { request: Request }) => {
    const text = await request.text();

    requests.push({ method, path: new URL(request.url).pathname, body: text ? JSON.parse(text) : null });
  };
}

function bodiesOf(method: string, pathEnd: RegExp): unknown[] {
  return requests.filter((item) => item.method === method && pathEnd.test(item.path)).map((item) => item.body);
}

function startRouteChange() {
  for (const handler of router.handlers.get("routeChangeStart") ?? []) {
    (handler as Handler)("/evaluations/manage");
  }
}

function choiceDetail(overrides: Partial<EvaluationDetailDTO> = {}): EvaluationDetailDTO {
  return evaluationDetailDto("e1", {
    questions: [
      questionDto("q1", 0, {
        type: "SINGLE_CHOICE",
        points: 2,
        options: [optionDto("o1", 0, { content: "5 cmH2O", isCorrect: true }), optionDto("o2", 1, { content: "8 cmH2O" })],
      }),
    ],
    ...overrides,
  });
}

async function findCard(position: number) {
  return screen.findByRole("article", { name: BUILDER_COPY.questionLabel(position) }, LAZY_WAIT);
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  router.push.mockClear();
  router.replace.mockClear();
  router.handlers.clear();
  dnd.onDragEnd = null;
  requests = [];
  detail = choiceDetail();
  server.use(
    http.get(apiUrl("/api/curriculum/tree"), () => HttpResponse.json(envelope(curriculumTree))),
    http.get(apiUrl("/api/evaluations/:id"), () => HttpResponse.json(envelope(detail))),
    http.post(apiUrl("/api/evaluations"), async(info) => {
      await record("POST")(info);

      return HttpResponse.json(envelope({ id: "new-1" }), { status: 201 });
    }),
    http.patch(apiUrl("/api/evaluations/:id"), async(info) => {
      await record("PATCH")(info);
      detail = { ...detail, ...(requests.at(-1)?.body as Partial<EvaluationDetailDTO>) };

      return HttpResponse.json(envelope(null));
    }),
    http.post(apiUrl("/api/evaluations/:id/duplicate"), async(info) => {
      await record("POST")(info);

      return HttpResponse.json(envelope({ id: "copy-1" }), { status: 201 });
    }),
    http.post(apiUrl("/api/evaluations/:id/questions"), async(info) => {
      await record("POST")(info);

      return HttpResponse.json(envelope({ id: "q-new" }), { status: 201 });
    }),
    http.patch(apiUrl("/api/evaluations/:id/questions/:questionId"), async(info) => {
      await record("PATCH")(info);

      return HttpResponse.json(envelope(null));
    }),
    http.delete(apiUrl("/api/evaluations/:id/questions/:questionId"), async(info) => {
      await record("DELETE")(info);

      return HttpResponse.json(envelope(null));
    }),
    http.patch(apiUrl("/api/evaluations/:id/questions/:questionId/options/:optionId"), async(info) => {
      await record("PATCH")(info);

      return HttpResponse.json(envelope(null));
    }),
    http.put(apiUrl("/api/evaluations/:id/questions/order"), async(info) => {
      await record("PUT")(info);

      return HttpResponse.json(envelope(null));
    }),
    http.put(apiUrl("/api/evaluations/:id/scenarios/order"), async(info) => {
      await record("PUT")(info);

      return HttpResponse.json(envelope(null));
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});

describe("EvaluationBuilderPage — create", () => {
  it("validates, applies the type defaults, posts the evaluation and opens its editor", async() => {
    renderWithProviders(<EvaluationBuilderPage evaluationId={null} />);

    const showResults = screen.getByLabelText(BUILDER_COPY.showResultsImmediately);

    expect(showResults).toBeChecked();
    expect(screen.getByText(BUILDER_COPY.createFirst)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: BUILDER_COPY.create }));
    expect(await screen.findByText("Escribe un título.")).toBeInTheDocument();
    expect(requests).toEqual([]);

    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "EXAM" } });
    expect(showResults).not.toBeChecked();
    fireEvent.change(screen.getByLabelText(/^Título/), { target: { value: "Parcial" } });
    fireEvent.change(await screen.findByRole("textbox", { name: BUILDER_COPY.description }, LAZY_WAIT), { target: { value: "Lee el caso" } });
    fireEvent.change(screen.getByLabelText(BUILDER_COPY.module), { target: { value: "module-1" } });
    expect(screen.getByText(BUILDER_COPY.unsaved)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: BUILDER_COPY.create }));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/evaluations/manage/new-1/edit");
    });
    expect(bodiesOf("POST", /\/api\/evaluations$/)).toEqual([{
      type: "EXAM",
      title: "Parcial",
      description: paragraphDoc("Lee el caso"),
      levelId: "level-1",
      moduleId: "module-1",
      maxAttempts: 1,
      shuffleQuestions: false,
      showResultsImmediately: false,
    }]);
    // The redirect after creating is not blocked by the unsaved-changes guard.
    expect(() => startRouteChange()).not.toThrow();
  });
});

describe("EvaluationBuilderPage — edit", () => {
  it("tracks unsaved changes, guards navigation and saves only the changed metadata", async() => {
    renderWithProviders(<EvaluationBuilderPage evaluationId="e1" />);

    const title = await screen.findByLabelText(/^Título/);
    const status = screen.getByText(BUILDER_COPY.allSaved);

    expect(screen.getByRole("button", { name: BUILDER_COPY.save })).toBeDisabled();
    expect(screen.getByLabelText("Tipo")).toBeDisabled();

    fireEvent.change(title, { target: { value: "Final de ventilación" } });
    expect(status).toHaveTextContent(BUILDER_COPY.unsaved);

    const unload = new Event("beforeunload", { cancelable: true });

    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);

    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);

    expect(() => startRouteChange()).toThrow();
    expect(router.events.emit).toHaveBeenCalledWith("routeChangeError", expect.any(Error), "/evaluations/manage", { shallow: false });
    expect(() => startRouteChange()).not.toThrow();
    expect(confirm).toHaveBeenCalledWith(BUILDER_COPY.leaveConfirm);

    fireEvent.click(screen.getByRole("button", { name: BUILDER_COPY.save }));

    expect(await screen.findByText(BUILDER_COPY.saved)).toBeInTheDocument();
    expect(bodiesOf("PATCH", /\/api\/evaluations\/e1$/)).toEqual([{ title: "Final de ventilación" }]);
    await waitFor(() => {
      expect(status).toHaveTextContent(BUILDER_COPY.allSaved);
    });

    const afterSave = new Event("beforeunload", { cancelable: true });

    window.dispatchEvent(afterSave);
    expect(afterSave.defaultPrevented).toBe(false);
  });

  it("saves the prompt, points and correct answer of a choice question", async() => {
    renderWithProviders(<EvaluationBuilderPage evaluationId="e1" />);

    const card = await findCard(1);

    fireEvent.change(await within(card).findByRole("textbox", { name: BUILDER_COPY.prompt }, LAZY_WAIT), { target: { value: "¿Qué PEEP?" } });
    fireEvent.change(within(card).getByLabelText(BUILDER_COPY.points), { target: { value: "3" } });
    fireEvent.click(within(card).getByRole("radio", { name: BUILDER_COPY.correctOption(2) }));

    // Radio semantics: only one correct option.
    expect(within(card).getByRole("radio", { name: BUILDER_COPY.correctOption(1) })).not.toBeChecked();
    expect(within(card).getByText(BUILDER_COPY.unsavedQuestion)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: BUILDER_COPY.save }));

    expect(await screen.findByText(BUILDER_COPY.saved)).toBeInTheDocument();
    expect(bodiesOf("PATCH", /\/questions\/q1$/)).toEqual([{ prompt: paragraphDoc("¿Qué PEEP?"), points: 3 }]);
    expect(requests.filter((item) => item.path.includes("/options/")).map((item) => [item.path.split("/").at(-1), item.body])).toEqual([
      ["o2", { isCorrect: true }],
      ["o1", { isCorrect: false }],
    ]);
  });

  it("lets a multiple choice question mark several correct options", async() => {
    detail = evaluationDetailDto("e1", {
      questions: [questionDto("q1", 0, { type: "MULTIPLE_CHOICE", options: [optionDto("o1", 0, { isCorrect: true }), optionDto("o2", 1)] })],
    });
    renderWithProviders(<EvaluationBuilderPage evaluationId="e1" />);

    const card = await findCard(1);

    fireEvent.click(within(card).getByRole("checkbox", { name: BUILDER_COPY.correctOption(2) }));

    expect(within(card).getByRole("checkbox", { name: BUILDER_COPY.correctOption(1) })).toBeChecked();
    expect(within(card).getByRole("checkbox", { name: BUILDER_COPY.correctOption(2) })).toBeChecked();
  });

  it("adds a question of the chosen type and deletes a question after confirmation", async() => {
    renderWithProviders(<EvaluationBuilderPage evaluationId="e1" />);

    const root = await screen.findByRole("region", { name: BUILDER_COPY.rootGroup }, LAZY_WAIT);

    fireEvent.change(within(root).getByLabelText(BUILDER_COPY.addQuestionType), { target: { value: "TRUE_FALSE" } });
    fireEvent.click(within(root).getByRole("button", { name: BUILDER_COPY.addQuestion }));

    expect(await screen.findByText(BUILDER_COPY.questionAdded)).toBeInTheDocument();
    expect(bodiesOf("POST", /\/questions$/)).toEqual([{
      type: "TRUE_FALSE",
      prompt: { type: "doc", content: [] },
      options: [{ content: "Verdadero", isCorrect: false }, { content: "Falso", isCorrect: false }],
    }]);

    fireEvent.click(screen.getByRole("button", { name: BUILDER_COPY.deleteQuestion(1) }));

    const dialog = await screen.findByRole("dialog", { name: BUILDER_COPY.deleteQuestionTitle });

    fireEvent.click(within(dialog).getByRole("button", { name: BUILDER_COPY.deleteConfirm }));

    // Toasts are queued (FIFO): wait for the request rather than for the second toast.
    await waitFor(() => {
      expect(requests.filter((item) => item.method === "DELETE").map((item) => item.path)).toEqual(["/api/evaluations/e1/questions/q1"]);
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: BUILDER_COPY.deleteQuestionTitle })).not.toBeInTheDocument();
    });
  });

  it("sends the batch reorder of a drag and restores the order when it fails", async() => {
    detail = evaluationDetailDto("e1", {
      scenarios: [scenarioDto("s1", 0), scenarioDto("s2", 1)],
      questions: [questionDto("q1", 0), questionDto("q2", 1), questionDto("q3", 2, { scenarioId: "s1" })],
    });
    renderWithProviders(<EvaluationBuilderPage evaluationId="e1" />);
    await findCard(3);

    await act(async() => {
      dnd.onDragEnd?.({ type: "question", source: { droppableId: "root", index: 0 }, destination: { droppableId: "scenario:s1", index: 0 } });
    });
    await waitFor(() => {
      expect(bodiesOf("PUT", /\/questions\/order$/)).toEqual([{
        items: [
          { id: "q2", order: 0, scenarioId: null },
          { id: "q1", order: 1, scenarioId: "s1" },
          { id: "q3", order: 2, scenarioId: "s1" },
        ],
      }]);
    });

    await act(async() => {
      dnd.onDragEnd?.({ type: "scenario", source: { droppableId: "scenarios", index: 0 }, destination: { droppableId: "scenarios", index: 1 } });
    });
    await waitFor(() => {
      expect(bodiesOf("PUT", /\/scenarios\/order$/)).toEqual([{ items: [{ id: "s2", order: 0 }, { id: "s1", order: 1 }] }]);
    });

    server.use(http.put(apiUrl("/api/evaluations/:id/questions/order"), () => errorResponse("evaluation.invalid_reorder", 400)));

    const root = screen.getByRole("region", { name: BUILDER_COPY.rootGroup });
    const prompts = () => within(root).getAllByRole("textbox", { name: BUILDER_COPY.prompt }).map((item) => (item as HTMLTextAreaElement).value);

    await waitFor(() => {
      expect(prompts()).toEqual(["Enunciado q1", "Enunciado q2"]);
    });

    await act(async() => {
      dnd.onDragEnd?.({ type: "question", source: { droppableId: "root", index: 0 }, destination: { droppableId: "root", index: 1 } });
    });

    expect(await screen.findByText(`${BUILDER_COPY.reorderFailed} ${AUTHORING_ERROR_MESSAGES["evaluation.invalid_reorder"]}`)).toBeInTheDocument();
    expect(prompts()).toEqual(["Enunciado q1", "Enunciado q2"]);
  });

  it("shows the structure-locked banner and opens the duplicate", async() => {
    detail = choiceDetail({ structureLocked: true, usage: { attempts: 3, submittedAttempts: 3, assignments: 1 } });
    renderWithProviders(<EvaluationBuilderPage evaluationId="e1" />);

    const banner = (await screen.findByText(BUILDER_COPY.lockedTitle)).closest<HTMLElement>("[role='alert']");

    if (!banner) {
      throw new Error("The structure-locked banner is not an alert");
    }
    expect(screen.getByRole("button", { name: BUILDER_COPY.deleteQuestion(1) })).toBeDisabled();
    expect(within(await findCard(1)).getByLabelText(BUILDER_COPY.points)).toBeDisabled();

    fireEvent.click(within(banner).getByRole("button", { name: BUILDER_COPY.duplicate }));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith("/evaluations/manage/copy-1/edit");
    });
  });

  it("raises the banner when a save hits submitted attempts (409)", async() => {
    server.use(http.patch(apiUrl("/api/evaluations/:id/questions/:questionId"), () => errorResponse("evaluation.has_submitted_attempts", 409)));
    renderWithProviders(<EvaluationBuilderPage evaluationId="e1" />);

    const card = await findCard(1);

    expect(screen.queryByText(BUILDER_COPY.lockedTitle)).not.toBeInTheDocument();
    fireEvent.change(within(card).getByLabelText(BUILDER_COPY.points), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: BUILDER_COPY.save }));

    expect(await screen.findByText(BUILDER_COPY.lockedTitle)).toBeInTheDocument();
    expect(within(card).getByText(AUTHORING_ERROR_MESSAGES["evaluation.has_submitted_attempts"])).toBeInTheDocument();
    expect(within(card).getByText(BUILDER_COPY.unsavedQuestion)).toBeInTheDocument();
  });

  it("maps a 422 to the affected question with the reloaded readiness issues", async() => {
    server.use(http.patch(apiUrl("/api/evaluations/:id/questions/:questionId"), () => {
      detail = { ...detail, readinessIssues: [{ code: "correct_option_required", questionId: "q1", details: [] }] };

      return errorResponse("evaluation.not_ready", 422);
    }));
    renderWithProviders(<EvaluationBuilderPage evaluationId="e1" />);

    const card = await findCard(1);

    fireEvent.change(within(card).getByLabelText(BUILDER_COPY.points), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: BUILDER_COPY.save }));

    expect(await within(card).findByText("Marca al menos una opción correcta.")).toBeInTheDocument();
    expect(within(card).getAllByText(AUTHORING_ERROR_MESSAGES["evaluation.not_ready"]).length).toBeGreaterThan(0);
  });
});
