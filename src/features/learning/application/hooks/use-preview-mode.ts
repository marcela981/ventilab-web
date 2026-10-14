/*
* Funcionalidad: usePreviewMode
* Descripción: True when the signed-in user is a TEACHER or ADMIN. Staff use the learning routes as a preview: they see a "Vista previa" notice, are never stopped by lock screens (only a hint that students would see the content locked) and never register page views (the page-view tracker skips them). Depends on @shared/session.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useSession } from "@shared/session/use-session";

export function usePreviewMode(): boolean {
  const { role } = useSession();

  return role === "TEACHER" || role === "ADMIN";
}
