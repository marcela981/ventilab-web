/*
* Funcionalidad: NotificationBell
* Descripción: Entry point of the notifications bell, contributed to the AppShell top bar from pages/_app.js (TopBarActionsProvider, next to the AI assistant launcher). Only an authenticated backend session renders it; the bell itself (NotificationBellMenu: popover, api-client requests, deep links) is loaded through React.lazy + retryImport so the app shell chunk stays small, with a disabled bell as placeholder while it loads. A chunk that fails to load or a render error renders nothing (the bell is optional). Depends on React, MUI, @shared/session, @shared/lib/retry-import and the silent boundary.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import IconButton from "@mui/material/IconButton";
import { lazy, Suspense } from "react";
import type { ComponentType } from "react";
import { retryImport } from "@shared/lib/retry-import";
import { useSession } from "@shared/session/use-session";
import { SilentBoundary } from "./silent-boundary";

// TODO(i18n): move to a notifications namespace in src/i18n.
const PLACEHOLDER_LABEL = "Notificaciones";

function NoBell() {
  return null;
}

const LoadedNotificationBell = lazy<ComponentType>(() =>
  retryImport(() => import("./notification-bell-menu"))
    .then((module) => ({ default: module.NotificationBellMenu }))
    .catch(() => ({ default: NoBell })),
);

function BellPlaceholder() {
  return (
    <IconButton aria-label={PLACEHOLDER_LABEL} disabled>
      <NotificationsNoneIcon />
    </IconButton>
  );
}

export function NotificationBell() {
  const { status } = useSession();

  if (status !== "authenticated") {
    return null;
  }

  return (
    <SilentBoundary>
      <Suspense fallback={<BellPlaceholder />}>
        <LoadedNotificationBell />
      </Suspense>
    </SilentBoundary>
  );
}
