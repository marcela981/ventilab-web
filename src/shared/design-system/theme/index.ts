/*
* Funcionalidad: Design-system theme public API
* Descripción: Public entry of the theme module: the cssVariables MUI theme, the brand colors, curriculum level colors and color helpers. Depends on ./theme and ./palette.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { theme } from "./theme";
export {
  colors,
  levelColors,
  getColorWithOpacity,
  getLevelColor,
  getStatusColor,
  type ColorVariations,
  type CurriculumLevel,
} from "./palette";
