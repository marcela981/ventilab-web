/*
* Funcionalidad: EvaluationBuilderPage tests
* Descripción: Renders the evaluation builder against a mocked backend (msw) with a mocked next/router (with route events), a textarea standing in for the lazy Tiptap editor and a pass-through @hello-pangea/dnd that exposes onDragEnd: creating validates, applies the type defaults, posts the evaluation and replaces the route with its editor; editing tracks "Cambios sin guardar", arms beforeunload and the route-change confirmation, and saves only the changed metadata with PATCH; a choice question saves its prompt and points with PATCH and its correct answer with option PATCHes (radio semantics); questions are added and deleted; a drag sends the batch `PUT .../questions/order` (and `.../scenarios/order`) and a refused reorder restores the previous order with a toast; structureLocked and a 409 has_submitted_attempts show the banner whose "Duplicar" opens the copy; a 422 shows its message and the reloaded readiness issues on the question. Depends on vitest, Testing Library, msw and the authoring test helpers. v1.1 (A3 + A2 review): the question texts and its points go in separate PATCHes; a 409 on the structural PATCH keeps the saved texts and drops the structural edits; a 422 shows the client READY validation on the question (the mocked detail does not change); an option created while its text is edited keeps that edit and is not created twice; the refused reorder is shown optimistically while the PUT is pending; "Marcar como lista" validates on the client (issues on the cards, no request), sends `PATCH .../status` READY and shows the reloaded issues on a 422; a READY evaluation disables single-correct answers and adding questions and returns to DRAFT; a SIMULATION question picks a published clinical case and edits its rubric, invalid rubrics block the save. v1.2 (A3 review W2/S1/S2): a SIMULATION question without a clinical case shows the non-blocking recommendation and can still be marked READY; the case title filter says it covers this page only; a 422 on a save with no client READY issue shows the READY hint on the question. v1.3 (S1): with the shared media service upload mocked (msw serves the preview URL), the statement uploads a video and removes an attached image (saved as `mediaIds` in the text PATCH), an option uploads its image (saved as `mediaId` in its option PATCH), and a statement file of another kind is refused before uploading. v1.4 (closure B1): Testing Library waits 5 s (the 1 s default failed under the full parallel suite).
* Versión: 1.4
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, configure, fireEvent, screen, waitFor, within } from "@testing-library/react";
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
    asPath: "/evaluations/manage/e1/edit",
    beforePopState: vi.fn(),
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

// msw cannot complete a jsdom XHR multipart upload: the upload itself is covered by the shared media
// service tests; the preview URL still goes through msw.
const upload = vi.hoisted(() => ({ ids: [] as string[] }));

vi.mock("@shared/media-upload/api/media.service", async(importActual) => ({
  ...await importActual<typeof import("@shared/media-upload/api/media.service")>(),
  uploadMedia: () => Promise.resolve(upload.ids.shift() ?? "m-extra"),
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

// MUI forms plus the lazy structure chunk are slow under a parallel run on a small machine.
vi.setConfig({ testTimeout: 30_000 });
// Every other Testing Library wait (dialogs, toasts, refreshed readiness) also outlived the 1 s default under the full suite.
configure({ asyncUtilTimeout: 5_000 });
const server = setupServer();
let detail: EvaluationDetailDTO;
let requests: Array<{ method: string, path: string, body: unknown }>;
let caseQueries: URLSearchParams[];

const clinicalCase = (id: string, title: string) => ({
  clinicalCase: {
    id,
    title,
    description: "",
    patientAge: 60,
    patientWeight: 70,
    mainDiagnosis: "SDRA",
    comorbidities: [],
    difficulty: "INTERMEDIATE",
    pathology: "SDRA",
    educationalGoal: "",
  },
  userAttempts: { total: 0, bestScore: null, lastAttemptAt: null },
});

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
  upload.ids = [];
  requests = [];
  caseQueries = [];
  detail = choiceDetail();
  server.use(
    http.get(apiUrl("/api/clinical-cases"), ({ request }) => {
      const params = new URL(request.url).searchParams;

      caseQueries.push(params);

      if (params.get("ids")) {
        return HttpResponse.json(envelope([clinicalCase("case-old", "Caso archivado")].filter((item) => item.clinicalCase.id === params.get("ids"))));
      }

      return HttpResponse.json(envelope([clinicalCase("case-1", "SDRA moderado"), clinicalCase("case-2", "EPOC exacerbado")], { total: 2, pages: 1, page: 1, limit: 20 }));
    }),
    http.patch(apiUrl("/api/evaluations/:id/status"), async(info) => {
      await record("PATCH")(info);
      detail = { ...detail, status: (requests.at(-1)?.body as { status: EvaluationDetailDTO["status"] }).status };

      return HttpResponse.json(envelope(null));
    }),
    http.get(apiUrl("/api/curriculum/tree"), () => HttpResponse.json(envelope(curriculumTree))),
    http.get(apiUrl("/api/media/:mediaId/url"), ({ params }) => HttpResponse.json(envelope({
      mediaId: params.mediaId,
      url: `https://cdn.example.org/${String(params.mediaId)}`,
      mimeType: "image/png",
      kind: "IMAGE",
      expiresAt: "2026-10-15T13:00:00.000Z",
    }))),
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

describe("EvaluationBuilderPage — status", () => {
  it("checks readiness on the client and shows the issues without sending the status", async() => {
    detail = evaluationDetailDto("e1", {
      questions: [questionDto("q1", 0, { type: "SINGLE_CHOICE", options: [optionDto("o1", 0), optionDto("o2", 1)] })],
    });
    renderWithProviders(<EvaluationBuilderPage evaluationId="e1" />);

    const card = await findCard(1);

    fireEvent.click(screen.getByRole("button", { name: BUILDER_COPY.markReady }));

    expect(await within(card).findByText("Marca al menos una opción correcta.")).toBeInTheDocument();
    expect(bodiesOf("PATCH", /\/status$/)).toEqual([]);
  });

  it("asks to save before changing the status", async() => {
    renderWithProviders(<EvaluationBuilderPage evaluationId="e1" />);

    fireEvent.change(await screen.findByLabelText(/^Título/, {}, LAZY_WAIT), { target: { value: "Otro título" } });
    fireEvent.click(screen.getByRole("button", { name: BUILDER_COPY.markReady }));

    expect(await screen.findByText(BUILDER_COPY.saveBeforeStatus)).toBeInTheDocument();
    expect(bodiesOf("PATCH", /\/status$/)).toEqual([]);
  });

  it("marks a valid evaluation as READY and returns it to DRAFT", async() => {
    renderWithProviders(<EvaluationBuilderPage evaluationId="e1" />);

    fireEvent.click(await screen.findByRole("button", { name: BUILDER_COPY.markReady }, LAZY_WAIT));

    expect(await screen.findByText(BUILDER_COPY.markedReady)).toBeInTheDocument();
    expect(bodiesOf("PATCH", /\/status$/)).toEqual([{ status: "READY" }]);

    const card = await findCard(1);

    // READY: single-correct answers and new questions would leave it incomplete.
    await waitFor(() => {
      expect(within(card).getByRole("radio", { name: BUILDER_COPY.correctOption(2) })).toBeDisabled();
    });
    expect(within(card).getByText(BUILDER_COPY.readySingleCorrectHint)).toBeInTheDocument();
    expect(screen.getByText(BUILDER_COPY.readyHint)).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: BUILDER_COPY.rootGroup })).getByRole("button", { name: BUILDER_COPY.addQuestion })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: BUILDER_COPY.backToDraft }));

    await waitFor(() => {
      expect(bodiesOf("PATCH", /\/status$/)).toEqual([{ status: "READY" }, { status: "DRAFT" }]);
    });
    await waitFor(() => {
      expect(within(card).getByRole("radio", { name: BUILDER_COPY.correctOption(2) })).toBeEnabled();
    });
  });

  it("shows the reloaded readiness issues when the backend refuses READY (422)", async() => {
    server.use(http.patch(apiUrl("/api/evaluations/:id/status"), () => {
      detail = { ...detail, readinessIssues: [{ code: "points_not_positive", questionId: "q1", details: [] }] };

      return errorResponse("evaluation.not_ready", 422);
    }));
    renderWithProviders(<EvaluationBuilderPage evaluationId="e1" />);

    const card = await findCard(1);

    fireEvent.click(screen.getByRole("button", { name: BUILDER_COPY.markReady }));

    expect(await within(card).findByText("Los puntos de la pregunta deben ser mayores que cero.")).toBeInTheDocument();
  });
});

describe("EvaluationBuilderPage — simulation", () => {
  function simulationDetail(): EvaluationDetailDTO {
    return evaluationDetailDto("e1", {
      questions: [questionDto("q1", 0, { type: "SIMULATION", clinicalCaseId: "case-old", rubric: null })],
    });
  }

  it("picks a published clinical case and saves the rubric in the structural PATCH", async() => {
    detail = simulationDetail();
    renderWithProviders(<EvaluationBuilderPage evaluationId="e1" />);

    const card = await findCard(1);
    const caseSelect = within(card).getByLabelText(BUILDER_COPY.simulationCase);

    // The current case is read by id: it is not among the published ones.
    expect(await within(caseSelect).findByRole("option", { name: "Caso archivado · SDRA" })).toBeInTheDocument();
    expect(await within(caseSelect).findByRole("option", { name: "EPOC exacerbado · SDRA" })).toBeInTheDocument();
    expect(Object.fromEntries(caseQueries.find((query) => query.get("status")) ?? [])).toMatchObject({ status: "PUBLISHED", page: "1", limit: "20" });

    fireEvent.change(within(card).getByLabelText(BUILDER_COPY.simulationCaseFilter), { target: { value: "sdra" } });
    expect(within(caseSelect).queryByRole("option", { name: "EPOC exacerbado · SDRA" })).not.toBeInTheDocument();
    fireEvent.change(caseSelect, { target: { value: "case-1" } });

    fireEvent.click(within(card).getByRole("button", { name: BUILDER_COPY.rubricAdd }));
    fireEvent.change(within(card).getByLabelText(BUILDER_COPY.rubricParameter(1)), { target: { value: "peep" } });
    fireEvent.change(within(card).getByLabelText(BUILDER_COPY.rubricExpected(1)), { target: { value: "12" } });
    fireEvent.change(within(card).getByLabelText(BUILDER_COPY.rubricMin(1)), { target: { value: "5" } });
    fireEvent.change(within(card).getByLabelText(BUILDER_COPY.rubricMax(1)), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: BUILDER_COPY.save }));

    // Invalid rubric: nothing is sent.
    expect(await within(card).findByText("Criterio 1: el valor esperado debe estar entre el mínimo y el máximo.")).toBeInTheDocument();
    expect(bodiesOf("PATCH", /\/questions\/q1$/)).toEqual([]);

    fireEvent.change(within(card).getByLabelText(BUILDER_COPY.rubricExpected(1)), { target: { value: "8" } });
    fireEvent.change(within(card).getByLabelText(BUILDER_COPY.rubricPriority(1)), { target: { value: "CRITICO" } });
    fireEvent.click(screen.getByRole("button", { name: BUILDER_COPY.save }));

    expect(await screen.findByText(BUILDER_COPY.saved)).toBeInTheDocument();
    expect(bodiesOf("PATCH", /\/questions\/q1$/)).toEqual([{
      clinicalCaseId: "case-1",
      rubric: { criteria: [{ parameter: "peep", expectedValue: 8, min: 5, max: 10, priority: "CRITICO" }] },
    }]);
   });

  it("recommends a clinical case without blocking READY and says the title filter covers this page only", async() => {
    detail = evaluationDetailDto("e1", {
      questions: [questionDto("q1", 0, {
        type: "SIMULATION",
        clinicalCaseId: null,
        rubric: { criteria: [{ parameter: "peep", expectedValue: 8 }] },
      })],
    });
    renderWithProviders(<EvaluationBuilderPage evaluationId="e1" />);

    const card = await findCard(1);

    expect(within(card).getByText(BUILDER_COPY.simulationCaseRecommended)).toBeInTheDocument();
    expect(within(card).getByText(BUILDER_COPY.simulationCaseFilterHelp)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: BUILDER_COPY.markReady }));

    await waitFor(() => {
      expect(bodiesOf("PATCH", /\/status$/)).toEqual([{ status: "READY" }]);
    });
  });

  it("offers no range for a text parameter", async() => {
    detail = simulationDetail();
    renderWithProviders(<EvaluationBuilderPage evaluationId="e1" />);

    const card = await findCard(1);

    fireEvent.click(within(card).getByRole("button", { name: BUILDER_COPY.rubricAdd }));
    fireEvent.change(within(card).getByLabelText(BUILDER_COPY.rubricParameter(1)), { target: { value: "ventilationMode" } });

    expect(within(card).queryByLabelText(BUILDER_COPY.rubricMin(1))).not.toBeInTheDocument();
    expect(within(card).getByLabelText(BUILDER_COPY.rubricExpected(1))).toBeInTheDocument();
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
    // Texts and structure go separately, so texts still save when the structure is locked.
    expect(bodiesOf("PATCH", /\/questions\/q1$/)).toEqual([{ prompt: paragraphDoc("¿Qué PEEP?") }, { points: 3 }]);
    expect(requests.filter((item) => item.path.includes("/options/")).map((item) => [item.path.split("/").at(-1), item.body])).toEqual([
      ["o2", { isCorrect: true }],
      ["o1", { isCorrect: false }],
    ]);
  });

  it("uploads statement media and an option image and saves them with the question and option PATCHes", async() => {
    detail = choiceDetail({
      questions: [
        questionDto("q1", 0, {
          type: "SINGLE_CHOICE",
          points: 2,
          mediaIds: ["m-old"],
          media: [{ mediaId: "m-old", url: "https://cdn.example.org/m-old", mimeType: "image/png", kind: "IMAGE", expiresAt: null }],
          options: [optionDto("o1", 0, { content: "5 cmH2O", isCorrect: true }), optionDto("o2", 1, { content: "8 cmH2O" })],
        }),
      ],
    });
    upload.ids = ["m-video", "m-option"];
    renderWithProviders(<EvaluationBuilderPage evaluationId="e1" />);

    const card = await findCard(1);

    expect(within(card).getByRole("img", { name: BUILDER_COPY.mediaImage(1) })).toHaveAttribute("src", "https://cdn.example.org/m-old");

    fireEvent.change(within(card).getByLabelText(BUILDER_COPY.mediaUpload), { target: { files: [new File(["mp4"], "curva.mp4", { type: "video/mp4" })] } });
    expect(await within(card).findByRole("link", { name: BUILDER_COPY.mediaVideo })).toHaveAttribute("href", "https://cdn.example.org/m-video");
    fireEvent.click(within(card).getByRole("button", { name: BUILDER_COPY.mediaRemove(1) }));

    fireEvent.change(within(card).getByLabelText(BUILDER_COPY.optionMediaUpload(2)), { target: { files: [new File(["png"], "o2.png", { type: "image/png" })] } });
    expect(await within(card).findByLabelText(BUILDER_COPY.optionMediaReplace(2))).toBeInTheDocument();
    expect(within(card).getByText(BUILDER_COPY.unsavedQuestion)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: BUILDER_COPY.save }));

    expect(await screen.findByText(BUILDER_COPY.saved)).toBeInTheDocument();
    expect(bodiesOf("PATCH", /\/questions\/q1$/)).toEqual([{ mediaIds: ["m-video"] }]);
    expect(bodiesOf("PATCH", /\/options\/o2$/)).toEqual([{ mediaId: "m-option" }]);
  });

  it("rejects a statement file that is neither an image nor a video before uploading", async() => {
    upload.ids = ["m-pdf"];
    renderWithProviders(<EvaluationBuilderPage evaluationId="e1" />);

    const card = await findCard(1);

    fireEvent.change(within(card).getByLabelText(BUILDER_COPY.mediaUpload), { target: { files: [new File(["pdf"], "guia.pdf", { type: "application/pdf" })] } });

    expect(await within(card).findByRole("alert")).toHaveTextContent("Formato no permitido. Usa PNG, JPEG, WebP o GIF; o MP4 o WebM.");
    expect(upload.ids).toEqual(["m-pdf"]);
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

    let releaseReorder: () => void = () => undefined;
    const reorderGate = new Promise<void>((resolve) => {
      releaseReorder = resolve;
    });

    server.use(http.put(apiUrl("/api/evaluations/:id/questions/order"), async() => {
      await reorderGate;

      return errorResponse("evaluation.invalid_reorder", 400);
    }));

    const root = screen.getByRole("region", { name: BUILDER_COPY.rootGroup });
    const prompts = () => within(root).getAllByRole("textbox", { name: BUILDER_COPY.prompt }).map((item) => (item as HTMLTextAreaElement).value);

    await waitFor(() => {
      expect(prompts()).toEqual(["Enunciado q1", "Enunciado q2"]);
    });

    await act(async() => {
      dnd.onDragEnd?.({ type: "question", source: { droppableId: "root", index: 0 }, destination: { droppableId: "root", index: 1 } });
    });

    // Optimistic: the new order shows while the PUT is still pending.
    expect(prompts()).toEqual(["Enunciado q2", "Enunciado q1"]);

    releaseReorder();

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

  it("keeps the texts and drops the structural edits when a save hits submitted attempts (409)", async() => {
    server.use(http.patch(apiUrl("/api/evaluations/:id/questions/:questionId"), async(info) => {
      await record("PATCH")(info);

      if ("points" in (requests.at(-1)?.body as object)) {
        return errorResponse("evaluation.has_submitted_attempts", 409);
      }

      return HttpResponse.json(envelope(null));
    }));
    renderWithProviders(<EvaluationBuilderPage evaluationId="e1" />);

    const card = await findCard(1);

    expect(screen.queryByText(BUILDER_COPY.lockedTitle)).not.toBeInTheDocument();
    fireEvent.change(within(card).getByLabelText(BUILDER_COPY.explanation), { target: { value: "La PEEP protege" } });
    fireEvent.change(within(card).getByLabelText(BUILDER_COPY.points), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: BUILDER_COPY.save }));

    expect(await screen.findByText(BUILDER_COPY.lockedTitle)).toBeInTheDocument();
    expect(within(card).getByText(AUTHORING_ERROR_MESSAGES["evaluation.has_submitted_attempts"])).toBeInTheDocument();
    expect(bodiesOf("PATCH", /\/questions\/q1$/)).toEqual([{ explanation: "La PEEP protege" }, { points: 4 }]);
    // The refused points edit is dropped: the next save does not repeat the 409.
    await waitFor(() => {
      expect(within(card).getByLabelText(BUILDER_COPY.points)).toHaveValue("2");
    });
    expect(within(card).getByLabelText(BUILDER_COPY.explanation)).toHaveValue("La PEEP protege");
  });

  it("shows the client READY issues on the question when a save gets a 422 without issues", async() => {
    detail = evaluationDetailDto("e1", {
      status: "READY",
      questions: [questionDto("q1", 0, { type: "MULTIPLE_CHOICE", options: [optionDto("o1", 0, { isCorrect: true }), optionDto("o2", 1)] })],
    });
    // The backend rolls the change back: the reloaded detail has no issues.
    server.use(http.patch(apiUrl("/api/evaluations/:id/questions/:questionId/options/:optionId"), () => errorResponse("evaluation.not_ready", 422)));
    renderWithProviders(<EvaluationBuilderPage evaluationId="e1" />);

    const card = await findCard(1);

    fireEvent.click(within(card).getByRole("checkbox", { name: BUILDER_COPY.correctOption(1) }));
    fireEvent.click(screen.getByRole("button", { name: BUILDER_COPY.save }));

    expect(await within(card).findByText("Marca al menos una opción correcta.")).toBeInTheDocument();
    expect(within(card).getAllByText(AUTHORING_ERROR_MESSAGES["evaluation.not_ready"]).length).toBeGreaterThan(0);
  });

  it("falls back to the READY hint when a 422 on a save has no client explanation", async() => {
    detail = evaluationDetailDto("e1", {
      status: "READY",
      questions: [questionDto("q1", 0, {
        type: "MULTIPLE_CHOICE",
        options: [optionDto("o1", 0, { isCorrect: true }), optionDto("o2", 1, { isCorrect: true })],
      })],
    });
    server.use(http.patch(apiUrl("/api/evaluations/:id/questions/:questionId/options/:optionId"), () => errorResponse("evaluation.not_ready", 422)));
    renderWithProviders(<EvaluationBuilderPage evaluationId="e1" />);

    const card = await findCard(1);

    // Still one correct option: the client READY validation finds nothing.
    fireEvent.click(within(card).getByRole("checkbox", { name: BUILDER_COPY.correctOption(1) }));
    fireEvent.click(screen.getByRole("button", { name: BUILDER_COPY.save }));

    expect(await within(card).findByText(BUILDER_COPY.readyHint)).toBeInTheDocument();
  });

  it("keeps an option text typed while the option is being created and does not create it twice", async() => {
    detail = evaluationDetailDto("e1", {
      questions: [questionDto("q1", 0, { type: "MULTIPLE_CHOICE", options: [optionDto("o1", 0, { content: "5", isCorrect: true })] })],
    });

    let releaseCreate: () => void = () => undefined;
    const createGate = new Promise<void>((resolve) => {
      releaseCreate = resolve;
    });

    server.use(
      http.post(apiUrl("/api/evaluations/:id/questions/:questionId/options"), async(info) => {
        await record("POST")(info);
        await createGate;

        const body = requests.at(-1)?.body as { content: string, isCorrect: boolean };
        const question = detail.questions[0];

        if (question) {
          detail = { ...detail, questions: [{ ...question, options: [...question.options, optionDto("o9", 1, body)] }] };
        }

        return HttpResponse.json(envelope({ id: "o9" }), { status: 201 });
      }),
    );
    renderWithProviders(<EvaluationBuilderPage evaluationId="e1" />);

    const card = await findCard(1);

    fireEvent.click(within(card).getByRole("button", { name: BUILDER_COPY.addOption }));
    fireEvent.change(within(card).getByLabelText(BUILDER_COPY.optionText(2)), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: BUILDER_COPY.save }));
    await waitFor(() => {
      expect(bodiesOf("POST", /\/options$/)).toEqual([{ content: "12", isCorrect: false }]);
    });

    // Typed while the POST is in flight.
    fireEvent.change(within(card).getByLabelText(BUILDER_COPY.optionText(2)), { target: { value: "12 cmH2O" } });
    releaseCreate();

    expect(await screen.findByText(BUILDER_COPY.saved)).toBeInTheDocument();
    expect(within(card).getByLabelText(BUILDER_COPY.optionText(2))).toHaveValue("12 cmH2O");

    fireEvent.click(screen.getByRole("button", { name: BUILDER_COPY.save }));

    await waitFor(() => {
      expect(requests.filter((item) => item.path.endsWith("/options/o9")).map((item) => item.body)).toEqual([{ content: "12 cmH2O" }]);
    });
    expect(bodiesOf("POST", /\/options$/)).toHaveLength(1);
  });
});
