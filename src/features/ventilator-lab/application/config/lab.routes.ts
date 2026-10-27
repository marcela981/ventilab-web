/*
* Funcionalidad: Ventilator lab routes
* Descripción: URLs of the ventilator lab pages declared in routes.config (every authenticated role): summary /lab, reservations /lab/reservations, live console /lab/live, recordings /lab/recordings and the playback of one recording /lab/recordings/[recordingId] (the recording id is the reservation id). No dependencies. v1.1 (W1 Bloque 1): the summary and the live console are tabs of the unified simulator workspace: LAB_URL → /simulador?tab=conexion and LAB_LIVE_URL → /simulador?tab=monitoreo (their /lab and /lab/live pages are gone and redirect there); reservations and recordings keep their /lab/** pages.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

const LAB_PAGES_URL = "/lab";

/** Conexión tab of the unified simulator workspace (device status and reservations summary). */
export const LAB_URL = "/simulador?tab=conexion";
/** Monitoreo tab of the unified simulator workspace (live console of the real ventilator). */
export const LAB_LIVE_URL = "/simulador?tab=monitoreo";
export const LAB_RESERVATIONS_URL = `${LAB_PAGES_URL}/reservations`;
export const LAB_RECORDINGS_URL = `${LAB_PAGES_URL}/recordings`;

export function buildRecordingUrl(recordingId: string): string {
  return `${LAB_RECORDINGS_URL}/${encodeURIComponent(recordingId)}`;
}
