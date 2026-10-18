/*
* Funcionalidad: Legacy session-expiry handler tests
* Descripción: Tests of the legacy handleSessionExpired as a coexistence adapter: it clears BOTH backend tokens through the shared token-storage clearTokens() (so the new backend session is notified) plus the legacy user data, and it acts only once when called twice (one auth:logout event, one token notification). v1.1 (B3.4, D4): NextAuth removed, no signOut mock. The module is re-imported per test to reset its idempotency flag. Depends on vitest and the legacy/new token modules.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadModules() {
  vi.resetModules();

  const tokenStorage = await import("@shared/api-client/token-storage");
  const { authEvents } = await import("@/shared/services/authEvents");
  const { handleSessionExpired } = await import("@/shared/services/sessionExpired");

  return { tokenStorage, authEvents, handleSessionExpired };
}

describe("legacy handleSessionExpired", () => {
  beforeEach(() => {
    window.localStorage.clear();
    // On the login page the handler never navigates (jsdom has no navigation).
    window.history.replaceState(null, "", "/auth/login");
  });

  afterEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/");
  });

  it("clears both backend tokens and the legacy user data, notifying token subscribers", async () => {
    const { tokenStorage, handleSessionExpired } = await loadModules();
    const listener = vi.fn();

    tokenStorage.saveTokens("access-token", "refresh-token");
    window.localStorage.setItem("ventilab_user_data", JSON.stringify({ id: "u1" }));
    const unsubscribe = tokenStorage.subscribeTokens(listener);

    handleSessionExpired("token_refresh_failed");

    expect(window.localStorage.getItem(tokenStorage.ACCESS_TOKEN_KEY)).toBeNull();
    expect(window.localStorage.getItem(tokenStorage.REFRESH_TOKEN_KEY)).toBeNull();
    expect(window.localStorage.getItem("ventilab_user_data")).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ accessToken: null, refreshToken: null });

    unsubscribe();
  });

  it("acts only once when called twice", async () => {
    const { tokenStorage, authEvents, handleSessionExpired } = await loadModules();
    const tokenListener = vi.fn();
    const logoutListener = vi.fn();

    tokenStorage.saveTokens("access-token", "refresh-token");
    const unsubscribeTokens = tokenStorage.subscribeTokens(tokenListener);
    const unsubscribeLogout = authEvents.on("auth:logout", logoutListener);

    handleSessionExpired("token_refresh_failed");
    handleSessionExpired("socket_auth_error");

    expect(tokenListener).toHaveBeenCalledTimes(1);
    expect(logoutListener).toHaveBeenCalledTimes(1);
    expect(logoutListener).toHaveBeenCalledWith({ reason: "token_refresh_failed" });

    unsubscribeTokens();
    unsubscribeLogout();
  });
});
