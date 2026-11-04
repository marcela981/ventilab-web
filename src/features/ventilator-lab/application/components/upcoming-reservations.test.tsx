/*
* Funcionalidad: Upcoming reservations section tests
* Descripción: "Próximas reservas" with msw: one GET /api/reservations over the current Bogota day + 7 days, only scheduled reservations that have not ended, ordered by start, with the holder and student code or the group (and who operates it), the purpose and "En curso"; the empty state; a retryable error (403 included). Depends on vitest, msw, Testing Library and the lab test helpers.
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
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { apiUrl, detailDto, envelope, errorResponse, renderLab } from "../pages/lab-test-helpers";
import { UPCOMING_RESERVATIONS_COPY, UpcomingReservations } from "./upcoming-reservations";

const server = setupServer();
// Friday 2026-10-16, 09:37 in Bogota.
const NOW = new Date("2026-10-16T14:37:00.000Z");
let queries: string[] = [];

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  queries = [];
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

function serve(items: unknown[]) {
  server.use(http.get(apiUrl("/api/reservations"), ({ request }) => {
    queries.push(new URL(request.url).search);

    return HttpResponse.json(envelope(items));
  }));
}

describe("UpcomingReservations", () => {
  it("lists the scheduled reservations of the next 7 days by start, with holder, group and purpose", async() => {
    serve([
      detailDto("later", {
        startsAt: "2026-10-20T15:00:00.000Z",
        endsAt: "2026-10-20T16:00:00.000Z",
        holderType: "GROUP",
        holder: null,
        group: { id: "g1", name: "Turno mañana" },
        purpose: "Práctica de PEEP",
      }),
      detailDto("now", {
        startsAt: "2026-10-16T14:00:00.000Z",
        endsAt: "2026-10-16T15:00:00.000Z",
        holder: { id: "u1", code: "2020123", name: "Ana Gómez", identifier: "ana@ventylab.demo", role: "STUDENT" },
      }),
      detailDto("ended", { startsAt: "2026-10-16T12:00:00.000Z", endsAt: "2026-10-16T13:00:00.000Z" }),
      detailDto("cancelled", { startsAt: "2026-10-17T15:00:00.000Z", endsAt: "2026-10-17T16:00:00.000Z", status: "CANCELLED" }),
    ]);

    renderLab(<UpcomingReservations now={NOW} />, { role: "TEACHER" });

    const list = await screen.findByRole("list", { name: UPCOMING_RESERVATIONS_COPY.title });
    const items = within(list).getAllByRole("listitem");

    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Reservado por Ana Gómez (2020123)");
    expect(items[0]).toHaveTextContent("En curso");
    expect(items[1]).toHaveTextContent("Reservado por Grupo Turno mañana");
    expect(items[1]).toHaveTextContent(UPCOMING_RESERVATIONS_COPY.groupOperator);
    expect(items[1]).toHaveTextContent("Propósito: Práctica de PEEP");
    expect(items[1]).toHaveTextContent("Programada");
    expect(queries).toEqual(["?from=2026-10-16T05:00:00.000Z&to=2026-10-23T05:00:00.000Z"]);
  });

  it("shows the empty state", async() => {
    serve([detailDto("cancelled", { status: "CANCELLED", startsAt: "2026-10-17T15:00:00.000Z", endsAt: "2026-10-17T16:00:00.000Z" })]);

    renderLab(<UpcomingReservations now={NOW} />, { role: "ADMIN" });

    expect(await screen.findByText(UPCOMING_RESERVATIONS_COPY.empty)).toBeInTheDocument();
  });

  it("shows a retryable error, also for a 403", async() => {
    server.use(http.get(apiUrl("/api/reservations"), () => errorResponse("auth.forbidden", 403)));

    renderLab(<UpcomingReservations now={NOW} />, { role: "TEACHER" });

    expect(await screen.findByText(UPCOMING_RESERVATIONS_COPY.error)).toBeInTheDocument();

    serve([]);
    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));

    expect(await screen.findByText(UPCOMING_RESERVATIONS_COPY.empty)).toBeInTheDocument();
  });
});
