/*
* Funcionalidad: AdminResearchPage tests
* Descripción: /admin/research with msw: explains the export (long format, pseudonymized ids, what is left out), downloads `GET /api/analytics/research/export.csv` with the selected student group, and a 503 shows "La clave de anonimización no está configurada en el servidor". Depends on Testing Library, msw, vitest and the admin console page and test helpers.
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
import { RESEARCH_EXPORT_NOT_CONFIGURED_MESSAGE } from "../entities/admin-console-error-messages";
import { apiUrl, envelope, errorResponse, groupDto, renderAdminConsole } from "./admin-console-test-helpers";
import { ADMIN_RESEARCH_COPY, AdminResearchPage } from "./admin-research.page";

vi.setConfig({ testTimeout: 20_000 });

const server = setupServer();
let exported: URLSearchParams[];
let exportStatus: number;
const original = { createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL };

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  exported = [];
  exportStatus = 200;
  URL.createObjectURL = vi.fn(() => "blob:research");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  server.use(
    http.get(apiUrl("/api/groups"), () => HttpResponse.json(envelope([groupDto("g1", "Grupo A"), groupDto("t1", "Docentes", "TEACHER")]))),
    http.get(apiUrl("/api/analytics/research/export.csv"), ({ request }) => {
      exported.push(new URL(request.url).searchParams);

      return exportStatus === 200
        ? new HttpResponse("participant,group,domain,item,metric,value\n", { headers: { "Content-Type": "text/csv" } })
        : errorResponse("analytics.export_not_configured", exportStatus);
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
  URL.createObjectURL = original.createObjectURL;
  URL.revokeObjectURL = original.revokeObjectURL;
});

afterAll(() => {
  server.close();
});

describe("AdminResearchPage", () => {
  it("explains the export and downloads it for the selected student group", async() => {
    renderAdminConsole(<AdminResearchPage />);

    expect(screen.getByText(ADMIN_RESEARCH_COPY.format)).toBeInTheDocument();
    expect(screen.getByText(ADMIN_RESEARCH_COPY.excludes[0])).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("combobox", { name: ADMIN_RESEARCH_COPY.group }));
    const listbox = await screen.findByRole("listbox");

    expect(within(listbox).queryByRole("option", { name: "Docentes" })).not.toBeInTheDocument();
    fireEvent.click(within(listbox).getByRole("option", { name: "Grupo A" }));
    fireEvent.click(screen.getByRole("button", { name: ADMIN_RESEARCH_COPY.download }));

    await waitFor(() => expect(exported).toHaveLength(1));
    expect(exported[0]?.get("groupId")).toBe("g1");
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(1));
  });

  it("explains a missing anonymization key on 503", async() => {
    exportStatus = 503;
    renderAdminConsole(<AdminResearchPage />);

    fireEvent.click(screen.getByRole("button", { name: ADMIN_RESEARCH_COPY.download }));

    const alerts = await screen.findAllByText(RESEARCH_EXPORT_NOT_CONFIGURED_MESSAGE);

    expect(alerts.length).toBeGreaterThan(0);
    expect(exported[0]?.has("groupId")).toBe(false);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
