/*
* Funcionalidad: useScrollToHash
* Descripción: Once the async content is ready, scrolls to the element named by the URL hash (level anchors such as /learn/s1#level-lv1, used by the prerequisite links and the breadcrumb). The browser cannot do it on navigation because the target does not exist until the curriculum tree loads. Depends on react.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect } from "react";

export function useScrollToHash(ready: boolean): void {
  useEffect(() => {
    if (!ready || typeof window === "undefined") {
      return;
    }

    const id = decodeURIComponent(window.location.hash.slice(1));
    const target = id ? document.getElementById(id) : null;

    target?.scrollIntoView?.({ block: "start" });
  }, [ready]);
}
