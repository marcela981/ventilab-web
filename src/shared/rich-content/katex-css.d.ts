/*
* Funcionalidad: KaTeX stylesheet declaration
* Descripción: Declares the KaTeX global stylesheet as a side-effect module so `noUncheckedSideEffectImports` accepts the import in the lazy math chunk. Next only types `*.module.css`; an exact module name avoids a global `*.css` wildcard.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

declare module "katex/dist/katex.min.css";
