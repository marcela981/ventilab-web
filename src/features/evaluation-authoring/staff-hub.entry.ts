/*
* Funcionalidad: Staff evaluation hub entry point
* Descripción: Public entry point of the staff evaluation hub (Bloque 3 W5): StaffEvaluationsHub, loaded lazily by /evaluations for teachers and admins, and staffHubUrl, the destination of the /evaluations/manage and /grading redirect pages. Depends on the authoring application layer.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { StaffEvaluationsHub } from "./application/components/staff-hub/staff-evaluations-hub";
export { staffHubUrl } from "./application/entities/staff-hub.entity";
