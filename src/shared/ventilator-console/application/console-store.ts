/*
* Funcionalidad: Console external store
* Descripción: Low-frequency state of a live ventilator console kept outside React (W2, Bloque 1). A tiny external
*   store (`subscribe` / `getSnapshot` / `set`, notifies only when the snapshot identity changes) read by components
*   through `useStoreSelector` (useSyncExternalStore + a memoised selector + an equality check), so each zone
*   re-renders only when its own slice changes. A `ConsoleAdapterStore` publishes immutable console adapter snapshots:
*   it keeps a stable identity for the whole data source while its snapshots change at most every UI refresh window.
*   `reuseUnchangedSlices` keeps the previous identity of every adapter slice whose content did not change (structural
*   comparison of plain data), so a rebuilt snapshot only invalidates the zones that really changed. `createUiThrottle`
*   publishes at most once per interval with an optional trailing publish (the last values always show), shared by
*   the simulator, the replay and the real ventilator. Depends only on React and the console contract.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useRef, useSyncExternalStore } from "react";
import type { VentilatorConsoleAdapter } from "./ventilator-console.entity";

/** Read side of an external store (the shape `useSyncExternalStore` expects). */
export type ExternalStore<T> = {
  subscribe: (onStoreChange: () => void) => () => void
  getSnapshot: () => T
};

export type WritableStore<T> = ExternalStore<T> & {
  /** Replaces the snapshot; listeners run only when the identity changes. */
  set: (next: T) => void
};

export function createExternalStore<T>(initial: T): WritableStore<T> {
  let snapshot = initial;
  const listeners = new Set<() => void>();

  return {
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    set(next) {
      if (Object.is(next, snapshot)) {
        return;
      }

      snapshot = next;
      [...listeners].forEach((listener) => listener());
    },
  };
}

/** A read-only view of a store: the selected part of its snapshot, with the same subscription. */
export function mapStore<T, S>(store: ExternalStore<T>, select: (snapshot: T) => S): ExternalStore<S> {
  return { subscribe: store.subscribe, getSnapshot: () => select(store.getSnapshot()) };
}

/**
 * The selected slice of an external store. The component re-renders only when `isEqual(previous, next)` is false, so a
 * selector that returns a reused slice (or a primitive) isolates it from every other change of the snapshot.
 */
export function useStoreSelector<T, S>(
  store: ExternalStore<T>,
  selector: (snapshot: T) => S,
  isEqual: (a: S, b: S) => boolean = Object.is,
): S {
  const cacheRef = useRef<{ snapshot: T, selector: (snapshot: T) => S, selection: S } | null>(null);

  // The cache is keyed by snapshot AND selector, so an inline selector that closes over props is never stale; the
  // equality check still keeps the previous selection (and skips the re-render) when its content is the same.
  const getSelection = useCallback((): S => {
    const snapshot = store.getSnapshot();
    const cached = cacheRef.current;

    if (cached !== null && Object.is(cached.snapshot, snapshot) && cached.selector === selector) {
      return cached.selection;
    }

    const next = selector(snapshot);
    const selection = cached !== null && isEqual(cached.selection, next) ? cached.selection : next;

    cacheRef.current = { snapshot, selector, selection };

    return selection;
  }, [store, selector, isEqual]);

  return useSyncExternalStore(store.subscribe, getSelection, getSelection);
}

/** Console adapter published as an external store: stable per data source, immutable snapshots at ≤ 4 Hz. */
export type ConsoleAdapterStore = ExternalStore<VentilatorConsoleAdapter>;

/** Whether the console received a store (live source) or a plain adapter object. */
export function isConsoleAdapterStore(adapter: VentilatorConsoleAdapter | ConsoleAdapterStore): adapter is ConsoleAdapterStore {
  return typeof (adapter as Partial<ConsoleAdapterStore>).getSnapshot === "function";
}

const NO_UNSUBSCRIBE = (): void => undefined;

