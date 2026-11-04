/*
* Funcionalidad: Monitor value cards preference
* Descripción: Pure model of the per-user preference of the July value cards (DISENO_BLOQUE5 §6.7, D27: one preference for Digital and Real, nothing hidden by default): `{ version: 1, order, hidden, known }` stored under `ventylab.monitor.cards.v1.<userId>`, where `known` is the card catalog at save time, so a card added to the catalog later is told apart from one the user kept. `normalizeCardsPref(raw, catalog)` turns whatever is stored into a valid preference: not JSON, not an object, no version or a version below 1 → defaults; a NEWER version → defaults and `writable: false` (that preference belongs to a newer app and must not be overwritten); ids that are not in the catalog and duplicates are dropped; a catalog id missing from the order is inserted right after its previous catalog neighbour that is present (at the start when none), visible unless the user hid it while it was known. A future v2 reads the v1 key once, migrates it with its own migrateV1 and removes the v1 key (the key carries the version). Also the conversion to and from the console layout (order + hidden). v0.1 (Bloque 5, C5): first version. Depends on the ventilator-console card catalog.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { MONITOR_CARD_IDS } from "@shared/ventilator-console";
import type { MonitorCardId, MonitorCardsLayout } from "@shared/ventilator-console";

export const MONITOR_CARDS_PREF_VERSION = 1;

export type MonitorCardsPrefV1 = {
  version: 1
  order: readonly MonitorCardId[]
  hidden: readonly MonitorCardId[]
  known: readonly MonitorCardId[]
};

export type NormalizedCardsPref = {
  pref: MonitorCardsPrefV1
  /** false: the stored value belongs to a newer version and is left untouched. */
  writable: boolean
};

export function monitorCardsStorageKey(userId: string): string {
  return `ventylab.monitor.cards.v1.${userId}`;
}

export function defaultCardsPref(catalog: readonly MonitorCardId[] = MONITOR_CARD_IDS): MonitorCardsPrefV1 {
  return { version: MONITOR_CARDS_PREF_VERSION, order: [...catalog], hidden: [], known: [...catalog] };
}

function parse(raw: unknown): unknown {
  if (typeof raw !== "string") {
    return raw;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/** Catalog ids of a stored list, in its order, without duplicates; anything else is dropped. */
function cleanIds(value: unknown, catalog: ReadonlySet<string>): MonitorCardId[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();

  return value.filter((id): id is MonitorCardId => typeof id === "string" && catalog.has(id) && !seen.has(id) && Boolean(seen.add(id)));
}

/** Any stored value (JSON string or object) → a valid v1 preference for this catalog. */
export function normalizeCardsPref(raw: unknown, catalog: readonly MonitorCardId[] = MONITOR_CARD_IDS): NormalizedCardsPref {
  const value = parse(raw);
  const defaults = { pref: defaultCardsPref(catalog), writable: true };

  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return defaults;
  }

  const record = value as Record<string, unknown>;
  const version = record.version;

  if (typeof version !== "number" || !Number.isFinite(version) || version < MONITOR_CARDS_PREF_VERSION) {
    return defaults;
  }

  if (version > MONITOR_CARDS_PREF_VERSION) {
    return { pref: defaultCardsPref(catalog), writable: false };
  }

  const ids = new Set<string>(catalog);
  const order = cleanIds(record.order, ids);
  const known = new Set(cleanIds(record.known, ids));
  const hiddenStored = cleanIds(record.hidden, ids);
  const present = new Set(order);

  // A card the order lacks goes right after its previous catalog neighbour that is present (at the start without one).
  catalog.forEach((id, catalogIndex) => {
    if (present.has(id)) {
      return;
    }

    const previous = catalog.slice(0, catalogIndex).reverse().find((candidate) => present.has(candidate));
    const at = previous === undefined ? 0 : order.indexOf(previous) + 1;

    order.splice(at, 0, id);
    present.add(id);
  });

  // A card that was not known yet starts visible; the user's choice holds for the known ones.
  const hidden = hiddenStored.filter((id) => known.has(id));

  return { pref: { version: MONITOR_CARDS_PREF_VERSION, order, hidden, known: [...catalog] }, writable: true };
}

export function prefToLayout(pref: MonitorCardsPrefV1): MonitorCardsLayout {
  return { order: pref.order, hidden: pref.hidden };
}

export function layoutToPref(layout: MonitorCardsLayout, catalog: readonly MonitorCardId[] = MONITOR_CARD_IDS): MonitorCardsPrefV1 {
  return normalizeCardsPref({ version: MONITOR_CARDS_PREF_VERSION, order: layout.order, hidden: layout.hidden, known: catalog }, catalog).pref;
}
