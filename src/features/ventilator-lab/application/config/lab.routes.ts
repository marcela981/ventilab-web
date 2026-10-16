/*
* Funcionalidad: Ventilator lab routes
* Descripción: URLs of the ventilator lab pages declared in routes.config (every authenticated role): summary /lab, reservations /lab/reservations, live console /lab/live, recordings /lab/recordings and the playback of one recording /lab/recordings/[recordingId] (the recording id is the reservation id). No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const LAB_URL = "/lab";
export const LAB_RESERVATIONS_URL = `${LAB_URL}/reservations`;
export const LAB_LIVE_URL = `${LAB_URL}/live`;
export const LAB_RECORDINGS_URL = `${LAB_URL}/recordings`;

export function buildRecordingUrl(recordingId: string): string {
  return `${LAB_RECORDINGS_URL}/${encodeURIComponent(recordingId)}`;
}
