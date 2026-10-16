/*
* Funcionalidad: Vendored lab setting defaults
* Descripción: GENERATED — do not edit; run node scripts/sync-lab-settings.mjs. Default value of each lab platform setting, extracted from the class defaults of EnvironmentVariables in ventylab-server/src/common/infrastructure/config/env.validation.ts (the backend reads these settings from those variables). Used only when the caller may not read GET /api/platform-settings (settings:manage); the backend stays the authority and its 4xx responses are shown.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const VENDORED_LAB_SETTING_DEFAULTS = {
  "reservations.slotMinutes": 15, // RESERVATION_SLOT_MINUTES
  "reservations.maxDurationMinutes": 120, // RESERVATION_MAX_DURATION_MINUTES
  "reservations.maxAdvanceDays": 14, // RESERVATION_MAX_ADVANCE_DAYS
  "reservations.maxUpcomingPerStudent": 3, // RESERVATION_MAX_FUTURE_PER_STUDENT
  "reservations.maxUpcomingPerGroup": 5, // RESERVATION_MAX_FUTURE_PER_GROUP
  "telemetry.staleAfterMs": 2000, // VENTILATOR_STALE_AFTER_MS
  "commands.ratePerSecond": 5, // VENTILATOR_COMMAND_RATE_PER_SECOND
  "commands.ackTimeoutMs": 3000, // VENTILATOR_COMMAND_TIMEOUT_MS
  "commands.safety.maxPeep": 15, // VENTILATOR_SAFETY_MAX_PEEP
  "commands.safety.maxPressureLimit": 40, // VENTILATOR_SAFETY_MAX_PRESSURE_LIMIT
  "commands.safety.maxTidalVolume": 700, // VENTILATOR_SAFETY_MAX_TIDAL_VOLUME
  "commands.safety.maxRespiratoryRate": 35, // VENTILATOR_SAFETY_MAX_RESPIRATORY_RATE
  "commands.safety.maxIeRatio": 1, // VENTILATOR_SAFETY_MAX_IE_RATIO
} as const;

export type LabSettingKey = keyof typeof VENDORED_LAB_SETTING_DEFAULTS;
