/*
* Funcionalidad: retryImport + isChunkLoadError (new code)
* Descripción: New-code equivalent of the C1 legacy utilities in src/shared/components/ChunkErrorBoundary.jsx (kept untouched for legacy pages). retryImport retries a failed dynamic import() with exponential backoff (3 attempts in total, 500 ms then 1000 ms) to absorb transient network failures; isChunkLoadError detects chunk-load failures that persist (typically a deploy that invalidated chunk hashes) so a boundary can offer a user-triggered reload. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export function retryImport<T>(importFn: () => Promise<T>, retries = 2, delayMs = 500): Promise<T> {
  return importFn().catch((error: unknown) => {
    if (retries <= 0) {
      throw error;
    }

    return new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    }).then(() => retryImport(importFn, retries - 1, delayMs * 2));
  });
}

export function isChunkLoadError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const { name, message } = error as { name?: unknown, message?: unknown };
  const text = typeof message === "string" ? message : "";

  return (
    name === "ChunkLoadError"
    || /loading (css )?chunk [^ ]* failed/i.test(text)
    || /failed to fetch dynamically imported module/i.test(text)
  );
}
