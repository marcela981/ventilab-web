/*
* Funcionalidad: useGroupExport
* Descripción: "Exportar CSV" of /teacher: downloads the group analytics as CSV (`GET /api/analytics/groups/{groupId}/export.csv`, same scope as the dashboard) with a pending state; a failure becomes an error toast. Depends on React, the design-system toast, the teacher dashboard service and error messages.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useState } from "react";
import { useToast } from "@shared/design-system/components/use-toast";
import { exportGroupCsv } from "../../api/services/teacher-dashboard.service";
import { getTeacherDashboardErrorMessage } from "../entities/teacher-dashboard-error-messages";

export type UseGroupExportResult = {
  exporting: boolean
  exportCsv: (groupId: string, groupName: string | null) => Promise<void>
};

export function useGroupExport(): UseGroupExportResult {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);

  const exportCsv = useCallback(async(groupId: string, groupName: string | null) => {
    setExporting(true);

    try {
      await exportGroupCsv(groupId, groupName);
    } catch (error) {
      toast.error(getTeacherDashboardErrorMessage(error));
    } finally {
      setExporting(false);
    }
  }, [toast]);

  return { exporting, exportCsv };
}
