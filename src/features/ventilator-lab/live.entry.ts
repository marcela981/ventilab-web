/*
* Funcionalidad: Ventilator lab live entry point
* Descripción: Public entry point of the live lab page (W4, Bloque 1), lazy loaded by the Monitoreo tab of /simulador
*   without the rest of the lab barrel. Depends on the ventilator-lab application layer.
*   v0.2 (W10, Bloque 1): the pieces of the real monitor of the Monitoreo tab: the LAZY live console (shared console,
*   waveforms and real adapter stay in their own chunk), the device status, the stale telemetry timer, the server clock
*   and telemetry latency hooks with the latency thresholds and level, the session recording hook, toggle and REC mark,
*   and the operator control copy.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { LAB_LIVE_COPY, LabLivePage } from "./application/pages/lab-live.page";
export { LazyLiveConsole, LIVE_CONSOLE_LOADING_LABEL } from "./application/components/lazy-live-console";
export type { LiveConsoleProps } from "./application/components/live-console";
export { RecIndicator, RecordingControl } from "./application/components/recording-control";
export { CONTROL_COPY } from "./application/entities/operator-control.entity";
export { RECORDING_COPY } from "./application/entities/session-recording.entity";
export { LATENCY_THRESHOLD_MS, LATENCY_WARNING_MS, latencyLevel } from "./application/entities/telemetry-latency";
export type { LatencyLevel, LatencySnapshot } from "./application/entities/telemetry-latency";
export { useDeviceStatus } from "./application/hooks/use-device-status";
export type { DeviceStatus } from "./application/hooks/use-device-status";
export { useLabSettings } from "./application/hooks/use-lab-settings";
export { useSessionRecording } from "./application/hooks/use-session-recording";
export type { SessionRecording } from "./application/hooks/use-session-recording";
export { useServerClockOffset, useTelemetryLatency } from "./application/hooks/use-telemetry-latency";
export type { ServerClock } from "./application/hooks/use-telemetry-latency";
export { useTelemetryStale } from "./application/hooks/use-telemetry-stale";
