/*
* Funcionalidad: useSessionsView
* Descripción: View of the Mis sesiones tab of /simulador, owned by the URL like the workspace tab (DISENO_BLOQUE1
*   §2.4 and §2.8): the list, `?tab=sesiones&replay=<id>`, `&result=<id>` or `&recording=<id>`, read only once the
*   router is ready (the list before). Opening a view or going back to the list is a shallow `router.replace` that
*   keeps the rest of the query (e.g. `?session=`), so the workspace and its panels never remount. Depends on
*   next/router and the sessions feed entity.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { useCallback } from "react";
import { parseSessionsView, SESSIONS_LIST_VIEW, sessionsViewQuery } from "../entities/sessions-feed.entity";
import type { SessionsView } from "../entities/sessions-feed.entity";

export type UseSessionsViewResult = {
  view: SessionsView
  open: (view: SessionsView) => void
  /** Back to the list (drops the view key). */
  back: () => void
};

export function useSessionsView(): UseSessionsViewResult {
  const router = useRouter();
  const view = router.isReady ? parseSessionsView(router.query) : SESSIONS_LIST_VIEW;

  const open = useCallback((next: SessionsView) => {
    void router.replace({ pathname: router.pathname, query: sessionsViewQuery(router.query, next) }, undefined, { shallow: true });
  }, [router]);

  const back = useCallback(() => open(SESSIONS_LIST_VIEW), [open]);

  return { view, open, back };
}
