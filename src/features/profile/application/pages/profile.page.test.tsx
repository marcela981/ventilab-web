/*
* Funcionalidad: ProfilePage tests
* Descripción: Component tests of the own-profile page against MSW: URL-owned tabs (`?tab=info|password`), read-only account data, name editing (PATCH only the changed name, session refresh, busy button, backend validation, 403/429/offline and load errors), photo upload from the device (client type/size checks with julio's messages, crop step replaced by a stub because jsdom has no canvas, PUT multipart then re-read of the profile, 503), photo removal (DELETE then re-read) and the change-password form (client validation, POST + saveTokens with the returned pair, wrong current password, 429, Google accounts without a password). Depends on vitest, Testing Library, MSW, SWR and the backend session provider. v1.1 (Bloque 4, W7): tabs, photo upload and change password; avatar URL tests removed.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { useSyncExternalStore } from "react";
import { SWRConfig } from "swr";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@shared/api-client/http-client";
import { getTokens, saveTokens } from "@shared/api-client/token-storage";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { AuthProvider } from "@shared/session/auth-provider";
import type { Role } from "@shared/session/session.entity";
import { useSession } from "@shared/session/use-session";
import { ProfilePage } from "./profile.page";

type Query = Record<string, string | undefined>;

const routerListeners = new Set<() => void>();
let routerQuery: Query = {};
const replace = vi.fn((url: { query?: Query }) => {
  routerQuery = url.query ?? {};
  routerListeners.forEach((listener) => listener());

  return Promise.resolve(true);
});

vi.mock("next/router", () => ({
  useRouter: () => {
    const query = useSyncExternalStore(
      (listener) => {
        routerListeners.add(listener);

        return () => routerListeners.delete(listener);
      },
      () => routerQuery,
    );

    return { isReady: true, pathname: "/profile", query, replace };
  },
}));

vi.mock("../hooks/crop-avatar-image", () => ({
  cropAvatarImage: vi.fn(() => Promise.resolve({ blob: new Blob(["cropped"], { type: "image/jpeg" }), fileName: "avatar.jpg" })),
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
  hasPassword: boolean
};

let stored: StoredUser;
let patchBodies: unknown[] = [];
let passwordBodies: unknown[] = [];
let avatarUploads = 0;
let meCalls = 0;

const authUser = () => ({ id: "u1", email: "ana@ventylab.demo", name: stored.name, image: stored.image, role: stored.role });

const userDto = () => ({
  ...authUser(),
  isActive: stored.isActive,
  hasPassword: stored.hasPassword,
  isSuperadmin: false,
  studentCode: null,
  emailVerified: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
});

const server = setupServer(
  http.get(url("/api/auth/me"), () => {
    meCalls += 1;

    return HttpResponse.json(envelope({ user: authUser(), permissions: [] }));
  }),
  http.get(url("/api/users/me"), () => HttpResponse.json(envelope(userDto()))),
  http.patch(url("/api/users/me"), async({ request }) => {
    const body = (await request.json()) as Partial<StoredUser>;

    patchBodies.push(body);
    stored = { ...stored, ...body };

    return HttpResponse.json(envelope(null));
  }),
  http.put(url("/api/users/me/avatar"), () => {
    avatarUploads += 1;
    stored = { ...stored, image: `data:image/jpeg;base64,signed-${avatarUploads}` };

    return HttpResponse.json(envelope(userDto()));
  }),
  http.delete(url("/api/users/me/avatar"), () => {
    stored = { ...stored, image: null };

    return HttpResponse.json(envelope(userDto()));
  }),
  http.post(url("/api/auth/change-password"), async({ request }) => {
    passwordBodies.push(await request.json());

    return HttpResponse.json(envelope({
      accessToken: "access-2",
      refreshToken: "refresh-2",
      userId: "u1",
      user: authUser(),
    }));
  }),
);

function SessionName() {
  const { user } = useSession();

  return <output aria-label="Usuario de la sesión">{user?.name ?? ""}</output>;
}

function renderProfile(query: Query = {}) {
  routerQuery = query;

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

function save() {
  fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));
}

function chooseFile(file: File) {
  fireEvent.change(screen.getByTestId("profile-avatar-input"), { target: { files: [file] } });
}

function photo(): HTMLElement {
  return screen.getByRole("img", { name: "Foto de perfil" });
}

async function passwordPanel(): Promise<HTMLElement> {
  return screen.findByRole("tabpanel", { name: "Cambiar contraseña" }, { timeout: 5000 });
}

function typePassword(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillPasswordForm(current = "OldPassword1", next = "NewPassword2", confirm = next) {
  typePassword(/^contraseña actual/i, current);
  typePassword(/^nueva contraseña/i, next);
  typePassword(/^confirmar nueva contraseña/i, confirm);
}

function submitPassword() {
  fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  stored = { name: "Ana Torres", image: null, role: "STUDENT", isActive: true, hasPassword: true };
  patchBodies = [];
  passwordBodies = [];
  avatarUploads = 0;
  meCalls = 0;
  replace.mockClear();
  saveTokens("access-1", "refresh-1");
});

afterEach(() => {
  server.resetHandlers();
  window.localStorage.clear();
});

describe("ProfilePage tabs", { timeout: 15_000 }, () => {
  it("opens the personal information tab by default", async() => {
    renderProfile();
    await nameField();

    expect(screen.getByRole("tab", { name: "Información personal" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Cambiar contraseña" })).toHaveAttribute("aria-selected", "false");
    expect(screen.queryByLabelText(/url de la foto/i)).not.toBeInTheDocument();
  });

  it("opens the password tab from ?tab=password and writes the tab to the URL", async() => {
    renderProfile({ tab: "password" });

    expect(await passwordPanel()).toBeVisible();
    expect(screen.getByRole("tab", { name: "Cambiar contraseña" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("tab", { name: "Información personal" }));

    expect(replace).toHaveBeenCalledWith({ pathname: "/profile", query: { tab: "info" } }, undefined, { shallow: true });
    expect(await nameField()).toBeVisible();
  });
});

describe("ProfilePage read-only data", { timeout: 15_000 }, () => {
  it("shows role, email and status as read-only information", async() => {
    stored = { ...stored, role: "TEACHER" };
    renderProfile();

    expect((await nameField()).value).toBe("Ana Torres");

    const account = screen.getByRole("region", { name: /datos de la cuenta/i });

    expect(within(account).getByText("ana@ventylab.demo")).toBeInTheDocument();
    expect(within(account).getByText("Docente")).toBeInTheDocument();
    expect(within(account).getByText("Activa")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /correo/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /guardar cambios/i })).toBeDisabled();
  });
});

describe("ProfilePage name", { timeout: 15_000 }, () => {
  it("PATCHes only the changed name and refreshes the session user", async() => {
    renderProfile();
    fireEvent.change(await nameField(), { target: { value: "  Ana María Torres " } });
    await waitFor(() => expect(meCalls).toBe(1));
    save();

    expect(await screen.findByText("Perfil actualizado.", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(patchBodies).toEqual([{ name: "Ana María Torres" }]);
    await waitFor(() => expect(screen.getByLabelText("Usuario de la sesión")).toHaveTextContent("Ana María Torres"));
  });

  it("keeps the save label and shows a busy spinner while the save is pending", async() => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    server.use(http.patch(url("/api/users/me"), async() => {
      await gate;

      return HttpResponse.json(envelope(null));
    }));
    renderProfile();
    fireEvent.change(await nameField(), { target: { value: "Ana María Torres" } });
    save();

    const button = screen.getByRole("button", { name: /guardar cambios/i });

    await waitFor(() => expect(button).toHaveAttribute("aria-busy", "true"));
    expect(button).toBeDisabled();
    expect(within(button).getByRole("progressbar")).toBeInTheDocument();

    release();
    expect(await screen.findByText("Perfil actualizado.", {}, { timeout: 5000 })).toBeInTheDocument();
  });

  it("maps a backend validation message to the name field", async() => {
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

describe("ProfilePage photo", { timeout: 15_000 }, () => {
  it("shows the initials and no remove action when there is no photo", async() => {
    renderProfile();
    await nameField();

    expect(photo()).toHaveTextContent("AT");
    expect(screen.queryByRole("button", { name: "Quitar foto" })).not.toBeInTheDocument();
  });

  it("uploads a chosen photo and shows the URL read again from the profile", async() => {
    const put = vi.spyOn(httpClient, "put");

    renderProfile();
    await nameField();
    chooseFile(new File(["png"], "me.png", { type: "image/png" }));

    expect(await screen.findByText("Foto de perfil actualizada correctamente", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(avatarUploads).toBe(1);
    const form = put.mock.calls[0]?.[1];

    expect(form).toBeInstanceOf(FormData);
    expect(((form as FormData).get("file") as File).name).toBe("avatar.jpg");
    put.mockRestore();
    await waitFor(() => expect(photo().querySelector("img")).toHaveAttribute("src", "data:image/jpeg;base64,signed-1"));
  });

  it.each([
    ["an unsupported type", new File(["gif"], "me.gif", { type: "image/gif" }), "Solo se permiten archivos PNG, JPG, JPEG o WEBP"],
    [
      "a file over 2 MB",
      new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.jpg", { type: "image/jpeg" }),
      "La imagen no puede exceder 2 MB",
    ],
  ])("rejects %s without uploading", async(_label, file, expected) => {
    renderProfile();
    await nameField();
    chooseFile(file);

    expect(await screen.findByText(expected)).toBeInTheDocument();
    expect(avatarUploads).toBe(0);
  });

  it("explains when photo storage is unavailable", async() => {
    server.use(http.put(url("/api/users/me/avatar"), () => errorResponse("media.storage_unavailable", 503)));
    renderProfile();
    await nameField();
    chooseFile(new File(["jpg"], "me.jpg", { type: "image/jpeg" }));

    expect(await screen.findByRole("alert", {}, { timeout: 5000 })).toHaveTextContent(/almacenamiento de fotos no está disponible/i);
  });

  it("removes the photo and falls back to the initials", async() => {
    stored = { ...stored, image: "https://cdn.example/old.png" };
    renderProfile();
    await nameField();
    fireEvent.click(screen.getByRole("button", { name: "Quitar foto" }));

    expect(await screen.findByText("Foto de perfil eliminada correctamente", {}, { timeout: 5000 })).toBeInTheDocument();
    await waitFor(() => expect(photo().querySelector("img")).toBeNull());
    expect(photo()).toHaveTextContent("AT");
  });
});

describe("ProfilePage change password", { timeout: 15_000 }, () => {
  it("shows the Google notice instead of the form for accounts without a password", async() => {
    stored = { ...stored, hasPassword: false };
    renderProfile({ tab: "password" });

    const panel = await passwordPanel();

    expect(within(panel).getByText("Tu cuenta usa Google; la contraseña se gestiona en Google.")).toBeInTheDocument();
    expect(within(panel).queryByLabelText(/contraseña actual/i)).not.toBeInTheDocument();
  });

  it("shows the requirements and validates on the client without a request", async() => {
    renderProfile({ tab: "password" });
    await passwordPanel();

    expect(screen.getByText("Requisitos de contraseña:")).toBeInTheDocument();
    expect(screen.getByText("Entre 8 y 128 caracteres")).toBeInTheDocument();

    fillPasswordForm("OldPassword1", "newpassword", "other");
    submitPassword();

    expect(await screen.findByText("Debe contener al menos una letra mayúscula")).toBeInTheDocument();
    expect(screen.getByText("Las contraseñas no coinciden")).toBeInTheDocument();
    expect(passwordBodies).toEqual([]);
  });

  it("changes the password, stores the new token pair and clears the form", async() => {
    renderProfile({ tab: "password" });
    await passwordPanel();
    fillPasswordForm();
    submitPassword();

    expect(await screen.findByText("Contraseña actualizada correctamente", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(passwordBodies).toEqual([{ currentPassword: "OldPassword1", newPassword: "NewPassword2" }]);
    expect(getTokens()).toEqual({ accessToken: "access-2", refreshToken: "refresh-2" });
    expect(screen.getByLabelText(/^contraseña actual/i)).toHaveValue("");
  });

  it("marks a wrong current password on its field", async() => {
    server.use(http.post(url("/api/auth/change-password"), () =>
      errorResponse("users.invalid_current_password", 400, "La contraseña actual no es correcta")));
    renderProfile({ tab: "password" });
    await passwordPanel();
    fillPasswordForm();
    submitPassword();

    expect(await screen.findByText("Contraseña actual incorrecta", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByLabelText(/^contraseña actual/i)).toHaveAttribute("aria-invalid", "true");
    expect(getTokens().accessToken).toBe("access-1");
  });

  it("shows the wait when too many attempts were made", async() => {
    server.use(http.post(url("/api/auth/change-password"), () =>
      errorResponse("common.too_many_requests", 429, "Too many", { "Retry-After": "45" })));
    renderProfile({ tab: "password" });
    await passwordPanel();
    fillPasswordForm();
    submitPassword();

    expect(await screen.findByRole("alert", {}, { timeout: 5000 })).toHaveTextContent("Inténtalo de nuevo en 45 segundos.");
  });
});
