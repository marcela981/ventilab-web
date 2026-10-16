/*
* Funcionalidad: Lazy exam practical slot
* Descripción: The component registered as the evaluations practical question renderer (T9). It only holds a
*   React.lazy boundary (with retryImport) around the exam practical slot, so the slot code is a separate chunk loaded
*   when an exam actually renders a SIMULATION question; the console, the sim-engine and Chart.js are never reachable
*   from it statically. Depends on React, the shared retry-import helper and the design-system loading state.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { lazy, Suspense } from "react";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { retryImport } from "@shared/lib/retry-import";
import type { ExamPracticalSlotProps } from "./exam-practical-slot";

const LoadedExamPracticalSlot = lazy(() =>
  retryImport(() => import("./exam-practical-slot")).then((module) => ({ default: module.ExamPracticalSlot })),
);

// TODO(i18n): move to a simulator namespace in src/i18n.
export const LAZY_EXAM_SLOT_LOADING = "Cargando la parte práctica…";

export function LazyExamPracticalSlot(props: ExamPracticalSlotProps) {
  return (
    <Suspense fallback={<LoadingState label={LAZY_EXAM_SLOT_LOADING} />}>
      <LoadedExamPracticalSlot {...props} />
    </Suspense>
  );
}
