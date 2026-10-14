/*
* Funcionalidad: groups public API
* Descripción: Public surface of the groups feature for pages and other features: MyGroupPage (thin route pages/my-group) and GroupsPage (thin route pages/groups). v1.1 (T11b): GroupDetailPage (thin route pages/groups/[groupId]). v1.2 (T11c): GroupsPage and GroupDetailPage are the lazy wrappers of lazy-staff-pages, so the student-only /my-group route does not ship the staff code (dialogs, tables, detail).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type { GroupDetailPageProps } from "./application/pages/group-detail.page";
export { GroupDetailPage, GroupsPage } from "./application/pages/lazy-staff-pages";
export { MyGroupPage } from "./application/pages/my-group.page";
