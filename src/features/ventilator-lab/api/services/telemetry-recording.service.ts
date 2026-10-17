/*
* Funcionalidad: Telemetry recording service
* Descripción: Start / stop of the telemetry recording of the ACTIVE ventilator reservation, both present in
*   openapi/openapi.json: POST /api/ventilator/telemetry/recordings/start and POST
*   /api/ventilator/telemetry/recordings/stop (no body; the answer carries data null: the recording state is not
*   returned). 403 not a holder, 409 no active reservation. Idempotent on the backend (start of a reservation already
*   recorded and stop without a recording answer 200). v1.1 (T11): the path of GET
*   /api/ventilator/telemetry/recordings/{reservationId} (decoded frames of a reservation, ordered by server time;
*   holders, teachers and admins; 403 recording_forbidden, 404 reservation_not_found; a reservation without recorded
*   chunks answers 200 with no frames). There is no list endpoint and no CSV export. v1.2 (T11 review fix W1/W2):
*   fetchTelemetryRecording reads it OUTSIDE the SWR cache with the caller's AbortSignal and the slow timeout (the
*   answer carries every frame and can weigh several MB). Depends on the api-client request helpers.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiGet, apiPost } from "@shared/api-client/api-request";
import type { RecordingSource } from "../../application/entities/recording-index";

export const RECORDING_START_PATH = "/api/ventilator/telemetry/recordings/start";
export const RECORDING_STOP_PATH = "/api/ventilator/telemetry/recordings/stop";
export const RECORDING_PATH = "/api/ventilator/telemetry/recordings/{reservationId}";

export async function startTelemetryRecording(): Promise<void> {
  await apiPost(RECORDING_START_PATH);
}

export async function stopTelemetryRecording(): Promise<void> {
  await apiPost(RECORDING_STOP_PATH);
}

/** Every frame of the reservation's recording, read without cache; aborted through `signal`. */
export async function fetchTelemetryRecording(reservationId: string, signal?: AbortSignal): Promise<RecordingSource> {
  const result = await apiGet(RECORDING_PATH, { params: { reservationId }, timeout: "slow", ...(signal ? { signal } : {}) });

  return result.data;
}
