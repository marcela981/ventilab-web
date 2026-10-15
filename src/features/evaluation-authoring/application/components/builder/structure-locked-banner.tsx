/*
* Funcionalidad: StructureLockedBanner
* Descripción: Warning of the evaluation builder shown when the evaluation has submitted attempts (structureLocked from the detail, or a 409 evaluation.has_submitted_attempts on any save): explains that structural changes need a copy and offers "Duplicar" (`POST /api/evaluations/{id}/duplicate`, then the editor of the copy). Depends on MUI, the design-system AsyncButton and the builder copy.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { BUILDER_COPY } from "../../entities/builder-copy";

export type StructureLockedBannerProps = {
  busy: boolean
  onDuplicate: () => Promise<void>
};

export function StructureLockedBanner({ busy, onDuplicate }: StructureLockedBannerProps) {
  return (
    <Alert
      severity="warning"
      role="alert"
      action={(
        <AsyncButton color="inherit" size="small" disabled={busy} onClick={onDuplicate}>
          {BUILDER_COPY.duplicate}
        </AsyncButton>
      )}
    >
      <AlertTitle>{BUILDER_COPY.lockedTitle}</AlertTitle>
      {BUILDER_COPY.lockedDescription}
    </Alert>
  );
}
