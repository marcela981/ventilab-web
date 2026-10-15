/*
* Funcionalidad: Module print entity
* Descripción: The whole module as the print view renders it (GET /api/modules/{id}/full): cover data (title, description, difficulty, estimated time), the lessons sorted by order with their Pages and blocks sorted by order, and the Pages without a lesson. difficultyLabel gives the Spanish label of the known difficulty values (others pass through). No dependencies besides the shared block input type.
* Versión: 1.0 (L7)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ContentBlockInput } from "@shared/rich-content/blocks/content-block.types";

export type PrintPage = {
  id: string
  title: string
  blocks: ContentBlockInput[]
};

export type PrintLesson = {
  id: string
  title: string
  pages: PrintPage[]
};

export type PrintModule = {
  id: string
  title: string
  description: string | null
  difficulty: string | null
  estimatedMinutes: number | null
  lessons: PrintLesson[]
  unassignedPages: PrintPage[]
};

// TODO(i18n): move to a learning namespace in src/i18n.
const DIFFICULTY_LABELS: Record<string, string> = {
  BEGINNER: "Básico",
  INTERMEDIATE: "Intermedio",
  ADVANCED: "Avanzado",
};

export function difficultyLabel(difficulty: string): string {
  return DIFFICULTY_LABELS[difficulty.toUpperCase()] ?? difficulty;
}
