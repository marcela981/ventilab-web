/*
* Funcionalidad: Ventilator commands service
* Descripción: The command endpoints of the backend (openapi `sendVentilatorCommand`, `getVentilatorCommands`; base
*   /api/ventilator, permission ventilator:control): POST /api/ventilator/commands sends a full setting set built by the
*   command mapper and answers 202 `{ commandId, reservationId, status, sentAt? }` (the status may already be terminal);
*   GET /api/ventilator/commands?reservationId= lists the reservation's commands, newest first (holders of that
*   reservation, teachers, administrators), mapped to the command history records of the lab. The request has no
*   idempotency key (none in the DTO; gap recorded), so the caller must never retry a send by itself. Depends on the
*   api-client request helpers, the lab DTOs and the command state types.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiGet, apiPost } from "@shared/api-client/api-request";
import type { LabCommandRecord } from "../../application/entities/command-state";
import type { SendVentilatorCommandRequestDTO, SentVentilatorCommandDTO, VentilatorCommandDTO } from "../dtos/lab.dto";

export const VENTILATOR_COMMANDS_PATH = "/api/ventilator/commands";

/** Commands shown in "Comandos recientes". */
export const RECENT_COMMANDS_LIMIT = 10;

export type SentCommand = {
  commandId: string
  reservationId: string
  status: SentVentilatorCommandDTO["status"]
};

export async function sendVentilatorCommand(body: SendVentilatorCommandRequestDTO): Promise<SentCommand> {
  const result = await apiPost(VENTILATOR_COMMANDS_PATH, { body });

  return { commandId: result.data.commandId, reservationId: result.data.reservationId, status: result.data.status };
}

export function toLabCommandRecord(dto: VentilatorCommandDTO): LabCommandRecord {
  return {
    id: dto.id,
    status: dto.status,
    // Typed `Record<string, never>` by the generator; the backend returns the validated parameters.
    params: dto.params as Readonly<Record<string, unknown>>,
    rejectReason: dto.rejectReason,
    createdAt: dto.createdAt,
    latencyMs: dto.latencyMs,
  };
}

export async function fetchVentilatorCommands(reservationId: string, ids?: readonly string[]): Promise<LabCommandRecord[]> {
  const result = await apiGet(VENTILATOR_COMMANDS_PATH, {
    query: {
      reservationId,
      limit: RECENT_COMMANDS_LIMIT,
      sortOrder: "desc",
      ...(ids && ids.length > 0 ? { ids: ids.join(",") } : {}),
    },
  });

  return result.data.map(toLabCommandRecord);
}
