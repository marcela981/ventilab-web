/*
* Funcionalidad: AiRatingWidget tests
* Descripción: Covers the "¿Te fue útil?" widget against an msw backend: the PUT /api/ai-ratings body, optimistic selection with rollback and error message, disabled state while saving, comment length limit and counter, aria-pressed, and loading the existing rating from GET /api/ai-ratings/mine. v1.1 (W7, Bloque 2): surface and scope in the PUT body, and the single retry of a 404 (stopped answer not stored yet). Depends on Vitest, Testing Library, msw and SWR.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { SWRConfig } from "swr";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { AiRatingWidget } from "./application/ai-rating-widget";
import { AI_RATING_COMMENT_MAX } from "./application/ai-rating.entity";
import type { AiRating } from "./application/ai-rating.entity";

const url = (path: string): string => `${BACKEND_ORIGIN}${path}`;

const envelope = (data: unknown) => ({
  success: true,
  message: "ok",
  data,
  code: null,
  timestamp: "2026-10-13T00:00:00.000Z",
  traceId: "trace-ok",
  pagination: null,
});

const failure = () =>
  HttpResponse.json(
    { success: false, message: "boom", data: null, code: "common.internal", timestamp: "2026-10-13T00:00:00.000Z", traceId: "t", pagination: null },
    { status: 500 },
  );

const server = setupServer();
let putBodies: unknown[] = [];
let mineQueries: string[] = [];

function mineHandler(data: unknown = null) {
  return http.get(url("/api/ai-ratings/mine"), ({ request }) => {
    mineQueries.push(new URL(request.url).search);

    return HttpResponse.json(envelope(data));
  });
}

function putHandler(respond: () => Response | Promise<Response> = () => HttpResponse.json(envelope(null))) {
  return http.put(url("/api/ai-ratings"), async({ request }) => {
    putBodies.push(await request.json());

    return respond();
  });
}

function renderWidget(initialRating?: AiRating | null) {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {initialRating === undefined ? (
        <AiRatingWidget targetType="MESSAGE" targetId="msg-1" />
      ) : (
        <AiRatingWidget targetType="MESSAGE" targetId="msg-1" initialRating={initialRating} />
      )}
    </SWRConfig>,
  );
}

const upButton = () => screen.getByRole("button", { name: "Sí, fue útil" });
const downButton = () => screen.getByRole("button", { name: "No fue útil" });

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
  putBodies = [];
  mineQueries = [];
});

afterAll(() => {
  server.close();
});

describe("AiRatingWidget", () => {
  it("loads the existing rating and reflects it with aria-pressed", async() => {
    server.use(mineHandler({ id: "r1", targetType: "MESSAGE", targetId: "msg-1", helpful: false, comment: "Confuso", createdAt: "x", updatedAt: "x" }));
    renderWidget();

    await waitFor(() => {
      expect(downButton()).toHaveAttribute("aria-pressed", "true");
    });
    expect(upButton()).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("textbox", { name: "Comentario (opcional)" })).toHaveValue("Confuso");
    expect(mineQueries).toEqual(["?targetType=MESSAGE&targetId=msg-1"]);
  });

  it("does not request the existing rating when initialRating is given", () => {
    server.use(putHandler());
    renderWidget(null);

    expect(upButton()).toHaveAttribute("aria-pressed", "false");
    expect(mineQueries).toEqual([]);
  });

  it("sends the right body, selects optimistically and disables while saving", async() => {
    server.use(putHandler(async() => {
      await delay(50);

      return HttpResponse.json(envelope(null));
    }));
    renderWidget(null);

    fireEvent.click(upButton());

    expect(upButton()).toHaveAttribute("aria-pressed", "true");
    expect(upButton()).toBeDisabled();
    expect(downButton()).toBeDisabled();

    await waitFor(() => {
      expect(upButton()).toBeEnabled();
    });
    expect(upButton()).toHaveAttribute("aria-pressed", "true");
    expect(putBodies).toEqual([{ targetType: "MESSAGE", targetId: "msg-1", helpful: true }]);
  });

  it("sends the surface and the scope of the answer", async() => {
    server.use(putHandler());
    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <AiRatingWidget targetType="MESSAGE" targetId="msg-1" initialRating={null} surface="ACCORDION" scope="PAGE" />
      </SWRConfig>,
    );

    fireEvent.click(downButton());

    await waitFor(() => expect(putBodies).toEqual([{ targetType: "MESSAGE", targetId: "msg-1", helpful: false, surface: "ACCORDION", scope: "PAGE" }]));
  });

  it("retries a 404 once (an answer stopped a moment ago may not be stored yet)", async() => {
    let calls = 0;

    server.use(putHandler(() => {
      calls += 1;

      return calls === 1
        ? HttpResponse.json(
          { success: false, message: "missing", data: null, code: "ai-ratings.target_not_found", timestamp: "x", traceId: "t", pagination: null },
          { status: 404 },
        )
        : HttpResponse.json(envelope(null));
    }));
    renderWidget(null);

    fireEvent.click(upButton());

    expect(await screen.findByRole("status")).toHaveTextContent("¡Gracias por tu valoración!");
    expect(putBodies).toHaveLength(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("rolls back the selection and shows an error when saving fails", async() => {
    server.use(putHandler(failure));
    renderWidget({ helpful: true, comment: "" });

    fireEvent.click(downButton());

    expect(downButton()).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar tu valoración");
    expect(downButton()).toHaveAttribute("aria-pressed", "false");
    expect(upButton()).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps the saved comment when changing the thumb and sends a trimmed comment", async() => {
    server.use(putHandler());
    renderWidget({ helpful: true, comment: "Claro" });

    fireEvent.click(downButton());
    await waitFor(() => {
      expect(putBodies).toHaveLength(1);
    });

    const field = screen.getByRole("textbox", { name: "Comentario (opcional)" });

    fireEvent.change(field, { target: { value: "  Muy útil  " } });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Enviar comentario" })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar comentario" }));

    await waitFor(() => {
      expect(putBodies).toHaveLength(2);
    });
    expect(putBodies).toEqual([
      { targetType: "MESSAGE", targetId: "msg-1", helpful: false, comment: "Claro" },
      { targetType: "MESSAGE", targetId: "msg-1", helpful: false, comment: "Muy útil" },
    ]);
  });

  it("limits the comment to 2000 characters with a counter", () => {
    renderWidget({ helpful: true, comment: "" });

    const field = screen.getByRole("textbox", { name: "Comentario (opcional)" });

    expect(field).toHaveAttribute("maxLength", String(AI_RATING_COMMENT_MAX));

    fireEvent.change(field, { target: { value: "a".repeat(AI_RATING_COMMENT_MAX) } });

    expect(screen.getByText(`${AI_RATING_COMMENT_MAX}/${AI_RATING_COMMENT_MAX}`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar comentario" })).toBeEnabled();

    fireEvent.change(field, { target: { value: "a".repeat(AI_RATING_COMMENT_MAX + 1) } });

    expect(screen.getByText(`${AI_RATING_COMMENT_MAX + 1}/${AI_RATING_COMMENT_MAX}`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar comentario" })).toBeDisabled();
    expect(putBodies).toEqual([]);
  });
});
