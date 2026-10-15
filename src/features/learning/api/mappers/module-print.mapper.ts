/*
* Funcionalidad: Module print mapper
* Descripción: Maps GET /api/modules/{id}/full (ModuleFullDTO) to the print entity: lessons, their Pages and the Pages' blocks sorted by order (the arrays are not guaranteed to be ordered), and the unassigned Pages sorted the same way. Depends on the curriculum DTOs and the module print entity.
* Versión: 1.0 (L7)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { PrintModule, PrintPage } from "../../application/entities/module-print.entity";
import type { ModuleFullDTO, ModuleFullPageDTO } from "../dtos/curriculum.dto";

const byOrder = <T extends { order: number }>(left: T, right: T): number => left.order - right.order;

function toPrintPages(pages: readonly ModuleFullPageDTO[]): PrintPage[] {
  return [...pages].sort(byOrder).map((page) => ({
    id: page.id,
    title: page.title,
    blocks: [...page.blocks]
      .sort(byOrder)
      .map(({ id, type, title, content, mediaId, mediaUrl }) => ({ id, type, title, content, mediaId, mediaUrl })),
  }));
}

export function toPrintModule(dto: ModuleFullDTO): PrintModule {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    difficulty: dto.difficulty,
    estimatedMinutes: dto.estimatedTime,
    lessons: [...dto.lessons].sort(byOrder).map((lesson) => ({ id: lesson.id, title: lesson.title, pages: toPrintPages(lesson.pages) })),
    unassignedPages: toPrintPages(dto.unassignedPages),
  };
}
