/*
* Funcionalidad: Password recovery pages tests
* Descripción: ForgotPasswordPage validates the email, sends it once and shows the same notice whatever the answer (202), shows the rate limit message and offers to send again; ResetPasswordPage reads ?token=, validates the new password and its confirmation, posts them and then offers "Iniciar sesión", offers a new link without a token or with an invalid or expired one (auth.password_reset_token_invalid). The auth service is mocked. Depends on vitest, Testing Library, next/router and next/link (mocked) and the api-client ApiError.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@shared/api-client/api-error";
import { readResetToken } from "../entities/password-reset.entity";
import { ForgotPasswordPage } from "./forgot-password.page";
import { ResetPasswordPage } from "./reset-password.page";

const service = vi.hoisted(() => ({ requestPasswordReset: vi.fn(), resetPassword: vi.fn() }));
vi.mock("../../api/services/auth.service", () => service);

const router = vi.hoisted(() => ({ query: {} as Record<string, string | string[]>, isReady: true }));
vi.mock("next/router", () => ({ useRouter: () => router }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  service.requestPasswordReset.mockReset().mockResolvedValue(undefined);
  service.resetPassword.mockReset().mockResolvedValue(undefined);
  router.query = {};
});

describe("ForgotPasswordPage", () => {
  it("validates the email and shows the same notice after sending", async () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Recuperar contraseña" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enviar enlace" }));
    expect(await screen.findByText("Ingresa tu correo electrónico.")).toBeInTheDocument();
    expect(service.requestPasswordReset).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole("textbox", { name: /Correo electrónico/ }), { target: { value: "ana@ventylab.demo" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar enlace" }));

    expect(await screen.findByText(/te enviamos un enlace para restablecerla/)).toBeInTheDocument();
    expect(service.requestPasswordReset).toHaveBeenCalledWith("ana@ventylab.demo");
    expect(screen.queryByRole("form", { name: "Recuperar contraseña con el correo" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Enviar otro enlace" }));
    expect(screen.getByRole("textbox", { name: /Correo electrónico/ })).toHaveValue("");
    expect(screen.getByRole("link", { name: "Volver al inicio de sesión" })).toHaveAttribute("href", "/auth/login");
    expect(screen.getByRole("link", { name: "Regístrate aquí" })).toHaveAttribute("href", "/auth/register");
  }, 15_000);

  it("shows the rate limit message and keeps the form", async () => {
    service.requestPasswordReset.mockRejectedValue(new ApiError({ code: "common.too_many_requests", message: "", status: 429, retryAfter: 30 }));
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByRole("textbox", { name: /Correo electrónico/ }), { target: { value: "ana@ventylab.demo" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar enlace" }));

    expect(await screen.findByText("Demasiados intentos. Inténtalo de nuevo en 30 segundos.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar enlace" })).toBeInTheDocument();
  });
});

describe("ResetPasswordPage", () => {
  const fill = (password: string, confirm: string) => {
    fireEvent.change(screen.getByLabelText(/^Nueva contraseña/), { target: { value: password } });
    fireEvent.change(screen.getByLabelText(/^Confirmar contraseña/), { target: { value: confirm } });
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }));
  };

  it("validates and resets the password with the link token, then offers the login", async () => {
    router.query = { token: "abc123" };
    render(<ResetPasswordPage />);

    fill("corta", "otra");
    expect(await screen.findByText(/La contraseña debe tener entre 8 y 128 caracteres/)).toBeInTheDocument();
    expect(screen.getByText("Las contraseñas no coinciden.")).toBeInTheDocument();
    expect(service.resetPassword).not.toHaveBeenCalled();

    fill("Nueva-Clave-2026", "Nueva-Clave-2026");

    expect(await screen.findByText("Tu contraseña se restableció. Inicia sesión con la nueva contraseña.")).toBeInTheDocument();
    expect(service.resetPassword).toHaveBeenCalledWith("abc123", "Nueva-Clave-2026");
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute("href", "/auth/login");
  });

  it("offers a new link without a token", () => {
    render(<ResetPasswordPage />);

    expect(screen.getByText(/Falta el enlace de recuperación/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pedir un enlace nuevo" })).toHaveAttribute("href", "/auth/forgot-password");
    expect(screen.queryByRole("button", { name: "Restablecer contraseña" })).not.toBeInTheDocument();
  });

  it("offers a new link when the token is invalid or expired", async () => {
    router.query = { token: "used" };
    service.resetPassword.mockRejectedValue(new ApiError({ code: "auth.password_reset_token_invalid", message: "", status: 400 }));
    render(<ResetPasswordPage />);

    fill("Nueva-Clave-2026", "Nueva-Clave-2026");

    expect(await screen.findByText(/no es válido o ya venció/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("link", { name: "Pedir un enlace nuevo" })).toBeInTheDocument());
  });
});

describe("readResetToken", () => {
  it("takes the first non-empty token of the query", () => {
    expect(readResetToken({ token: " abc " })).toBe("abc");
    expect(readResetToken({ token: ["x", "y"] })).toBe("x");
    expect(readResetToken({ token: "" })).toBeNull();
    expect(readResetToken({})).toBeNull();
  });
});
