/*
* Funcionalidad: Case editor sections
* Descripción: The sections of the case editor in page order (id, anchor and Spanish title) and the section each
*   field error belongs to, so the side index can count the errors of every section. Depends on nothing.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type CaseSectionId = "general" | "patient" | "mechanics" | "ventilator" | "events" | "targets" | "rubric";

// TODO(i18n): move to a case-editor namespace in src/i18n.
export const CASE_SECTIONS: ReadonlyArray<{ id: CaseSectionId, title: string }> = [
  { id: "general", title: "Datos generales" },
  { id: "patient", title: "Paciente" },
  { id: "mechanics", title: "Mecánica y fisiología" },
  { id: "ventilator", title: "Ajustes iniciales del ventilador" },
  { id: "events", title: "Eventos programados" },
  { id: "targets", title: "Objetivos de estabilización" },
  { id: "rubric", title: "Rúbrica por defecto" },
];

export function sectionAnchor(id: CaseSectionId): string {
  return `case-section-${id}`;
}

/** Section of a field id (DTO path or row id). */
export function sectionOfField(field: string): CaseSectionId {
  if (field.startsWith("patient")) {
    return "patient";
  }

  if (field.startsWith("mechanics") || field.startsWith("initialState")) {
    return "mechanics";
  }

  if (field.startsWith("initialVentilatorSettings")) {
    return "ventilator";
  }

  if (field.startsWith("events")) {
    return "events";
  }

  if (field.startsWith("targets")) {
    return "targets";
  }

  return field.startsWith("defaultRubric") ? "rubric" : "general";
}
