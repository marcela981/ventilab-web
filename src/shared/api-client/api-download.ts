/*
* Funcionalidad: Text file download helpers
* Descripción: `apiGetText(path, options)` reads a typed GET endpoint that answers a text file (CSV exports) through the shared httpClient (Bearer token, 401 refresh, timeout category) and returns its raw content plus the file name of the Content-Disposition header when the browser can read it. A JSON error body is still parsed, so failures reject with the usual ApiError (code, status, Retry-After). `saveTextFile(file, fallbackName)` hands the content to the browser as a download (Blob + object URL + temporary anchor). v1.1 (O3 review + O4b): saveTextFile prepends a UTF-8 BOM to CSV content (withCsvBom) so Excel es-CO shows accents; apiGetText also returns the response headers (lowercase names) and isHeaderTrue reads flags such as X-Export-Truncated. Depends on axios, http-client, api-request, api-types, timeouts and api-error.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import { toApiError } from "./api-error";
import { buildPath } from "./api-request";
import type { CallOptions, PathsWithMethod, RequestArgs } from "./api-types";
import { httpClient } from "./http-client";
import { TIMEOUTS } from "./timeouts";

export type ApiTextFile = {
  content: string
  filename: string | null
  /** Response headers with lowercase names (only the ones CORS exposes in the browser); absent when built by hand. */
  headers?: Readonly<Record<string, string>>
};

type LooseOptions = CallOptions & {
  params?: Record<string, unknown>
  query?: Record<string, unknown>
};

const CSV_MIME_TYPE = "text/csv;charset=utf-8";
const UTF8_BOM = "\uFEFF";

function toHeaderRecord(headers: unknown): Record<string, string> {
  const record: Record<string, string> = {};

  if (!headers || typeof headers !== "object") {
    return record;
  }

  for (const [name, value] of Object.entries(headers as Record<string, unknown>)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      record[name.toLowerCase()] = String(value);
    }
  }

  return record;
}

/** True when a header such as X-Export-Truncated says "true" (case-insensitive). */
export function isHeaderTrue(file: ApiTextFile, name: string): boolean {
  return file.headers?.[name.toLowerCase()]?.trim().toLowerCase() === "true";
}

/** CSV content with a UTF-8 BOM so spreadsheet apps (Excel es-CO) read accents; other types are left as they are. */
export function withCsvBom(content: string, mimeType: string): string {
  return mimeType.toLowerCase().startsWith("text/csv") && !content.startsWith(UTF8_BOM) ? `${UTF8_BOM}${content}` : content;
}

// Keeps a text body as is; an error answered as JSON is parsed so api-error can read its code.
function parseTextBody(data: unknown, headers: unknown): unknown {
  if (typeof data !== "string") {
    return data;
  }

  const contentType = String((headers as Record<string, unknown> | undefined)?.["content-type"] ?? "");

  if (!contentType.includes("json")) {
    return data;
  }

  try {
    return JSON.parse(data) as unknown;
  } catch {
    return data;
  }
}

function unquote(value: string): string {
  return value.trim().replace(/^"(.*)"$/, "$1");
}

/** File name of a Content-Disposition header (RFC 5987 `filename*` first); null when absent or unreadable. */
export function filenameFromContentDisposition(header: unknown): string | null {
  if (typeof header !== "string") {
    return null;
  }

  const encoded = /filename\*\s*=\s*(?:UTF-8'[^']*')?([^;]+)/i.exec(header);

  if (encoded?.[1]) {
    try {
      return decodeURIComponent(unquote(encoded[1])) || null;
    } catch {
      // Malformed percent-encoding: fall back to the plain parameter.
    }
  }

  const plain = /filename\s*=\s*("[^"]*"|[^;]+)/i.exec(header);
  const name = plain?.[1] ? unquote(plain[1]) : "";

  return name || null;
}

export async function apiGetText<P extends PathsWithMethod<"get">>(
  path: P,
  ...args: RequestArgs<P, "get">
): Promise<ApiTextFile> {
  const options = (args[0] ?? {}) as LooseOptions;

  try {
    const config: AxiosRequestConfig = {
      method: "get",
      url: buildPath(path, options.params),
      responseType: "text",
      transformResponse: [parseTextBody],
    };

    if (options.query) {
      config.params = options.query;
    }

    if (options.signal) {
      config.signal = options.signal;
    }

    if (options.headers) {
      config.headers = options.headers;
    }

    if (options.timeout) {
      config.timeout = TIMEOUTS[options.timeout];
    }

    const response = await httpClient.request<unknown>(config);
    const content = typeof response.data === "string" ? response.data : "";

    return {
      content,
      filename: filenameFromContentDisposition(response.headers["content-disposition"]),
      headers: toHeaderRecord(response.headers),
    };
  } catch (error) {
    if (axios.isCancel(error)) {
      throw error;
    }

    throw toApiError(error);
  }
}

export function saveTextFile(file: ApiTextFile, fallbackName: string, mimeType: string = CSV_MIME_TYPE): void {
  const url = URL.createObjectURL(new Blob([withCsvBom(file.content, mimeType)], { type: mimeType }));
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = file.filename ?? fallbackName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoked on the next task so the browser has started the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
