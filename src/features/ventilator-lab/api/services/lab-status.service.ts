/*
* Funcionalidad: Lab status service
* Descripción: Read paths used by the lab hooks through useApiQuery, all present in openapi/openapi.json: the platform settings GET /api/platform-settings (settings:manage, ADMIN only; the source of the effective lab settings when readable) and the system status GET /api/system/status (system:status, TEACHER and ADMIN; its ventilator component seeds the device online state). Also the permission names that gate both reads and the reader of the ventilator component. Depends on the lab DTOs (types).
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";
import type { SystemVentilatorStatusDTO } from "../dtos/lab.dto";

export const PLATFORM_SETTINGS_PATH = "/api/platform-settings";
export const SYSTEM_STATUS_PATH = "/api/system/status";

export const SETTINGS_READ_PERMISSION = "settings:manage";
export const SYSTEM_STATUS_PERMISSION = "system:status";

export function ventilatorStatusOf(status: components["schemas"]["SystemStatusDTO"]): SystemVentilatorStatusDTO {
  return status.components.ventilator;
}
