/*
* Funcionalidad: AdminAuditPage tests
* Descripción: /admin/audit with msw: lists the rows of `GET /api/audit` with the URL filters sent as the Bogota ISO range, the detail dialog shows only the changed fields and loads the target history, the CSV export shows the truncation notice when X-Export-Truncated is true, a page beyond the last one moves to the last page, and a failing request shows the error instead of stale rows. Depends on Testing Library, msw, vitest and the admin console page and test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditLogEntryDTO } from "../../api/dtos/admin-console.dto";
import { AUDIT_DIALOG_COPY } from "../components/audit-entry-dialog";
import { AUDIT_TABLE_COPY } from "../components/audit-table";
import { ADMIN_AUDIT_COPY, AdminAuditPage } from "./admin-audit.page";
import { apiUrl, envelope, errorResponse, renderAdminConsole } from "./admin-console-test-helpers";

const router = vi.hoisted(() => ({
  pathname: "/admin/audit",
  asPath: "/admin/audit",
  isReady: true,
  query: {} as Record<string, string>,
  replace: vi.fn(() => Promise.resolve(true)),
  push: vi.fn(() => Promise.resolve(true)),
  prefetch: () => Promise.resolve(),
  events: { on: () => undefined, off: () => undefined, emit: () => undefined },
}));

vi.mock("next/router", () => ({ useRouter: () => router }));

vi.setConfig({ testTimeout: 20_000 });

function auditDto(id: string, overrides: Partial<AuditLogEntryDTO> = {}): AuditLogEntryDTO {
  return {
    id,
    action: "user_role_changed",
    actorId: "admin-1",
    actorRole: "ADMIN",
    after: { role: "TEACHER", isActive: true } as unknown as AuditLogEntryDTO["after"],
    before: { role: "STUDENT", isActive: true } as unknown as AuditLogEntryDTO["before"],
    description: "Role changed by an administrator",
    ip: "203.0.113.10",
    metadata: null,
    performedAt: "2026-10-11T14:20:00.000Z",
    reason: "Coordinación",
    requestId: "req-1",
    targetCollection: "users",
    targetId: "u-7",
    targetType: "user",
    ...overrides,
  };
}

const server = setupServer();
let listQueries: URLSearchParams[];
let listStatus: number;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  listQueries = [];
  listStatus = 200;
  router.query = {};
  router.replace.mockClear();
  server.use(
    http.get(apiUrl("/api/audit"), ({ request }) => {
      const params = new URL(request.url).searchParams;

      listQueries.push(params);

      if (listStatus !== 200) {
        return errorResponse("internal", listStatus);
      }

      if (params.get("page") === "5") {
        return HttpResponse.json(envelope([], { total: 2, pages: 1, page: 5, limit: 20 }));
      }

      return HttpResponse.json(envelope([auditDto("a-1"), auditDto("a-2", { action: "user_status_changed", actorId: null, actorRole: null })], { total: 2, pages: 1, page: 1, limit: 20 }));
    }),
    http.get(apiUrl("/api/audit/targets/:type/:id"), ({ params }) => HttpResponse.json(envelope(
      [auditDto("h-1", { action: "user_created", targetType: String(params.type), targetId: String(params.id), before: null })],
      { total: 1, pages: 1, page: 1, limit: 10 },
    ))),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("AdminAuditPage", () => {
  it("lists the audit rows with the URL filters sent as the Bogota range", async() => {
    router.query = { action: "user_role_changed", from: "2026-10-01", to: "2026-10-01" };
    renderAdminConsole(<AdminAuditPage />, { keepPreviousData: true });

    expect(await screen.findAllByText("user_role_changed")).not.toHaveLength(0);
    expect(screen.getByText(AUDIT_TABLE_COPY.system)).toBeInTheDocument();
    const query = listQueries[0];

    expect(query?.get("action")).toBe("user_role_changed");
    expect(query?.get("from")).toBe("2026-10-01T05:00:00.000Z");
    expect(query?.get("to")).toBe("2026-10-02T05:00:00.000Z");
    expect(query?.get("sortOrder")).toBe("desc");
  });

  it("shows only the changed fields in the detail and loads the target history", async() => {
    renderAdminConsole(<AdminAuditPage />);

    const buttons = await screen.findAllByRole("button", { name: /^Ver detalle de user_role_changed/ });

    fireEvent.click(buttons[0] as HTMLElement);
    const dialog = await screen.findByRole("dialog");
    const changes = within(dialog).getByRole("table", { name: AUDIT_DIALOG_COPY.changesCaption });

    expect(within(changes).getByRole("rowheader", { name: "role" })).toBeInTheDocument();
    expect(within(changes).queryByRole("rowheader", { name: "isActive" })).not.toBeInTheDocument();
    expect(within(changes).getByText("STUDENT")).toBeInTheDocument();
    expect(within(changes).getByText("TEACHER")).toBeInTheDocument();
    expect(within(dialog).getByText("203.0.113.10")).toBeInTheDocument();
    expect(within(dialog).getByText("Coordinación")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: AUDIT_DIALOG_COPY.history }));

    expect(await within(dialog).findByText("user_created")).toBeInTheDocument();
  });

  it("shows the truncation notice when the export is truncated", async() => {
    const original = { createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL };
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const exported: URLSearchParams[] = [];

    URL.createObjectURL = vi.fn(() => "blob:audit");
    URL.revokeObjectURL = vi.fn();
    server.use(http.get(apiUrl("/api/audit/export"), ({ request }) => {
      exported.push(new URL(request.url).searchParams);

      return new HttpResponse("id,action\n", { headers: { "Content-Type": "text/csv", "X-Export-Truncated": "true" } });
    }));

    try {
      router.query = { action: "user_role_changed" };
      renderAdminConsole(<AdminAuditPage />);
      await screen.findAllByText("user_role_changed");

      fireEvent.click(screen.getByRole("button", { name: ADMIN_AUDIT_COPY.export }));

      expect(await screen.findByText(ADMIN_AUDIT_COPY.truncated)).toBeInTheDocument();
      expect(exported[0]?.get("action")).toBe("user_role_changed");
      expect(exported[0]?.has("page")).toBe(false);
      await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    } finally {
      click.mockRestore();
      URL.createObjectURL = original.createObjectURL;
      URL.revokeObjectURL = original.revokeObjectURL;
    }
  });

  it("moves a page beyond the last one to the last page", async() => {
    router.query = { page: "5" };
    renderAdminConsole(<AdminAuditPage />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith({ pathname: "/admin/audit", query: {} }, undefined, { shallow: true }));
    expect(screen.queryByText(ADMIN_AUDIT_COPY.emptyTitle)).not.toBeInTheDocument();
  });

  it("shows the error of a failing request", async() => {
    listStatus = 500;
    renderAdminConsole(<AdminAuditPage />, { keepPreviousData: true });

    expect(await screen.findByText(ADMIN_AUDIT_COPY.loadErrorTitle)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
