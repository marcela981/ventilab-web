/*
* Funcionalidad: Vitest jsdom environment with native AbortSignal
* Descripción: Wraps the built-in Vitest jsdom environment and puts Node's native AbortController/AbortSignal back on the global after jsdom is installed (same idea as jest-fixed-jsdom). jsdom replaces them with its own classes; the fetch of Node 24 (undici 7), used by msw's interceptor, rejects a jsdom AbortSignal with "RequestInit: Expected signal to be an instance of AbortSignal", so every SSE/streaming test that passes a signal to fetch failed outside Node 22. Test infrastructure only. Depends on vitest.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { Environment } from "vitest/environments";
import { builtinEnvironments } from "vitest/environments";

const jsdom = builtinEnvironments.jsdom;

const NATIVE_KEYS = ["AbortController", "AbortSignal"] as const;

const jsdomNativeAbort: Environment = {
  ...jsdom,
  name: "jsdom-native-abort",
  async setup(global, options) {
    const natives = Object.fromEntries(NATIVE_KEYS.map((key) => [key, globalThis[key]]));
    const result = await jsdom.setup(global, options);
    for (const key of NATIVE_KEYS) {
      Object.defineProperty(global, key, { value: natives[key], writable: true, configurable: true });
    }
    return result;
  },
};

export default jsdomNativeAbort;
