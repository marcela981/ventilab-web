/*
* Funcionalidad: Recording control tests
* Descripción: The "Grabar sesión" toggle with msw: start sends ONE POST /api/ventilator/telemetry/recordings/start
*   (a double click too) and shows the REC mark, stop asks for confirmation and sends POST …/stop only after
*   «Detener» (cancel keeps recording), the Spanish errors of 409 / 403 / 404 / a lost connection, a failed stop keeps
*   the REC mark (outcome unknown), and nothing is sent while not enabled. Depends on vitest, msw, Testing Library, the
*   lab test helpers, the recording control and the session recording hook and entity. v1.1 (T10 review fix): a 409 on
*   stop goes idle with its note (S8); a recording that stops being allowed leaves a note instead of vanishing (S9).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useState } from "react";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { RECORDING_COPY } from "../entities/session-recording.entity";
import { useSessionRecording } from "../hooks/use-session-recording";
import { apiUrl, envelope, renderLab } from "../pages/lab-test-helpers";
import { RecIndicator, RecordingControl } from "./recording-control";

const server = setupServer();
let calls: string[] = [];

function Harness({ enabled = true }: { enabled?: boolean }) {
  const recording = useSessionRecording({ enabled });

  return (
    <>
      <RecIndicator phase={recording.state.phase} />
      {enabled ? <RecordingControl recording={recording} /> : null}
      <button type="button" onClick={() => void recording.start()}>forzar inicio</button>
    </>
  );
}

function answer(path: "start" | "stop", status = 200, code = "ok") {
  server.use(http.post(apiUrl(`/api/ventilator/telemetry/recordings/${path}`), () => {
    calls.push(path);

    if (status === 0) {
      return HttpResponse.error();
    }

    return status === 200
      ? HttpResponse.json(envelope(null))
      : HttpResponse.json({ success: false, message: "english", data: null, code, timestamp: "", traceId: "t", pagination: null }, { status });
  }));
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  calls = [];
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

// The first test pays the MUI dialog import: under a full parallel run it can exceed the default 5 s.
describe("RecordingControl", { timeout: 20_000 }, () => {
  it("starts once (double click) and shows the REC mark, stops only after confirming", async() => {
    answer("start");
    answer("stop");
    renderLab(<Harness />);

    expect(screen.queryByTestId("lab-live-rec")).not.toBeInTheDocument();
    const start = screen.getByRole("button", { name: RECORDING_COPY.start });

    fireEvent.click(start);
    fireEvent.click(start);
    expect(await screen.findByTestId("lab-live-rec")).toHaveTextContent(RECORDING_COPY.rec);
    expect(calls).toEqual(["start"]);

    // Stop: confirmation first; «Seguir grabando» keeps the recording.
    fireEvent.click(screen.getByRole("button", { name: RECORDING_COPY.stop }));
    expect(await screen.findByRole("dialog")).toHaveTextContent(RECORDING_COPY.stopTitle);
    fireEvent.click(screen.getByRole("button", { name: RECORDING_COPY.stopCancel }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(calls).toEqual(["start"]);
    expect(screen.getByTestId("lab-live-rec")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: RECORDING_COPY.stop }));
    fireEvent.click(await screen.findByRole("button", { name: RECORDING_COPY.stopConfirm }));
    await waitFor(() => expect(screen.queryByTestId("lab-live-rec")).not.toBeInTheDocument());
    expect(calls).toEqual(["start", "stop"]);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: RECORDING_COPY.start })).toBeInTheDocument();
  });

  it.each([
    [409, "ventilator-telemetry.no_active_reservation", "No hay una reserva activa del ventilador: no se pudo iniciar la grabación."],
    [403, "ventilator-telemetry.recording_forbidden", RECORDING_COPY.errors.forbidden],
    [404, "ventilator-telemetry.reservation_not_found", "No se encontró la reserva: no se pudo iniciar la grabación."],
    [0, "", RECORDING_COPY.errors.uncertain("iniciar")],
  ])("shows the Spanish error of a failed start (%i)", async(status, code, message) => {
    answer("start", status, code);
    renderLab(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: RECORDING_COPY.start }));
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.queryByTestId("lab-live-rec")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: RECORDING_COPY.start })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: RECORDING_COPY.dismiss }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the REC mark when the stop fails (the outcome is unknown)", async() => {
    answer("start");
    answer("stop", 500, "internal");
    renderLab(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: RECORDING_COPY.start }));
    await screen.findByTestId("lab-live-rec");
    fireEvent.click(screen.getByRole("button", { name: RECORDING_COPY.stop }));
    fireEvent.click(await screen.findByRole("button", { name: RECORDING_COPY.stopConfirm }));

    expect(await screen.findByRole("alert")).toHaveTextContent(RECORDING_COPY.errors.uncertain("detener"));
    expect(screen.getByTestId("lab-live-rec")).toBeInTheDocument();
  });

  it("goes idle when the stop answers 409: no active reservation, the server stopped the recording (T10 review fix S8)", async() => {
    answer("start");
    answer("stop", 409, "ventilator-telemetry.no_active_reservation");
    renderLab(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: RECORDING_COPY.start }));
    await screen.findByTestId("lab-live-rec");
    fireEvent.click(screen.getByRole("button", { name: RECORDING_COPY.stop }));
    fireEvent.click(await screen.findByRole("button", { name: RECORDING_COPY.stopConfirm }));

    expect(await screen.findByRole("alert")).toHaveTextContent(RECORDING_COPY.stoppedByServer);
    expect(screen.queryByTestId("lab-live-rec")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: RECORDING_COPY.start })).toBeInTheDocument();
  });

  it("keeps a note instead of silently dropping REC when recording stops being allowed (T10 review fix S9)", async() => {
    answer("start");

    function Revocable() {
      const [enabled, setEnabled] = useState(true);
      const recording = useSessionRecording({ enabled });

      return (
        <>
          <RecIndicator phase={recording.state.phase} />
          {enabled ? <RecordingControl recording={recording} /> : null}
          {recording.note ? <p data-testid="rec-note">{recording.note}</p> : null}
          <button type="button" onClick={() => setEnabled(false)}>quitar permiso</button>
        </>
      );
    }

    renderLab(<Revocable />);
    fireEvent.click(screen.getByRole("button", { name: RECORDING_COPY.start }));
    await screen.findByTestId("lab-live-rec");
    expect(screen.queryByTestId("rec-note")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "quitar permiso" }));
    expect(screen.queryByTestId("lab-live-rec")).not.toBeInTheDocument();
    expect(screen.getByTestId("rec-note")).toHaveTextContent(RECORDING_COPY.noLongerAllowed);
  });

  it("sends nothing while not enabled", async() => {
    answer("start");
    renderLab(<Harness enabled={false} />);

    expect(screen.queryByRole("button", { name: RECORDING_COPY.start })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "forzar inicio" }));
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    expect(calls).toEqual([]);
    expect(screen.queryByTestId("lab-live-rec")).not.toBeInTheDocument();
  });
});
