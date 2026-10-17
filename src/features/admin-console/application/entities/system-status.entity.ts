/*
* Funcionalidad: System status rules
* Descripción: Pure rules of /admin/status: the SystemStatus read model (the `GET /api/system/status` response as it comes), the Spanish labels and tones (ok, degraded, down, idle) of the global state (OK, DEGRADED, DOWN) and of the component states (up, degraded, down, idle, not_configured), the component titles, the circuit breaker labels and applyStatusChange, which writes the global and component states of a `system:status-changed` event into the cached status (a selection of the pushed values, no computation) so the page updates before the refetch arrives. Depends on the admin console DTOs and the realtime contract types.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { SystemComponentName, SystemComponentState, SystemStatusChangedEvent } from "@shared/realtime/realtime.entity";
import type { AiProviderStatusDTO, SystemStatusDTO } from "../../api/dtos/admin-console.dto";

export type SystemStatus = SystemStatusDTO;
export type GlobalState = SystemStatusDTO["state"];
export type ComponentState = SystemComponentState;
export type BreakerState = AiProviderStatusDTO["breaker"];
export type StatusTone = "ok" | "degraded" | "down" | "idle";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const GLOBAL_STATE_LABELS: Record<GlobalState, string> = {
  OK: "Operativo",
  DEGRADED: "Degradado",
  DOWN: "Caído",
};

export const COMPONENT_STATE_LABELS: Record<ComponentState, string> = {
  up: "Operativo",
  degraded: "Degradado",
  down: "Caído",
  idle: "En reposo",
  not_configured: "Sin configurar",
};

export const COMPONENT_TITLES: Record<SystemComponentName, string> = {
  database: "Base de datos",
  mqttBroker: "Broker MQTT",
  ventilator: "Ventilador físico",
  aiProviders: "Proveedores de IA",
  storage: "Almacenamiento de medios",
  process: "Proceso del servidor",
};

export const BREAKER_LABELS: Record<BreakerState, string> = {
  closed: "Cerrado",
  open: "Abierto",
  half_open: "Semiabierto",
};

export const COMPONENT_ORDER: readonly SystemComponentName[] = ["database", "mqttBroker", "ventilator", "aiProviders", "storage", "process"];

export function globalStateTone(state: GlobalState): StatusTone {
  if (state === "OK") {
    return "ok";
  }

  return state === "DEGRADED" ? "degraded" : "down";
}

export function componentStateTone(state: ComponentState): StatusTone {
  if (state === "up") {
    return "ok";
  }

  if (state === "degraded" || state === "down") {
    return state;
  }

  return "idle";
}

/** The cached status with the states pushed by `system:status-changed`; the details stay until the refetch. */
export function applyStatusChange(status: SystemStatus, event: SystemStatusChangedEvent): SystemStatus {
  const components = { ...status.components };

  for (const change of event.changedComponents) {
    const current = components[change.component];

    if (current) {
      (components as Record<SystemComponentName, { state: ComponentState }>)[change.component] = { ...current, state: change.state };
    }
  }

  return { ...status, state: event.state, checkedAt: event.checkedAt, components };
}
