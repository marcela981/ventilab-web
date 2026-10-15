/*
* Funcionalidad: Page draft entity
* Descripción: Local draft of the blocks of one Page in the page editor and its pure logic. A DraftBlock keeps a stable local key (the server id for loaded blocks, `new-N` for added ones) and its server id (null until created). Operations: createDraftBlock (default content per type, matching the backend block content shapes: {doc} rich text, {latex, display}, {url}, {caption, alt}, {code, language}, {}), duplicateBlock (copy right after the original, no id), moveBlock, removeBlock, replaceBlock. Validation mirrors the backend normalizeBlock rules (equation LaTeX required, video = exactly one of a YouTube/Vimeo https URL or a media id, code language pattern, image/file need a media id). planPageSave diffs the draft against the server blocks: deletes, updates with only the changed fields (title, content, mediaId), creates (the backend appends them) and a full reorder only when the final order differs from what the backend leaves after appending. toBlockPayload builds the request body (empty video URL / code language omitted; rich text never sends media). Depends on @shared/rich-content block types and the video source parser. v1.1 (C4 review): SavedOperations and applySavedOperations: the confirmed deletes, updates, creates and reorder of a save applied over the loaded server blocks, so a retry diffs against what was really saved even when the refresh failed.
* Versión: 1.1 (C4)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { isRecord, isRichTextBlockType, readString } from "@shared/rich-content/blocks/content-block.types";
import type { ContentBlockType } from "@shared/rich-content/blocks/content-block.types";
import { parseVideoEmbed } from "@shared/rich-content/blocks/video-source";

export type BlockContent = Record<string, unknown>;

export type DraftBlock = {
  key: string
  id: string | null
  // Any stored type; unknown types are kept untouched.
  type: string
  title: string
  content: BlockContent
  mediaId: string | null
  // Resolved URL of the media of a loaded block (preview only).
  mediaUrl: string | null
};

export type BlockPayload = {
  type: string
  title?: string
  content: BlockContent
  mediaId?: string
};

export type BlockUpdateBody = {
  title?: string
  content?: BlockContent
  mediaId?: string | null
};

export type BlockRef = { key: string, id: string | null };

export type PageSavePlan = {
  deletes: string[]
  updates: { id: string, body: BlockUpdateBody }[]
  creates: { key: string, body: BlockPayload }[]
  // Final order of every block when a reorder is needed; null otherwise.
  order: BlockRef[] | null
};

export type RichTextFormat = "doc" | "markdown" | "html";

// TODO(i18n): move to a content-editor namespace in src/i18n.
export const BLOCK_TYPE_LABELS: Readonly<Record<ContentBlockType, string>> = {
  TEXT: "Texto",
  INTRODUCTION: "Introducción",
  THEORY: "Teoría",
  CASE_STUDY: "Caso de estudio",
  SUMMARY: "Resumen",
  EXERCISE: "Ejercicio",
  QUIZ: "Cuestionario",
  REFERENCES: "Referencias",
  CALLOUT: "Destacado",
  IMAGE: "Imagen",
  FILE: "Archivo",
  VIDEO: "Video",
  EQUATION: "Ecuación",
  CODE: "Código",
  DIVIDER: "Separador",
};

export const ADDABLE_BLOCK_TYPES = ["TEXT", "EQUATION", "VIDEO", "IMAGE", "FILE", "CODE", "DIVIDER"] as const satisfies readonly ContentBlockType[];

export type AddableBlockType = (typeof ADDABLE_BLOCK_TYPES)[number];

const CODE_LANGUAGE = /^[a-zA-Z][a-zA-Z0-9_]*$/;

const MESSAGES = {
  equation: "Escribe la ecuación en LaTeX.",
  videoMissing: "Pega el enlace de un video de YouTube o Vimeo.",
  videoHost: "Solo se admiten enlaces de YouTube o Vimeo.",
  videoBoth: "Usa un enlace o un archivo de video, no ambos.",
  image: "Falta el archivo de imagen.",
  file: "Falta el archivo adjunto.",
  codeLanguage: "El lenguaje solo puede tener letras, números y guiones bajos.",
} as const;

export function blockTypeLabel(type: string): string {
  return (BLOCK_TYPE_LABELS as Readonly<Record<string, string>>)[type] ?? type;
}

function defaultContent(type: AddableBlockType): BlockContent {
  switch (type) {
    case "TEXT":
      return { doc: { type: "doc", content: [{ type: "paragraph" }] } };
    case "EQUATION":
      return { latex: "", display: true };
    case "VIDEO":
      return { url: "" };
    case "IMAGE":
      return { caption: "", alt: "" };
    case "FILE":
      return { caption: "" };
    case "CODE":
      return { code: "", language: "" };
    case "DIVIDER":
      return {};
  }
}

export function createDraftBlock(type: AddableBlockType, key: string): DraftBlock {
  return { key, id: null, type, title: "", content: defaultContent(type), mediaId: null, mediaUrl: null };
}

export function duplicateBlock(blocks: readonly DraftBlock[], key: string, newKey: string): DraftBlock[] {
  const index = blocks.findIndex((block) => block.key === key);
  const original = blocks[index];

  if (!original) {
    return [...blocks];
  }

  const copy: DraftBlock = { ...original, key: newKey, id: null, content: JSON.parse(JSON.stringify(original.content)) as BlockContent };

  return [...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)];
}

export function moveBlock(blocks: readonly DraftBlock[], from: number, to: number): readonly DraftBlock[] {
  if (from === to || from < 0 || to < 0 || from >= blocks.length || to >= blocks.length) {
    return blocks;
  }

  const next = [...blocks];
  const [moved] = next.splice(from, 1);

  next.splice(to, 0, moved as DraftBlock);

  return next;
}

export function removeBlock(blocks: readonly DraftBlock[], key: string): DraftBlock[] {
  return blocks.filter((block) => block.key !== key);
}

export function replaceBlock(blocks: readonly DraftBlock[], key: string, change: Partial<Pick<DraftBlock, "title" | "content" | "mediaId">>): DraftBlock[] {
  return blocks.map((block) => (block.key === key ? { ...block, ...change } : block));
}

export function richTextFormat(content: BlockContent): RichTextFormat | null {
  if (isRecord(content.doc)) {
    return "doc";
  }

  if (typeof content.markdown === "string") {
    return "markdown";
  }

  return typeof content.html === "string" ? "html" : null;
}

export function videoUrlError(url: string): string | null {
  if (url.trim() === "") {
    return MESSAGES.videoMissing;
  }

  return parseVideoEmbed(url) ? null : MESSAGES.videoHost;
}

export function blockError(block: DraftBlock): string | null {
  const { content, mediaId } = block;

  switch (block.type) {
    case "EQUATION":
      return readString(content, "latex") === null ? MESSAGES.equation : null;
    case "VIDEO": {
      const url = readString(content, "url");

      if (mediaId !== null) {
        return url === null ? null : MESSAGES.videoBoth;
      }

      return videoUrlError(url ?? "");
    }
    case "IMAGE":
      return mediaId === null ? MESSAGES.image : null;
    case "FILE":
      return mediaId === null ? MESSAGES.file : null;
    case "CODE": {
      const language = readString(content, "language")?.trim() ?? null;

      return language === null || CODE_LANGUAGE.test(language) ? null : MESSAGES.codeLanguage;
    }
    default:
      return null;
  }
}

function payloadContent(block: DraftBlock): BlockContent {
  const content = { ...block.content };

  if (block.type === "VIDEO") {
    const url = typeof content.url === "string" ? content.url.trim() : "";

    if (url) {
      content.url = url;
    } else {
      delete content.url;
    }
  }

  if (block.type === "CODE") {
    const language = typeof content.language === "string" ? content.language.trim() : "";

    if (language) {
      content.language = language;
    } else {
      delete content.language;
    }
  }

  return content;
}

export function toBlockPayload(block: DraftBlock): BlockPayload {
  const title = block.title.trim();
  const sendsMedia = block.mediaId !== null && !isRichTextBlockType(block.type);

  return {
    type: block.type,
    ...(title ? { title } : {}),
    content: payloadContent(block),
    ...(sendsMedia ? { mediaId: block.mediaId as string } : {}),
  };
}

// Key-sorted JSON so two equal contents compare equal whatever their key order.
function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }

  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}

function updateBody(server: DraftBlock, draft: DraftBlock): BlockUpdateBody | null {
  const body: BlockUpdateBody = {};
  const title = draft.title.trim();

  if (title !== server.title.trim()) {
    body.title = title;
  }

  const content = payloadContent(draft);

  if (stableJson(content) !== stableJson(payloadContent(server))) {
    body.content = content;
  }

  if (draft.mediaId !== server.mediaId) {
    body.mediaId = draft.mediaId;
  }

  return Object.keys(body).length > 0 ? body : null;
}

export function planPageSave(server: readonly DraftBlock[], draft: readonly DraftBlock[]): PageSavePlan {
  const serverById = new Map(server.map((block) => [block.key, block]));
  const kept = new Set(draft.flatMap((block) => (block.id !== null && serverById.has(block.id) ? [block.id] : [])));
  const deletes = server.filter((block) => !kept.has(block.key)).map((block) => block.key);
  const updates: PageSavePlan["updates"] = [];
  const creates: PageSavePlan["creates"] = [];

  for (const block of draft) {
    const original = block.id === null ? undefined : serverById.get(block.id);

    if (!original) {
      creates.push({ key: block.key, body: toBlockPayload(block) });
      continue;
    }

    const body = updateBody(original, block);

    if (body) {
      updates.push({ id: original.key, body });
    }
  }

  // The backend appends created blocks after the kept ones, in creation order.
  const expected = [...server.filter((block) => kept.has(block.key)).map((block) => block.key), ...creates.map((create) => create.key)];
  const actual = draft.map((block) => (block.id !== null && kept.has(block.id) ? block.id : block.key));
  const sameOrder = expected.length === actual.length && expected.every((value, index) => value === actual[index]);

  return {
    deletes,
    updates,
    creates,
    order: sameOrder ? null : draft.map((block) => ({ key: block.key, id: block.id !== null && kept.has(block.id) ? block.id : null })),
  };
}

export function hasPendingChanges(plan: PageSavePlan): boolean {
  return plan.deletes.length > 0 || plan.updates.length > 0 || plan.creates.length > 0 || plan.order !== null;
}

// Operations the backend already confirmed for blocks loaded in one server snapshot.
export type SavedOperations = {
  deleted: ReadonlySet<string>
  // Saved state of each updated block, keyed by its server id.
  updated: ReadonlyMap<string, DraftBlock>
  // Created blocks in creation order, with their server id as key and id.
  created: readonly DraftBlock[]
  // Final order of every block id when a reorder was saved.
  order: readonly string[] | null
};

export const NO_SAVED_OPERATIONS: SavedOperations = { deleted: new Set(), updated: new Map(), created: [], order: null };

// The server blocks as they really are after the saved operations, even while the loaded snapshot is stale.
export function applySavedOperations(server: readonly DraftBlock[], saved: SavedOperations): readonly DraftBlock[] {
  if (saved.deleted.size === 0 && saved.updated.size === 0 && saved.created.length === 0 && saved.order === null) {
    return server;
  }

  const kept = server.filter((block) => !saved.deleted.has(block.key)).map((block) => saved.updated.get(block.key) ?? block);
  const present = new Set(kept.map((block) => block.key));
  // The backend appends created blocks after the kept ones, in creation order.
  const blocks = [...kept, ...saved.created.filter((block) => !present.has(block.key))];
  const order = saved.order;

  if (!order) {
    return blocks;
  }

  const position = (key: string) => {
    const index = order.indexOf(key);

    return index === -1 ? order.length : index;
  };

  return [...blocks].sort((left, right) => position(left.key) - position(right.key));
}
