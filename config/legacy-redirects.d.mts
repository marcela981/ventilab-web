/*
* Funcionalidad: Legacy redirects types
* Descripción: Type declaration of config/legacy-redirects.mjs so strict TypeScript tests can import the redirect list (the strict project does not allow JavaScript). Mirrors the Next.js redirect shape used there.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type LegacyRedirectCondition = {
  type: "query"
  key: string
  value: string
};

export type LegacyRedirect = {
  source: string
  destination: string
  permanent: false
  has?: readonly LegacyRedirectCondition[]
};

export declare const LEGACY_REDIRECTS: readonly LegacyRedirect[];
