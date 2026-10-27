/*
* Funcionalidad: Register page tests
* Descripción: Integration tests of the register page with the real backend session (AuthProvider) and MSW: a valid registration posts name, email and password (trimmed, no confirmation) to /api/auth/register, then logs in with the same credentials, establishes the session and navigates to the student home or a safe returnTo; the fields are validated in Spanish before any request; a taken email (409), invalid data (400) and network failures show their Spanish message without a login; a failed login after the account was created says so; the submit is busy while pending; an authenticated visitor is redirected to the home of their role. Depends on vitest, Testing Library, MSW, next/router (mocked) and the hard navigation helper (mocked). v1.1 (W1 Bloque 1): the role home of every role is /simulador.
* Versión: 1.1
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
import { REGISTER_VALIDATION_MESSAGES } from "../entities/register.entity";
import { RegisterPage } from "./register.page";

const router = vi.hoisted(() => ({
  query: {} as Record<string, string | string[]>,
  isReady: true,
  asPath: "/auth/register",
  pathname: "/auth/register",
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
  timestamp: "2026-10-18T00:00:00.000Z",
  traceId: "trace-ok",
  pagination: null,
});

const errorResponse = (code: string, status: number) =>
  HttpResponse.json(
    {
      success: false,
      message: code,
      data: null,
      code,
      timestamp: "2026-10-18T00:00:00.000Z",
      traceId: "trace-error",
      pagination: null,
    },
    { status },
  );

let currentRole: Role = "STUDENT";
let registerBodies: unknown[] = [];
let loginBodies: unknown[] = [];

const user = () => ({ id: "u1", email: "ana@ventylab.demo", name: "Ana María Pérez", image: null, role: currentRole });

const server = setupServer(
  http.get(url("/api/auth/me"), () => HttpResponse.json(envelope({ user: user(), permissions: [] }))),
  http.post(url("/api/auth/register"), async({ request }) => {
    registerBodies.push(await request.json());

    return HttpResponse.json(envelope(null), { status: 201 });
  }),
  http.post(url("/api/auth/login"), async({ request }) => {
    loginBodies.push(await request.json());

    return HttpResponse.json(envelope({ accessToken: "access-1", refreshToken: "refresh-1", userId: "u1", user: user() }));
  }),
);

function renderRegister() {
  return render(
    <AuthProvider>
      <RegisterPage />
    </AuthProvider>,
  );
}

type RegistrationInput = { name?: string, email?: string, password?: string, confirmPassword?: string };

function fillAndSubmit({
  name = "  Ana María Pérez ",
  email = " ana@ventylab.demo ",
  password = "SecurePass123",
  confirmPassword = password,
}: RegistrationInput = {}) {
  fireEvent.change(screen.getByLabelText(/nombre completo/i), { target: { value: name } });
  fireEvent.change(screen.getByLabelText(/correo electrónico/i), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/^contraseña/i), { target: { value: password } });
  fireEvent.change(screen.getByLabelText(/confirmar contraseña/i), { target: { value: confirmPassword } });
  fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  currentRole = "STUDENT";
  registerBodies = [];
  loginBodies = [];
  router.query = {};
  router.isReady = true;
  navigation.navigateTo.mockClear();
});

afterEach(() => {
  server.resetHandlers();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("RegisterPage", () => {
  it("registers, logs in with the same credentials and goes to the student home", async() => {
    renderRegister();
    fillAndSubmit();

    await waitFor(() => expect(navigation.navigateTo).toHaveBeenCalledWith("/simulador"), { timeout: 5000 });
    expect(registerBodies).toEqual([{ name: "Ana María Pérez", email: "ana@ventylab.demo", password: "SecurePass123" }]);
    expect(loginBodies).toEqual([{ email: "ana@ventylab.demo", password: "SecurePass123" }]);
    expect(getAccessToken()).toBe("access-1");
    expect(getRefreshToken()).toBe("refresh-1");
    expect(navigation.navigateTo).toHaveBeenCalledTimes(1);
  });

  it("goes to a safe returnTo after registering", async() => {
    router.query = { returnTo: "/learn" };
    renderRegister();
    fillAndSubmit();

    await waitFor(() => expect(navigation.navigateTo).toHaveBeenCalledWith("/learn"), { timeout: 5000 });
  });

  it("validates every field in Spanish before calling the backend", async() => {
    renderRegister();
    fireEvent.click(await screen.findByRole("button", { name: /crear cuenta/i }));

    expect(await screen.findByText(REGISTER_VALIDATION_MESSAGES.nameRequired)).toBeInTheDocument();
    expect(screen.getByText(REGISTER_VALIDATION_MESSAGES.emailRequired)).toBeInTheDocument();
    expect(screen.getByText(REGISTER_VALIDATION_MESSAGES.passwordRequired)).toBeInTheDocument();
    expect(screen.getByText(REGISTER_VALIDATION_MESSAGES.confirmRequired)).toBeInTheDocument();
    expect(registerBodies).toEqual([]);
  });

  it("rejects a weak password and a mismatching confirmation without a request", async() => {
    renderRegister();
    await screen.findByRole("button", { name: /crear cuenta/i });
    fillAndSubmit({ password: "weakpass", confirmPassword: "other" });

    expect(await screen.findByText(REGISTER_VALIDATION_MESSAGES.passwordWeak)).toBeInTheDocument();
    expect(screen.getByText(REGISTER_VALIDATION_MESSAGES.confirmMismatch)).toBeInTheDocument();
    expect(registerBodies).toEqual([]);
  });

  it.each([
    ["users.user_already_exists", 409, "Ya existe una cuenta con este correo"],
    ["common.validation_error", 400, "Revisa los datos ingresados"],
    ["auth.email_domain_not_allowed", 403, "no pertenece a un dominio autorizado"],
  ])("shows the message for %s without logging in", async(code, status, expected) => {
    server.use(http.post(url("/api/auth/register"), () => errorResponse(code, status)));
    renderRegister();
    await screen.findByRole("button", { name: /crear cuenta/i });
    fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(expected);
    expect(loginBodies).toEqual([]);
    expect(navigation.navigateTo).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
  });

  it("shows a network message when the backend cannot be reached", async() => {
    server.use(http.post(url("/api/auth/register"), () => HttpResponse.error()));
    renderRegister();
    await screen.findByRole("button", { name: /crear cuenta/i });
    fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar con el servidor");
  });

  it("says the account exists when the login after registering fails", async() => {
    server.use(http.post(url("/api/auth/login"), () => errorResponse("common.internal_error", 500)));
    renderRegister();
    await screen.findByRole("button", { name: /crear cuenta/i });
    fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Tu cuenta se creó, pero no se pudo iniciar sesión.");
    expect(navigation.navigateTo).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: /inicia sesión/i })).toHaveAttribute("href", "/auth/login");
  });

  it("keeps the submit label and marks it busy while the registration is pending", async() => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    server.use(http.post(url("/api/auth/register"), async() => {
      await gate;

      return errorResponse("users.user_already_exists", 409);
    }));
    renderRegister();
    await screen.findByRole("button", { name: /crear cuenta/i });
    fillAndSubmit();

    const submit = screen.getByRole("button", { name: /crear cuenta/i });

    await waitFor(() => expect(submit).toHaveAttribute("aria-busy", "true"));
    expect(submit).toBeDisabled();

    release();
    await waitFor(() => expect(submit).toHaveAttribute("aria-busy", "false"));
  });

  it("redirects an authenticated visitor to the home of their role", async() => {
    currentRole = "TEACHER";
    saveTokens("access-0", "refresh-0");
    renderRegister();

    await waitFor(() => expect(navigation.navigateTo).toHaveBeenCalledWith("/simulador"), { timeout: 5000 });
    expect(screen.queryByRole("button", { name: /crear cuenta/i })).not.toBeInTheDocument();
  });
});
