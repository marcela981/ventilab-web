/*
* Funcionalidad: MUI theme module augmentation
* Descripción: Declares the custom palette keys of the VentyLab theme (palette.curriculum, background.contrast, text.hint) so they are typed in theme.palette and theme.vars.palette. Depends on @mui/material/styles types.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import "@mui/material/styles";
import type { ColorVariations, CurriculumLevel } from "./palette";

type CurriculumPalette = Record<CurriculumLevel, ColorVariations>;

declare module "@mui/material/styles" {
  interface Palette {
    curriculum: CurriculumPalette;
  }

  interface PaletteOptions {
    curriculum?: CurriculumPalette;
  }

  interface TypeBackground {
    contrast?: string;
  }

  interface TypeText {
    hint?: string;
  }
}
