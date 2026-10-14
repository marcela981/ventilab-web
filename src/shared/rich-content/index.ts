/*
* Funcionalidad: rich-content public API
* Descripción: Public surface of the read-only lesson content renderer: the RichContent component and the pure format detection helper. The markdown/KaTeX renderers are internal lazy chunks.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { detectContentFormat } from "./content-format";
export type { ContentFormat } from "./content-format";
export { RichContent } from "./rich-content";
export type { RichContentProps } from "./rich-content";
