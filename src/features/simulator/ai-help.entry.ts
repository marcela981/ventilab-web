/*
* Funcionalidad: Simulator AI help entry point
* Descripción: Public entry point of the simulator AI help for the real monitor of /simulador (Bloque A): the lazy
*   "¿Cómo estabilizar?" alarm help panel with the real-mode request builders (POST /api/simulation/real/alarm-help
*   and /assist with the monitor state the client sends) and the lazy "Asesoría IA" launcher of the real monitor. The
*   panels and the launcher load on demand, so importing this entry does not bring the console or the AI conversation
*   UI into the caller's chunk. Depends on React and the simulator application layer.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { realAlarmHelpRequest, realAssistRequest } from "./api/services/simulation-alarm-help.service";
export type { RealMonitorStateDTO } from "./api/services/simulation-alarm-help.service";
export { AlarmHelpPanel } from "./application/components/lazy-alarm-help-panel";
export { RealAssistLauncher } from "./application/components/lazy-real-assist-launcher";
export type { RealAssistLauncherProps } from "./application/components/lazy-real-assist-launcher";
export type { AlarmHelpPanelProps } from "./application/components/alarm-help-panel";
