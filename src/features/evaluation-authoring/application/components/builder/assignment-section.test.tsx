/*
* Funcionalidad: AssignmentSection tests
* Descripción: Renders the "Asignación a grupos" section of the builder against a mocked backend (msw): the assignments table (window, state, attempts, close and delete actions), the inline "Nueva asignación" form for staff and a READY evaluation (groups and Bogota window sent in UTC, validation of the window, the 403 message inside the form), the READY-only message "Marca la evaluación como lista para asignarla." without the form, the non-staff notice, closing after confirmation and the reload of a stale row, and the focus of the heading when the builder opens with ?section=asignacion. Moved from the former assignments page tests (Bloque 3, W6). Depends on vitest, Testing Library, msw and the authoring test helpers.
* Versión: 2.0
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
import { formatDateRange } from "@shared/lib/format";
import type { EvaluationAssignmentDTO } from "../../../api/dtos/evaluation-authoring.dto";
import { ASSIGNMENTS_COPY } from "../../entities/assignments-copy";
import { ACTIVATION_ERRORS } from "../../entities/evaluation-assignment.entity";
import { ASSIGNMENT_FORBIDDEN_MESSAGE } from "../../entities/evaluation-authoring-error-messages";
import { apiUrl, envelope, errorResponse, renderWithProviders } from "../../pages/authoring-test-helpers";
import { AssignmentSection } from "./assignment-section";

vi.setConfig({ testTimeout: 20_000 });

const server = setupServer();
let assignments: EvaluationAssignmentDTO[];
let activationBodies: unknown[];
let closed: string[];
let activationFailure: { code: string, status: number } | null;
let closeFailure: { code: string, status: number } | null;
let listRequests: number;

function assignmentDto(id: string, groupName: string, overrides: Partial<EvaluationAssignmentDTO> = {}): EvaluationAssignmentDTO {
  return {
    id,
    evaluationId: "e1",
    evaluationTitle: "Parcial de ventilación",
    evaluationType: "EXAM",
    evaluationStatus: "READY",
    groupId: `g-${id}`,
    groupName,
    startsAt: "2026-10-10T13:00:00.000Z",
    endsAt: "2026-10-30T13:00:00.000Z",
    state: "ACTIVE",
    assignedById: "teacher-1",
    legacyIsActive: null,
    attemptCounts: { inProgress: 2, submitted: 0, pendingReview: 1, graded: 4 },
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

const groupsResponse = [
  { id: "g1", name: "UCI 2026-2", type: "STUDENT", isActive: true, membersCount: 12 },
  { id: "g2", name: "Anestesia", type: "STUDENT", isActive: true, membersCount: 8 },
];

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  assignments = [
    assignmentDto("a1", "UCI 2026-2"),
    assignmentDto("a2", "Anestesia", {
      state: "CLOSED",
      startsAt: "2026-09-01T13:00:00.000Z",
      endsAt: "2026-09-02T13:00:00.000Z",
      attemptCounts: { inProgress: 0, submitted: 0, pendingReview: 0, graded: 0 },
    }),
    assignmentDto("a3", "Neonatos", {
      state: "UPCOMING",
      startsAt: "2026-11-01T13:00:00.000Z",
      endsAt: "2026-11-02T13:00:00.000Z",
      attemptCounts: { inProgress: 0, submitted: 0, pendingReview: 0, graded: 0 },
    }),
  ];
  activationBodies = [];
  closed = [];
  activationFailure = null;
  closeFailure = null;
  listRequests = 0;
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-15T12:00:00.000Z") });
  server.use(
    http.get(apiUrl("/api/evaluations/:id/assignments"), () => {
      listRequests += 1;

      return HttpResponse.json(envelope(assignments));
    }),
    http.get(apiUrl("/api/groups"), () => HttpResponse.json(envelope(groupsResponse))),
    http.post(apiUrl("/api/evaluations/:id/assignments"), async({ request }) => {
      activationBodies.push(await request.json());

      if (activationFailure) {
        return errorResponse(activationFailure.code, activationFailure.status);
      }

      return HttpResponse.json(envelope({ ids: ["new-1"] }), { status: 201 });
    }),
    http.post(apiUrl("/api/evaluations/:id/assignments/:assignmentId/close"), ({ params }) => {
      closed.push(String(params.assignmentId));

      if (closeFailure) {
        return errorResponse(closeFailure.code, closeFailure.status);
      }

      return HttpResponse.json(envelope(null));
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

async function openDialog() {
  renderWithProviders(<AssignmentSection evaluationId="e1" status="READY" />);

  return screen.findByRole("group", { name: ASSIGNMENTS_COPY.form.title });
}

function fillWindow(dialog: HTMLElement, start: string, end: string) {
  fireEvent.change(within(dialog).getByLabelText(/Inicio/), { target: { value: start } });
  fireEvent.change(within(dialog).getByLabelText(/Cierre/), { target: { value: end } });
}

describe("AssignmentSection", () => {
  it("lists the activations with window, state and attempts", async() => {
    renderWithProviders(<AssignmentSection evaluationId="e1" status="READY" />);

    const table = await screen.findByRole("table", { name: ASSIGNMENTS_COPY.tableLabel });
    const rows = within(table).getAllByRole("row").slice(1);

    // Most recent start first.
    expect(rows.map((row) => within(row).getAllByRole("cell")[0]?.textContent)).toEqual(["Neonatos", "UCI 2026-2", "Anestesia"]);
    expect(within(rows[1] as HTMLElement).getByText("Activa")).toBeInTheDocument();
    expect(within(rows[0] as HTMLElement).getByText("Próxima")).toBeInTheDocument();
    expect(within(rows[2] as HTMLElement).getByText("Cerrada")).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText(formatDateRange("2026-10-10T13:00:00.000Z", "2026-10-30T13:00:00.000Z"))).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText("7")).toBeInTheDocument();
    // Closed rows have no close action; the upcoming one without attempts can be deleted.
    expect(within(rows[2] as HTMLElement).queryByRole("button", { name: /Cerrar ahora/ })).not.toBeInTheDocument();
    expect(within(rows[0] as HTMLElement).getByRole("button", { name: ASSIGNMENTS_COPY.deleteFor("Neonatos") })).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).queryByRole("button", { name: /Eliminar/ })).not.toBeInTheDocument();
    // A closed activation without attempts can still be deleted (backend rule: no attempts).
    expect(within(rows[2] as HTMLElement).getByRole("button", { name: ASSIGNMENTS_COPY.deleteFor("Anestesia") })).toBeInTheDocument();
  });

  it("lets a teacher assign a READY evaluation and act on the rows", async() => {
    renderWithProviders(<AssignmentSection evaluationId="e1" status="READY" />, "TEACHER");

    expect(screen.getByRole("heading", { level: 2, name: "Asignación a grupos" })).toBeInTheDocument();
    expect(await screen.findByRole("group", { name: ASSIGNMENTS_COPY.form.title })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: ASSIGNMENTS_COPY.closeNowFor("UCI 2026-2") })).toBeInTheDocument();
    expect(screen.queryByText(ASSIGNMENTS_COPY.notStaff)).not.toBeInTheDocument();
  });

  it("does not let a non-staff viewer assign", async() => {
    renderWithProviders(<AssignmentSection evaluationId="e1" status="READY" />, "STUDENT");

    expect(await screen.findByText(ASSIGNMENTS_COPY.notStaff)).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: ASSIGNMENTS_COPY.form.title })).not.toBeInTheDocument();
  });

  it("asks to mark the evaluation as ready instead of offering the form", async() => {
    renderWithProviders(<AssignmentSection evaluationId="e1" status="DRAFT" />);

    expect(await screen.findByText("Marca la evaluación como lista para asignarla.")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: ASSIGNMENTS_COPY.form.title })).not.toBeInTheDocument();
  });

  it("scrolls to and focuses its heading when the builder opens on it", async() => {
    renderWithProviders(<AssignmentSection evaluationId="e1" status="READY" focusOnMount />);

    expect(screen.getByRole("heading", { level: 2, name: "Asignación a grupos" })).toHaveFocus();
  });

  it("activates for the chosen groups with the Bogota window in UTC", async() => {
    const dialog = await openDialog();

    fireEvent.click(await within(dialog).findByRole("checkbox", { name: /UCI 2026-2/ }));
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Anestesia/ }));
    fillWindow(dialog, "2026-12-31T20:00", "2027-01-07T08:30");
    fireEvent.click(within(dialog).getByRole("button", { name: ASSIGNMENTS_COPY.form.submit }));

    await waitFor(() => expect(activationBodies).toHaveLength(1));
    // Groups are sorted by name in the form, but the payload keeps the click order.
    expect(activationBodies[0]).toEqual({
      groupIds: ["g1", "g2"],
      startsAt: "2027-01-01T01:00:00.000Z",
      endsAt: "2027-01-07T13:30:00.000Z",
    });
    expect(await screen.findByText(ASSIGNMENTS_COPY.activated(1))).toBeInTheDocument();
    // A successful assignment starts a clean form.
    await waitFor(() => expect(within(screen.getByRole("group", { name: ASSIGNMENTS_COPY.form.title })).getByRole("checkbox", { name: /UCI 2026-2/ })).not.toBeChecked());
  });

  it("does not send an activation that ends before it starts", async() => {
    const dialog = await openDialog();

    fireEvent.click(await within(dialog).findByRole("checkbox", { name: /UCI 2026-2/ }));
    fillWindow(dialog, "2026-11-02T10:00", "2026-11-01T10:00");
    fireEvent.click(within(dialog).getByRole("button", { name: ASSIGNMENTS_COPY.form.submit }));

    expect(await within(dialog).findByText(ACTIVATION_ERRORS.endBeforeStart)).toBeInTheDocument();
    expect(activationBodies).toHaveLength(0);
  });

  it("does not send an activation that already ended", async() => {
    const dialog = await openDialog();

    fireEvent.click(await within(dialog).findByRole("checkbox", { name: /UCI 2026-2/ }));
    fillWindow(dialog, "2026-10-01T10:00", "2026-10-14T10:00");
    fireEvent.click(within(dialog).getByRole("button", { name: ASSIGNMENTS_COPY.form.submit }));

    expect(await within(dialog).findByText(ACTIVATION_ERRORS.endNotFuture)).toBeInTheDocument();
    expect(activationBodies).toHaveLength(0);
  });

  it("shows the permissions message on a 403", async() => {
    activationFailure = { code: "FORBIDDEN", status: 403 };
    const dialog = await openDialog();

    fireEvent.click(await within(dialog).findByRole("checkbox", { name: /Anestesia/ }));
    fillWindow(dialog, "2026-11-01T10:00", "2026-11-02T10:00");
    fireEvent.click(within(dialog).getByRole("button", { name: ASSIGNMENTS_COPY.form.submit }));

    expect(await within(dialog).findByText(ASSIGNMENT_FORBIDDEN_MESSAGE)).toBeInTheDocument();
    expect(activationBodies).toHaveLength(1);
  });

  it("closes an activation now after confirmation", async() => {
    renderWithProviders(<AssignmentSection evaluationId="e1" status="READY" />);

    fireEvent.click(await screen.findByRole("button", { name: ASSIGNMENTS_COPY.closeNowFor("UCI 2026-2") }));
    const confirm = await screen.findByRole("dialog", { name: ASSIGNMENTS_COPY.closeTitle });

    expect(closed).toEqual([]);
    fireEvent.click(within(confirm).getByRole("button", { name: ASSIGNMENTS_COPY.closeConfirm }));

    await waitFor(() => expect(closed).toEqual(["a1"]));
    expect(await screen.findByText(ASSIGNMENTS_COPY.closed("UCI 2026-2"))).toBeInTheDocument();
  });

  it("reloads the list when closing fails because the row is stale", async() => {
    closeFailure = { code: "evaluation.assignment_closed", status: 409 };
    renderWithProviders(<AssignmentSection evaluationId="e1" status="READY" />);

    fireEvent.click(await screen.findByRole("button", { name: ASSIGNMENTS_COPY.closeNowFor("UCI 2026-2") }));
    const confirm = await screen.findByRole("dialog", { name: ASSIGNMENTS_COPY.closeTitle });
    const before = listRequests;

    fireEvent.click(within(confirm).getByRole("button", { name: ASSIGNMENTS_COPY.closeConfirm }));

    expect(await screen.findByText("Esta activación ya está cerrada.")).toBeInTheDocument();
    await waitFor(() => expect(listRequests).toBeGreaterThan(before));
  });
});
