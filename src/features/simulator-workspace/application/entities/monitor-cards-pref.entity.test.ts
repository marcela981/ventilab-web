/*
* Funcionalidad: Monitor value cards preference tests
* Descripción: normalizeCardsPref and the layout conversion: defaults for anything that is not a v1 preference (not JSON, not an object, missing or old version), a newer version read as defaults and not writable, unknown and duplicate ids dropped, a new catalog card inserted after its previous neighbour and visible, the hidden cards of known ids kept, and the per-user key. v0.1 (Bloque 5, C5): first version. v0.2 (Bloque A): a preference saved before the heart rate card gets FC at the end of the vitals, visible, with the user's order and hidden cards kept. Depends on Vitest and the preference entity.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { MONITOR_CARD_IDS } from "@shared/ventilator-console";
import type { MonitorCardId } from "@shared/ventilator-console";
import { defaultCardsPref, layoutToPref, monitorCardsStorageKey, normalizeCardsPref, prefToLayout } from "./monitor-cards-pref.entity";

const CATALOG: readonly MonitorCardId[] = ["peakPressure", "meanPressure", "totalPeep", "spo2"];

describe("normalizeCardsPref", () => {
  it("uses the defaults for anything that is not a v1 preference", () => {
    const defaults = { pref: defaultCardsPref(CATALOG), writable: true };

    expect(normalizeCardsPref("{not json", CATALOG)).toEqual(defaults);
    expect(normalizeCardsPref("[1,2]", CATALOG)).toEqual(defaults);
    expect(normalizeCardsPref(null, CATALOG)).toEqual(defaults);
    expect(normalizeCardsPref({ order: ["spo2"] }, CATALOG)).toEqual(defaults);
    expect(normalizeCardsPref({ version: 0, order: ["spo2"] }, CATALOG)).toEqual(defaults);
    expect(defaultCardsPref(CATALOG)).toEqual({ version: 1, order: CATALOG, hidden: [], known: CATALOG });
  });

  it("does not take over a newer version", () => {
    expect(normalizeCardsPref(JSON.stringify({ version: 2, cards: [] }), CATALOG)).toEqual({ pref: defaultCardsPref(CATALOG), writable: false });
  });

  it("drops unknown and duplicate ids and keeps the order and hidden cards of the user", () => {
    const { pref, writable } = normalizeCardsPref(
      JSON.stringify({ version: 1, order: ["spo2", "gone", "totalPeep", "spo2", "meanPressure", "peakPressure", 3], hidden: ["totalPeep", "gone", "totalPeep"], known: CATALOG }),
      CATALOG,
    );

    expect(writable).toBe(true);
    expect(pref).toEqual({ version: 1, order: ["spo2", "totalPeep", "meanPressure", "peakPressure"], hidden: ["totalPeep"], known: CATALOG });
  });

  it("inserts a new catalog card after its previous neighbour, visible", () => {
    const { pref } = normalizeCardsPref(
      { version: 1, order: ["totalPeep", "peakPressure", "spo2"], hidden: ["meanPressure"], known: ["peakPressure", "totalPeep", "spo2"] },
      CATALOG,
    );

    expect(pref.order).toEqual(["totalPeep", "peakPressure", "meanPressure", "spo2"]);
    expect(pref.hidden).toEqual([]);

    expect(normalizeCardsPref({ version: 1, order: ["spo2"], hidden: [], known: ["spo2"] }, CATALOG).pref.order).toEqual(["peakPressure", "meanPressure", "totalPeep", "spo2"]);
  });

  it("migrates a preference saved before the heart rate card: FC lands after PCO2, visible (Bloque A)", () => {
    const before = MONITOR_CARD_IDS.filter((id) => id !== "hr");
    const userOrder = ["spo2", ...before.filter((id) => id !== "spo2")];
    const { pref, writable } = normalizeCardsPref(JSON.stringify({ version: 1, order: userOrder, hidden: ["fio2"], known: before }));

    expect(writable).toBe(true);
    expect(MONITOR_CARD_IDS.at(-1)).toBe("hr");
    expect(pref.order).toEqual([...userOrder, "hr"]);
    expect(pref.hidden).toEqual(["fio2"]);
  });

  it("converts to and from the console layout and keys the preference per user", () => {
    const pref = layoutToPref({ order: [...MONITOR_CARD_IDS].reverse(), hidden: ["fio2"] });

    expect(pref.known).toEqual(MONITOR_CARD_IDS);
    expect(prefToLayout(pref)).toEqual({ order: [...MONITOR_CARD_IDS].reverse(), hidden: ["fio2"] });
    expect(monitorCardsStorageKey("u-1")).toBe("ventylab.monitor.cards.v1.u-1");
  });
});
