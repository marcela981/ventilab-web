/*
* Funcionalidad: AI chat entity tests
* Descripción: Pure rules of the AI chat: off-topic detection by exact (trimmed) match of the mirrored backend reply, client title filter normalization (case and accents), rename title normalization and limits, error classification (quota with reset seconds, provider unavailable, interrupted, not found, failed) and the deep link of a LESSON / MODULE / PAGE conversation origin. Depends on vitest and the AI chat entities and config. v1.1 (cierre IA): message kind fallback (DETERMINISTIC source or the server label) next to off-topic and answer; a busy 503 keeps its Retry-After and shows the reset time.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError, CLIENT_ERROR_CODES } from "@shared/api-client/api-error";
import { OFF_TOPIC_REPLY } from "../config/ai-chat.config";
import {
  buildConversationUrl,
  classifyChatError,
  isOffTopicReply,
  matchesTitleFilter,
  messageKind,
  normalizeRenameTitle,
} from "./ai-chat.entity";
import { buildConversationOriginUrl } from "./conversation-origin";

describe("isOffTopicReply", () => {
  it("matches the fixed backend reply, ignoring surrounding whitespace", () => {
    expect(isOffTopicReply(`  ${OFF_TOPIC_REPLY}\n`)).toBe(true);
    expect(isOffTopicReply(`${OFF_TOPIC_REPLY} Además…`)).toBe(false);
    expect(isOffTopicReply("La PEEP es…")).toBe(false);
  });
});

describe("messageKind", () => {
  it("tells the off-topic refusal, the non-AI fallback and an AI answer apart", () => {
    expect(messageKind("assistant", OFF_TOPIC_REPLY, "DETERMINISTIC")).toBe("off-topic");
    expect(messageKind("assistant", "Revisa la lección.", "DETERMINISTIC")).toBe("fallback");
    // A saved message has no source: the server label marks it.
    expect(messageKind("assistant", "[Respuesta automática sin IA] Revisa la lección.")).toBe("fallback");
    expect(messageKind("assistant", "La PEEP es…", "LLM")).toBe("answer");
    // An older server sends no source.
    expect(messageKind("assistant", "La PEEP es…")).toBe("answer");
    expect(messageKind("user", "[Respuesta automática sin IA]")).toBe("answer");
  });
});

describe("matchesTitleFilter", () => {
  it("ignores case, accents and surrounding spaces; an empty filter matches all", () => {
    expect(matchesTitleFilter("Ventilación Protectora", " VENTILACION ")).toBe(true);
    expect(matchesTitleFilter("PEEP en SDRA", "ventil")).toBe(false);
    expect(matchesTitleFilter("PEEP en SDRA", "   ")).toBe(true);
  });
});

describe("normalizeRenameTitle", () => {
  it("collapses whitespace and rejects empty or over-long titles", () => {
    expect(normalizeRenameTitle("  Ventilación \n protectora ")).toBe("Ventilación protectora");
    expect(normalizeRenameTitle("   ")).toBeNull();
    expect(normalizeRenameTitle("x".repeat(120))).toHaveLength(120);
    expect(normalizeRenameTitle("x".repeat(121))).toBeNull();
  });
});

describe("classifyChatError", () => {
  it("classifies the quota error with its wait and local reset time", () => {
    const error = classifyChatError(new ApiError({ code: "ai.quota_exceeded", message: "q", status: 429, retryAfter: 120 }), Date.UTC(2026, 9, 15, 10, 0));

    expect(error).toMatchObject({ kind: "quota", retryable: false, retryAfterSeconds: 120 });
    expect(error.message).toMatch(/Podrás usarlo de nuevo a las \d{2}:\d{2}\./);
  });

  it("classifies provider, interruption, not found and the rest", () => {
    expect(classifyChatError(new ApiError({ code: "ai.providers_unavailable", message: "", status: 503 }))).toMatchObject({ kind: "unavailable", retryable: true });
    const busy = classifyChatError(new ApiError({ code: "ai.providers_unavailable", message: "", status: 503, retryAfter: 90 }));

    expect(busy).toMatchObject({ kind: "unavailable", retryAfterSeconds: 90 });
    expect(busy.message).toMatch(/^El asistente de IA está saturado en este momento\. Podrás intentarlo de nuevo a las \d{2}:\d{2}\.$/);
    expect(classifyChatError(new ApiError({ code: CLIENT_ERROR_CODES.streamInterrupted, message: "", status: 0 }))).toMatchObject({ kind: "interrupted", retryable: true });
    expect(classifyChatError(new ApiError({ code: "ai-tutor.conversation_not_found", message: "", status: 404 }))).toMatchObject({ kind: "not-found", retryable: false });
    expect(classifyChatError(new ApiError({ code: "ai-tutor.stream_failed", message: "", status: 0 }))).toMatchObject({ kind: "failed", retryable: true });
    expect(classifyChatError(new ApiError({ code: CLIENT_ERROR_CODES.networkUnavailable, message: "", status: 0 }))).toMatchObject({ kind: "failed", retryable: true });
  });
});

describe("conversation URLs", () => {
  it("builds the assistant conversation URL", () => {
    expect(buildConversationUrl("c 1")).toBe("/assistant/c%201");
  });

  it("links MODULE, LESSON and PAGE conversations to the learning viewer", () => {
    expect(buildConversationOriginUrl({ scope: "MODULE", refId: "m1" })).toBe("/learn/modules/m1");
    expect(buildConversationOriginUrl({ scope: "LESSON", refId: "l1", moduleId: "m1" })).toBe("/learn/modules/m1/lessons/l1/1");
    expect(buildConversationOriginUrl({ scope: "PAGE", refId: "p1", moduleId: "m1", lessonId: "l1" })).toBe("/learn/modules/m1/lessons/l1/1");
  });

  it("has no link for FREE conversations or while the owners are unknown", () => {
    expect(buildConversationOriginUrl({ scope: "FREE", refId: null })).toBeNull();
    expect(buildConversationOriginUrl({ scope: "LESSON", refId: "l1" })).toBeNull();
    expect(buildConversationOriginUrl({ scope: "PAGE", refId: "p1", moduleId: "m1" })).toBeNull();
    expect(buildConversationOriginUrl({ scope: "MODULE", refId: null })).toBeNull();
  });
});
