/*
* Funcionalidad: ApiContractBanner tests
* Descripción: Renders the API contract banner against msw: hidden for a matching contract, shown to an admin for a mismatch and for a server without `GET /api/version` (404), and never requested nor shown for teachers and students. Depends on Testing Library, msw, SWR, the session context and the banner.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { SWRConfig } from "swr";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import type { Role } from "@shared/session/session.entity";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import { ApiContractBanner } from "./api-contract-banner";

const server = setupServer();
let versionRequests = 0;

function sessionValue(role: Role): SessionContextValue {
  return {
    status: "authenticated",
    user: { id: "u1", email: "ana@ventylab.demo", name: "Ana", image: null, role },
    role,
    permissions: [],
    error: null,
    hasRole: (...roles: Role[]) => roles.includes(role),
    hasPermission: () => false,
    establishSession: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
    reloadSession: vi.fn(),
    handleRoleChanged: vi.fn(),
  };
}

function serveVersion(response: () => Response) {
  server.use(http.get(`${BACKEND_ORIGIN}/api/version`, () => {
    versionRequests += 1;

    return response();
  }));
}

function renderBanner(role: Role) {
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <SessionContext.Provider value={sessionValue(role)}>
        <ApiContractBanner />
      </SessionContext.Provider>
    </SWRConfig>,
  );
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  versionRequests = 0;
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("ApiContractBanner", () => {
  it("stays hidden when the server contract matches", async() => {
    serveVersion(() => HttpResponse.json({ sha: "0123456789", builtAt: "2026-11-04T10:00:00.000Z", contract: 1 }));
    renderBanner("ADMIN");

    await waitFor(() => expect(versionRequests).toBe(1));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("warns an admin about a contract mismatch", async() => {
    serveVersion(() => HttpResponse.json({ data: { sha: "abcdef0123", builtAt: "unknown", contract: 2 } }));
    renderBanner("ADMIN");

    expect(await screen.findByRole("status")).toHaveTextContent(
      "El servidor (versión abcdef0, contrato v2) no coincide con el contrato que espera la web (v1). Redespliegue el servidor.",
    );
  });

  it("warns an admin when the server has no version endpoint", async() => {
    serveVersion(() => HttpResponse.json({ success: false, message: "Not Found", data: null }, { status: 404 }));
    renderBanner("ADMIN");

    expect(await screen.findByRole("status")).toHaveTextContent("El servidor no informa su versión");
    expect(versionRequests).toBe(1);
  });

  it.each<Role>(["TEACHER", "STUDENT"])("never asks nor warns a %s", async(role) => {
    serveVersion(() => HttpResponse.json({ success: false, message: "Not Found", data: null }, { status: 404 }));
    renderBanner(role);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(versionRequests).toBe(0);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
