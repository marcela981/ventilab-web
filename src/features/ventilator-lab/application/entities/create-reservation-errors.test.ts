/*
* Funcionalidad: Create reservation error messages tests
* Descripción: Spanish copy of the POST /api/reservations failures by backend code: upcoming limit, outside the booking window (with the configured days), slot in the past, overlap (also the preemptable variant), misaligned slot and too long (with the configured values), forbidden or missing holder, and the generic lab messages for anything else. Depends on vitest, the api-client error and the lab error messages.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError } from "@shared/api-client/api-error";
import { CREATE_RESERVATION_ERROR_COPY, getCreateReservationErrorMessage } from "./lab-error-messages";
import { LAB_SETTING_DEFAULTS } from "./lab-settings.entity";

const fail = (code: string, status: number) => new ApiError({ code, status, message: code });
const settings = { ...LAB_SETTING_DEFAULTS, "reservations.maxAdvanceDays": 7, "reservations.maxDurationMinutes": 90, "reservations.slotMinutes": 30 };

describe("getCreateReservationErrorMessage", () => {
  it("explains each backend rule in Spanish", () => {
    expect(getCreateReservationErrorMessage(fail("reservations.limit_reached", 409), settings)).toBe(CREATE_RESERVATION_ERROR_COPY.limitReached);
    expect(getCreateReservationErrorMessage(fail("reservations.too_far_ahead", 400), settings))
      .toBe("Esa franja está fuera de la ventana de reserva: solo puedes reservar con hasta 7 días de antelación.");
    expect(getCreateReservationErrorMessage(fail("reservations.in_past", 400), settings)).toBe(CREATE_RESERVATION_ERROR_COPY.inPast);
    expect(getCreateReservationErrorMessage(fail("reservations.conflict", 409), settings)).toBe(CREATE_RESERVATION_ERROR_COPY.overlap);
    expect(getCreateReservationErrorMessage(fail("reservations.conflict_preemptable", 409), settings)).toBe(CREATE_RESERVATION_ERROR_COPY.overlap);
    expect(getCreateReservationErrorMessage(fail("reservations.not_aligned", 400), settings))
      .toBe("La reserva debe empezar y terminar en franjas de 30 minutos.");
    expect(getCreateReservationErrorMessage(fail("reservations.too_long", 400), settings))
      .toBe("La reserva no puede durar más de 1 h 30 min.");
    expect(getCreateReservationErrorMessage(fail("reservations.reserve_forbidden", 403), settings)).toBe(CREATE_RESERVATION_ERROR_COPY.forbidden);
    expect(getCreateReservationErrorMessage(fail("reservations.holder_not_found", 404), settings)).toBe(CREATE_RESERVATION_ERROR_COPY.holderNotFound);
  });

  it("falls back to the generic lab messages", () => {
    expect(getCreateReservationErrorMessage(fail("common.validation", 400), settings)).toBe("Revisa los datos enviados.");
    expect(getCreateReservationErrorMessage(fail("common.internal_server_error", 500), settings))
      .toBe("Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.");
  });
});
