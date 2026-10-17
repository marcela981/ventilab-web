/*
* Funcionalidad: NotificationsBadgeSync
* Descripción: Entry point of the unread-notifications navigation badge, mounted once in pages/_app.js inside the NavBadgeProvider (like GradingPendingBadgeSync). Only an authenticated backend session, and only while a badge host (the AppShell) is on screen (useNavBadgesVisible), loads NotificationsBadgeLoader through React.lazy + retryImport, so the app shell chunk never pulls the api-client request layer and legacy pages do not poll; a chunk or render failure renders nothing. Depends on React, @shared/layouts/nav-badges, @shared/session, @shared/lib/retry-import and the silent boundary.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { lazy, Suspense } from "react";
import { useNavBadgesVisible } from "@shared/layouts/nav-badges";
import { retryImport } from "@shared/lib/retry-import";
import { useSession } from "@shared/session/use-session";
import { SilentBoundary } from "./silent-boundary";

function NoBadge() {
  return null;
}

const LoadedNotificationsBadge = lazy(() =>
  retryImport(() => import("./notifications-badge-loader"))
    .then((module) => ({ default: module.NotificationsBadgeLoader }))
    .catch(() => ({ default: NoBadge })),
);

export function NotificationsBadgeSync() {
  const { status } = useSession();
  const visible = useNavBadgesVisible();

  if (status !== "authenticated" || !visible) {
    return null;
  }

  return (
    <SilentBoundary>
      <Suspense fallback={null}>
        <LoadedNotificationsBadge />
      </Suspense>
    </SilentBoundary>
  );
}
