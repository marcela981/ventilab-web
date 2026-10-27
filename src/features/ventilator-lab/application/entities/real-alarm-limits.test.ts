/*
* Funcionalidad: Real ventilator alarm limits tests
* Descripción: The client alarm limits of the real console (W10, Bloque 1): defaults, applying the panel changes
*   (unchanged identity without changes), the alarms raised by crossing each limit with their onset time kept while
*   active, nothing without metrics, and the merge that shows a device alarm of the same type once. Depends on vitest.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { EMPTY_BREATH_METRICS } from "./breath-detection";
import type { BreathMetrics } from "./breath-detection";
import { applyAlarmLimitChanges, DEFAULT_REAL_ALARM_LIMITS, evaluateAlarmLimits } from "./real-alarm-limits";
import { mergeConsoleAlarms } from "./telemetry-alarms";

const metrics = (overrides: Partial<BreathMetrics>): BreathMetrics => ({ ...EMPTY_BREATH_METRICS, ...overrides });

describe("real alarm limits", () => {
  it("applies the panel changes and keeps the list when nothing changes", () => {
    const changed = applyAlarmLimitChanges(DEFAULT_REAL_ALARM_LIMITS, [{ id: "highPressure", value: 30 }]);

    expect(changed.find((limit) => limit.id === "highPressure")?.value).toBe(30);
    expect(applyAlarmLimitChanges(DEFAULT_REAL_ALARM_LIMITS, [{ id: "unknown", value: 1 }])).toBe(DEFAULT_REAL_ALARM_LIMITS);
  });

  it("raises an alarm per crossed limit and keeps its onset while active", () => {
    const first = evaluateAlarmLimits(DEFAULT_REAL_ALARM_LIMITS, metrics({ peakPressure: 45, exhaledTidalVolume: 150, respiratoryRate: 40 }), 1000);

    expect(first.map((alarm) => [alarm.type, alarm.priority])).toEqual([
      ["HIGH_PRESSURE", "high"],
      ["LOW_VOLUME", "medium"],
      ["HIGH_RESPIRATORY_RATE", "medium"],
    ]);
    expect(first[0]?.message).toBe("Presión pico alta: 45 cmH2O (límite 40)");

    const later = evaluateAlarmLimits(DEFAULT_REAL_ALARM_LIMITS, metrics({ peakPressure: 50 }), 2000, first);

    expect(later).toHaveLength(1);
    expect(later[0]?.since).toBe(1000);
  });

  it("raises nothing without metrics or inside the limits", () => {
    expect(evaluateAlarmLimits(DEFAULT_REAL_ALARM_LIMITS, EMPTY_BREATH_METRICS, 0)).toEqual([]);
    expect(evaluateAlarmLimits(DEFAULT_REAL_ALARM_LIMITS, metrics({ peakPressure: 20, exhaledTidalVolume: 450, respiratoryRate: 14 }), 0)).toEqual([]);
  });

  it("shows a limit alarm after the device ones unless the device raised that type", () => {
    const limit = evaluateAlarmLimits(DEFAULT_REAL_ALARM_LIMITS, metrics({ peakPressure: 45, respiratoryRate: 40 }), 0);
    const device = [{ id: "device:HIGH_PRESSURE", type: "HIGH_PRESSURE", priority: "high" as const, message: "Presión alta", since: 0 }];

    expect(mergeConsoleAlarms(device, [], null, limit).map((alarm) => alarm.id)).toEqual(["device:HIGH_PRESSURE", "limit:highRespiratoryRate"]);
  });
});
