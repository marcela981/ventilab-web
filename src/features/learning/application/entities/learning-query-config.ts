/*
* Funcionalidad: Learning query config
* Descripción: SWR configuration of the curriculum and progress queries (C4 cache pattern): cache-first with stale-while-revalidate, 60 s deduplication window (a module opened again within a minute is served from the cache without a request), keepPreviousData so a key change keeps the last data on screen, no revalidation on focus. Mutations (page views) invalidate the affected keys explicitly. Depends on swr types.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { SWRConfiguration } from "swr";

export const LEARNING_CACHE_TTL_MS = 60_000;

export const LEARNING_QUERY_CONFIG = {
  dedupingInterval: LEARNING_CACHE_TTL_MS,
  keepPreviousData: true,
  revalidateOnFocus: false,
  revalidateIfStale: true,
} as const satisfies SWRConfiguration;
