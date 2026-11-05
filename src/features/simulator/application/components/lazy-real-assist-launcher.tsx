/*
* Funcionalidad: Lazy real-mode "Asesoría IA" launcher
* Descripción: The "Asesoría IA" button of the real monitor console (Bloque A, DISENO_AJUSTES_A §5 "Modo real"): the
*   simulator AssistLauncher in real mode (POST /api/simulation/real/assist with the monitor state read at each
*   request, no exam policy), loaded through React.lazy + retryImport so the real monitor of /simulador keeps the
*   console and the AI conversation UI out of its static graph (lab-live lazy boundary). It renders inside the July
*   console, so its drawer is exclusive with the other console drawers. Depends on React and @shared/lib/retry-import.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { lazy, Suspense } from "react";
import { retryImport } from "@shared/lib/retry-import";
import type { RealMonitorStateDTO } from "../../api/services/simulation-alarm-help.service";

const LoadedAssistLauncher = lazy(() =>
  retryImport(() => import("./assist-launcher")).then((module) => ({ default: module.AssistLauncher })),
);

export type RealAssistLauncherProps = {
  /** The monitor state of the real console, read at each request. */
  getMonitorState: () => RealMonitorStateDTO
  /** false while the device sends no data: the panel closes and the button is disabled. */
  active: boolean
};

export function RealAssistLauncher({ getMonitorState, active }: RealAssistLauncherProps) {
  return (
    <Suspense fallback={null}>
      <LoadedAssistLauncher sessionId="" mode="FREE" active={active} realMonitor={getMonitorState} />
    </Suspense>
  );
}
