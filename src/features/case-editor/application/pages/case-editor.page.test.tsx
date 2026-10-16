/*
* Funcionalidad: Case editor page tests
* Descripción: Drives the case editor against a mocked backend (msw) and a mocked next/router with route events:
*   creating validates on the client (required fields on their inputs, error counts in the side index, no request),
*   the configure-mode console writes the applied PEEP into the draft, the events timeline goes out sorted by time,
*   the first save posts the case and replaces the route with its editor; editing loads GET /definition (fields,
*   live PBW, stored status and validation), tracks "Cambios sin guardar", arms beforeunload and the route-change
*   confirmation, and saves with PUT; a 422 range violation lands on its field and a 409 with sessions shows the page
*   message. Depends on vitest, Testing Library, msw and the case editor test helpers.
*   v1.1 (review of 50ed812): an unchanged stored case cannot be saved; a console edit not applied yet shows as
*   unsaved, arms beforeunload and blocks the save with its note until cancelled; the first invalid field takes the
*   focus. These run inside the existing mounts (no extra full-editor render: the page tests are the slow ones).
*   v1.2 (final review): the console note reads "Aplica o cancela los cambios del ventilador"; a failed save with no
*   invalid field (409 with sessions) focuses the page error alert.
* Versión: 1.2
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
import type { UpsertClinicalCaseDTO } from "../../api/dtos/case-editor.dto";
import { apiUrl, definitionDto, envelope, errorResponse, renderWithProviders } from "./case-editor-test-helpers";
import { CASE_EDITOR_COPY, CaseEditorPage } from "./case-editor.page";

const router = vi.hoisted(() => {
  const handlers = new Map<string, Set<(...args: unknown[]) => void>>();

  return {
    handlers,
    pathname: "/simulator/cases/[id]/edit",
    query: {},
    asPath: "/simulator/cases/c1/edit",
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

vi.mock("next/router", () => ({ useRouter: () => router }));

const server = setupServer();

// The whole editor (about 60 fields, the configure-mode console and the lazy Markdown preview) re-renders on every
// keystroke in jsdom: widen the budgets on the shared machine.
vi.setConfig({ testTimeout: 60_000 });

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
  router.push.mockClear();
  router.replace.mockClear();
  router.events.emit.mockClear();
  router.handlers.clear();
});

afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});

function startRouteChange(url = "/simulator/cases"): void {
  router.handlers.get("routeChangeStart")?.forEach((handler) => handler(url, { shallow: false }));
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Scoped and text queries: label and role queries over the whole editor (about 60 fields and the console) are slow in
// jsdom, so every field is looked up inside its section.
const section = (id: string) => document.getElementById(`case-section-${id}`) as HTMLElement;
const SECTION_OF_LABEL: Readonly<Record<string, string>> = {
  "Título": "general",
  "Historia clínica (Markdown)": "general",
  "Diagnóstico principal": "general",
  "Objetivo educativo": "general",
  "Edad (años)": "patient",
  "Peso real (kg)": "patient",
  "Distensibilidad estática (C)": "mechanics",
  "Espacio muerto (VD)": "mechanics",
};
const field = (label: string) => within(section(SECTION_OF_LABEL[label] ?? "general")).getByLabelText(new RegExp(`^${escape(label)}`));
const saveButton = () => screen.getByText("Guardar", { selector: "button" });
const clickSave = () => fireEvent.click(saveButton());

function type(label: string, value: string): void {
  fireEvent.change(field(label), { target: { value } });
}

describe("CaseEditorPage — new case", () => {
  it("validates on the client before sending anything and counts the errors per section", async() => {
    let posts = 0;

    server.use(http.post(apiUrl("/api/clinical-cases"), () => {
      posts += 1;

      return HttpResponse.json(envelope({ id: "x" }), { status: 201 });
    }));
    renderWithProviders(<CaseEditorPage caseId={null} />);

    clickSave();

    expect(await screen.findByText("Revisa los campos marcados antes de guardar.")).toBeInTheDocument();
    expect(field("Título")).toHaveAttribute("aria-invalid", "true");
    expect(field("Edad (años)")).toHaveAttribute("aria-invalid", "true");
    // The first field with an error takes the focus.
    await waitFor(() => expect(field("Título")).toHaveFocus());

    const index = screen.getByLabelText("Secciones del caso");

    expect(within(index).getByRole("link", { name: /Datos generales.*4 errores/ })).toHaveAttribute("href", "#case-section-general");
    expect(within(index).getByRole("link", { name: /Paciente.*2 errores/ })).toBeInTheDocument();
    expect(posts).toBe(0);
  });

  it("writes the applied console settings and the sorted events into the POST body, then opens the editor route", async() => {
    const bodies: UpsertClinicalCaseDTO[] = [];

    server.use(http.post(apiUrl("/api/clinical-cases"), async({ request }) => {
      bodies.push(await request.json() as UpsertClinicalCaseDTO);

      return HttpResponse.json(envelope({ id: "new-case" }), { status: 201 });
    }));
    renderWithProviders(<CaseEditorPage caseId={null} />);

    expect(screen.getByText(CASE_EDITOR_COPY.notSaved)).toBeInTheDocument();
    type("Título", "Asma grave");
    type("Historia clínica (Markdown)", "Paciente con **crisis asmática**.");
    type("Diagnóstico principal", "Asma");
    type("Objetivo educativo", "Evitar la hiperinsuflación");
    type("Edad (años)", "30");
    type("Peso real (kg)", "65");
    expect(screen.getByText(CASE_EDITOR_COPY.unsaved)).toBeInTheDocument();
    // The Markdown preview uses the shared renderer (lazy chunk: slow to load on a busy machine).
    expect(await within(section("general")).findByText("crisis asmática", {}, { timeout: 15_000 })).toBeInTheDocument();

    // Configure-mode console: the same controls the student sees; "Aplicar" writes into the draft.
    const ventilator = section("ventilator");

    fireEvent.click(within(ventilator).getByRole("button", { name: "Aumentar PEEP" }));
    fireEvent.click(within(ventilator).getByRole("button", { name: "Aplicar" }));

    const events = section("events");

    fireEvent.click(within(events).getByText("Agregar evento"));
    fireEvent.click(within(events).getByText("Agregar evento"));

    const [first, second] = within(events).getAllByRole("listitem", { name: /^Evento/ });

    fireEvent.change(within(first!).getByLabelText(/^Tiempo/), { target: { value: "600" } });
    fireEvent.change(within(first!).getByLabelText(/^Multiplicador de resistencia/), { target: { value: "2" } });
    fireEvent.change(within(second!).getByLabelText(/^Tiempo/), { target: { value: "60" } });
    fireEvent.change(within(second!).getByLabelText(/^Tipo de evento/), { target: { value: "DISCONNECTION" } });
    expect(screen.getByText("Los eventos no están en orden de tiempo; se guardarán ordenados.")).toBeInTheDocument();

    clickSave();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/simulator/cases/new-case/edit"));
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({
      title: "Asma grave",
      description: "Paciente con **crisis asmática**.",
      patientAge: 30,
      patientWeight: 65,
      initialVentilatorSettings: { mode: "VCV", peepCmH2O: 6 },
      events: [{ simTimeMs: 60_000, type: "DISCONNECTION" }, { simTimeMs: 600_000, type: "BRONCHOSPASM", resistanceFactor: 2 }],
    });
    expect(bodies[0]?.mechanics).toBeUndefined();
    expect(await screen.findByText(CASE_EDITOR_COPY.created)).toBeInTheDocument();
    // The redirect after the save is not blocked by the unsaved-changes guard.
    expect(() => startRouteChange("/simulator/cases/new-case/edit")).not.toThrow();
  });
});

describe("CaseEditorPage — existing case", () => {
  function definitionHandler(overrides: Parameters<typeof definitionDto>[1] = {}) {
    return http.get(apiUrl("/api/clinical-cases/c1/definition"), () => HttpResponse.json(envelope(definitionDto("c1", overrides))));
  }

  it("loads the definition, shows the PBW and the stored facts, guards unsaved changes and saves with PUT", async() => {
    const puts: UpsertClinicalCaseDTO[] = [];

    server.use(
      definitionHandler(),
      http.put(apiUrl("/api/clinical-cases/c1"), async({ request }) => {
        puts.push(await request.json() as UpsertClinicalCaseDTO);

        return HttpResponse.json(envelope(null));
      }),
    );
    renderWithProviders(<CaseEditorPage caseId="c1" />);

    expect(await screen.findByDisplayValue("SDRA en paciente obeso")).toBeInTheDocument();
    // Devine, female 165 cm: 45.5 + 0.91 × 12.6 = 56.966 kg.
    expect(screen.getByText("57,0 kg")).toBeInTheDocument();
    expect(screen.getByText("Borrador")).toBeInTheDocument();
    expect(screen.getByText("Sin validar")).toBeInTheDocument();
    expect(screen.getByText(CASE_EDITOR_COPY.saved)).toBeInTheDocument();
    expect(field("Distensibilidad estática (C)")).toHaveValue("30");
    expect(screen.getAllByText(/Rango plausible: 5–150 mL\/cmH2O/).length).toBeGreaterThan(0);
    // A PUT always clears the expert validation: nothing changed, nothing to save.
    expect(saveButton()).toBeDisabled();

    // A console edit not applied yet counts as unsaved and blocks the save until it is applied or cancelled.
    const ventilator = section("ventilator");

    fireEvent.click(within(ventilator).getByRole("button", { name: "Aumentar PEEP" }));
    expect(screen.getByText(CASE_EDITOR_COPY.unsaved)).toBeInTheDocument();
    expect(screen.getByText("Aplica o cancela los cambios del ventilador")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();

    const pendingUnload = new Event("beforeunload", { cancelable: true });

    window.dispatchEvent(pendingUnload);
    expect(pendingUnload.defaultPrevented).toBe(true);
    fireEvent.click(within(ventilator).getByRole("button", { name: "Cancelar" }));
    expect(screen.getByText(CASE_EDITOR_COPY.saved)).toBeInTheDocument();
    expect(screen.queryByText(CASE_EDITOR_COPY.consolePending)).not.toBeInTheDocument();
    expect(saveButton()).toBeDisabled();

    type("Título", "SDRA grave en paciente obeso");
    expect(saveButton()).toBeEnabled();
    expect(screen.getByText(CASE_EDITOR_COPY.unsaved)).toBeInTheDocument();

    const unload = new Event("beforeunload", { cancelable: true });

    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);

    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false);

    expect(() => startRouteChange()).toThrow();
    expect(confirm).toHaveBeenCalledWith(CASE_EDITOR_COPY.leaveWarning);
    expect(router.events.emit).toHaveBeenCalledWith("routeChangeError", expect.any(Error), "/simulator/cases", { shallow: false });

    clickSave();

    expect(await screen.findByText(CASE_EDITOR_COPY.updated)).toBeInTheDocument();
    expect(puts).toHaveLength(1);
    expect(puts[0]).toMatchObject({ title: "SDRA grave en paciente obeso", labData: { ph: 7.3 }, events: [{ simTimeMs: 300000, type: "SECRETIONS", resistanceFactor: 1.5 }] });
    expect(screen.getByText(CASE_EDITOR_COPY.saved)).toBeInTheDocument();
    expect(() => startRouteChange()).not.toThrow();
  });

  it("maps a 422 range violation to its field and a 409 with sessions to the page message", async() => {
    let answer = errorResponse("clinical-cases.physiological_range_violation", 422, "mechanics.deadSpaceMl = 150 está fuera del rango fisiológicamente plausible 50-500 mL");

    server.use(definitionHandler(), http.put(apiUrl("/api/clinical-cases/c1"), () => answer));
    renderWithProviders(<CaseEditorPage caseId="c1" />);

    await screen.findByDisplayValue("SDRA en paciente obeso");
    type("Título", "SDRA grave");
    clickSave();

    expect(await screen.findByText(/El servidor rechazó un valor fuera del rango/)).toBeInTheDocument();
    expect(field("Espacio muerto (VD)")).toHaveAttribute("aria-invalid", "true");
    expect(within(screen.getByLabelText("Secciones del caso")).getByRole("link", { name: /Mecánica y fisiología.*1 error/ })).toBeInTheDocument();

    // Editing clears the server error.
    type("Espacio muerto (VD)", "160");
    expect(field("Espacio muerto (VD)")).not.toHaveAttribute("aria-invalid", "true");

    answer = errorResponse("clinical-cases.clinical_case_has_simulation_sessions", 409);
    clickSave();

    const pageMessage = await screen.findByText("El caso ya tiene sesiones de simulación: duplícalo para cambiar su definición.");

    // No field is invalid: the page error takes the focus so a screen reader user hears why the save failed.
    await waitFor(() => expect(pageMessage.closest("[role=\"alert\"]")).toHaveFocus());
  });

  it("shows the load error with a retry", async() => {
    server.use(http.get(apiUrl("/api/clinical-cases/c1/definition"), () => errorResponse("clinical-cases.clinical_case_not_found", 404)));
    renderWithProviders(<CaseEditorPage caseId="c1" />);

    expect(await screen.findByText("No se pudo cargar el caso clínico")).toBeInTheDocument();
    expect(screen.getByText("El caso clínico no existe o fue eliminado.")).toBeInTheDocument();
  });

  it("renders the T12 tools slot with the loaded definition", async() => {
    server.use(definitionHandler({ validatedByExpert: true }));
    renderWithProviders(
      <CaseEditorPage caseId="c1" renderTools={({ caseId, definition, dirty }) => <p>{`tools ${caseId} ${String(definition.validatedByExpert)} ${String(dirty)}`}</p>} />,
    );

    expect(await screen.findByText("tools c1 true false")).toBeInTheDocument();
    expect(screen.getByText("Validado")).toBeInTheDocument();
  });
});
