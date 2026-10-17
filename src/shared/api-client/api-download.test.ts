/*
* Funcionalidad: Text file download helper tests
* Descripción: apiGetText with msw: returns the raw CSV body and the Content-Disposition file name, and rejects with an ApiError carrying the backend code and status when the export answers a JSON error; the Content-Disposition parser (quoted, plain and RFC 5987 names); saveTextFile builds an object URL and clicks a download anchor with the file name or the fallback. v1.1 (O3 review + O4b): response headers (X-Export-Truncated), withCsvBom and the BOM in the saved CSV blob. Depends on vitest, msw and the api-client modules.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { apiGetText, filenameFromContentDisposition, isHeaderTrue, saveTextFile, withCsvBom } from "./api-download";
import { isApiError } from "./api-error";

const EXPORT_PATH = "/api/analytics/groups/{groupId}/export.csv";
const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});

describe("apiGetText", () => {
  it("returns the raw CSV body and the file name", async() => {
    server.use(http.get(`${BACKEND_ORIGIN}/api/analytics/groups/g-1/export.csv`, () => new HttpResponse("userId,email\nu1,a@b.co\n", {
      headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=\"grupo-g-1.csv\"" },
    })));

    await expect(apiGetText(EXPORT_PATH, { params: { groupId: "g-1" } })).resolves.toMatchObject({
      content: "userId,email\nu1,a@b.co\n",
      filename: "grupo-g-1.csv",
    });
  });

  it("returns the response headers so X-Export-Truncated can be read", async() => {
    server.use(http.get(`${BACKEND_ORIGIN}/api/analytics/groups/g-3/export.csv`, () => new HttpResponse("a\n", {
      headers: { "Content-Type": "text/csv", "X-Export-Truncated": "true" },
    })));

    const file = await apiGetText(EXPORT_PATH, { params: { groupId: "g-3" } });

    expect(isHeaderTrue(file, "X-Export-Truncated")).toBe(true);
    expect(isHeaderTrue({ content: "", filename: null }, "X-Export-Truncated")).toBe(false);
  });

  it("rejects with the backend error of a JSON error body", async() => {
    server.use(http.get(`${BACKEND_ORIGIN}/api/analytics/groups/g-2/export.csv`, () => HttpResponse.json(
      { success: false, message: "Forbidden", data: null, code: "analytics.scope_forbidden", timestamp: "", traceId: "t", pagination: null },
      { status: 403 },
    )));

    const error: unknown = await apiGetText(EXPORT_PATH, { params: { groupId: "g-2" } }).catch((caught: unknown) => caught);

    expect(isApiError(error)).toBe(true);
    expect(error).toMatchObject({ status: 403, code: "analytics.scope_forbidden" });
  });
});

describe("filenameFromContentDisposition", () => {
  it("reads quoted, plain and encoded names", () => {
    expect(filenameFromContentDisposition("attachment; filename=\"a b.csv\"")).toBe("a b.csv");
    expect(filenameFromContentDisposition("attachment; filename=plain.csv")).toBe("plain.csv");
    expect(filenameFromContentDisposition("attachment; filename=\"x.csv\"; filename*=UTF-8''grupo%20%C3%B1.csv")).toBe("grupo ñ.csv");
    expect(filenameFromContentDisposition("attachment")).toBeNull();
    expect(filenameFromContentDisposition(undefined)).toBeNull();
  });
});

describe("withCsvBom", () => {
  it("prepends one UTF-8 BOM to CSV content only", () => {
    expect(withCsvBom("año,nota", "text/csv;charset=utf-8")).toBe("\uFEFFaño,nota");
    expect(withCsvBom("\uFEFFaño", "text/csv")).toBe("\uFEFFaño");
    expect(withCsvBom("{}", "application/json")).toBe("{}");
  });
});

describe("saveTextFile", () => {
  it("writes the CSV blob with a leading BOM", () => {
    const blobs: Blob[] = [];
    const original = { createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL };

    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);

      return "blob:bom";
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    saveTextFile({ content: "ñ", filename: "a.csv" }, "a.csv");

    // "\uFEFF" is 3 bytes in UTF-8 and "ñ" is 2.
    expect(blobs[0]?.size).toBe(5);
    URL.createObjectURL = original.createObjectURL;
    URL.revokeObjectURL = original.revokeObjectURL;
  });

  it("clicks a download anchor with the file name or the fallback", async() => {
    const createObjectURL = vi.fn(() => "blob:test");
    const original = { createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL };

    // jsdom has no object URLs: install stubs and put the originals back at the end.
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const names: string[] = [];

    click.mockImplementation(function record(this: HTMLAnchorElement) {
      names.push(this.download);
    });

    saveTextFile({ content: "a,b", filename: "named.csv" }, "fallback.csv");
    saveTextFile({ content: "a,b", filename: null }, "fallback.csv");

    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(names).toEqual(["named.csv", "fallback.csv"]);
    // The object URLs are revoked on the next task: let it run before the stubs go away.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
    URL.createObjectURL = original.createObjectURL;
    URL.revokeObjectURL = original.revokeObjectURL;
  });
});
