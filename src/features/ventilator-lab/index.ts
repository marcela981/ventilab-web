/*
* Funcionalidad: Ventilator lab public API
* Descripción: Public surface of the ventilator-lab feature (real ventilator: reservations, live console, control, commands, recordings): the lab routes, the summary page, the reservation, device status and lab settings hooks and their entity types. Later tasks add the reservations, live console and recordings pages. Depends on the feature modules it re-exports.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export {
  buildRecordingUrl,
  LAB_LIVE_URL,
  LAB_RECORDINGS_URL,
  LAB_RESERVATIONS_URL,
  LAB_URL,
} from "./application/config/lab.routes";
export type {
  CurrentReservation,
  FullReservation,
  LabReservation,
  LimitedReservation,
} from "./application/entities/reservation.entity";
export type { LabSettingKey, LabSettings, LabSettingsSource } from "./application/entities/lab-settings.entity";
export { useDeviceStatus } from "./application/hooks/use-device-status";
export type { DeviceNoDataReason, DeviceStatus } from "./application/hooks/use-device-status";
export { useCurrentReservation, useMyReservations } from "./application/hooks/use-lab-reservations";
export { useLabSettings } from "./application/hooks/use-lab-settings";
export type { UseLabSettingsResult } from "./application/hooks/use-lab-settings";
export { LAB_HOME_COPY, LabHomePage } from "./application/pages/lab-home.page";
