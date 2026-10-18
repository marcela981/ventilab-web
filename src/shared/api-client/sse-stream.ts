/*
* Funcionalidad: Server-sent events stream helper
* Descripción: POSTs a JSON body to a backend text/event-stream route with fetch + ReadableStream (EventSource cannot POST or send a bearer token) and exposes the events as an async iterator (postEventStream) or as callbacks (runEventStream). Same backend origin, bearer token and credentials as the axios client; on a 401 it reuses the shared single-flight refresh and retries once (auth routes never refresh). Errors before the stream starts (validation, 403, 404 unpublished, 429 with Retry-After or retry info in the body, 503 provider unavailable) become ApiError through apiErrorFromResponse; `event: error` after the stream started is yielded as an event, and a stream that closes before `done`/`error` yields `network.stream_interrupted`. Aborting the signal ends the iteration silently. Depends on env, api-error, token-storage and token-refresh. v1.1 (B5): the stream request sends Accept-Language: es and the client-built error messages are Spanish (CLIENT_ERROR_MESSAGES).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { BACKEND_ORIGIN } from "@shared/lib/env";
import { ApiError, apiErrorFromResponse, CLIENT_ERROR_CODES, CLIENT_ERROR_MESSAGES, parseRetryAfter, toApiError } from "./api-error";
import { LANGUAGE_HEADERS } from "./request-language";
import { REFRESH_EXEMPT_ROUTES } from "./http-client";
import { refreshAccessToken } from "./token-refresh";
import { getAccessToken } from "./token-storage";

export type SseFrame = {
  event: string
  data: string
};

export type SseParser = {
  feed: (chunk: string) => SseFrame[]
  flush: () => SseFrame[]
};

// The `done` payload of the AI tutor routes; other routes pass their own type.
export type TutorStreamDone = {
  aiCallId: string
  messageId: string
  conversationId: string
};

export type EventStreamEvent<TDone = TutorStreamDone> =
  | { type: "delta", text: string }
  | { type: "done", data: TDone }
  | { type: "error", code: string, message: string };

export type EventStreamOptions = {
  signal?: AbortSignal | undefined
};

export type EventStreamHandlers<TDone = TutorStreamDone> = {
  onDelta?: (text: string) => void
  onDone?: (data: TDone) => void
  onError?: (error: { code: string, message: string }) => void
};

const LINE_BREAK = /\r\n|\r|\n/;

// Incremental parser of the text/event-stream format (WHATWG HTML, "Server-sent events").
export function createSseParser(): SseParser {
  let buffer = "";
  let eventName = "";
  let dataLines: string[] = [];

  function processLine(line: string, frames: SseFrame[]): void {
    if (line === "") {
      if (dataLines.length > 0) {
        frames.push({ event: eventName || "message", data: dataLines.join("\n") });
      }

      eventName = "";
      dataLines = [];

      return;
    }

    if (line.startsWith(":")) {
      return;
    }

    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    const rawValue = colon === -1 ? "" : line.slice(colon + 1);
    const value = rawValue.startsWith(" ") ? rawValue.slice(1) : rawValue;

    if (field === "event") {
      eventName = value;
    } else if (field === "data") {
      dataLines.push(value);
    }
  }

  return {
    feed(chunk) {
      buffer += chunk;

      const frames: SseFrame[] = [];

      for (let match = LINE_BREAK.exec(buffer); match !== null; match = LINE_BREAK.exec(buffer)) {
        // A trailing "\r" may be the first half of a "\r\n" split across chunks.
        if (match[0] === "\r" && match.index === buffer.length - 1) {
          break;
        }

        processLine(buffer.slice(0, match.index), frames);
        buffer = buffer.slice(match.index + match[0].length);
      }

      return frames;
    },
    flush() {
      const frames: SseFrame[] = [];

      if (buffer.endsWith("\r")) {
        processLine(buffer.slice(0, -1), frames);
      }

      // An incomplete frame at the end of the stream is discarded, as the spec requires.
      buffer = "";
      eventName = "";
      dataLines = [];

      return frames;
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJson(data: string): unknown {
  try {
    return JSON.parse(data) as unknown;
  } catch {
    return undefined;
  }
}

function toStreamEvent<TDone>(frame: SseFrame): EventStreamEvent<TDone> | null {
  const payload = parseJson(frame.data);

  if (frame.event === "delta") {
    return isRecord(payload) && typeof payload.text === "string" ? { type: "delta", text: payload.text } : null;
  }

  if (frame.event === "done") {
    return isRecord(payload) ? { type: "done", data: payload as TDone } : null;
  }

  if (frame.event === "error") {
    const body = isRecord(payload) ? payload : {};

    return {
      type: "error",
      code: typeof body.code === "string" ? body.code : CLIENT_ERROR_CODES.unknown,
      message: typeof body.message === "string" ? body.message : CLIENT_ERROR_MESSAGES.streamFailed,
    };
  }

  return null;
}

function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError";
}

async function readBody(response: Response): Promise<unknown> {
  try {
    return await response.json() as unknown;
  } catch {
    return null;
  }
}

// Retry-After header first; the backend may also put `retryAfter` (seconds) or `resetAt` in the error data.
function retryAfterFrom(response: Response, body: unknown): unknown {
  const header = response.headers.get("retry-after");

  if (header !== null || !isRecord(body) || !isRecord(body.data)) {
    return header;
  }

  const { retryAfter, resetAt } = body.data;

  if (typeof retryAfter === "number") {
    return String(retryAfter);
  }

  return typeof resetAt === "string" && parseRetryAfter(resetAt) !== undefined ? resetAt : undefined;
}

async function toResponseError(response: Response): Promise<ApiError> {
  const body = await readBody(response);

  return apiErrorFromResponse({ status: response.status, body, retryAfterHeader: retryAfterFrom(response, body) });
}

function send(path: string, body: unknown, signal: AbortSignal | undefined): Promise<Response> {
  const token = getAccessToken();
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "text/event-stream", ...LANGUAGE_HEADERS };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`${BACKEND_ORIGIN}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
    credentials: "include",
    ...(signal ? { signal } : {}),
  });
}

// Returns null when the caller aborted before the stream opened.
async function open(path: string, body: unknown, signal: AbortSignal | undefined): Promise<Response | null> {
  let response: Response;

  try {
    const sentToken = getAccessToken();

    response = await send(path, body, signal);

    if (response.status === 401 && !REFRESH_EXEMPT_ROUTES.some((pattern) => pattern.test(path))) {
      const currentToken = getAccessToken();

      // A concurrent request may have refreshed the token already: retry without another refresh.
      if (!currentToken || currentToken === sentToken) {
        await refreshAccessToken().catch((refreshError: unknown) => {
          throw toApiError(refreshError);
        });
      }

      response = await send(path, body, signal);
    }
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) {
      return null;
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError({
      code: CLIENT_ERROR_CODES.networkUnavailable,
      message: CLIENT_ERROR_MESSAGES.unreachable,
      status: 0,
    });
  }

  if (!response.ok) {
    throw await toResponseError(response);
  }

  return response;
}

export async function* postEventStream<TDone = TutorStreamDone>(
  path: string,
  body: unknown,
  { signal }: EventStreamOptions = {},
): AsyncGenerator<EventStreamEvent<TDone>, void, undefined> {
  if (signal?.aborted) {
    return;
  }

  const response = await open(path, body, signal);

  if (!response) {
    return;
  }

  if (!response.body) {
    yield { type: "error", code: CLIENT_ERROR_CODES.streamInterrupted, message: CLIENT_ERROR_MESSAGES.streamEmpty };

    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = createSseParser();

  try {
    for (;;) {
      const { done, value } = await reader.read();
      const frames = done ? [...parser.feed(decoder.decode()), ...parser.flush()] : parser.feed(decoder.decode(value, { stream: true }));

      for (const frame of frames) {
        const event = toStreamEvent<TDone>(frame);

        if (event) {
          yield event;

          if (event.type !== "delta") {
            return;
          }
        }

        if (signal?.aborted) {
          return;
        }
      }

      if (done) {
        break;
      }
    }
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) {
      return;
    }

    yield { type: "error", code: CLIENT_ERROR_CODES.streamInterrupted, message: CLIENT_ERROR_MESSAGES.streamInterrupted };

    return;
  } finally {
    // Cancelling the body closes the connection, which cancels the AI call on the backend.
    reader.cancel().catch(() => undefined);
  }

  if (!signal?.aborted) {
    yield { type: "error", code: CLIENT_ERROR_CODES.streamInterrupted, message: CLIENT_ERROR_MESSAGES.streamInterrupted };
  }
}

export async function runEventStream<TDone = TutorStreamDone>(
  path: string,
  body: unknown,
  handlers: EventStreamHandlers<TDone>,
  options: EventStreamOptions = {},
): Promise<void> {
  for await (const event of postEventStream<TDone>(path, body, options)) {
    if (event.type === "delta") {
      handlers.onDelta?.(event.text);
    } else if (event.type === "done") {
      handlers.onDone?.(event.data);
    } else {
      handlers.onError?.({ code: event.code, message: event.message });
    }
  }
}
