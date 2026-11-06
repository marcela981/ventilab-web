/*
* Funcionalidad: Fake LLM core tests
* Descripción: The fake OpenAI-compatible server parses its options (port, chunk delay) and rejects invalid ones, answers JSON (topic guard and notes analysis) to full or JSON-format requests and markdown to streamed ones, and frames a stream as OpenAI deltas that rebuild the answer, then a usage chunk and [DONE]. Depends on vitest and the fake LLM core. v0.2 (cierre IA): start mode and Retry-After options, the per-request prompt directive and the response plan of every fault injection mode (ok, 429 with Retry-After, 500, timeout, drop-mid-stream, malformed-json). v0.3 (Bloque A): the case interpretation prompt gets a JSON echoing the curated values (also streamed), and an unreadable curated block falls back to the usual answers.
* Versión: 0.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  chunkText,
  CLAIMS_STABLE_ANSWER,
  completionPayload,
  ECHO_MARKER,
  modeReplyFor,
  DEFAULT_CHUNK_DELAY_MS,
  DEFAULT_PORT,
  DEFAULT_RETRY_AFTER_S,
  GRADE_FEEDBACK_ANSWER,
  interpretationAnswer,
  INTERPRETATION_RATIONALE,
  JSON_ANSWER,
  MODES,
  parseArgs,
  parseMode,
  planResponse,
  replyFor,
  requestMode,
  STREAM_ANSWER,
  streamFrames,
} from "./fake-llm-core.mjs";

describe("case interpretation (Bloque A)", () => {
  const curated = { complianceMlPerCmH2O: { curated: 30, min: 21, max: 39 }, shuntScale: { curated: 1, min: 0.7, max: 1.3 }, broken: { min: 1 } };
  const request = (block) => ({
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "Eres un intensivista…" },
      { role: "user", content: `<historia_clinica>\nCaso: SDRA grave inestable\n</historia_clinica>\n\n<parametros_curados>\n${block}\n</parametros_curados>` },
    ],
  });

  it("echoes every curated value with a stable trajectory", () => {
    const answer = { complianceMlPerCmH2O: 30, shuntScale: 1, trajectory: "STABLE", rationale: INTERPRETATION_RATIONALE };

    expect(interpretationAnswer(request(JSON.stringify(curated)))).toEqual(answer);
    expect(JSON.parse(replyFor(request(JSON.stringify(curated))))).toEqual(answer);
    expect(JSON.parse(replyFor({ ...request(JSON.stringify(curated)), stream: true }))).toEqual(answer);
  });

  it("falls back to the usual answers without a readable curated block", () => {
    expect(interpretationAnswer(request("{not json"))).toBeNull();
    expect(interpretationAnswer({ messages: [{ role: "user", content: "hola" }] })).toBeNull();
    expect(JSON.parse(replyFor(request("[1, 2]")))).toEqual(JSON_ANSWER);
  });
});

describe("parseArgs", () => {
  it("uses the defaults and the FAKE_LLM_PORT variable", () => {
    expect(parseArgs([])).toEqual({
      port: DEFAULT_PORT,
      chunkDelayMs: DEFAULT_CHUNK_DELAY_MS,
      mode: "ok",
      retryAfterSeconds: DEFAULT_RETRY_AFTER_S,
      help: false,
    });
    expect(parseArgs([], { FAKE_LLM_PORT: "5000" }).port).toBe(5000);
  });

  it("reads --port and --chunk-delay and rejects invalid values", () => {
    expect(parseArgs(["--port", "4999", "--chunk-delay", "0"])).toMatchObject({ port: 4999, chunkDelayMs: 0 });
    expect(() => parseArgs(["--port", "abc"])).toThrow(/--port/);
    expect(() => parseArgs(["--chunk-delay", "-1"])).toThrow(/--chunk-delay/);
    expect(() => parseArgs(["--bogus"])).toThrow(/Unknown option/);
  });

  it("reads the start mode and the Retry-After of the 429 mode from flags or variables", () => {
    expect(parseArgs([], { FAKE_LLM_MODE: "500", FAKE_LLM_RETRY_AFTER: "5" })).toMatchObject({ mode: "500", retryAfterSeconds: 5 });
    expect(parseArgs(["--mode", "Timeout", "--retry-after", "0"])).toMatchObject({ mode: "timeout", retryAfterSeconds: 0 });
    expect(() => parseArgs(["--mode", "slow"])).toThrow(/Unknown mode/);
    expect(() => parseArgs(["--retry-after", "1.5"])).toThrow(/--retry-after/);
  });
});

describe("fault injection", () => {
  const streamed = (content = "Explica la PEEP") => ({ stream: true, messages: [{ role: "user", content }] });
  const full = (content = "Analiza mis notas") => ({ messages: [{ role: "user", content }] });
  const payloadsOf = (chunks) => chunks.map((chunk) => JSON.parse(chunk.replace(/^data: /, "")));

  it("lists every mode and rejects unknown ones", () => {
    expect(MODES).toEqual(["ok", "429", "500", "timeout", "drop-mid-stream", "malformed-json", "echo", "claims-stable"]);
    expect(parseMode(" DROP-MID-STREAM ")).toBe("drop-mid-stream");
    expect(() => parseMode("crash")).toThrow(/Unknown mode/);
  });

  it("takes the mode of a request from its prompt directive, else the current mode", () => {
    expect(requestMode(streamed("Explica la PEEP [[fake-llm:500]]"), "ok")).toBe("500");
    expect(requestMode(full(), "timeout")).toBe("timeout");
    expect(requestMode(full("[[fake-llm:bogus]]"), "ok")).toBe("ok");
    expect(requestMode({ messages: [{ role: "system", content: "x" }, { role: "user", content: "[[FAKE-LLM:429]]" }] })).toBe("429");
  });

  it("answers normally in the ok mode", () => {
    const stream = planResponse("ok", streamed());
    const completion = planResponse("ok", full());

    expect(stream).toMatchObject({ status: 200, streamed: true, end: "end" });
    expect(stream.chunks).toEqual(streamFrames(streamed()));
    expect(completion).toMatchObject({ status: 200, streamed: false, end: "end" });
    expect(JSON.parse(completion.chunks[0])).toEqual(completionPayload(full()));
  });

  it("rate limits with Retry-After and fails with 500 as OpenAI-style JSON errors", () => {
    const limited = planResponse("429", streamed(), { retryAfterSeconds: 12 });
    const failed = planResponse("500", full());

    expect(limited).toMatchObject({ status: 429, end: "end" });
    expect(limited.headers["retry-after"]).toBe("12");
    expect(JSON.parse(limited.chunks[0]).error.code).toBe("rate_limit_exceeded");
    expect(failed).toMatchObject({ status: 500, end: "end" });
    expect(JSON.parse(failed.chunks[0]).error.type).toBe("server_error");
  });

  it("never answers in the timeout mode", () => {
    expect(planResponse("timeout", streamed())).toEqual({ status: null, headers: {}, chunks: [], streamed: false, end: "hang" });
  });

  it("sends part of the answer and then cuts the connection in the drop-mid-stream mode", () => {
    const stream = planResponse("drop-mid-stream", streamed());
    const deltas = streamFrames(streamed()).slice(0, -2);
    const completion = planResponse("drop-mid-stream", full());

    expect(stream).toMatchObject({ status: 200, streamed: true, end: "destroy" });
    expect(stream.chunks.length).toBeGreaterThan(0);
    expect(stream.chunks.length).toBeLessThan(deltas.length);
    expect(payloadsOf(stream.chunks).every((payload) => payload.choices[0].delta.content)).toBe(true);
    expect(stream.chunks).not.toContain("data: [DONE]\n\n");
    expect(completion).toMatchObject({ status: 200, end: "destroy" });
    expect(() => JSON.parse(completion.chunks[0])).toThrow();
  });

  it("sends an unparseable body or SSE chunk in the malformed-json mode", () => {
    const stream = planResponse("malformed-json", streamed());
    const completion = planResponse("malformed-json", full());

    expect(stream).toMatchObject({ status: 200, streamed: true, end: "end" });
    expect(() => JSON.parse(stream.chunks[1].replace(/^data: /, ""))).toThrow();
    expect(stream.chunks.at(-1)).toBe("data: [DONE]\n\n");
    expect(completion).toMatchObject({ status: 200, end: "end" });
    expect(() => JSON.parse(completion.chunks[0])).toThrow();
  });
});

describe("replies", () => {
  it("answers markdown to a streamed request and JSON otherwise", () => {
    expect(replyFor({ stream: true })).toBe(STREAM_ANSWER);
    expect(JSON.parse(replyFor({ stream: false }))).toEqual(JSON_ANSWER);
    expect(JSON.parse(replyFor({ stream: true, response_format: { type: "json_object" } }))).toEqual(JSON_ANSWER);
  });

  it("answers a grade feedback prompt with the overall and perQuestion JSON", () => {
    const body = { messages: [{ role: "user", content: "FORMATO DE RESPUESTA (JSON):\n{\"overall\": \"string\", \"perQuestion\": []}" }] };

    expect(JSON.parse(replyFor(body))).toEqual(GRADE_FEEDBACK_ANSWER);
    expect(JSON.parse(replyFor({ ...body, stream: true }))).toEqual(GRADE_FEEDBACK_ANSWER);
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

describe("simulator answer modes (fix sim-assist-current-state)", () => {
  const STATE = {
    simTime: "01:16",
    simTimeS: 76.2,
    patient: { status: "CRITICAL", severityPercent: 69 },
    alarms: [{ code: "LOW_SPO2", priority: "HIGH", value: 72.2, threshold: 90 }],
    vitals: { spo2Percent: 72.2, pao2MmHg: 38, paco2MmHg: 33.4, ph: 7.48, mapMmHg: 66, heartRateBpm: 107 },
  };
  const body = (tag, state) => ({ stream: true, messages: [{ role: "user", content: `<${tag}>\n${JSON.stringify(state)}\n</${tag}>\n\n<pregunta>\nx\n</pregunta>` }] });

  it("echoes the values of the state block it received, readable and as JSON", () => {
    const answer = modeReplyFor("echo", body("estado_actual", STATE));
    const [line, json] = answer.split("\n");

    expect(line).toBe(`${ECHO_MARKER}: t = 01:16 · SpO2 72.2 % · PaO2 38 mmHg · PaCO2 33.4 mmHg · pH 7.48 · PAM 66 mmHg · FC 107 lpm · gravedad 69 % · alarmas LOW_SPO2`);
    expect(JSON.parse(json)).toMatchObject({ simTimeS: 76.2, status: "CRITICAL", spo2Percent: 72.2, mapMmHg: 66, alarms: ["LOW_SPO2"] });
  });

  it("echoes the real monitor state too", () => {
    const real = { source: "REAL_VENTILATOR", dataAgeS: 3.5, stale: true, alarms: [{ code: "HIGH_PRESSURE" }], metrics: { spo2Percent: 93, peakPressureCmH2O: 42 } };

    expect(JSON.parse(modeReplyFor("echo", body("estado_actual", real)).split("\n")[1])).toMatchObject({ source: "REAL_VENTILATOR", spo2Percent: 93, peakPressureCmH2O: 42, dataAgeS: 3.5, stale: true });
  });

  it("claims a stable patient in claims-stable mode and streams it", () => {
    const plan = planResponse("claims-stable", body("estado_monitor", STATE));
    const text = plan.chunks.slice(0, -2).map((frame) => JSON.parse(frame.replace(/^data: /, "")).choices[0].delta.content).join("");

    expect(text).toBe(CLAIMS_STABLE_ANSWER);
  });

  it("reads the state block of the user message even when the system prompt names the tag", () => {
    const withSystem = { ...body("estado_actual", STATE), messages: [{ role: "system", content: "Basa el análisis SOLO en el bloque <estado_actual> (simTime)." }, ...body("estado_actual", STATE).messages] };

    expect(modeReplyFor("echo", withSystem)).toContain("SpO2 72.2 %");
  });

  it("keeps the normal answers for other prompts and the old state block", () => {
    expect(modeReplyFor("echo", { stream: true, messages: [{ role: "user", content: "hola" }] })).toBeNull();
    expect(modeReplyFor("ok", body("estado_actual", STATE))).toBeNull();
    expect(modeReplyFor("echo", body("estado_simulacion", { gases: { spo2Percent: 90.6 }, mapMmHg: 80 }))).toContain("SpO2 90.6 %");
    expect(parseMode("echo")).toBe("echo");
  });
});
