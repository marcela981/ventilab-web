/*
* Funcionalidad: content-editor public API
* Descripción: Public surface of the content editor feature for pages: ContentTreePage (thin route pages/content), the lazy wrapper of the tree page so the route only ships the editor code on demand. The page editor (/content/pages/[pageId]) is added in C4.
* Versión: 1.0 (C1)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { ContentTreePage } from "./application/pages/lazy-staff-pages";
