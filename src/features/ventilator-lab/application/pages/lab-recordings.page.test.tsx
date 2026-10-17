/*
* Funcionalidad: Lab recordings pages tests
* Descripción: /lab/recordings with msw: the started reservations of the current 31-day calendar window (backend holder
*   text, reservation duration, link to the playback), every one for staff and only the own ones for a student, the
*   note on what can be listed, the previous window, the empty and retryable error states. /lab/recordings/[id]: 403
*   and 404 with their Spanish message and no console, a reservation without frames, and a playable recording with
*   the "Datos submuestreados" note and its rate, the transport (play / pause, speed, clock) and the lazy console.
*   Depends on Vitest, msw, Testing Library and the lab test helpers. v1.1 (T11 review fix): the
*   header length comes from the index and states the gaps, the gaps are marked on the time bar and listed, and
*   seeking into a gap shows the no-data overlay.
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
import type { RecordedTelemetryFrameDTO } from "../../api/dtos/lab.dto";
import { PLAYBACK_COPY } from "../components/playback-transport";
import { RECORDINGS_COPY } from "../entities/recordings-list.entity";
import { LAB_RECORDING_COPY, LabRecordingPage } from "./lab-recording.page";
import { LabRecordingsPage } from "./lab-recordings.page";
import { apiUrl, detailDto, envelope, errorResponse, renderLab, summaryDto } from "./lab-test-helpers";

const server = setupServer();
const NOW = Date.parse("2026-10-16T15:00:00.000Z");
const DAY = 86_400_000;
const LOAD_TIMEOUT = 20_000;
let calendarQueries: Array<{ from: string | null, to: string | null }> = [];

const done = detailDto("done", { startsAt: "2026-10-15T14:00:00.000Z", endsAt: "2026-10-15T15:30:00.000Z", status: "COMPLETED" });
const future = detailDto("future", { startsAt: "2026-10-17T14:00:00.000Z", endsAt: "2026-10-17T15:00:00.000Z" });
const other = { ...summaryDto("other", "reservations.labels.teacher", "Reservado por un docente"), startsAt: "2026-10-14T14:00:00.000Z", endsAt: "2026-10-14T15:00:00.000Z", status: "COMPLETED" };

function useCalendar(data: unknown[]) {
  server.use(http.get(apiUrl("/api/reservations"), ({ request }) => {
    const url = new URL(request.url);

    calendarQueries.push({ from: url.searchParams.get("from"), to: url.searchParams.get("to") });

    return HttpResponse.json(envelope(data));
  }));
}

function frames(seconds: number): RecordedTelemetryFrameDTO[] {
  return Array.from({ length: seconds * 20 + 1 }, (_, at) => ({
    serverTs: NOW - DAY + at * 50,
    deviceTs: null,
    seq: at,
    pressure: 10,
    flow: 0,
    volume: 0,
    spo2: null,
    pco2: null,
  }));
}

function useRecording(response: () => Response) {
  server.use(http.get(apiUrl("/api/ventilator/telemetry/recordings/:reservationId"), response));
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  calendarQueries = [];
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("LabRecordingsPage", () => {
  it("lists every started reservation of the last 31 days for staff, with the backend holder text and a playback link", async() => {
    useCalendar([done, future, other]);

    renderLab(<LabRecordingsPage />, { role: "TEACHER" });

    const list = await screen.findByRole("list", { name: RECORDINGS_COPY.listLabel });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Titular: Ana Gómez");
    expect(items[0]).toHaveTextContent("Duración de la reserva: 1 h 30 min");
    expect(items[0]).toHaveTextContent("Finalizada");
    expect(within(items[0] as HTMLElement).getByRole("link", { name: /Abrir la grabación/ })).toHaveAttribute("href", "/lab/recordings/done");
    expect(items[1]).toHaveTextContent("Reservado por un docente");
    expect(calendarQueries[0]).toEqual({ from: new Date(NOW - 31 * DAY).toISOString(), to: new Date(NOW).toISOString() });
    expect(screen.getByTestId("lab-recordings-note")).toHaveTextContent(RECORDINGS_COPY.note);
    expect(screen.getByTestId("lab-recordings-note")).not.toHaveTextContent(RECORDINGS_COPY.studentNote);
  });

  it("gives a student only their own reservations and says so", async() => {
    useCalendar([done, other]);

    renderLab(<LabRecordingsPage />, { role: "STUDENT" });

    const list = await screen.findByRole("list", { name: RECORDINGS_COPY.listLabel });
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByTestId("lab-recordings-note")).toHaveTextContent(RECORDINGS_COPY.studentNote);
  });

  it("goes back 31 days and shows the empty state", async() => {
    useCalendar([done]);

    renderLab(<LabRecordingsPage />, { role: "TEACHER" });
    await screen.findByRole("list", { name: RECORDINGS_COPY.listLabel });
    expect(screen.getByRole("button", { name: RECORDINGS_COPY.next })).toBeDisabled();

    useCalendar([]);
    fireEvent.click(screen.getByRole("button", { name: RECORDINGS_COPY.previous }));

    expect(await screen.findByText(RECORDINGS_COPY.empty)).toBeInTheDocument();
    expect(calendarQueries[calendarQueries.length - 1]).toEqual({
      from: new Date(NOW - 62 * DAY).toISOString(),
      to: new Date(NOW - 31 * DAY).toISOString(),
    });
    expect(screen.getByRole("button", { name: RECORDINGS_COPY.next })).toBeEnabled();
  });

  it("shows a retryable error", async() => {
    server.use(http.get(apiUrl("/api/reservations"), () => errorResponse("common.unknown", 500)));

    renderLab(<LabRecordingsPage />, { role: "TEACHER" });

    expect(await screen.findByText(RECORDINGS_COPY.error)).toBeInTheDocument();
    useCalendar([done]);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("list", { name: RECORDINGS_COPY.listLabel })).toBeInTheDocument();
  });
});

describe("LabRecordingPage", { timeout: 30_000 }, () => {
  const curvesStatus = () => document.querySelector("[data-source-status]")?.getAttribute("data-source-status") ?? null;

  it("explains a 403 without loading the console", async() => {
    useRecording(() => errorResponse("ventilator-telemetry.recording_forbidden", 403));

    renderLab(<LabRecordingPage recordingId="r1" />);

    expect(await screen.findByText(LAB_RECORDING_COPY.forbiddenTitle)).toBeInTheDocument();
    expect(screen.getByText(RECORDINGS_COPY.forbidden)).toBeInTheDocument();
    screen.getAllByRole("link", { name: LAB_RECORDING_COPY.back }).forEach((link) => expect(link).toHaveAttribute("href", "/lab/recordings"));
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
    expect(curvesStatus()).toBeNull();
  });

  it("explains a 404", async() => {
    useRecording(() => errorResponse("ventilator-telemetry.reservation_not_found", 404));

    renderLab(<LabRecordingPage recordingId="missing" />);

    expect(await screen.findByText(LAB_RECORDING_COPY.notFoundTitle)).toBeInTheDocument();
    expect(screen.getByText(RECORDINGS_COPY.notFound)).toBeInTheDocument();
  });

  it("says when the reservation has no recording", async() => {
    useRecording(() => HttpResponse.json(envelope({ reservationId: "r1", sampleRateHz: null, chunkCount: 0, frames: [] })));

    renderLab(<LabRecordingPage recordingId="r1" />);

    expect(await screen.findByText(LAB_RECORDING_COPY.emptyTitle)).toBeInTheDocument();
    expect(curvesStatus()).toBeNull();
  });

  it("states the gaps in the header length and marks them on the time bar (T11 review fix S1/S4)", async() => {
    const withGap = [...frames(5), ...frames(5).map((item) => ({ ...item, serverTs: item.serverTs + 60_000 }))];
    useRecording(() => HttpResponse.json(envelope({ reservationId: "r1", sampleRateHz: 20, chunkCount: 2, frames: withGap })));

    renderLab(<LabRecordingPage recordingId="r1" />);

    expect(await screen.findByTestId("lab-recording-meta")).toHaveTextContent("Duración: 01:05 (incluye 1 intervalo sin datos, 00:55 en total)");
    await waitFor(() => expect(screen.getByTestId("lab-recording-clock")).toHaveTextContent("00:00 / 01:05"), { timeout: LOAD_TIMEOUT });
    expect(screen.getByTestId("lab-recording-gaps").querySelectorAll("rect")).toHaveLength(1);
    expect(screen.getByTestId("lab-recording-gap-list")).toHaveTextContent("Intervalos sin datos: 00:05–01:00.");

    fireEvent.change(screen.getByRole("slider", { name: PLAYBACK_COPY.position }), { target: { value: "30000" } });
    await waitFor(() => expect(curvesStatus()).toBe("no-data"));
  });

  it("plays a recording in the read-only console with the subsampling note and the transport", async() => {
    useRecording(() => HttpResponse.json(envelope({ reservationId: "r1", sampleRateHz: 20, chunkCount: 1, frames: frames(10) })));

    renderLab(<LabRecordingPage recordingId="r1" />);

    expect(await screen.findByTestId("lab-recording-subsampled")).toHaveTextContent("Datos submuestreados por el servidor a 20 Hz.");
    await waitFor(() => expect(curvesStatus()).toBe("live"), { timeout: LOAD_TIMEOUT });
    expect(screen.getByTestId("lab-recording-clock")).toHaveTextContent("00:00 / 00:10");
    expect(screen.getAllByText("Reproducción de una grabación: solo lectura.").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: PLAYBACK_COPY.play }));
    expect(screen.getByRole("button", { name: PLAYBACK_COPY.pause })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "×4" }));
    expect(screen.getByRole("button", { name: "×4" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "×1" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.change(screen.getByRole("slider", { name: PLAYBACK_COPY.position }), { target: { value: "5000" } });
    expect(screen.getByTestId("lab-recording-clock")).toHaveTextContent("00:05 / 00:10");
    // No CSV export: the API offers none.
    expect(screen.queryByRole("button", { name: /csv/i })).not.toBeInTheDocument();
  });
});
