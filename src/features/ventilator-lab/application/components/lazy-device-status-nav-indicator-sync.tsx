/*
* Funcionalidad: Device status navigation indicator sync
* Descripción: T12 review fix W1. Entry point of the "Laboratorio" navigation indicator, mounted once in
*   pages/_app.js inside the NavIndicatorProvider (same pattern as GradingPendingBadgeSync). Only for an
*   authenticated backend session and only while a host (the AppShell) displays the "ventilatorDevice" key
*   (useNavIndicatorVisible of @shared/layouts/nav-indicators) it loads DeviceStatusNavIndicatorLoader through
*   React.lazy + retryImport, so legacy pages without the shell read and listen to nothing and the app shell chunk
*   never pulls the api-client request layer; a chunk that fails to load or a render error renders nothing (the
*   indicator is optional). pages/_app.js imports this module by its direct path, not through the feature barrel.
*   Depends on React, @shared/session, @shared/layouts/nav-indicators and @shared/lib/retry-import.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { Component, lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { useNavIndicatorVisible } from "@shared/layouts/nav-indicators";
import { retryImport } from "@shared/lib/retry-import";
import { useSession } from "@shared/session/use-session";

function NoIndicator() {
  return null;
}

const LoadedDeviceStatusNavIndicator = lazy(() =>
  retryImport(() => import("./device-status-nav-indicator-loader"))
    .then((module) => ({ default: module.DeviceStatusNavIndicatorLoader }))
    .catch(() => ({ default: NoIndicator })),
);

type IndicatorBoundaryState = { failed: boolean };

// The indicator is optional: a failure while rendering it must never break the app.
class IndicatorErrorBoundary extends Component<{ children: ReactNode }, IndicatorBoundaryState> {
  override state: IndicatorBoundaryState = { failed: false };

  static getDerivedStateFromError(): IndicatorBoundaryState {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function DeviceStatusNavIndicatorSync() {
  const { status } = useSession();
  const visible = useNavIndicatorVisible("ventilatorDevice");

  if (status !== "authenticated" || !visible) {
    return null;
  }

  return (
    <IndicatorErrorBoundary>
      <Suspense fallback={null}>
        <LoadedDeviceStatusNavIndicator />
      </Suspense>
    </IndicatorErrorBoundary>
  );
}
