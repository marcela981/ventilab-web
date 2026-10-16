/*
* Funcionalidad: Reservations service tests
* Descripción: The read services call the documented paths (the calendar with its ISO range query) and map each item by its projection. Depends on vitest, msw and the reservations service.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { apiUrl, detailDto, envelope, errorResponse, summaryDto } from "../../application/pages/lab-test-helpers";
import { fetchCurrentReservation, fetchMyReservations, fetchReservationsCalendar } from "./reservations.service";

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("reservations service", () => {
  it("reads the current reservation with its control flag", async() => {
    server.use(http.get(apiUrl("/api/reservations/current"), () => HttpResponse.json(envelope({
      reservation: summaryDto("r1", "reservations.labels.teacher", "Reserved by a teacher"),
      canControl: false,
    }))));

    await expect(fetchCurrentReservation()).resolves.toEqual({
      reservation: {
        visibility: "limited",
        id: "r1",
        startsAt: "2026-10-16T16:00:00.000Z",
        endsAt: "2026-10-16T17:00:00.000Z",
        status: "SCHEDULED",
        occupancyLabel: "Reservado por un docente",
      },
      canControl: false,
    });
  });

  it("reads my reservations as full projections", async() => {
    server.use(http.get(apiUrl("/api/reservations/mine"), () => HttpResponse.json(envelope([detailDto("r2")]))));

    const mine = await fetchMyReservations();

    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ visibility: "full", id: "r2", holderName: "Ana Gómez" });
  });

  it("sends the calendar range as ISO instants and maps mixed projections", async() => {
    let query: Record<string, string> = {};

    server.use(http.get(apiUrl("/api/reservations"), ({ request }) => {
      query = Object.fromEntries(new URL(request.url).searchParams);

      return HttpResponse.json(envelope([detailDto("r3"), summaryDto("r4", "reservations.labels.student", "x")]));
    }));

    const items = await fetchReservationsCalendar(new Date("2026-10-12T05:00:00.000Z"), new Date("2026-10-19T05:00:00.000Z"));

    expect(query).toEqual({ from: "2026-10-12T05:00:00.000Z", to: "2026-10-19T05:00:00.000Z" });
    expect(items.map(({ visibility }) => visibility)).toEqual(["full", "limited"]);
  });

  it("rejects with the backend error", async() => {
    server.use(http.get(apiUrl("/api/reservations/mine"), () => errorResponse("auth.forbidden", 403)));

    await expect(fetchMyReservations()).rejects.toMatchObject({ status: 403 });
  });
});
