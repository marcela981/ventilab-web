/*
* Funcionalidad: useCsvExport
* Descripción: Runs one CSV export of the operation pages: calls the given export (which returns the downloaded file and the X-Export-Truncated flag), hands the file to the browser with saveTextFile (UTF-8 BOM for Excel) under the server file name or the fallback, and keeps `truncated` so the page can show a visible notice; failures show the admin console error message as a toast (the caller may pass its own message mapper). v1.1 (review): `truncated` is cleared at the start of every run and by `reset()`, which the pages call when their filters change, so a stale truncation notice never outlives the export it belongs to. Depends on React, @shared/api-client, the design-system toast and the admin console service and error messages.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useState } from "react";
import { saveTextFile } from "@shared/api-client/api-download";
import { useToast } from "@shared/design-system/components/use-toast";
import type { ExportedFile } from "../../api/services/admin-operations.service";
import { getAdminConsoleErrorMessage } from "../entities/admin-console-error-messages";

export type UseCsvExportResult = {
  exporting: boolean
  truncated: boolean
  error: unknown
  run: (exportFile: () => Promise<ExportedFile>, fallbackName: string) => Promise<void>
  /** Clears the truncation notice (call it when the export filters change). */
  reset: () => void
};

export function useCsvExport(messageOf: (error: unknown) => string = getAdminConsoleErrorMessage): UseCsvExportResult {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const run = useCallback(async(exportFile: () => Promise<ExportedFile>, fallbackName: string) => {
    setExporting(true);
    setError(null);
    setTruncated(false);

    try {
      const result = await exportFile();

      saveTextFile(result.file, fallbackName);
      setTruncated(result.truncated);
    } catch (caught) {
      setError(caught);
      toast.error(messageOf(caught));
    } finally {
      setExporting(false);
    }
  }, [toast, messageOf]);

  const reset = useCallback(() => {
    setTruncated(false);
  }, []);

  return { exporting, truncated, error, run, reset };
}
