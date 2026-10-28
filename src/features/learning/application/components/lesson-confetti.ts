/*
* Funcionalidad: Lesson completion confetti
* Descripción: launchLessonConfetti fires a short confetti burst when a lesson is completed (W5, Bloque 2; July CompletionConfetti). `canvas-confetti` is a lazy chunk loaded with retryImport only at that moment, never part of the viewer's initial bundle (July shipped it statically). Nothing is loaded or drawn when the user prefers reduced motion; a failed download is ignored (the dialog still opens). Depends on canvas-confetti (dynamic import) and @shared/lib/retry-import.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { retryImport } from "@shared/lib/retry-import";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(REDUCED_MOTION_QUERY).matches;
  } catch {
    return false;
  }
}

/** Fire and forget; resolves once the burst started (or was skipped). */
export async function launchLessonConfetti(): Promise<void> {
  if (prefersReducedMotion()) {
    return;
  }

  try {
    const { default: confetti } = await retryImport(() => import("canvas-confetti"));

    await confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 }, disableForReducedMotion: true });
  } catch {
    // Decoration only: a missing chunk or canvas never blocks the completion dialog.
  }
}
