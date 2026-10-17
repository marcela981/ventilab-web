/*
* Funcionalidad: Ventilator control service
* Descripción: Endpoints of the exclusive operator control of the physical ventilator, all present in
*   openapi/openapi.json: GET /api/ventilator/control (state for the caller), POST /api/ventilator/control (take the
*   free control), POST /api/ventilator/control/takeover (leader of the holder group, teacher or admin take it from the
*   current operator; audited), DELETE /api/ventilator/control (release) and POST /api/ventilator/control/heartbeat
*   (refreshes the operator presence; the socket message ventilator:heartbeat does the same). Writes answer data null
*   and emit ventilator:control-changed. Also a keepalive `fetch` DELETE for leaving the page (axios cannot outlive the
*   page), with the Bearer token of token storage and the cookies, like the simulator page-hide flush; best effort.
*   v1.1 (T9 review fix W2): `readControlStateResult` (raw result for a re-read that must reject on failure).
*   Depends on the api-client request helpers and token storage, the backend origin and the lab DTOs.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiDelete, apiGet, apiPost } from "@shared/api-client/api-request";
import { getAccessToken } from "@shared/api-client/token-storage";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import type { OperatorControlState } from "../../application/entities/operator-control.entity";
import type { VentilatorControlStateDTO } from "../dtos/lab.dto";

export const VENTILATOR_CONTROL_PATH = "/api/ventilator/control";
export const VENTILATOR_CONTROL_TAKEOVER_PATH = "/api/ventilator/control/takeover";
export const VENTILATOR_CONTROL_HEARTBEAT_PATH = "/api/ventilator/control/heartbeat";

/** Keeps `undefined` when the backend omits a field (restricted projection), so nothing is filled in. */
export function toOperatorControlState(dto: VentilatorControlStateDTO): OperatorControlState {
  return {
    reservationId: dto.reservationId ?? null,
    operatorUserId: dto.operatorUserId,
    isOperator: dto.isOperator,
    canTake: dto.canTake,
    canTakeover: dto.canTakeover,
    occupied: dto.occupied,
  };
}

/** The raw GET /api/ventilator/control result (the shape the SWR cache keeps); rejects on a failed read. */
export function readControlStateResult() {
  return apiGet(VENTILATOR_CONTROL_PATH);
}

export async function fetchControlState(): Promise<OperatorControlState> {
  const result = await apiGet(VENTILATOR_CONTROL_PATH);

  return toOperatorControlState(result.data);
}

export async function takeControl(): Promise<void> {
  await apiPost(VENTILATOR_CONTROL_PATH);
}

export async function takeOverControl(): Promise<void> {
  await apiPost(VENTILATOR_CONTROL_TAKEOVER_PATH);
}

export async function releaseControl(): Promise<void> {
  await apiDelete(VENTILATOR_CONTROL_PATH);
}

export async function sendControlHeartbeat(): Promise<void> {
  await apiPost(VENTILATOR_CONTROL_HEARTBEAT_PATH);
}

/** DELETE /api/ventilator/control that survives the page going away (pagehide / unmount); errors are ignored. */
export function releaseControlKeepalive(): void {
  if (typeof fetch !== "function") {
    return;
  }

  const token = getAccessToken();
  const headers: Record<string, string> = { Accept: "application/json" };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    void fetch(`${BACKEND_ORIGIN}${VENTILATOR_CONTROL_PATH}`, { method: "DELETE", keepalive: true, credentials: "include", headers })
      .catch(() => undefined);
  } catch {
    // Nothing else can be done while the page goes away; the backend presence grace releases it otherwise.
  }
}
