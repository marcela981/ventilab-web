/*
* Funcionalidad: Learn workspace tabs
* Descripción: Tab keys of the /learn workspace (W3, Bloque 2; DISENO_BLOQUE2 §2.1): ?tab=inicio | curriculo | progreso, default curriculo (a missing, repeated or unknown value gives curriculo, through the shared parseUrlTab). Staff (TEACHER, ADMIN) only get Currículo and the URL tab is ignored for them (decision 1 of §7b, July: "Teachers always stay on Curriculum"). No dependencies.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const LEARN_TABS = ["inicio", "curriculo", "progreso"] as const;

export type LearnTab = (typeof LEARN_TABS)[number];

export const DEFAULT_LEARN_TAB: LearnTab = "curriculo";

export const STAFF_LEARN_TABS: readonly LearnTab[] = ["curriculo"];

/** Tabs a role sees: staff only preview the curriculum. */
export function learnTabsFor(isStaff: boolean): readonly LearnTab[] {
  return isStaff ? STAFF_LEARN_TABS : LEARN_TABS;
}
