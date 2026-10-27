/*
* Funcionalidad: Ventilator lab public API
* Descripción: Public surface of the ventilator-lab feature (real ventilator: reservations, live console, control, commands, recordings): the lab routes, the summary page, the reservation, device status and lab settings hooks and their entity types. v1.1 (T2): the reservations page (calendar + create) and the create request and conflict types. Later tasks add the live console and recordings pages. Depends on the feature modules it re-exports. v1.2 (T5): the real-ventilator live console adapter hook and its option type. v1.3 (T6): the live console page; the adapter hook is no longer exported here, because every /lab page imports this index and the adapter statically reaches the shared ventilator console (it is loaded only through the lazy live console of /lab/live). v1.4 (T11): the recordings list and recording playback pages (the player is lazy loaded by the playback page). v1.5 (T12): the legacy /simulador redirect helper (legacyLabRedirect) used by pages/simulador/index.js. v1.6 (B3.8, D5): the /simulador redirect moved to config/legacy-redirects.mjs (next.config redirects); legacyLabRedirect is gone. v1.7 (W4, Bloque 1): the summary and live pages moved to home.entry and live.entry (lazy loaded by the /simulador tabs without this barrel).
* Versión: 1.7
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
export { LAB_RESERVATIONS_COPY, LabReservationsPage } from "./application/pages/lab-reservations.page";
export type { CreateReservationRequest, ReservationConflict } from "./application/entities/create-reservation.entity";
export { LabRecordingsPage } from "./application/pages/lab-recordings.page";
export { LAB_RECORDING_COPY, LabRecordingPage } from "./application/pages/lab-recording.page";
export type { LabRecordingPageProps } from "./application/pages/lab-recording.page";
export { RECORDINGS_COPY } from "./application/entities/recordings-list.entity";
