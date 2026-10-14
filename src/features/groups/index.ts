/*
* Funcionalidad: groups public API
* Descripción: Public surface of the groups feature for pages and other features: MyGroupPage (thin route pages/my-group) and GroupsPage (thin route pages/groups). v1.1 (T11b): GroupDetailPage (thin route pages/groups/[groupId]).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { GroupDetailPage } from "./application/pages/group-detail.page";
export type { GroupDetailPageProps } from "./application/pages/group-detail.page";
export { GroupsPage } from "./application/pages/groups.page";
export { MyGroupPage } from "./application/pages/my-group.page";
