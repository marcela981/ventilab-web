/*
* Funcionalidad: AI conversation SSE test helpers
* Descripción: Test-only builders of text/event-stream bodies for msw: delta/done/error frames, a controlled stream the test pushes chunks into, and a closed stream with fixed chunks. Shared modules cannot import the learning helpers, so this is the shared copy. Depends on msw.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { HttpResponse } from "msw";

const encoder = new TextEncoder();

export const deltaFrame = (text: string): string => `event: delta\ndata: ${JSON.stringify({ text })}\n\n`;

export const doneFrame = (data: Record<string, unknown>): string => `event: done\ndata: ${JSON.stringify(data)}\n\n`;

export const errorFrame = (code: string, message: string): string => `event: error\ndata: ${JSON.stringify({ code, message })}\n\n`;

export type ControlledStream = {
  response: () => HttpResponse<ReadableStream<Uint8Array>>
  push: (chunk: string) => void
  close: () => void
};

export function controlledStream(): ControlledStream {
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  const stream = new ReadableStream<Uint8Array>({
    start(streamController) {
      controller = streamController;
    },
  });

  return {
    response: () => new HttpResponse(stream, { headers: { "Content-Type": "text/event-stream" } }),
    push: (chunk) => {
      try {
        controller?.enqueue(encoder.encode(chunk));
      } catch {
        // The client already cancelled the stream.
      }
    },
    close: () => {
      try {
        controller?.close();
      } catch {
        // Already closed or cancelled.
      }
    },
  };
}

export function sseResponse(chunks: readonly string[]): HttpResponse<ReadableStream<Uint8Array>> {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }

      controller.close();
    },
  });

  return new HttpResponse(stream, { headers: { "Content-Type": "text/event-stream" } });
}
