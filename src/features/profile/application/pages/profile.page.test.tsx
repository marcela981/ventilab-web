/*
* Funcionalidad: Profile page tests
* Descripción: Integration tests of the profile page with the real backend session (AuthProvider), an isolated SWR cache and MSW: role, email and account status are shown read-only; name and avatar edits PATCH /api/users/me with only the changed fields and then refresh the session user (/api/auth/me) so the shell shows the new name; an avatar URL that is not http(s) is blocked before any request; backend validation messages land on their field; 403, 429 (Retry-After) and network failures show clear Spanish messages; the avatar preview falls back to initials. Depends on vitest, Testing Library, MSW and SWR.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { SWRConfig } from "swr";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { saveTokens } from "@shared/api-client/token-storage";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { AuthProvider } from "@shared/session/auth-provider";
import type { Role } from "@shared/session/session.entity";
import { useSession } from "@shared/session/use-session";
import { ProfilePage } from "./profile.page";

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(() => Promise.resolve({ ok: true, error: null })),
  signOut: vi.fn(() => Promise.resolve(undefined)),
  getSession: vi.fn(() => Promise.resolve(null)),
}));

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

const errorResponse = (code: string, status: number, message: unknown = code, headers: Record<string, string> = {}) =>
  HttpResponse.json(
    { success: false, message, data: null, code, timestamp: "2026-10-14T00:00:00.000Z", traceId: "trace-error", pagination: null },
    { status, headers },
  );

type StoredUser = {
  name: string | null
  image: string | null
  role: Role
  isActive: boolean
};

let stored: StoredUser;
let patchBodies: unknown[] = [];
let meCalls = 0;

const authUser = () => ({ id: "u1", email: "ana@ventylab.demo", name: stored.name, image: stored.image, role: stored.role });

const server = setupServer(
  http.get(url("/api/auth/me"), () => {
    meCalls += 1;

    return HttpResponse.json(envelope({ user: authUser(), permissions: [] }));
  }),
  http.get(url("/api/users/me"), () => HttpResponse.json(envelope({
    ...authUser(),
    isActive: stored.isActive,
    emailVerified: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  }))),
  http.patch(url("/api/users/me"), async({ request }) => {
    const body = (await request.json()) as Partial<StoredUser>;

    patchBodies.push(body);
    stored = { ...stored, ...body };

    return HttpResponse.json(envelope(null));
  }),
);

function SessionName() {
  const { user } = useSession();

  return <output aria-label="Usuario de la sesión">{user?.name ?? ""}</output>;
}

function renderProfile() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
      <AuthProvider>
        <SessionName />
        <ProfilePage />
      </AuthProvider>
    </SWRConfig>,
  );
}

async function nameField(): Promise<HTMLInputElement> {
  return (await screen.findByLabelText(/^nombre/i, {}, { timeout: 5000 })) as HTMLInputElement;
}

function avatarField(): HTMLInputElement {
  return screen.getByLabelText(/url de la foto/i) as HTMLInputElement;
}

function save() {
  fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  stored = { name: "Ana Torres", image: null, role: "STUDENT", isActive: true };
  patchBodies = [];
  meCalls = 0;
  saveTokens("access-1", "refresh-1");
});

afterEach(() => {
  server.resetHandlers();
  window.localStorage.clear();
});

describe("ProfilePage read-only data", () => {
  it("shows role, email and status as read-only information", async() => {
    stored = { ...stored, role: "TEACHER" };
    renderProfile();

    expect((await nameField()).value).toBe("Ana Torres");

    const account = screen.getByRole("region", { name: /datos de la cuenta/i });

    expect(within(account).getByText("ana@ventylab.demo")).toBeInTheDocument();
    expect(within(account).getByText("Docente")).toBeInTheDocument();
    expect(within(account).getByText("Activa")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /correo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /rol/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /guardar cambios/i })).toBeDisabled();
  });

  it("shows the initials when there is no avatar and the preview of a valid URL", async() => {
    renderProfile();
    await nameField();

    const preview = screen.getByRole("img", { name: /vista previa de la foto/i });

    expect(preview).toHaveTextContent("AT");

    fireEvent.change(avatarField(), { target: { value: "https://cdn.example/new.png" } });

    expect(screen.getByRole("img", { name: /vista previa de la foto/i }).querySelector("img")).toHaveAttribute(
      "src",
      "https://cdn.example/new.png",
    );
  });
});

describe("ProfilePage editing", () => {
  it("PATCHes only the changed name and refreshes the session user", async() => {
    renderProfile();
    fireEvent.change(await nameField(), { target: { value: "  Ana María Torres " } });
    await waitFor(() => expect(meCalls).toBe(1));
    save();

    expect(await screen.findByText("Perfil actualizado.", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(patchBodies).toEqual([{ name: "Ana María Torres" }]);
    await waitFor(() => expect(meCalls).toBe(2));
    await waitFor(() => expect(screen.getByLabelText("Usuario de la sesión")).toHaveTextContent("Ana María Torres"));
  });

  it("PATCHes only the changed avatar", async() => {
    renderProfile();
    await nameField();
    fireEvent.change(avatarField(), { target: { value: "https://cdn.example/new.png" } });
    save();

    expect(await screen.findByText("Perfil actualizado.", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(patchBodies).toEqual([{ image: "https://cdn.example/new.png" }]);
  });

  it("removes the avatar with null", async() => {
    stored = { ...stored, image: "https://cdn.example/old.png" };
    renderProfile();
    await nameField();
    fireEvent.click(screen.getByRole("button", { name: /quitar foto/i }));
    save();

    expect(await screen.findByText("Perfil actualizado.", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(patchBodies).toEqual([{ image: null }]);
  });

  it("blocks an avatar URL that is not http or https", async() => {
    renderProfile();
    await nameField();
    fireEvent.change(avatarField(), { target: { value: "javascript:alert(1)" } });
    save();

    expect(await screen.findByText("Ingresa una URL que empiece por http:// o https://.")).toBeInTheDocument();
    expect(avatarField()).toHaveAttribute("aria-invalid", "true");
    expect(patchBodies).toEqual([]);
  });
});

describe("ProfilePage errors", () => {
  it("maps a backend validation message to its field", async() => {
    server.use(http.patch(url("/api/users/me"), () =>
      errorResponse("validation_error", 400, ["El nombre no puede exceder 100 caracteres"])));
    renderProfile();
    fireEvent.change(await nameField(), { target: { value: "Ana B" } });
    save();

    expect(await screen.findByText("El nombre no puede exceder 100 caracteres", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(await nameField()).toHaveAttribute("aria-invalid", "true");
  });

  it.each([
    ["forbidden", () => errorResponse("auth.forbidden", 403), "No tienes permiso para modificar este perfil."],
    [
      "rate limited",
      () => errorResponse("common.too_many_requests", 429, "Too many", { "Retry-After": "30" }),
      "Inténtalo de nuevo en 30 segundos.",
    ],
    ["offline", () => HttpResponse.error(), "No se pudo conectar con el servidor"],
  ])("shows a clear message when %s", async(_label, response, expected) => {
    server.use(http.patch(url("/api/users/me"), response));
    renderProfile();
    fireEvent.change(await nameField(), { target: { value: "Ana B" } });
    save();

    expect(await screen.findByRole("alert", {}, { timeout: 5000 })).toHaveTextContent(expected);
    expect((await nameField()).value).toBe("Ana B");
  });

  it("shows an error with retry when the profile cannot be loaded", async() => {
    server.use(http.get(url("/api/users/me"), () => errorResponse("common.internal_error", 500)));
    renderProfile();

    expect(await screen.findByText(/no se pudo cargar tu perfil/i, {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument();
  });
});
