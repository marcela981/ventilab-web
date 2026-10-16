/*
* Funcionalidad: AiChatProvider load-failure tests
* Descripción: Failure paths of the lazily loaded AI assistant drawer (A3 review R3-drawer-load-failure-silent): when the drawer chunk fails to import, or the drawer throws while rendering, the provider closes it again (the launcher's aria-expanded goes back to false and it drops aria-controls), shows the "No se pudo abrir el asistente. Inténtalo de nuevo." error toast, and the next click on the launcher retries the load and opens the drawer. retryImport and the drawer module are mocked so each test decides whether the import or the render fails. v1.1 (closing review R3-failure-after-successful-load, R3-no-toast-provider-branch-untested): a failure after the drawer already loaded shows the runtime message instead of the open-failure one, and without a ToastProvider a failure only closes the drawer and the next click still retries. v1.2: after a runtime failure, a later failure while opening shows the open-failure message again. Depends on vitest, Testing Library, a mocked next/router, the session context and the shared ToastProvider.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@shared/design-system/components/toast-provider";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import { AiChatLauncher } from "./ai-chat-launcher";
import { AI_CHAT_LOAD_ERROR, AI_CHAT_RUNTIME_ERROR, AiChatProvider } from "./ai-chat-provider";

const router = vi.hoisted(() => ({ pathname: "/learn", asPath: "/learn", push: vi.fn() }));
// failImports: number of next imports that reject; failRender: the drawer throws while rendering (React retries a
// failed render once, so it stays failing until the test clears it).
const control = vi.hoisted(() => ({ failImports: 0, failRender: false, imports: 0 }));

vi.mock("next/router", () => ({ useRouter: () => router }));

// One attempt per load (no backoff delays) whose outcome the test decides.
vi.mock("@shared/lib/retry-import", () => ({
  retryImport: <T,>(importFn: () => Promise<T>) => {
    control.imports += 1;

    if (control.failImports > 0) {
      control.failImports -= 1;

      return Promise.reject(new Error("Loading chunk ai-chat-drawer failed"));
    }

    return importFn();
  },
}));

vi.mock("./ai-chat-drawer", () => ({
  AiChatDrawer: function AiChatDrawerStub() {
    if (control.failRender) {
      throw new Error("drawer render failure");
    }

    return <div role="dialog" aria-label="Asistente IA">Drawer cargado</div>;
  },
}));

const SESSION: SessionContextValue = {
  status: "authenticated",
  user: { id: "u1", email: "laura@ventylab.demo", name: "Laura Gómez", image: null, role: "STUDENT" },
  role: "STUDENT",
  permissions: [],
  error: null,
  hasRole: () => true,
  hasPermission: () => false,
  establishSession: vi.fn(),
  signOut: vi.fn(() => Promise.resolve()),
  reloadSession: vi.fn(),
  handleRoleChanged: vi.fn(),
};

function tree(withToasts = true) {
  const provider = (
    <AiChatProvider>
      <AiChatLauncher />
    </AiChatProvider>
  );

  return <SessionContext.Provider value={SESSION}>{withToasts ? <ToastProvider>{provider}</ToastProvider> : provider}</SessionContext.Provider>;
}

function renderProvider(withToasts = true) {
  return render(tree(withToasts));
}

const launcher = () => screen.getByRole("button", { name: "Abrir asistente IA", hidden: true });

async function expectClosedWithToast() {
  expect(await screen.findByText(AI_CHAT_LOAD_ERROR)).toBeInTheDocument();
  await waitFor(() => expect(launcher()).toHaveAttribute("aria-expanded", "false"));
  expect(launcher()).not.toHaveAttribute("aria-controls");
  expect(screen.queryByText("Drawer cargado")).not.toBeInTheDocument();
}

beforeEach(() => {
  control.failImports = 0;
  control.failRender = false;
  control.imports = 0;
});

describe("AiChatProvider drawer load failures", () => {
  it("closes the drawer, shows a toast and retries the import on the next click", async() => {
    control.failImports = 1;
    // React logs the import error caught by the boundary.
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);

    renderProvider();

    fireEvent.click(launcher());
    await expectClosedWithToast();
    expect(AI_CHAT_LOAD_ERROR).toBe("No se pudo abrir el asistente. Inténtalo de nuevo.");

    fireEvent.click(launcher());

    expect(await screen.findByText("Drawer cargado")).toBeInTheDocument();
    expect(control.imports).toBe(2);
    expect(launcher()).toHaveAttribute("aria-expanded", "true");
    expect(launcher()).toHaveAttribute("aria-controls", "ai-chat-drawer");
    errors.mockRestore();
  });

  it("closes the drawer, shows a toast and renders it again on the next click after a render failure", async() => {
    control.failRender = true;
    // React logs the error caught by the boundary.
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);

    renderProvider();

    fireEvent.click(launcher());
    await expectClosedWithToast();

    control.failRender = false;
    fireEvent.click(launcher());

    expect(await screen.findByText("Drawer cargado")).toBeInTheDocument();
    expect(launcher()).toHaveAttribute("aria-expanded", "true");
    errors.mockRestore();
  });

  it("shows the runtime message, not the open-failure one, when the drawer fails after it loaded", async() => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const view = renderProvider();

    fireEvent.click(launcher());
    expect(await screen.findByText("Drawer cargado")).toBeInTheDocument();

    control.failRender = true;
    view.rerender(tree());

    expect(await screen.findByText(AI_CHAT_RUNTIME_ERROR)).toBeInTheDocument();
    expect(screen.queryByText(AI_CHAT_LOAD_ERROR)).not.toBeInTheDocument();
    await waitFor(() => expect(launcher()).toHaveAttribute("aria-expanded", "false"));

    // The ready flag was cleared: a failure on the next open is an open failure again.
    fireEvent.click(launcher());
    expect(await screen.findByText(AI_CHAT_LOAD_ERROR)).toBeInTheDocument();
    await waitFor(() => expect(launcher()).toHaveAttribute("aria-expanded", "false"));

    control.failRender = false;
    fireEvent.click(launcher());

    expect(await screen.findByText("Drawer cargado")).toBeInTheDocument();
    errors.mockRestore();
  });

  it("closes the drawer and retries on the next click without a ToastProvider", async() => {
    control.failImports = 1;
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);

    renderProvider(false);

    fireEvent.click(launcher());
    await waitFor(() => expect(launcher()).toHaveAttribute("aria-expanded", "false"));
    expect(launcher()).not.toHaveAttribute("aria-controls");

    fireEvent.click(launcher());

    expect(await screen.findByText("Drawer cargado")).toBeInTheDocument();
    expect(control.imports).toBe(2);
    errors.mockRestore();
  });
});
