/*
* Funcionalidad: Page blocks mapper
* Descripción: Maps the page of GET /api/pages/{id} (PageDTO, blocks in `sections`) to the page editor: the blocks sorted by order as draft blocks keyed by their server id (content kept as stored, a non-object content becomes {}; null title becomes ""), plus the page header data (title, status). Depends on the content editor DTOs, the page draft entity and @shared/rich-content block types.
* Versión: 1.0 (C4)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { isRecord } from "@shared/rich-content/blocks/content-block.types";
import type { ContentStatus } from "../../application/entities/content-node.entity";
import type { DraftBlock } from "../../application/entities/page-draft.entity";
import type { PageBlockDTO, PageDTO } from "../dtos/content-editor.dto";

export type EditablePage = {
  id: string
  title: string
  status: ContentStatus
  blocks: DraftBlock[]
};

export function toDraftBlock(block: PageBlockDTO): DraftBlock {
  const content: unknown = block.content;

  return {
    key: block.id,
    id: block.id,
    type: block.type,
    title: block.title ?? "",
    content: isRecord(content) ? content : {},
    mediaId: block.mediaId,
    mediaUrl: block.mediaUrl,
  };
}

export function toEditablePage(page: PageDTO): EditablePage {
  return {
    id: page.id,
    title: page.title,
    status: page.status,
    blocks: [...page.sections].sort((left, right) => left.order - right.order).map(toDraftBlock),
  };
}
