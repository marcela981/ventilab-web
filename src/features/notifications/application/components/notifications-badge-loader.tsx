/*
* Funcionalidad: NotificationsBadgeLoader
* Descripción: Renders nothing; feeds the "notificationsUnread" navigation badge (nav-badges registry of @shared/layouts) with the unread count read by useUnreadNotificationsCount (the same SWR key as the bell, refreshed by its realtime listener, every 120 s and on window focus). A pending or failed read keeps the last known count; the badge is cleared on unmount. Loaded lazily by NotificationsBadgeSync. Depends on React, @shared/layouts/nav-badges and the unread count hook.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect } from "react";
import { useSetNavBadgeCount } from "@shared/layouts/nav-badges";
import { useUnreadNotificationsCount } from "../hooks/use-unread-notifications-count";

export function NotificationsBadgeLoader() {
  const count = useUnreadNotificationsCount(true);
  const setCount = useSetNavBadgeCount("notificationsUnread");

  useEffect(() => {
    if (count !== null) {
      setCount(count);
    }
  }, [count, setCount]);

  useEffect(() => () => setCount(null), [setCount]);

  return null;
}
