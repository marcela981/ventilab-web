/*
* Funcionalidad: Fake LLM core tests
* Descripción: The fake OpenAI-compatible server parses its options (port, chunk delay) and rejects invalid ones, answers JSON (topic guard and notes analysis) to full or JSON-format requests and markdown to streamed ones, and frames a stream as OpenAI deltas that rebuild the answer, then a usage chunk and [DONE]. Depends on vitest and the fake LLM core.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  chunkText,
  completionPayload,
  DEFAULT_CHUNK_DELAY_MS,
  DEFAULT_PORT,
  JSON_ANSWER,
  parseArgs,
  replyFor,
  STREAM_ANSWER,
  streamFrames,
} from "./fake-llm-core.mjs";

describe("parseArgs", () => {
  it("uses the defaults and the FAKE_LLM_PORT variable", () => {
    expect(parseArgs([])).toEqual({ port: DEFAULT_PORT, chunkDelayMs: DEFAULT_CHUNK_DELAY_MS, help: false });
    expect(parseArgs([], { FAKE_LLM_PORT: "5000" }).port).toBe(5000);
  });

  it("reads --port and --chunk-delay and rejects invalid values", () => {
    expect(parseArgs(["--port", "4999", "--chunk-delay", "0"])).toMatchObject({ port: 4999, chunkDelayMs: 0 });
    expect(() => parseArgs(["--port", "abc"])).toThrow(/--port/);
    expect(() => parseArgs(["--chunk-delay", "-1"])).toThrow(/--chunk-delay/);
    expect(() => parseArgs(["--bogus"])).toThrow(/Unknown option/);
  });
});

describe("replies", () => {
  it("answers markdown to a streamed request and JSON otherwise", () => {
    expect(replyFor({ stream: true })).toBe(STREAM_ANSWER);
    expect(JSON.parse(replyFor({ stream: false }))).toEqual(JSON_ANSWER);
    expect(JSON.parse(replyFor({ stream: true, response_format: { type: "json_object" } }))).toEqual(JSON_ANSWER);
  });

  it("builds a chat.completion payload with usage", () => {
    const payload = completionPayload({ messages: [{ role: "user", content: "hola" }] });

    expect(JSON.parse(payload.choices[0].message.content).onTopic).toBe(true);
    expect(payload.usage.prompt_tokens).toBeGreaterThan(0);
  });
});

describe("streamFrames", () => {
  it("rebuilds the answer from the deltas and ends with usage and [DONE]", () => {
    const frames = streamFrames({ stream: true, messages: [] });
    const payloads = frames.slice(0, -1).map((frame) => JSON.parse(frame.replace(/^data: /, "")));
    const text = payloads.map((payload) => payload.choices[0]?.delta?.content ?? "").join("");

    expect(text).toBe(STREAM_ANSWER);
    expect(payloads.at(-1).usage.completion_tokens).toBeGreaterThan(0);
    expect(frames.at(-1)).toBe("data: [DONE]\n\n");
    expect(frames.every((frame) => frame.endsWith("\n\n"))).toBe(true);
  });

  it("splits text into chunks of the given size", () => {
    expect(chunkText("abcdef", 4)).toEqual(["abcd", "ef"]);
  });
});
