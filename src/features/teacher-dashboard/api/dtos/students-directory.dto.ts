/*
* Funcionalidad: Students directory DTOs
* Descripción: Request and response types of the students directory (/teacher/students) and the General tab of /teacher, taken from the generated OpenAPI schema: one row of `GET /api/admin/students` (student code, active groups, published-content progress, canView), its query, the platform statistics of `GET /api/admin/statistics` and the group creation body of `POST /api/groups` used by "Conformar grupo". Types only.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components, operations } from "@shared/api-client/generated/schema";

type Schemas = components["schemas"];

export type AdminStudentListItemDTO = Schemas["AdminStudentListItemDTO"];
export type AdminStudentsQueryDTO = NonNullable<operations["adminGetStudents"]["parameters"]["query"]>;
export type PlatformStatisticsDTO = Schemas["PlatformStatisticsDTO"];
export type CreateGroupRequestDTO = Schemas["CreateGroupDTO"];
