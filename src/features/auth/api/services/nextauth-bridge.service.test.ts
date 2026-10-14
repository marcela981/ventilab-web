/*
* Funcionalidad: NextAuth sign-in bridge tests
* Descripción: Tests of the post-login NextAuth reconciliation: no NextAuth session or the same user -> "synced"; a session of another user is signed out and re-checked ("synced" when it is gone, "mismatch" when it survives); a check that cannot run counts as "mismatch"; and the whole reconciliation (sign-in, sign-out, session checks) never takes longer than the single NEXTAUTH_SYNC_BUDGET_MS cap even when every NextAuth call hangs (fake timers). next-auth/react is mocked. Depends on vitest.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NEXTAUTH_SYNC_BUDGET_MS,
  syncNextAuthAfterGoogleLogin,
  syncNextAuthAfterPasswordLogin,
} from "./nextauth-bridge.service";

const nextAuth = vi.hoisted(() => ({
  signIn: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  signOut: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  getSession: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}));

vi.mock("next-auth/react", () => nextAuth);

const BACKEND_EMAIL = "ana@ventylab.demo";
const CREDENTIALS = { email: BACKEND_EMAIL, password: "VentyLab-Demo-2026" };
const otherSession = { user: { email: "luis@ventylab.demo" } };

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  nextAuth.signIn.mockReset();
  nextAuth.signIn.mockResolvedValue({ ok: true, error: null });
  nextAuth.signOut.mockReset();
  nextAuth.signOut.mockResolvedValue(undefined);
  nextAuth.getSession.mockReset();
  nextAuth.getSession.mockResolvedValue(null);
});

afterEach(() => {
  vi.useRealTimers();
  warn.mockRestore();
});

describe("syncNextAuthAfterPasswordLogin", () => {
  it("is synced when NextAuth holds the same user (case-insensitive)", async() => {
    nextAuth.getSession.mockResolvedValue({ user: { email: "ANA@ventylab.demo" } });

    await expect(syncNextAuthAfterPasswordLogin(CREDENTIALS, BACKEND_EMAIL)).resolves.toBe("synced");
    expect(nextAuth.signOut).not.toHaveBeenCalled();
  });

  it("signs out a session of another user and is synced once it is gone", async() => {
    nextAuth.signIn.mockResolvedValue({ ok: false, error: "CredentialsSignin" });
    nextAuth.getSession.mockResolvedValueOnce(otherSession).mockResolvedValue(null);

    await expect(syncNextAuthAfterPasswordLogin(CREDENTIALS, BACKEND_EMAIL)).resolves.toBe("synced");
  });

  it("reports a mismatch when the other user's session survives the sign-out", async() => {
    nextAuth.signIn.mockRejectedValue(new Error("csrf failed"));
    nextAuth.getSession.mockResolvedValue(otherSession);

    await expect(syncNextAuthAfterPasswordLogin(CREDENTIALS, BACKEND_EMAIL)).resolves.toBe("mismatch");
    expect(nextAuth.signOut).toHaveBeenCalledWith({ redirect: false });
  });

  it("caps the whole reconciliation at one overall budget when every call hangs", async() => {
    vi.useFakeTimers();
    const never = () => new Promise(() => undefined);

    nextAuth.signIn.mockImplementation(never);
    nextAuth.signOut.mockImplementation(never);
    nextAuth.getSession.mockImplementation(never);

    let outcome: string | null = null;

    void syncNextAuthAfterPasswordLogin(CREDENTIALS, BACKEND_EMAIL).then((value) => {
      outcome = value;
    });

    await vi.advanceTimersByTimeAsync(NEXTAUTH_SYNC_BUDGET_MS);

    expect(NEXTAUTH_SYNC_BUDGET_MS).toBe(5_000);
    // Nothing could be verified, so the caller must not open legacy pages.
    expect(outcome).toBe("mismatch");
  });
});

describe("syncNextAuthAfterGoogleLogin", () => {
  it("drops any NextAuth cookie and is synced when no session remains", async() => {
    await expect(syncNextAuthAfterGoogleLogin(BACKEND_EMAIL)).resolves.toBe("synced");
    expect(nextAuth.signIn).not.toHaveBeenCalled();
    expect(nextAuth.signOut).toHaveBeenCalledWith({ redirect: false });
  });

  it("reports a mismatch when another user's session cannot be cleared", async() => {
    nextAuth.getSession.mockResolvedValue(otherSession);

    await expect(syncNextAuthAfterGoogleLogin(BACKEND_EMAIL)).resolves.toBe("mismatch");
  });
});