/** A store that never changes, for a plain adapter object (a new object gives a new store). */
export function staticConsoleStore(adapter: VentilatorConsoleAdapter): ConsoleAdapterStore {
  return { subscribe: () => NO_UNSUBSCRIBE, getSnapshot: () => adapter };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype: unknown = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

/**
 * Structural equality of plain data (numbers, strings, arrays, plain objects); functions and class instances compare
 * by identity. Meant for the small console slices (a dozen metrics, a few short arrays), not for large data.
 */
export function sameData(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }

  if (Array.isArray(a)) {
    return Array.isArray(b) && a.length === b.length && a.every((item, index) => sameData(item, b[index]));
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = Object.keys(a);

    return keys.length === Object.keys(b).length && keys.every((key) => Object.prototype.hasOwnProperty.call(b, key) && sameData(a[key], b[key]));
  }

  return false;
}

/**
 * The next adapter snapshot with every top-level slice (and every frame source field) that did not change taken from
 * the previous one. Returns `previous` itself when nothing changed, so the store does not notify at all.
 */
export function reuseUnchangedSlices(previous: VentilatorConsoleAdapter | null, next: VentilatorConsoleAdapter): VentilatorConsoleAdapter {
  if (previous === null) {
    return next;
  }

  const merged: Record<string, unknown> = {};
  const prior = previous as unknown as Record<string, unknown>;
  let changed = Object.keys(prior).length !== Object.keys(next).length;

  (Object.keys(next) as (keyof VentilatorConsoleAdapter)[]).forEach((key) => {
    const value = next[key];

    if (sameData(prior[key], value)) {
      merged[key] = prior[key];
    } else {
      merged[key] = value;
      changed = true;
    }
  });

  return changed ? (merged as VentilatorConsoleAdapter) : previous;
}

export type UiThrottleTimers = {
  setTimeout: (handler: () => void, ms: number) => unknown
  clearTimeout: (handle: unknown) => void
};

const DEFAULT_TIMERS: UiThrottleTimers = {
  setTimeout: (handler, ms) => setTimeout(handler, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export type UiThrottleOptions = {
  intervalMs: number
  /** Wall clock in ms (default Date.now). */
  now?: (() => number) | undefined
  timers?: UiThrottleTimers | undefined
};

export type UiThrottleRequest = {
  /** Publish now, whatever the time since the last publish (e.g. a status change). */
  force?: boolean
  /** Inside the window, publish once at its end (e.g. new metrics that must show even if no other update comes). */
  trailing?: boolean
};

export type UiThrottle = {
  request: (options?: UiThrottleRequest) => void
  /** Drops the pending trailing publish (cleanup). */
  dispose: () => void
};

/** Publishes at most once per `intervalMs`; a forced request or the trailing publish keeps the last values on screen. */
export function createUiThrottle(publish: () => void, { intervalMs, now = Date.now, timers = DEFAULT_TIMERS }: UiThrottleOptions): UiThrottle {
  let lastMs = Number.NEGATIVE_INFINITY;
  let trailing: unknown = null;
  let disposed = false;

  const clearTrailing = (): void => {
    if (trailing !== null) {
      timers.clearTimeout(trailing);
      trailing = null;
    }
  };

  const run = (wallMs: number): void => {
    lastMs = wallMs;
    clearTrailing();
    publish();
  };

  return {
    request(options = {}) {
      if (disposed) {
        return;
      }

      const wallMs = now();

      if (options.force === true || wallMs - lastMs >= intervalMs) {
        run(wallMs);

        return;
      }

      if (options.trailing === true && trailing === null) {
        trailing = timers.setTimeout(() => {
          trailing = null;

          if (!disposed) {
            run(now());
          }
        }, Math.max(0, intervalMs - (wallMs - lastMs)));
      }
    },
    dispose() {
      disposed = true;
      clearTrailing();
    },
  };
}
