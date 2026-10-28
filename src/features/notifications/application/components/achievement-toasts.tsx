/*
* Funcionalidad: AchievementToasts
* Descripción: Renders nothing; mounted once in pages/_app.js next to NotificationToasts, inside the ToastProvider (W9, Bloque 2; DISENO_BLOQUE2 §2.11). For students only (other roles never unlock achievements, so they get no listener): every `achievement:unlocked` of the user room shows "¡Logro desbloqueado! {title}" as a success toast queued with `{ notice: true }`, so focus mode (an exam attempt, an EXAM simulation, the live ventilator console) drops it, and revalidates the gamification SWR keys (stats, recent activity, calendar, achievements) so Inicio and Mi Progreso show the new XP and achievement. Light on purpose: it only adds the swr mutator (already in the shell) and the learning gamification key list. Depends on swr, @shared/api-client (query invalidation), @shared/realtime, @shared/session, the design-system toast and the learning gamification entry.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useSWRConfig } from "swr";
import { GAMIFICATION_INVALIDATES } from "@features/learning/gamification.entry";
import { invalidateApiQueries } from "@shared/api-client/use-api-query";
import { useToast } from "@shared/design-system/components/use-toast";
import { useSocketEvent } from "@shared/realtime/use-socket-event";
import { useSession } from "@shared/session/use-session";

// TODO(i18n): move to a notifications namespace in src/i18n.
export const ACHIEVEMENT_TOAST_COPY = {
  unlocked: (title: string) => `¡Logro desbloqueado! ${title}`,
} as const;

function AchievementToastListener() {
  const toast = useToast();
  const { mutate } = useSWRConfig();

  useSocketEvent("achievement:unlocked", (achievement) => {
    toast.success(ACHIEVEMENT_TOAST_COPY.unlocked(achievement.title), { notice: true });
    void invalidateApiQueries(mutate, GAMIFICATION_INVALIDATES);
  });

  return null;
}

export function AchievementToasts() {
  const { role } = useSession();

  return role === "STUDENT" ? <AchievementToastListener /> : null;
}
