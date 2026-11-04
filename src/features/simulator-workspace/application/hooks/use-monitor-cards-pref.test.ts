/*
* Funcionalidad: useMonitorCardsPref tests
* Descripción: The persisted value cards preference: defaults without a stored value, the stored (normalized) value, writes only on setLayout / reset (removeItem), one stable controller per user with separate keys, memory only without a user, a newer stored version neither applied nor overwritten, storage that throws (defaults, no error) and the `storage` event of another tab. v0.1 (Bloque 5, C5): first version. Depends on Vitest, Testing Library and the hook.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CARDS_LAYOUT, MONITOR_CARD_IDS, useStoreSelector } from "@shared/ventilator-console";
import type { MonitorCardsController, MonitorCardsLayout } from "@shared/ventilator-console";
import { monitorCardsStorageKey } from "../entities/monitor-cards-pref.entity";
import { createPersistedCardsController, useMonitorCardsPref } from "./use-monitor-cards-pref";

const selectAll = (layout: MonitorCardsLayout) => layout;
const reversed: MonitorCardsLayout = { order: [...MONITOR_CARD_IDS].reverse(), hidden: ["fio2"] };

function useLayout(controller: MonitorCardsController): MonitorCardsLayout {
  return useStoreSelector(controller, selectAll);
}

let counter = 0;
const freshUser = () => {
  counter += 1;

  return `user-${counter}`;
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("persisted value cards preference", () => {
  it("starts from the defaults and writes only on user actions", () => {
    const key = monitorCardsStorageKey(freshUser());
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const controller = createPersistedCardsController(key);
    const { result } = renderHook(() => useLayout(controller));

    expect(result.current).toEqual(DEFAULT_CARDS_LAYOUT);
    expect(setItem).not.toHaveBeenCalled();

    act(() => controller.setLayout(reversed));
    expect(result.current).toEqual(reversed);
    expect(JSON.parse(window.localStorage.getItem(key) ?? "null")).toEqual({ version: 1, ...reversed, known: MONITOR_CARD_IDS });

    act(() => controller.reset());
    expect(result.current).toEqual(DEFAULT_CARDS_LAYOUT);
    expect(window.localStorage.getItem(key)).toBeNull();
  });

  it("reads the stored preference normalized", () => {
    const key = monitorCardsStorageKey(freshUser());

    window.localStorage.setItem(key, JSON.stringify({ version: 1, order: ["spo2", "spo2", "peakPressure"], hidden: ["spo2"], known: MONITOR_CARD_IDS }));
    const controller = createPersistedCardsController(key);

    // The missing cards go after their catalog neighbour (pao2 after spo2), the stored ones keep their order.
    expect(controller.getSnapshot().order.slice(0, 3)).toEqual(["spo2", "pao2", "paco2"]);
    expect(controller.getSnapshot().order.indexOf("peakPressure")).toBeGreaterThan(0);
    expect(controller.getSnapshot().order).toHaveLength(MONITOR_CARD_IDS.length);
    expect(controller.getSnapshot().hidden).toEqual(["spo2"]);
  });

  it("never overwrites a newer version", () => {
    const key = monitorCardsStorageKey(freshUser());
    const newer = JSON.stringify({ version: 2, layout: "grid" });

    window.localStorage.setItem(key, newer);
    const controller = createPersistedCardsController(key);

    expect(controller.getSnapshot()).toEqual(DEFAULT_CARDS_LAYOUT);
    controller.setLayout(reversed);
    controller.reset();
    expect(window.localStorage.getItem(key)).toBe(newer);
  });

  it("keeps working when the storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const controller = createPersistedCardsController(monitorCardsStorageKey(freshUser()));

    expect(controller.getSnapshot()).toEqual(DEFAULT_CARDS_LAYOUT);
    expect(() => controller.setLayout(reversed)).not.toThrow();
    expect(controller.getSnapshot()).toEqual(reversed);
  });

  it("follows another tab through the storage event", () => {
    const key = monitorCardsStorageKey(freshUser());
    const controller = createPersistedCardsController(key);
    const { result } = renderHook(() => useLayout(controller));

    window.localStorage.setItem(key, JSON.stringify({ version: 1, ...reversed, known: MONITOR_CARD_IDS }));
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key }));
    });
    expect(result.current).toEqual(reversed);
  });
});

describe("useMonitorCardsPref", () => {
  it("gives one stable controller per user and a memory one without a user", () => {
    const user = freshUser();
    const { result, rerender } = renderHook(({ id }: { id: string | null }) => useMonitorCardsPref(id), { initialProps: { id: user as string | null } });
    const first = result.current;

    rerender({ id: user });
    expect(result.current).toBe(first);

    act(() => first.setLayout(reversed));
    expect(window.localStorage.getItem(monitorCardsStorageKey(user))).not.toBeNull();

    rerender({ id: null });
    const memory = result.current;

    expect(memory).not.toBe(first);
    act(() => memory.setLayout(reversed));
    expect(memory.getSnapshot()).toEqual(reversed);
    expect(window.localStorage.length).toBe(1);

    rerender({ id: freshUser() });
    expect(result.current.getSnapshot()).toEqual(DEFAULT_CARDS_LAYOUT);
  });
});
