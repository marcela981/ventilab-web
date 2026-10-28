/*
* Funcionalidad: Learning router test helpers
* Descripción: Reactive next/router mock for the learning tests (W3, Bloque 2): a store-backed useRouter (useSyncExternalStore) whose replace updates the query like a shallow navigation, with vi.fn spies for replace and push, an isReady flag and a per-test reset. Use with `vi.mock("next/router", async() => (await import(".../learning-router-test-helpers")).nextRouterMock)`. Test-only. Depends on React and vitest.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useSyncExternalStore } from "react";
import { vi } from "vitest";

type Query = Record<string, string | string[] | undefined>;

type RouterUrl = string | { pathname?: string, query?: Query };

type RouterSnapshot = {
  isReady: boolean
  pathname: string
  query: Query
  replace: (url: RouterUrl, as?: unknown, options?: unknown) => Promise<boolean>
  push: (url: RouterUrl) => Promise<boolean>
};

const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

let snapshot: RouterSnapshot;

const replace = vi.fn((url: RouterUrl): Promise<boolean> => {
  if (typeof url !== "string") {
    snapshot = { ...snapshot, query: url.query ?? {} };
    notify();
  }

  return Promise.resolve(true);
});

const push = vi.fn((): Promise<boolean> => Promise.resolve(true));

snapshot = { isReady: true, pathname: "/learn", query: {}, replace, push };

/** Router of the learning tests; `reset` before each test. */
export const routerStore = {
  replace,
  push,
  reset(query: Query = {}, isReady = true, pathname = "/learn"): void {
    replace.mockClear();
    push.mockClear();
    snapshot = { isReady, pathname, query, replace, push };
    notify();
  },
  setReady(): void {
    snapshot = { ...snapshot, isReady: true };
    notify();
  },
};

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/** Body of the `next/router` mock. */
export const nextRouterMock = {
  useRouter: (): RouterSnapshot => useSyncExternalStore(subscribe, () => snapshot),
};
