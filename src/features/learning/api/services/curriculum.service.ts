/*
* Funcionalidad: Curriculum service
* Descripción: SWR keys (paths) of the curriculum read endpoints the learning feature queries through useApiQuery: the curriculum tree (`GET /api/curriculum/tree`), the lessons of a module (`GET /api/modules/{id}/lessons`) and the Pages of a lesson (`GET /api/pages?lessonId=`). Read only; default (fast) timeout. Depends on nothing at runtime. v1.1 (L3): PAGE_PATH (`GET /api/pages/{id}`, one Page with its blocks). v1.2 (L7): MODULE_FULL_PATH (`GET /api/modules/{id}/full`, the whole module with lessons, Pages and blocks for the print view).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const CURRICULUM_TREE_PATH = "/api/curriculum/tree";
export const MODULE_LESSONS_PATH = "/api/modules/{id}/lessons";
export const LESSON_PAGES_PATH = "/api/pages";
export const PAGE_PATH = "/api/pages/{id}";
export const MODULE_FULL_PATH = "/api/modules/{id}/full";
