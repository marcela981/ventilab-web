/*
* Funcionalidad: CaseEditorTools tests
* Descripción: Behaviour of the T12 case editor tools with msw and an injected fake worker: the expert validation
*   badge and the "Marcar como validado" action only with `clinical-cases:validate` (confirmed PATCH
*   /expert-validation, disabled while dirty, absent once validated); the server test run (form validation without a
*   request, the loading state, the summary and one chart per metric from the metrics timeline, the error alert); the
*   delete (a 409 for a case in use offers "Archivar" and archives with PATCH /status; a plain delete calls
*   onDeleted); and the local preview (the draft runs in the worker without any request; an incomplete draft lists
*   what is missing). Depends on Vitest, Testing Library, msw, the session context and the case editor test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { configure, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SimCommand, SimWorkerClient, SimWorkerListener } from "@shared/sim-engine";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import type { ClinicalCaseDefinitionDTO } from "../../api/dtos/case-editor.dto";
import { caseDraftFromDefinition } from "../entities/case-draft.entity";
import { CASE_ERROR_COPY } from "../entities/case-editor-errors";
import { TEST_RUN_COPY } from "../entities/case-tools.entity";
import { apiUrl, definitionDto, envelope, errorResponse, renderWithProviders } from "../pages/case-editor-test-helpers";
import { CASE_TOOLS_COPY, CaseEditorTools } from "./case-editor-tools";
import { CASE_PREVIEW_COPY, PREVIEW_BLOCK_LABELS } from "./case-preview-dialog";
import { CASE_TEST_RUN_COPY } from "./case-test-run";
import { DELETE_CASE_COPY } from "./delete-case-flow";

vi.mock("@shared/charts", () => ({
  LineChart: ({ title, labels }: { title: string, labels: readonly string[] }) => <figure aria-label={title}>{labels.join(" ")}</figure>,
}));

const server = setupServer();

vi.setConfig({ testTimeout: 30_000 });

beforeAll(() => {
  configure({ asyncUtilTimeout: 4000 });
  server.listen({ onUnhandledRequest: "error" });
});

afterAll(() => {
  configure({ asyncUtilTimeout: 1000 });
  server.close();
});

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});

function session(permissions: readonly string[]): SessionContextValue {
  return {
    status: "authenticated",
    user: { id: "t1", email: "docente@ventylab.demo", name: "Docente", image: null, role: "TEACHER" },
    role: "TEACHER",
    permissions,
    error: null,
    hasRole: () => true,
    hasPermission: (permission: string) => permissions.includes(permission),
    establishSession: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
    reloadSession: vi.fn(),
    handleRoleChanged: vi.fn(),
  } as unknown as SessionContextValue;
}

type FakeWorker = SimWorkerClient & { sent: SimCommand[] };

function createFakeWorker(): FakeWorker {
  const listeners = new Set<SimWorkerListener>();
  const worker: FakeWorker = {
    sent: [],
    send(command) {
      worker.sent.push(command);
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    terminate() {
      listeners.clear();
    },
  };

  return worker;
}

type SetupOptions = {
  definition?: ClinicalCaseDefinitionDTO
  permissions?: readonly string[]
  dirty?: boolean
};

function setup({ definition = definitionDto("c1"), permissions = ["clinical-cases:manage", "clinical-cases:validate"], dirty = false }: SetupOptions = {}) {
  const onDeleted = vi.fn();
  const workers: FakeWorker[] = [];
  const createWorker = () => {
    const worker = createFakeWorker();

    workers.push(worker);

    return worker;
  };

  renderWithProviders(
    <SessionContext.Provider value={session(permissions)}>
      <CaseEditorTools
        caseId="c1"
        definition={definition}
        draft={caseDraftFromDefinition(definition)}
        dirty={dirty}
        onDeleted={onDeleted}
        previewDeps={{ createWorker }}
      />
    </SessionContext.Provider>,
  );

  return { onDeleted, workers, tools: screen.getByRole("region", { name: CASE_TOOLS_COPY.title }) };
}

const dialogNamed = (name: string) => screen.findByRole("dialog", { name });

describe("CaseEditorTools — expert validation", () => {
  it("validates the stored case after a confirmation, for a caller with the permission", async() => {
    let patched = 0;

    server.use(http.patch(apiUrl("/api/clinical-cases/c1/expert-validation"), () => {
      patched += 1;

      return HttpResponse.json(envelope(null));
    }));

    const { tools } = setup();

    expect(within(tools).getByText(CASE_TOOLS_COPY.notValidated)).toBeInTheDocument();
    fireEvent.click(within(tools).getByRole("button", { name: CASE_TOOLS_COPY.markValidated }));

    const dialog = await dialogNamed(CASE_TOOLS_COPY.validateTitle);

    fireEvent.click(within(dialog).getByRole("button", { name: CASE_TOOLS_COPY.validateConfirm }));

    expect(await screen.findByText(CASE_TOOLS_COPY.validatedDone)).toBeInTheDocument();
    expect(patched).toBe(1);
  });

  it("hides the action without the permission", () => {
    const { tools } = setup({ permissions: ["clinical-cases:manage"] });

    expect(within(tools).queryByRole("button", { name: CASE_TOOLS_COPY.markValidated })).not.toBeInTheDocument();
  });

  it("shows the validated badge without the action", () => {
    const { tools } = setup({ definition: definitionDto("c1", { validatedByExpert: true }) });

    expect(within(tools).getByText(CASE_TOOLS_COPY.validated)).toBeInTheDocument();
    expect(within(tools).queryByRole("button", { name: CASE_TOOLS_COPY.markValidated })).not.toBeInTheDocument();
  });

  it("disables the action while there are unsaved changes", () => {
    const { tools } = setup({ dirty: true });

    expect(within(tools).getByRole("button", { name: CASE_TOOLS_COPY.markValidated })).toBeDisabled();
    expect(within(tools).getByText(CASE_TOOLS_COPY.dirtyValidationNote)).toBeInTheDocument();
  });
});

describe("CaseEditorTools — server test run", () => {
  const timeline = [1, 2, 3].map((second) => ({
    simTimeMs: second * 1000,
    gasExchange: { spo2Percent: 90 + second, paco2MmHg: 45, ph: 7.35 },
    hemodynamics: { meanArterialPressureMmHg: 80 },
    lastCycle: { plateauPressureCmH2O: 28, drivingPressureCmH2O: 14, tidalVolumePerKgPbw: 6 },
  }));

  it("validates the form without a request, then runs and charts the timeline", async() => {
    const bodies: unknown[] = [];

    server.use(http.post(apiUrl("/api/clinical-cases/c1/test-run"), async({ request }) => {
      bodies.push(await request.json());

      return HttpResponse.json(envelope({ engineVersion: "1.0.0", seconds: 120, seed: 7, metricsTimeline: timeline }));
    }));

    const { tools } = setup();

    fireEvent.click(within(tools).getByRole("button", { name: CASE_TOOLS_COPY.testRun }));

    const dialog = await dialogNamed(CASE_TEST_RUN_COPY.title("SDRA en paciente obeso"));
    const seconds = within(dialog).getByLabelText(CASE_TEST_RUN_COPY.seconds);

    fireEvent.change(seconds, { target: { value: "0" } });
    fireEvent.click(within(dialog).getByRole("button", { name: CASE_TEST_RUN_COPY.run }));
    expect(seconds).toHaveAccessibleDescription(TEST_RUN_COPY.secondsInvalid);
    expect(bodies).toHaveLength(0);

    fireEvent.change(seconds, { target: { value: "120" } });
    fireEvent.change(within(dialog).getByLabelText(CASE_TEST_RUN_COPY.seed), { target: { value: "7" } });
    fireEvent.click(within(dialog).getByRole("button", { name: CASE_TEST_RUN_COPY.run }));

    expect(within(dialog).getByText(CASE_TEST_RUN_COPY.running)).toBeInTheDocument();
    expect(await within(dialog).findByText(CASE_TEST_RUN_COPY.summary("1.0.0", 120, 7))).toBeInTheDocument();
    expect(bodies).toEqual([{ seconds: 120, seed: 7 }]);
    expect(within(dialog).getByRole("figure", { name: "SpO2 (%)" })).toHaveTextContent("0:01 0:02 0:03");
    expect(within(dialog).getByRole("figure", { name: "pH" })).toBeInTheDocument();
  });

  it("shows the server error and keeps the form", async() => {
    server.use(http.post(apiUrl("/api/clinical-cases/c1/test-run"), () => errorResponse("simulation.case_not_ready", 409)));

    const { tools } = setup({ dirty: true });

    fireEvent.click(within(tools).getByRole("button", { name: CASE_TOOLS_COPY.testRun }));

    const dialog = await dialogNamed(CASE_TEST_RUN_COPY.title("SDRA en paciente obeso"));

    expect(within(dialog).getByText(CASE_TEST_RUN_COPY.dirtyNote)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: CASE_TEST_RUN_COPY.run }));

    expect(await within(dialog).findByText(CASE_ERROR_COPY.engineNotReady)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: CASE_TEST_RUN_COPY.run })).toBeEnabled();
  });
});

describe("CaseEditorTools — delete", () => {
  it("offers to archive a case in use instead of deleting it", async() => {
    let status: unknown = null;

    server.use(
      http.delete(apiUrl("/api/clinical-cases/c1"), () => errorResponse("clinical-cases.clinical_case_in_use", 409)),
      http.patch(apiUrl("/api/clinical-cases/c1/status"), async({ request }) => {
        status = await request.json();

        return HttpResponse.json(envelope(null));
      }),
    );

    const { tools, onDeleted } = setup();

    fireEvent.click(within(tools).getByRole("button", { name: CASE_TOOLS_COPY.remove }));
    fireEvent.click(within(await dialogNamed(DELETE_CASE_COPY.confirmTitle)).getByRole("button", { name: DELETE_CASE_COPY.confirm }));

    const inUse = await dialogNamed(DELETE_CASE_COPY.inUseTitle);

    fireEvent.click(within(inUse).getByRole("button", { name: DELETE_CASE_COPY.archive }));

    expect(await screen.findByText(DELETE_CASE_COPY.archived("SDRA en paciente obeso"))).toBeInTheDocument();
    expect(status).toEqual({ status: "ARCHIVED" });
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("deletes a case that is not in use and leaves the editor", async() => {
    server.use(http.delete(apiUrl("/api/clinical-cases/c1"), () => HttpResponse.json(envelope(null))));

    const { tools, onDeleted } = setup();

    fireEvent.click(within(tools).getByRole("button", { name: CASE_TOOLS_COPY.remove }));
    fireEvent.click(within(await dialogNamed(DELETE_CASE_COPY.confirmTitle)).getByRole("button", { name: DELETE_CASE_COPY.confirm }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
  });
});

describe("CaseEditorTools — local preview", () => {
  it("runs the current draft in the worker without any request", async() => {
    const { tools, workers } = setup();

    fireEvent.click(within(tools).getByRole("button", { name: CASE_TOOLS_COPY.preview }));

    const dialog = await dialogNamed(CASE_PREVIEW_COPY.title);

    expect(within(dialog).getByText(CASE_PREVIEW_COPY.starting)).toBeInTheDocument();
    expect(workers).toHaveLength(1);
    expect(workers[0]?.sent[0]).toMatchObject({ type: "init", engineCase: { id: "c1", patient: { sex: "FEMALE", heightCm: 165 } } });
  });

  it("lists what the draft still needs", async() => {
    const { tools, workers } = setup({ definition: definitionDto("c1", { mechanics: null, initialState: null }) });

    fireEvent.click(within(tools).getByRole("button", { name: CASE_TOOLS_COPY.preview }));

    const dialog = await dialogNamed(CASE_PREVIEW_COPY.title);

    expect(within(dialog).getByText(PREVIEW_BLOCK_LABELS.mechanics)).toBeInTheDocument();
    expect(within(dialog).getByText(PREVIEW_BLOCK_LABELS.initialState)).toBeInTheDocument();
    expect(workers).toHaveLength(0);
  });
});
