/*
* Funcionalidad: Google sign-in configuration
* Descripción: Reads the public Google OAuth client ID (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`, inlined by Next at build time) used by Google Identity Services. An empty value means Google sign-in is not configured in this environment. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export function readGoogleClientId(): string {
  // Referenced literally so Next can inline it in the client bundle.
  return (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "").trim();
}
