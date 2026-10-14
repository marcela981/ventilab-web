/*
* Funcionalidad: Learning query config
* Descripción: SWR configuration of the curriculum and progress queries (C4 cache pattern): cache-first with stale-while-revalidate, 60 s deduplication window (a module opened again within a minute is served from the cache without a request), no revalidation on focus. v1.1 (L3): keepPreviousData is OFF: the learning queries are keyed by an entity id (module, lesson, section, level), and keeping the previous data across a key change rendered the previous module's data under the new module; a changed id now shows its loading state. Mutations (page views) invalidate the affected keys explicitly. Depends on swr types.
* Versión: 1.1
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
  // Never true: id-keyed queries must not show another id's data while the new one loads.
  keepPreviousData: false,
  revalidateOnFocus: false,
  revalidateIfStale: true,
} as const satisfies SWRConfiguration;
