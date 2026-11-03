/*
* Funcionalidad: Teacher general tab DTOs
* Descripción: Wire types of the General tab of /teacher (DISENO_BLOQUE4 §2.2), taken from the generated OpenAPI schema: the platform statistics (`GET /api/admin/statistics`) and one row of the students list (`GET /api/admin/students`). Depends on @shared/api-client/generated/schema.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

type Schemas = components["schemas"];

export type PlatformStatisticsDTO = Schemas["PlatformStatisticsDTO"];
export type AdminStudentListItemDTO = Schemas["AdminStudentListItemDTO"];
