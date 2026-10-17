/*
* Funcionalidad: Recordings list entity tests
* Descripción: The recordings list built from the calendar (no list endpoint): consecutive 31-day windows going back,
*   reservations that STARTED inside the window and already began, every one for staff and only the caller's own (full
*   projection) for a student, newest first, with the backend holder text, the window duration, the status and the
*   playback URL; the Spanish errors of the recording read (403, 404, generic). Depends on Vitest, the reservations
*   mapper, the lab test fixtures and the entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError } from "@shared/api-client/api-error";
import { toLabReservation } from "../../api/mappers/reservations.mapper";
import { detailDto, summaryDto } from "../pages/lab-test-helpers";
import {
  formatRecordingDuration,
  getRecordingErrorMessage,
  RECORDINGS_COPY,
  RECORDINGS_RANGE_DAYS,
  recordingRows,
  recordingsRange,
} from "./recordings-list.entity";

const NOW = Date.parse("2026-10-16T15:00:00.000Z");
const DAY = 86_400_000;

const reservation = (id: string, startsAt: string, endsAt: string, status = "COMPLETED") =>
  toLabReservation(detailDto(id, { startsAt, endsAt, status }));

describe("recordingsRange", () => {
  it("goes back in windows of the backend maximum (31 days), the first one ending now", () => {
    expect(RECORDINGS_RANGE_DAYS).toBe(31);
    expect(recordingsRange(NOW, 0)).toEqual({ from: new Date(NOW - 31 * DAY), to: new Date(NOW) });
    expect(recordingsRange(NOW, 2)).toEqual({ from: new Date(NOW - 93 * DAY), to: new Date(NOW - 62 * DAY) });
  });
});

describe("recordingRows", () => {
  const range = recordingsRange(NOW, 0);
  const done = reservation("done", "2026-10-15T14:00:00.000Z", "2026-10-15T15:30:00.000Z");
  const running = reservation("running", "2026-10-16T14:30:00.000Z", "2026-10-16T15:30:00.000Z", "SCHEDULED");
  const future = reservation("future", "2026-10-17T14:00:00.000Z", "2026-10-17T15:00:00.000Z", "SCHEDULED");
  // Overlaps the start of the window but started in the previous one (listed there).
  const boundary = reservation("boundary", new Date(NOW - 31 * DAY - 30 * 60_000).toISOString(), new Date(NOW - 31 * DAY + 30 * 60_000).toISOString());
  const someoneElse = toLabReservation({
    ...summaryDto("other", "reservations.labels.teacher", "Reservado por un docente"),
    startsAt: "2026-10-14T14:00:00.000Z",
    endsAt: "2026-10-14T15:00:00.000Z",
  });

  it("lists the started reservations of the window, newest first, with the backend holder text and duration", () => {
    const rows = recordingRows([done, future, running, boundary], { nowMs: NOW, range, staff: false });

    expect(rows.map((row) => row.id)).toEqual(["running", "done"]);
    expect(rows[1]).toMatchObject({
      id: "done",
      holderText: "Ana Gómez",
      durationMs: 90 * 60_000,
      inProgress: false,
      statusLabel: "Finalizada",
      url: "/lab/recordings/done",
    });
    expect(rows[0]).toMatchObject({ inProgress: true, statusLabel: RECORDINGS_COPY.inProgress });
  });

  it("keeps cancelled and preempted reservations with a note: the contract has no cancel time (T11 review fix S3)", () => {
    const cancelled = reservation("cancelled", "2026-10-15T10:00:00.000Z", "2026-10-15T11:00:00.000Z", "CANCELLED");
    const preempted = reservation("preempted", "2026-10-15T08:00:00.000Z", "2026-10-15T09:00:00.000Z", "PREEMPTED");
    const rows = recordingRows([cancelled, preempted, done], { nowMs: NOW, range, staff: true });

    expect(rows.map((row) => [row.id, row.note])).toEqual([
      ["done", null],
      ["cancelled", RECORDINGS_COPY.endedEarlyNote],
      ["preempted", RECORDINGS_COPY.endedEarlyNote],
    ]);
  });

  it("gives staff every reservation and a student only their own", () => {
    expect(recordingRows([done, someoneElse], { nowMs: NOW, range, staff: true }).map((row) => row.id)).toEqual(["done", "other"]);
    expect(recordingRows([done, someoneElse], { nowMs: NOW, range, staff: false }).map((row) => row.id)).toEqual(["done"]);
  });

  it("formats the duration", () => {
    expect(formatRecordingDuration(90 * 60_000)).toBe("1 h 30 min");
    expect(formatRecordingDuration(45 * 60_000)).toBe("45 min");
    expect(formatRecordingDuration(30_000)).toBe("1 min");
  });
});

describe("getRecordingErrorMessage", () => {
  it("explains 403 and 404 in Spanish and falls back to the lab messages", () => {
    expect(getRecordingErrorMessage(new ApiError({ code: "ventilator-telemetry.recording_forbidden", message: "x", status: 403 })))
      .toBe(RECORDINGS_COPY.forbidden);
    expect(getRecordingErrorMessage(new ApiError({ code: "ventilator-telemetry.reservation_not_found", message: "x", status: 404 })))
      .toBe(RECORDINGS_COPY.notFound);
    expect(getRecordingErrorMessage(new ApiError({ code: "common.unknown", message: "boom", status: 500 }))).not.toBe("boom");
  });
});
