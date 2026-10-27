/*
* Funcionalidad: Login page tests
* Descripción: Integration tests of the login page with the real backend session (AuthProvider) and MSW: local login posts the credentials and navigates to the role home or a safe returnTo, each backend error code shows its Spanish message, the Google ID token from Google Identity Services is posted to /api/auth/google, an authenticated visitor is redirected to the home of their role, the Google button is disabled without a client ID and an expired session shows a notice. v1.1: the best-effort NextAuth bridge (next-auth/react mocked): a local login signs in to NextAuth after establishSession and before the redirect, a bridge failure still redirects, and Google login never calls it (it only clears a stale NextAuth cookie). v1.2 (T9 follow-up): NextAuth session reconciliation (same user or none -> redirect; another user's session cleared -> redirect; persisting -> Spanish error, backend session signed out, no redirect, for local and Google logins), redirect loop guard (a bounced returnTo falls back to the role home; a bounced role home stops with an error and a sign-out button) and a staff-only returnTo for a student -> role home. v1.3 (T12): while a login is pending "Iniciar sesión" keeps its label, is disabled and aria-busy with a spinner (no "Iniciando sesión…" text). Depends on vitest, Testing Library, MSW, next/router (mocked) and the hard navigation helper (mocked). v1.4 (O5): role homes are /me for students and /teacher for staff. v1.5 (B3.4, D4): NextAuth removed: the bridge and reconciliation tests and the next-auth/react mock are gone. v1.6 (W1 Bloque 1): the role home of every role is /simulador.
* Versión: 1.6
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getAccessToken, getRefreshToken, saveTokens } from "@shared/api-client/token-storage";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { AuthProvider } from "@shared/session/auth-provider";
import type { Role } from "@shared/session/session.entity";
import { REDIRECT_HISTORY_KEY } from "../entities/redirect-loop-guard";
import { LoginPage } from "./login.page";

const router = vi.hoisted(() => ({
  query: {} as Record<string, string | string[]>,
  isReady: true,
  asPath: "/auth/login",
  pathname: "/auth/login",
  replace: vi.fn(() => Promise.resolve(true)),
  push: vi.fn(() => Promise.resolve(true)),
  prefetch: vi.fn(() => Promise.resolve()),
}));

const navigation = vi.hoisted(() => ({ navigateTo: vi.fn() }));

vi.mock("next/router", () => ({ useRouter: () => router }));
vi.mock("../hooks/navigation", () => navigation);

const url = (path: string): string => `${BACKEND_ORIGIN}${path}`;

const envelope = (data: unknown) => ({
  success: true,
  message: null,
  data,
  code: null,
  timestamp: "2026-10-14T00:00:00.000Z",
  traceId: "trace-ok",
  pagination: null,
});

const errorResponse = (code: string, status: number, headers: Record<string, string> = {}) =>
  HttpResponse.json(
    {
      success: false,
      message: code,
      data: null,
      code,
      timestamp: "2026-10-14T00:00:00.000Z",
      traceId: "trace-error",
      pagination: null,
    },
    { status, headers },
  );

let currentRole: Role = "STUDENT";
let loginBodies: unknown[] = [];
let googleBodies: unknown[] = [];

const user = () => ({ id: "u1", email: "ana@ventylab.demo", name: "Ana", image: null, role: currentRole });

const loginResponse = () =>
  HttpResponse.json(envelope({ accessToken: "access-1", refreshToken: "refresh-1", userId: "u1", user: user() }));

const server = setupServer(
  http.get(url("/api/auth/me"), () => HttpResponse.json(envelope({ user: user(), permissions: [] }))),
  http.post(url("/api/auth/login"), async({ request }) => {
    loginBodies.push(await request.json());

    return loginResponse();
  }),
  http.post(url("/api/auth/google"), async({ request }) => {
    googleBodies.push(await request.json());

    return loginResponse();
  }),
  http.post(url("/api/auth/logout"), () => HttpResponse.json(envelope(null))),
);

type GoogleCallback = (response: { credential: string }) => void;

let googleCallback: GoogleCallback | null = null;
const googleIdentity = {
  initialize: vi.fn((config: { callback: GoogleCallback }) => {
    googleCallback = config.callback;
  }),
  renderButton: vi.fn(),
  cancel: vi.fn(),
};

function renderLogin() {
  return render(
    <AuthProvider>
      <LoginPage />
    </AuthProvider>,
  );
}

function fillAndSubmit(email = "ana@ventylab.demo", password = "VentyLab-Demo-2026") {
  fireEvent.change(screen.getByLabelText(/correo electrónico/i), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/^contraseña/i), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  currentRole = "STUDENT";
  loginBodies = [];
  googleBodies = [];
  googleCallback = null;
  router.query = {};
  router.isReady = true;
  navigation.navigateTo.mockClear();
  googleIdentity.initialize.mockClear();
  googleIdentity.renderButton.mockClear();
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "client-123.apps.googleusercontent.com");
  (window as unknown as { google?: unknown }).google = { accounts: { id: googleIdentity } };
});

afterEach(() => {
  server.resetHandlers();
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.unstubAllEnvs();
  delete (window as unknown as { google?: unknown }).google;
});

describe("LoginPage local login", () => {
  it("posts the credentials, establishes the session and goes to the role home", async() => {
    renderLogin();
    fillAndSubmit("  ana@ventylab.demo ", "VentyLab-Demo-2026");

    await waitFor(() => expect(navigation.navigateTo).toHaveBeenCalledWith("/simulador"), { timeout: 5000 });
    expect(loginBodies).toEqual([{ email: "ana@ventylab.demo", password: "VentyLab-Demo-2026" }]);
    expect(getAccessToken()).toBe("access-1");
    expect(getRefreshToken()).toBe("refresh-1");
    expect(navigation.navigateTo).toHaveBeenCalledTimes(1);
  });

  it("goes to a safe returnTo after login", async() => {
    router.query = { returnTo: "/teaching/m1/l2" };
    renderLogin();
    fillAndSubmit();

    await waitFor(() => expect(navigation.navigateTo).toHaveBeenCalledWith("/teaching/m1/l2"), { timeout: 5000 });
  });

  it("ignores an unsafe returnTo and uses the role home", async() => {
    currentRole = "TEACHER";
    router.query = { returnTo: "https://evil.example" };
    renderLogin();
    fillAndSubmit();

    await waitFor(() => expect(navigation.navigateTo).toHaveBeenCalledWith("/simulador"), { timeout: 5000 });
  });

  it("keeps the submit label and shows a busy spinner while the login is pending", async() => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    server.use(http.post(url("/api/auth/login"), async() => {
      await gate;

      return errorResponse("auth.invalid_credentials", 401);
    }));
    renderLogin();
    fillAndSubmit();

    const submit = screen.getByRole("button", { name: /iniciar sesión/i });

    await waitFor(() => expect(submit).toHaveAttribute("aria-busy", "true"));
    expect(submit).toBeDisabled();
    expect(submit).toHaveAccessibleName("Iniciar sesión");
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByText(/iniciando sesión/i)).not.toBeInTheDocument();

    release();
    await waitFor(() => expect(submit).toHaveAttribute("aria-busy", "false"));
  });

  it("validates the fields before calling the backend", async() => {
    renderLogin();
    fireEvent.click(await screen.findByRole("button", { name: /iniciar sesión/i }));

    expect(await screen.findByText("Ingresa tu correo electrónico.")).toBeInTheDocument();
    expect(screen.getByText("Ingresa tu contraseña.")).toBeInTheDocument();
    expect(loginBodies).toEqual([]);
  });

  it.each([
    ["auth.invalid_credentials", 401, "Correo o contraseña incorrectos."],
    ["auth.user_inactive", 403, "Tu cuenta está desactivada"],
    ["auth.password_login_not_available", 400, "Esta cuenta inicia sesión con Google"],
    ["auth.email_domain_not_allowed", 403, "no pertenece a un dominio autorizado"],
  ])("shows the message for %s", async(code, status, expected) => {
    server.use(http.post(url("/api/auth/login"), () => errorResponse(code, status)));
    renderLogin();
    fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(expected);
    expect(navigation.navigateTo).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
  });

  it("shows the Retry-After wait for the rate limit", async() => {
    server.use(http.post(url("/api/auth/login"), () => errorResponse("common.too_many_requests", 429, { "Retry-After": "45" })));
    renderLogin();
    fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Inténtalo de nuevo en 45 segundos.");
  });

  it("shows a network message when the backend cannot be reached", async() => {
    server.use(http.post(url("/api/auth/login"), () => HttpResponse.error()));
    renderLogin();
    fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar con el servidor");
  });
});

describe("LoginPage Google sign-in", () => {
  it("initializes Google Identity Services and posts the ID token", async() => {
    renderLogin();

    await waitFor(() => expect(googleIdentity.initialize).toHaveBeenCalledTimes(1));
    expect(googleIdentity.initialize.mock.calls[0]?.[0]).toMatchObject({ client_id: "client-123.apps.googleusercontent.com" });
    expect(googleIdentity.renderButton).toHaveBeenCalledTimes(1);

    googleCallback?.({ credential: "google-id-token" });

    await waitFor(() => expect(navigation.navigateTo).toHaveBeenCalledWith("/simulador"), { timeout: 5000 });
    expect(googleBodies).toEqual([{ idToken: "google-id-token" }]);
  });

  it.each([
    ["auth.google_email_not_verified", 401, "no está verificado"],
    ["auth.invalid_google_token", 401, "No se pudo validar tu inicio de sesión con Google"],
    ["auth.google_sign_in_not_configured", 503, "no está disponible en este momento"],
    ["auth.email_domain_not_allowed", 403, "no pertenece a un dominio autorizado"],
  ])("shows the message for %s", async(code, status, expected) => {
    server.use(http.post(url("/api/auth/google"), () => errorResponse(code, status)));
    renderLogin();

    await waitFor(() => expect(googleIdentity.initialize).toHaveBeenCalled());
    googleCallback?.({ credential: "google-id-token" });

    expect(await screen.findByRole("alert")).toHaveTextContent(expected);
    expect(navigation.navigateTo).not.toHaveBeenCalled();
  });

  it("disables the Google button with a notice when no client ID is configured", async() => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "");
    renderLogin();

    expect(await screen.findByRole("button", { name: /continuar con google/i })).toBeDisabled();
    expect(screen.getByText(/no está configurado en este entorno/i)).toBeInTheDocument();
    expect(googleIdentity.initialize).not.toHaveBeenCalled();
  });
});

describe("LoginPage with an existing session", () => {
  it("redirects an authenticated visitor to the home of their role", async() => {
    currentRole = "ADMIN";
    saveTokens("access-0", "refresh-0");
    renderLogin();

    await waitFor(() => expect(navigation.navigateTo).toHaveBeenCalledWith("/simulador"), { timeout: 5000 });
    expect(navigation.navigateTo).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /iniciar sesión/i })).not.toBeInTheDocument();
  });

  it("falls back to the role home when the returnTo just bounced back to the login page", async() => {
    saveTokens("access-0", "refresh-0");
    window.sessionStorage.setItem(REDIRECT_HISTORY_KEY, JSON.stringify([{ target: "/teaching", at: Date.now() }]));
    router.query = { returnUrl: "/teaching" };
    renderLogin();

    await waitFor(() => expect(navigation.navigateTo).toHaveBeenCalledWith("/simulador"), { timeout: 5000 });
    expect(navigation.navigateTo).toHaveBeenCalledTimes(1);
  });

  it("stops redirecting and offers to sign out when the role home bounced too", async() => {
    saveTokens("access-0", "refresh-0");
    window.sessionStorage.setItem(REDIRECT_HISTORY_KEY, JSON.stringify([{ target: "/simulador", at: Date.now() }]));
    renderLogin();

    expect(await screen.findByRole("alert", {}, { timeout: 5000 })).toHaveTextContent("No se pudo abrir la página de destino");
    expect(navigation.navigateTo).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /cerrar sesión/i }));

    await waitFor(() => expect(getAccessToken()).toBeNull());
    expect(await screen.findByRole("button", { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(window.sessionStorage.getItem(REDIRECT_HISTORY_KEY)).toBeNull();
  });

  it("sends a student to the role home instead of a staff-only returnTo", async() => {
    router.query = { returnTo: "/panel/students" };
    renderLogin();
    fillAndSubmit();

    await waitFor(() => expect(navigation.navigateTo).toHaveBeenCalledWith("/simulador"), { timeout: 5000 });
  });

  it("shows a notice when the previous session expired", async() => {
    router.query = { expired: "1" };
    renderLogin();

    expect(await screen.findByText(/tu sesión expiró/i)).toBeInTheDocument();
  });
});
