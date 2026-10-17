/*
* Funcionalidad: Ventilator command messages tests
* Descripción: Spanish copy of a failed POST /api/ventilator/commands by status and backend code (403 without an active reservation or not holder, 423 not the operator, 503 device without data, 422 with every violation of `details.violations` in Spanish, 429 with the Retry-After wait, a client timeout that may have sent the command, the generic lab messages otherwise), of every command status and of the rejection / timeout reasons. v1.1 (T8 review fix W2): a lost connection and a 500/502/504 are flagged as possibly sent. Depends on vitest, the api-client ApiError and the command messages entity.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError, CLIENT_ERROR_CODES } from "@shared/api-client/api-error";
import { commandOutcomeReason, commandStatusLabel, describeSendCommandError, SEND_COMMAND_ERROR_COPY } from "./command-messages";

const apiError = (status: number, code: string, extra: { details?: unknown, retryAfter?: number } = {}) => new ApiError({
  status,
  code,
  message: "backend english message",
  ...extra,
});

describe("describeSendCommandError", () => {
  it.each([
    [403, "ventilator-commands.no_active_reservation", SEND_COMMAND_ERROR_COPY.noActiveReservation],
    [403, "ventilator-commands.not_reservation_holder", SEND_COMMAND_ERROR_COPY.notHolder],
    [423, "ventilator-commands.not_operator", SEND_COMMAND_ERROR_COPY.notOperator],
    [503, "ventilator-commands.device_offline", SEND_COMMAND_ERROR_COPY.deviceOffline],
  ])("%i %s", (status, code, message) => {
    expect(describeSendCommandError(apiError(status, code))).toEqual({ message, violations: [], retryAfterS: null, mayHaveBeenSent: false });
  });

  it("falls back on the status when the code is unknown", () => {
    expect(describeSendCommandError(apiError(423, "other")).message).toBe(SEND_COMMAND_ERROR_COPY.notOperator);
    expect(describeSendCommandError(apiError(503, "other")).message).toBe(SEND_COMMAND_ERROR_COPY.deviceOffline);
    expect(describeSendCommandError(apiError(403, "other")).message).toBe(SEND_COMMAND_ERROR_COPY.notHolder);
  });

  it("lists every 422 violation in Spanish", () => {
    const details = {
      violations: [
        { field: "peep", rule: "safety_limit", message: "peep 16 exceeds the safety maximum 15", limit: { max: 15 } },
        { field: "tidalVolume", rule: "out_of_range", message: "x", limit: { min: 200, max: 800 } },
        { field: "pressureLimit", rule: "required", message: "x" },
        { field: "inspiratoryTime", rule: "expiratory_time_too_short", message: "x", limit: { min: 0.3 } },
        { field: "ieRatio", rule: "ie_ratio_inconsistent", message: "x" },
        { field: "pressureLimit", rule: "pressure_limit_not_above_peep", message: "x", limit: { min: 5 } },
        { field: "fio2", rule: "not_a_number", message: "x" },
        { field: "mode", rule: "invalid_mode", message: "x" },
        { field: "flowRate", rule: "brand_new_rule", message: "x" },
      ],
    };

    expect(describeSendCommandError(apiError(422, "ventilator-commands.invalid_command", { details }))).toEqual({
      message: SEND_COMMAND_ERROR_COPY.invalid,
      violations: [
        "PEEP: supera el máximo de seguridad (15).",
        "Vt (volumen corriente): fuera del rango permitido (200–800).",
        "presión límite: es obligatorio en este modo.",
        "Ti (tiempo inspiratorio): el tiempo espiratorio quedaría por debajo de 0,3 s.",
        "relación I:E: no coincide con la FR y el Ti.",
        "presión límite: debe ser mayor que la PEEP (5).",
        "FiO2: no es un número válido.",
        "modo: no es un modo válido.",
        "flujo inspiratorio: valor no aceptado por el servidor.",
      ],
      retryAfterS: null,
      mayHaveBeenSent: false,
    });
  });

  it("tolerates a 422 without violations", () => {
    expect(describeSendCommandError(apiError(422, "ventilator-commands.invalid_command", { details: null })).violations).toEqual([]);
  });

  it("gives the Retry-After wait of a 429", () => {
    expect(describeSendCommandError(apiError(429, "ventilator-commands.rate_limited", { retryAfter: 2 }))).toEqual({
      message: SEND_COMMAND_ERROR_COPY.rateLimited,
      violations: [],
      retryAfterS: 2,
      mayHaveBeenSent: false,
    });
    expect(describeSendCommandError(apiError(429, "ventilator-commands.rate_limited")).retryAfterS).toBe(1);
  });

  it("warns that a client timeout may have sent the command", () => {
    const result = describeSendCommandError(apiError(0, CLIENT_ERROR_CODES.networkTimeout));

    expect(result.mayHaveBeenSent).toBe(true);
    expect(result.message).toBe(SEND_COMMAND_ERROR_COPY.timeout);
  });

  it("treats a lost connection after the request as a command that may have been sent (T8 review W2)", () => {
    const result = describeSendCommandError(apiError(0, CLIENT_ERROR_CODES.networkUnavailable));

    expect(result.mayHaveBeenSent).toBe(true);
    expect(result.message).toBe(SEND_COMMAND_ERROR_COPY.unreachable);
  });

  it.each([500, 502, 504])("treats a %i as a command that may have been sent (T8 review W2)", (status) => {
    const result = describeSendCommandError(apiError(status, "common.internal"));

    expect(result.mayHaveBeenSent).toBe(true);
    expect(result.message).toBe(SEND_COMMAND_ERROR_COPY.serverError);
  });

  it("uses the generic lab messages otherwise", () => {
    expect(describeSendCommandError(apiError(400, "common.bad_request")).mayHaveBeenSent).toBe(false);
    expect(describeSendCommandError(apiError(404, "common.not_found")).message.length).toBeGreaterThan(10);
  });
});

describe("command status copy", () => {
  it("labels every status", () => {
    expect(commandStatusLabel("PENDING")).toBe("Enviando");
    expect(commandStatusLabel("SENT")).toBe("Esperando confirmación del equipo");
    expect(commandStatusLabel("ACKED")).toBe("Aceptado por el equipo");
    expect(commandStatusLabel("APPLIED")).toBe("Aplicado por el equipo");
    expect(commandStatusLabel("REJECTED")).toBe("Rechazado por el equipo");
    expect(commandStatusLabel("TIMEOUT")).toBe("Sin confirmación del equipo");
  });

  it("explains the reasons of a rejection or a timeout", () => {
    expect(commandOutcomeReason("TIMEOUT", null)).toBe("el equipo no confirmó el cambio a tiempo");
    expect(commandOutcomeReason("TIMEOUT", "publish_unconfirmed")).toBe("el servidor no pudo confirmar el envío al equipo");
    expect(commandOutcomeReason("TIMEOUT", "server_shutdown_unconfirmed")).toBe("el servidor se reinició antes de confirmar el envío");
    expect(commandOutcomeReason("REJECTED", "out_of_order")).toBe("motivo informado: «out_of_order»");
    expect(commandOutcomeReason("REJECTED", null)).toBe("el equipo rechazó el cambio");
  });
});
