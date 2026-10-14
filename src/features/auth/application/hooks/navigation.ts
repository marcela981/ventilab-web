/*
* Funcionalidad: Post-login navigation
* Descripción: Full page navigation used after login. During the legacy coexistence the destination is usually a legacy page whose NextAuth-based auth context only reads the signed-in user when the app mounts, so a client-side route change would leave it without the user (and bounce back to login). A document navigation remounts the app with the new session. Browser only.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export function navigateTo(url: string): void {
  window.location.assign(url);
}
