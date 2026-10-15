/*
* Funcionalidad: Clinical case choices
* Descripción: Entities of the clinical case selector of SIMULATION questions: a case as a choice (id, title, pathology, difficulty), one page of published cases with its pagination, and the client-side title filter of the loaded page (the clinical cases API has no text search). No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type ClinicalCaseChoice = {
  id: string
  title: string
  pathology: string
  difficulty: string
};

export type ClinicalCasePage = {
  items: ClinicalCaseChoice[]
  page: number
  pages: number
  total: number
};

export const CLINICAL_CASES_PAGE_SIZE = 20;

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function filterCasesByTitle(items: readonly ClinicalCaseChoice[], term: string): ClinicalCaseChoice[] {
  const needle = normalize(term);

  return needle === "" ? [...items] : items.filter((item) => normalize(item.title).includes(needle));
}
