/*
* Funcionalidad: Google sign-in configuration
* Descripción: Reads the public Google OAuth client ID (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`, inlined by Next at build time) used by Google Identity Services. An empty value means Google sign-in is not configured in this environment. v1.1 (B6): reads the variable through @shared/lib/env (the only module that reads process.env).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { readGoogleClientId as readGoogleClientIdFromEnv } from "@shared/lib/env";

export function readGoogleClientId(): string {
  return readGoogleClientIdFromEnv();
}
