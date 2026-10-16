/*
* Funcionalidad: Case editor section props
* Descripción: Props shared by the case editor sections and their memo comparator. A section reads the whole draft
*   but writes only through a functional update (`update(current => next)`), so it never writes back a stale copy;
*   `sameSectionProps(keys, section)` lets React skip a section while its own draft keys (compared by reference: the
*   draft is updated immutably), its field errors and the update/disabled/newKey props are unchanged, so typing in
*   one section does not re-render the other ones. Depends on the draft entity and the sections config.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { sectionOfField } from "../config/case-editor-sections";
import type { CaseSectionId } from "../config/case-editor-sections";
import type { CaseDraft, FieldErrors } from "../entities/case-draft.entity";

export type DraftUpdate = (updater: (draft: CaseDraft) => CaseDraft) => void;

export type SectionProps = {
  draft: CaseDraft
  errors: FieldErrors
  update: DraftUpdate
  disabled: boolean
};

export type SectionWithKeysProps = SectionProps & { newKey: () => string };

function sectionErrorsText(errors: FieldErrors, section: CaseSectionId): string {
  return JSON.stringify(Object.entries(errors).filter(([field]) => sectionOfField(field) === section));
}

export function sameSectionProps<P extends SectionProps>(keys: readonly (keyof CaseDraft)[], section: CaseSectionId) {
  return (previous: P, next: P): boolean => {
    const previousRecord = previous as Record<string, unknown>;
    const nextRecord = next as Record<string, unknown>;

    return previous.update === next.update
      && previous.disabled === next.disabled
      && previousRecord.newKey === nextRecord.newKey
      && keys.every((key) => previous.draft[key] === next.draft[key])
      && sectionErrorsText(previous.errors, section) === sectionErrorsText(next.errors, section);
  };
}
