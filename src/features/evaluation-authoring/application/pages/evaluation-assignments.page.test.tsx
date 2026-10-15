/*
* Funcionalidad: EvaluationAssignmentsPage tests
* Descripción: Page tests through MSW: the list with group, Bogota window, derived state and attempts; "Activar" disabled with its reason for a DRAFT evaluation; the activation dialog payload (selected groups and the Bogota window as UTC ISO), the end-before-start validation that sends nothing, the 403 permissions message inside the dialog; "Cerrar ahora" asks for confirmation and then posts the close request. Depends on vitest, Testing Library, MSW, the authoring test helpers and the page. v1.1 (A4 review C1/W2/W3/S4): a teacher who is not the author can activate a READY evaluation and sees the row actions; a student cannot activate; delete is offered for a closed activation without attempts; a failed close reloads the list; an end in the past is rejected. Date is faked at 2026-10-15 so the "end in the future" rule is stable.
* Versión: 1.1
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
import type { EvaluationAssignmentDTO, EvaluationDetailDTO } from "../../api/dtos/evaluation-authoring.dto";
import { ASSIGNMENTS_COPY } from "../entities/assignments-copy";
import { ACTIVATION_ERRORS } from "../entities/evaluation-assignment.entity";
import { ASSIGNMENT_FORBIDDEN_MESSAGE } from "../entities/evaluation-authoring-error-messages";
import { apiUrl, envelope, errorResponse, evaluationDetailDto, renderWithProviders } from "./authoring-test-helpers";
import { EvaluationAssignmentsPage } from "./evaluation-assignments.page";

vi.setConfig({ testTimeout: 20_000 });

const server = setupServer();
let detail: EvaluationDetailDTO;
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
  detail = evaluationDetailDto("e1", { status: "READY" });
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
    http.get(apiUrl("/api/evaluations/:id"), () => HttpResponse.json(envelope(detail))),
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
  renderWithProviders(<EvaluationAssignmentsPage evaluationId="e1" />);
  const activate = await screen.findByRole("button", { name: ASSIGNMENTS_COPY.activate });

  await waitFor(() => expect(activate).toBeEnabled());
  fireEvent.click(activate);

  return screen.findByRole("dialog", { name: ASSIGNMENTS_COPY.dialog.title });
}

function fillWindow(dialog: HTMLElement, start: string, end: string) {
  fireEvent.change(within(dialog).getByLabelText(/Inicio/), { target: { value: start } });
  fireEvent.change(within(dialog).getByLabelText(/Cierre/), { target: { value: end } });
}

describe("EvaluationAssignmentsPage", () => {
  it("lists the activations with window, state and attempts", async() => {
    renderWithProviders(<EvaluationAssignmentsPage evaluationId="e1" />);

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

  it("lets a teacher who is not the author activate a READY evaluation and act on the rows", async() => {
    detail = evaluationDetailDto("e1", { status: "READY", canManage: false, createdById: "teacher-2" });
    renderWithProviders(<EvaluationAssignmentsPage evaluationId="e1" />, "TEACHER");

    const activate = await screen.findByRole("button", { name: ASSIGNMENTS_COPY.activate });

    await waitFor(() => expect(activate).toBeEnabled());
    expect(screen.queryByRole("link", { name: ASSIGNMENTS_COPY.edit })).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: ASSIGNMENTS_COPY.closeNowFor("UCI 2026-2") })).toBeInTheDocument();
    expect(screen.queryByText(ASSIGNMENTS_COPY.notStaff)).not.toBeInTheDocument();
  });

  it("does not let a non-staff viewer activate", async() => {
    renderWithProviders(<EvaluationAssignmentsPage evaluationId="e1" />, "STUDENT");

    expect(await screen.findByText(ASSIGNMENTS_COPY.notStaff)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ASSIGNMENTS_COPY.activate })).toBeDisabled();
  });

  it("disables Activar with the reason when the evaluation is not READY", async() => {
    detail = evaluationDetailDto("e1", { status: "DRAFT" });
    renderWithProviders(<EvaluationAssignmentsPage evaluationId="e1" />);

    expect(await screen.findByText(ASSIGNMENTS_COPY.notActivatable)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ASSIGNMENTS_COPY.activate })).toBeDisabled();
  });

  it("activates for the chosen groups with the Bogota window in UTC", async() => {
    const dialog = await openDialog();

    fireEvent.click(await within(dialog).findByRole("checkbox", { name: /UCI 2026-2/ }));
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Anestesia/ }));
    fillWindow(dialog, "2026-12-31T20:00", "2027-01-07T08:30");
    fireEvent.click(within(dialog).getByRole("button", { name: ASSIGNMENTS_COPY.dialog.submit }));

    await waitFor(() => expect(activationBodies).toHaveLength(1));
    // Groups are sorted by name in the dialog, but the payload keeps the click order.
    expect(activationBodies[0]).toEqual({
      groupIds: ["g1", "g2"],
      startsAt: "2027-01-01T01:00:00.000Z",
      endsAt: "2027-01-07T13:30:00.000Z",
    });
    expect(await screen.findByText(ASSIGNMENTS_COPY.activated(1))).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: ASSIGNMENTS_COPY.dialog.title })).not.toBeInTheDocument());
  });

  it("does not send an activation that ends before it starts", async() => {
    const dialog = await openDialog();

    fireEvent.click(await within(dialog).findByRole("checkbox", { name: /UCI 2026-2/ }));
    fillWindow(dialog, "2026-11-02T10:00", "2026-11-01T10:00");
    fireEvent.click(within(dialog).getByRole("button", { name: ASSIGNMENTS_COPY.dialog.submit }));

    expect(await within(dialog).findByText(ACTIVATION_ERRORS.endBeforeStart)).toBeInTheDocument();
    expect(activationBodies).toHaveLength(0);
  });

  it("does not send an activation that already ended", async() => {
    const dialog = await openDialog();

    fireEvent.click(await within(dialog).findByRole("checkbox", { name: /UCI 2026-2/ }));
    fillWindow(dialog, "2026-10-01T10:00", "2026-10-14T10:00");
    fireEvent.click(within(dialog).getByRole("button", { name: ASSIGNMENTS_COPY.dialog.submit }));

    expect(await within(dialog).findByText(ACTIVATION_ERRORS.endNotFuture)).toBeInTheDocument();
    expect(activationBodies).toHaveLength(0);
  });

  it("shows the permissions message on a 403", async() => {
    activationFailure = { code: "FORBIDDEN", status: 403 };
    const dialog = await openDialog();

    fireEvent.click(await within(dialog).findByRole("checkbox", { name: /Anestesia/ }));
    fillWindow(dialog, "2026-11-01T10:00", "2026-11-02T10:00");
    fireEvent.click(within(dialog).getByRole("button", { name: ASSIGNMENTS_COPY.dialog.submit }));

    expect(await within(dialog).findByText(ASSIGNMENT_FORBIDDEN_MESSAGE)).toBeInTheDocument();
    expect(activationBodies).toHaveLength(1);
  });

  it("closes an activation now after confirmation", async() => {
    renderWithProviders(<EvaluationAssignmentsPage evaluationId="e1" />);

    fireEvent.click(await screen.findByRole("button", { name: ASSIGNMENTS_COPY.closeNowFor("UCI 2026-2") }));
    const confirm = await screen.findByRole("dialog", { name: ASSIGNMENTS_COPY.closeTitle });

    expect(closed).toEqual([]);
    fireEvent.click(within(confirm).getByRole("button", { name: ASSIGNMENTS_COPY.closeConfirm }));

    await waitFor(() => expect(closed).toEqual(["a1"]));
    expect(await screen.findByText(ASSIGNMENTS_COPY.closed("UCI 2026-2"))).toBeInTheDocument();
  });

  it("reloads the list when closing fails because the row is stale", async() => {
    closeFailure = { code: "evaluation.assignment_closed", status: 409 };
    renderWithProviders(<EvaluationAssignmentsPage evaluationId="e1" />);

    fireEvent.click(await screen.findByRole("button", { name: ASSIGNMENTS_COPY.closeNowFor("UCI 2026-2") }));
    const confirm = await screen.findByRole("dialog", { name: ASSIGNMENTS_COPY.closeTitle });
    const before = listRequests;

    fireEvent.click(within(confirm).getByRole("button", { name: ASSIGNMENTS_COPY.closeConfirm }));

    expect(await screen.findByText("Esta activación ya está cerrada.")).toBeInTheDocument();
    await waitFor(() => expect(listRequests).toBeGreaterThan(before));
  });
});
