/*
* Funcionalidad: Case editor feature (public API)
* Descripción: Public surface of the case editor feature (teachers and admins, T11): the case list page
*   (/simulator/cases), the case editor page (new and edit, with the `renderTools` slot for T12), the route builders,
*   the draft model and its pure mapping to and from the contract. Pages and other features import only this index.
*   Depends on the case editor application layer.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { buildCaseEditUrl, CASES_URL, NEW_CASE_URL } from "./application/config/case-editor.routes";
export { CASE_LIST_COPY, CaseListPage } from "./application/pages/case-list.page";
export { CASE_EDITOR_COPY, CaseEditorPage } from "./application/pages/case-editor.page";
export type { CaseEditorPageProps, CaseEditorToolsContext } from "./application/pages/case-editor.page";
export { caseDraftFromDefinition, emptyCaseDraft, toUpsertCase } from "./application/entities/case-draft.entity";
export type { CaseDraft, FieldErrors, UpsertMapping } from "./application/entities/case-draft.entity";
