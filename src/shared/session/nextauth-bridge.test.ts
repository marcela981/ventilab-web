/*
* Funcionalidad: NextAuth coexistence bridge tests
* Descripción: Fake-timer tests of runNextAuthBestEffort: a NextAuth call that never settles is abandoned after the timeout and resolves to `undefined` with one warning, a resolved call returns its value, and an exhausted budget (timeout <= 0) skips the call. next-auth/react is mocked. Depends on vitest.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NEXTAUTH_BRIDGE_TIMEOUT_MS, runNextAuthBestEffort } from "./nextauth-bridge";

const nextAuth = vi.hoisted(() => ({
  signIn: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}));

vi.mock("next-auth/react", () => nextAuth);

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  nextAuth.signIn.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  warn.mockRestore();
});

describe("runNextAuthBestEffort", () => {
  it("gives up on a sign-in that never resolves once the timeout elapses", async() => {
    vi.useFakeTimers();
    nextAuth.signIn.mockImplementation(() => new Promise(() => undefined));

    let settled = false;
    const result = runNextAuthBestEffort("sign-in", (client) => client.signIn("credentials", { redirect: false }))
      .then((value) => {
        settled = true;

        return value;
      });

    await vi.advanceTimersByTimeAsync(NEXTAUTH_BRIDGE_TIMEOUT_MS - 1);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toBeUndefined();
    expect(nextAuth.signIn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[1])).toContain("timed out");
  });

  it("returns the value of a call that resolves in time", async() => {
    nextAuth.signIn.mockResolvedValue({ ok: true, error: null });

    await expect(runNextAuthBestEffort("sign-in", (client) => client.signIn("credentials")))
      .resolves.toEqual({ ok: true, error: null });
    expect(warn).not.toHaveBeenCalled();
  });

  it("skips the call when no time budget is left", async() => {
    await expect(runNextAuthBestEffort("sign-in", (client) => client.signIn("credentials"), 0)).resolves.toBeUndefined();
    expect(nextAuth.signIn).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
