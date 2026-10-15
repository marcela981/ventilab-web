/*
* Funcionalidad: Content editor service
* Descripción: Backend calls of the content editor through the typed api-client. Read keys (paths) used with useApiQuery: GET /api/sections, GET /api/levels (limit 100 = backend max, includeInactive for staff; only source of each level's sectionId), GET /api/teaching/tree, GET /api/pages?lessonId=. CONTENT_QUERY_PATHS are the keys every mutation invalidates. Mutations: createNode (POST in the sibling group, with the next free order for modules and lessons: section, level of a section or unsectioned, module of a level, lesson of a module, page of a lesson; new nodes start as DRAFT), updateNode (PUT with the editable fields of each kind), changeNodeStatus (PATCH /api/sections/{id}/status for sections; PUT {status} for the other kinds: BACKEND GAP, only sections have a status endpoint), deleteNode (DELETE; 409 curriculum.node_has_student_data when students have data) and reorderGroup (PUT /api/<kind>/reorder per parent). BACKEND GAP: CreateLessonDTO still requires the legacy `content` JSON with a type and a non-empty sections array, so a minimal placeholder is sent; new levels use the backend default track (mecanica). Default (fast) timeout; errors reject with ApiError. Depends on @shared/api-client, the content editor DTOs and entities.
* Versión: 1.0 (C1)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiDelete, apiPatch, apiPost, apiPut } from "@shared/api-client/api-request";
import type { ContentStatus, NodeFormValues, NodeKind, SiblingGroup } from "../../application/entities/content-node.entity";
import type { CreateLessonDTO, CreateLevelDTO } from "../dtos/content-editor.dto";
import { reorderRequest } from "../../application/entities/content-reorder";

export const SECTIONS_PATH = "/api/sections";
export const LEVELS_PATH = "/api/levels";
export const TEACHING_TREE_PATH = "/api/teaching/tree";
export const LESSON_PAGES_PATH = "/api/pages";

// The backend caps `limit` at 100; more levels than that would show the extra ones under "Sin sección".
export const LEVELS_QUERY = { limit: 100, includeInactive: true } as const;

export const CONTENT_QUERY_PATHS = [SECTIONS_PATH, LEVELS_PATH, TEACHING_TREE_PATH, LESSON_PAGES_PATH] as const;

const NEW_NODE_STATUS: ContentStatus = "DRAFT";
// The generated schema marks `track` as required (it has a default); "mecanica" is the backend default.
const DEFAULT_LEVEL_TRACK: CreateLevelDTO["track"] = "mecanica";

function optionalText(value: string): { description?: string } {
  const text = value.trim();

  return text ? { description: text } : {};
}

// The generated schema types `content` as an empty object; the backend needs a type and a non-empty sections array.
function placeholderLessonContent(title: string): CreateLessonDTO["content"] {
  return { type: "lesson", sections: [{ type: "text", title }] } as unknown as CreateLessonDTO["content"];
}

// `order` is only used for modules and lessons (see nextChildOrder); the backend computes the rest.
export async function createNode(group: SiblingGroup, values: NodeFormValues, order?: number): Promise<void> {
  const title = values.title.trim();
  const status = NEW_NODE_STATUS;

  switch (group.kind) {
    case "sections":
      await apiPost("/api/sections", { body: { title, slug: values.slug.trim(), status, ...optionalText(values.description) } });

      return;
    case "levels":
      await apiPost("/api/levels", {
        body: { title, status, track: DEFAULT_LEVEL_TRACK, ...(group.sectionId ? { sectionId: group.sectionId } : {}), ...optionalText(values.description) },
      });

      return;
    case "modules":
      await apiPost("/api/modules", {
        body: { title, status, levelId: group.levelId, ...(order === undefined ? {} : { order }), ...optionalText(values.description) },
      });

      return;
    case "lessons":
      await apiPost("/api/lessons", {
        body: { title, status, moduleId: group.moduleId, order: order ?? 0, estimatedTime: 0, aiGenerated: false, content: placeholderLessonContent(title) },
      });

      return;
    case "pages":
      await apiPost("/api/pages", { body: { title, status, lessonId: group.lessonId } });
  }
}

export async function updateNode(kind: NodeKind, id: string, values: NodeFormValues): Promise<void> {
  const title = values.title.trim();
  const description = values.description.trim();
  const params = { id };

  switch (kind) {
    case "section":
      await apiPut("/api/sections/{id}", { params, body: { title, slug: values.slug.trim(), description } });

      return;
    case "level":
      await apiPut("/api/levels/{id}", { params, body: { title, description } });

      return;
    case "module":
      await apiPut("/api/modules/{id}", { params, body: { title, description } });

      return;
    case "lesson":
      await apiPut("/api/lessons/{id}", { params, body: { title } });

      return;
    case "page":
      await apiPut("/api/pages/{id}", { params, body: { title } });
  }
}

export async function changeNodeStatus(kind: NodeKind, id: string, status: ContentStatus): Promise<void> {
  const params = { id };
  const body = { status };

  switch (kind) {
    case "section":
      await apiPatch("/api/sections/{id}/status", { params, body });

      return;
    case "level":
      await apiPut("/api/levels/{id}", { params, body });

      return;
    case "module":
      await apiPut("/api/modules/{id}", { params, body });

      return;
    case "lesson":
      await apiPut("/api/lessons/{id}", { params, body });

      return;
    case "page":
      await apiPut("/api/pages/{id}", { params, body });
  }
}

export async function deleteNode(kind: NodeKind, id: string): Promise<void> {
  const params = { id };

  switch (kind) {
    case "section":
      await apiDelete("/api/sections/{id}", { params });

      return;
    case "level":
      await apiDelete("/api/levels/{id}", { params });

      return;
    case "module":
      await apiDelete("/api/modules/{id}", { params });

      return;
    case "lesson":
      await apiDelete("/api/lessons/{id}", { params });

      return;
    case "page":
      await apiDelete("/api/pages/{id}", { params });
  }
}

export async function reorderGroup(group: SiblingGroup, ids: readonly string[]): Promise<void> {
  const request = reorderRequest(group, ids);

  switch (request.path) {
    case "/api/sections/reorder":
      await apiPut(request.path, { body: request.body });

      return;
    case "/api/levels/reorder":
      await apiPut(request.path, { body: request.body });

      return;
    case "/api/modules/reorder":
      await apiPut(request.path, { body: request.body });

      return;
    case "/api/lessons/reorder":
      await apiPut(request.path, { body: request.body });

      return;
    case "/api/pages/reorder":
      await apiPut(request.path, { body: request.body });
  }
}
