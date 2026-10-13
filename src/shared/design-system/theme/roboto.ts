/*
* Funcionalidad: Roboto font loader
* Descripción: Self-hosts Roboto through next/font/google (weights 400/500/600/700, display swap). The resulting family stack feeds the MUI theme typography, so it reaches the --mui-font-* CSS variables, CssBaseline (body) and every portal. Depends on next/font.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { Roboto } from "next/font/google";

// next/font requires the loader call to be assigned to a module-scope const.
const roboto = Roboto({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

/** Font stack: self-hosted Roboto (+ its metric-adjusted fallback), then the legacy fallbacks. */
export const fontFamily = [roboto.style.fontFamily, '"Helvetica"', '"Arial"', "sans-serif"].join(", ");
