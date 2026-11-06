/*
* Funcionalidad: Simulator alarm help and real-mode AI requests
* Descripción: Stream requests of the AI help of the simulator (Bloque A, DISENO_AJUSTES_A §5): the "¿Cómo estabilizar?"
*   help of an alarm of a digital session (POST /api/simulation/sessions/{id}/alarm-help) or of the real monitor (POST
*   /api/simulation/real/alarm-help with the monitor state the client sends) and the AI assistance of the real monitor
*   (POST /api/simulation/real/assist). The answers are Spanish. The state is the RealMonitorStateDTO of the contract;
*   the AI only suggests, it never sends commands to the ventilator. Depends on the shared stream request type and the
*   generated contract. v1.1 (fix sim-assist-current-state): the session alarm help carries the console context
*   (current simulated time, unsent changes and a snapshot) like the assistance.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { StreamRequest } from "@shared/ai-conversation";
import type { components } from "@shared/api-client/generated/schema";
import { helpContextBody } from "../../application/entities/sim-help-context.entity";
import type { SessionHelpContext } from "../../application/entities/sim-help-context.entity";

export type SimulationAlarmHelpDTO = components["schemas"]["SimulationAlarmHelpDTO"];
export type RealAlarmHelpDTO = components["schemas"]["RealAlarmHelpDTO"];
export type RealAssistDTO = components["schemas"]["RealAssistDTO"];
export type RealMonitorStateDTO = components["schemas"]["RealMonitorStateDTO"];

/** The console copy is Spanish. */
const HELP_LANGUAGE: NonNullable<SimulationAlarmHelpDTO["language"]> = "es";

export const SIMULATION_SESSION_ALARM_HELP_PATH = "/api/simulation/sessions/{id}/alarm-help";
export const REAL_ALARM_HELP_PATH = "/api/simulation/real/alarm-help";
export const REAL_ASSIST_PATH = "/api/simulation/real/assist";

/** v1.1: the console context (current simulated time, unsent changes, snapshot) so the server analyzes the patient now. */
export function sessionAlarmHelpRequest(sessionId: string, alarmCode: string, context?: SessionHelpContext | null): StreamRequest {
  const body: SimulationAlarmHelpDTO = { alarmCode, language: HELP_LANGUAGE, ...helpContextBody(context) };

  return { path: SIMULATION_SESSION_ALARM_HELP_PATH.replace("{id}", encodeURIComponent(sessionId)), body };
}

export function realAlarmHelpRequest(alarmCode: string, state: RealMonitorStateDTO): StreamRequest {
  const body: RealAlarmHelpDTO = { alarmCode, state, language: HELP_LANGUAGE };

  return { path: REAL_ALARM_HELP_PATH, body };
}

export function realAssistRequest(state: RealMonitorStateDTO, question: string): StreamRequest {
  const trimmed = question.trim();
  const body: RealAssistDTO = trimmed === "" ? { state, language: HELP_LANGUAGE } : { state, question: trimmed, language: HELP_LANGUAGE };

  return { path: REAL_ASSIST_PATH, body };
}
