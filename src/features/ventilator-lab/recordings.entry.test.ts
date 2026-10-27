/*
* Funcionalidad: Ventilator lab recordings entry point tests
* Descripción: The recordings entry point (W9, Bloque 1) exposes what the Mis sesiones tab of /simulador needs without
*   the lab barrel: the list and recording hooks, the lazy player, the 31-day window, the duration and clock formats
*   and the Spanish error messages of a recording. Depends on vitest and the entry point.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError } from "@shared/api-client/api-error";
import * as entry from "./recordings.entry";

describe("recordings entry point", () => {
  it("exposes the hooks and the lazy player", () => {
    expect(typeof entry.useRecordingsList).toBe("function");
    expect(typeof entry.useRecording).toBe("function");
    expect(typeof entry.LazyRecordingPlayer).toBe("function");
  });

  it("gives the 31-day windows going back from now", () => {
    const now = Date.parse("2026-10-26T12:00:00.000Z");
    const first = entry.recordingsRange(now, 0);
    const second = entry.recordingsRange(now, 1);

    expect(entry.RECORDINGS_RANGE_DAYS).toBe(31);
    expect(first.to.getTime()).toBe(now);
    expect(second.to.getTime()).toBe(first.from.getTime());
  });

  it("formats a recording and its errors in Spanish", () => {
    expect(entry.formatRecordingDuration(30 * 60_000)).toBe("30 min");
    expect(entry.formatPlaybackClock(65_000)).toBe("01:05");
    expect(entry.getRecordingErrorMessage(new ApiError({ status: 404, code: "ventilator-telemetry.reservation_not_found", message: "" })))
      .toBe(entry.RECORDINGS_COPY.notFound);
  });
});
