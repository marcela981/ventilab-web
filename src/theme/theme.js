/*
* Funcionalidad: Legacy theme adapter
* Descripción: Thin 1:1 adapter kept so legacy imports of src/theme/theme.js keep working. The official light identity now lives in src/shared/design-system/theme (MUI theme with cssVariables, self-hosted Roboto). Re-exports the same theme as default and the same named exports (colors, levelColors, getColorWithOpacity, getLevelColor, getStatusColor) with identical values.
* Versión: 4.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { theme } from '@shared/design-system/theme';

export {
  colors,
  levelColors,
  getColorWithOpacity,
  getLevelColor,
  getStatusColor,
} from '@shared/design-system/theme';

export default theme;
