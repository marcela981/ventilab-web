/*
* Funcionalidad: NotificationToasts
* Descripción: Renders nothing; mounted once in pages/_app.js inside the ToastProvider. Every `notification:new` of the user room shows its title as an info toast queued with `{ notice: true }`, so focus mode (an exam attempt, an EXAM simulation, the live ventilator console) drops it; the notification itself stays in the bell and in /notifications. Light on purpose (no api-client): it lives in the app shell. Depends on @shared/realtime and the design-system toast.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useToast } from "@shared/design-system/components/use-toast";
import { useSocketEvent } from "@shared/realtime/use-socket-event";

export function NotificationToasts() {
  const toast = useToast();

  useSocketEvent("notification:new", (notification) => {
    toast.info(notification.title, { notice: true });
  });

  return null;
}
