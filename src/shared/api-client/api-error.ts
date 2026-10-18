/*
* Funcionalidad: API error normalization
* Descripción: Single frontend error type (ApiError) built from the backend error envelope `{ success:false, code, message, data, traceId }`, the Retry-After header, or a network failure. Client-side codes: `network.unavailable`, `network.timeout`, `network.stream_interrupted`, `auth.session_expired`, `common.unknown`. No runtime dependencies (axios errors are detected by their `isAxiosError` flag, the same check axios uses), so it can live in the app shell without pulling axios in. v1.1 (T0 learning): apiErrorFromResponse builds the ApiError from a raw status/body/Retry-After triple so the fetch-based SSE helper maps errors exactly like axios responses (toApiError reuses it); new client code `network.stream_interrupted`. v1.2 (B5): the client-built fallback messages are Spanish (CLIENT_ERROR_MESSAGES), like the backend messages requested with Accept-Language: es.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const CLIENT_ERROR_CODES = {
  networkUnavailable: "network.unavailable",
  networkTimeout: "network.timeout",
  streamInterrupted: "network.stream_interrupted",
  sessionExpired: "auth.session_expired",
  unknown: "common.unknown",
} as const;

// Messages of the errors built on the client (no backend message to show).
export const CLIENT_ERROR_MESSAGES = {
  timeout: "El servidor tardó demasiado en responder",
  unreachable: "No se pudo conectar con el servidor",
  unknown: "Error desconocido",
  requestFailed: (status: number) => `La solicitud falló con el estado ${status}`,
  streamFailed: "No se pudo completar la respuesta",
  streamEmpty: "La respuesta llegó vacía",
  streamInterrupted: "La conexión se cerró antes de terminar la respuesta",
  sessionExpired: "La sesión expiró",
  refreshWithoutToken: "La renovación de la sesión no devolvió un token de acceso",
} as const;

export type ApiErrorInit = {
  code: string
  message: string
  status: number
  details?: unknown
  traceId?: string | undefined
  retryAfter?: number | undefined
};

export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details: unknown;
  public readonly traceId: string | undefined;
  public readonly retryAfter: number | undefined;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = "ApiError";
    this.code = init.code;
    this.status = init.status;
    this.details = init.details ?? null;
    this.traceId = init.traceId;
    this.retryAfter = init.retryAfter;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

type ErrorBody = {
  code?: unknown
  message?: unknown
  data?: unknown
  traceId?: unknown
};

const TIMEOUT_CODES = new Set(["ECONNABORTED", "ETIMEDOUT"]);

export function normalizeMessage(message: unknown): string | null {
  if (typeof message === "string") {
    return message;
  }

  if (Array.isArray(message)) {
    return message.filter((item): item is string => typeof item === "string").join(" ");
  }

  return null;
}

export function parseRetryAfter(header: unknown, now: number = Date.now()): number | undefined {
  if (typeof header !== "string" || header.trim() === "") {
    return undefined;
  }

  const seconds = Number(header);

  if (Number.isFinite(seconds)) {
    return Math.max(0, Math.ceil(seconds));
  }

  const date = Date.parse(header);

  return Number.isNaN(date) ? undefined : Math.max(0, Math.ceil((date - now) / 1000));
}

type AxiosLikeError = {
  isAxiosError: true
  code?: string
  response?: {
    status: number
    data: unknown
    headers?: Record<string, unknown>
  }
};

function isAxiosError(error: unknown): error is AxiosLikeError {
  return typeof error === "object" && error !== null && (error as { isAxiosError?: unknown }).isAxiosError === true;
}

function asBody(data: unknown): ErrorBody {
  return typeof data === "object" && data !== null ? (data as ErrorBody) : {};
}

export type HttpErrorResponse = {
  status: number
  body: unknown
  retryAfterHeader?: unknown
};

export function apiErrorFromResponse({ status, body: data, retryAfterHeader }: HttpErrorResponse): ApiError {
  const body = asBody(data);

  return new ApiError({
    code: typeof body.code === "string" ? body.code : CLIENT_ERROR_CODES.unknown,
    message: normalizeMessage(body.message) ?? CLIENT_ERROR_MESSAGES.requestFailed(status),
    status,
    details: body.data ?? null,
    traceId: typeof body.traceId === "string" ? body.traceId : undefined,
    retryAfter: parseRetryAfter(retryAfterHeader),
  });
}

export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }

  if (isAxiosError(error)) {
    if (!error.response) {
      const isTimeout = TIMEOUT_CODES.has(error.code ?? "");

      return new ApiError({
        code: isTimeout ? CLIENT_ERROR_CODES.networkTimeout : CLIENT_ERROR_CODES.networkUnavailable,
        message: isTimeout ? CLIENT_ERROR_MESSAGES.timeout : CLIENT_ERROR_MESSAGES.unreachable,
        status: 0,
      });
    }

    const { status, data, headers } = error.response;

    return apiErrorFromResponse({ status, body: data, retryAfterHeader: headers?.["retry-after"] });
  }

  return new ApiError({
    code: CLIENT_ERROR_CODES.unknown,
    message: error instanceof Error ? error.message : CLIENT_ERROR_MESSAGES.unknown,
    status: 0,
  });
}
