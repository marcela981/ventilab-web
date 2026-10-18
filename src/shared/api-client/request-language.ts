/*
* Funcionalidad: Request language
* Descripción: Language of the UI sent to the backend in every request (`Accept-Language: es`), so the nestjs-i18n AcceptLanguageResolver answers error messages and validation details in Spanish. Shared by the axios clients (http-client, token-refresh) and the SSE fetch (sse-stream). `es` is a CORS-safelisted value: no extra preflight. Pure; no dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const REQUEST_LANGUAGE = "es";

export const LANGUAGE_HEADERS = { "Accept-Language": REQUEST_LANGUAGE } as const;
