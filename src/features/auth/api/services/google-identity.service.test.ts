/*
* Funcionalidad: Google Identity Services loader tests
* Descripción: Tests of loadGoogleIdentity: resolves with the API after the script loads, rejects and removes the script tag when it fails to load, loads without exposing the API or times out (10 s, fake timers), and a retry after any failure appends exactly one new script. The module is re-imported per test because it keeps the in-flight load. Depends on vitest and jsdom.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type LoaderModule = typeof import("./google-identity.service");

const googleApi = { initialize: vi.fn(), renderButton: vi.fn(), cancel: vi.fn() };

async function importLoader(): Promise<LoaderModule> {
  vi.resetModules();

  return import("./google-identity.service");
}

function scripts(loader: LoaderModule): HTMLScriptElement[] {
  return Array.from(document.querySelectorAll<HTMLScriptElement>(`script[src="${loader.GOOGLE_IDENTITY_SCRIPT_URL}"]`));
}

function exposeApi() {
  (window as unknown as { google?: unknown }).google = { accounts: { id: googleApi } };
}

beforeEach(() => {
  document.head.innerHTML = "";
  delete (window as unknown as { google?: unknown }).google;
});

afterEach(() => {
  vi.useRealTimers();
  delete (window as unknown as { google?: unknown }).google;
});

describe("loadGoogleIdentity", () => {
  it("resolves with google.accounts.id once the script loads", async() => {
    const loader = await importLoader();
    const result = loader.loadGoogleIdentity();

    expect(scripts(loader)).toHaveLength(1);
    exposeApi();
    scripts(loader)[0]?.dispatchEvent(new Event("load"));

    await expect(result).resolves.toBe(googleApi);
  });

  it("rejects and removes the script tag when the script fails to load", async() => {
    const loader = await importLoader();
    const result = loader.loadGoogleIdentity();

    scripts(loader)[0]?.dispatchEvent(new Event("error"));

    await expect(result).rejects.toThrow("could not be loaded");
    expect(scripts(loader)).toHaveLength(0);
  });

  it("rejects and removes the script tag when it loads without the API", async() => {
    const loader = await importLoader();
    const result = loader.loadGoogleIdentity();

    scripts(loader)[0]?.dispatchEvent(new Event("load"));

    await expect(result).rejects.toThrow("did not initialize");
    expect(scripts(loader)).toHaveLength(0);
  });

  it("times out after 10 seconds and removes the script tag", async() => {
    vi.useFakeTimers();
    const loader = await importLoader();
    const result = loader.loadGoogleIdentity();
    const assertion = expect(result).rejects.toThrow("timed out");

    await vi.advanceTimersByTimeAsync(loader.GOOGLE_IDENTITY_LOAD_TIMEOUT_MS);

    await assertion;
    expect(loader.GOOGLE_IDENTITY_LOAD_TIMEOUT_MS).toBe(10_000);
    expect(scripts(loader)).toHaveLength(0);
  });

  it("appends exactly one new script on a retry after a failure", async() => {
    const loader = await importLoader();
    const first = loader.loadGoogleIdentity();

    scripts(loader)[0]?.dispatchEvent(new Event("error"));
    await expect(first).rejects.toThrow();

    const retry = loader.loadGoogleIdentity();

    expect(scripts(loader)).toHaveLength(1);
    expect(loader.loadGoogleIdentity()).toBe(retry);
    exposeApi();
    scripts(loader)[0]?.dispatchEvent(new Event("load"));

    await expect(retry).resolves.toBe(googleApi);
    expect(scripts(loader)).toHaveLength(1);
  });
});
