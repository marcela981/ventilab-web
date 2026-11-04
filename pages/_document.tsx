/*
* Funcionalidad: _document — HTML document of the Pages Router
* Descripción: Server-only document shell: `<html lang="es">`, the default meta description (APP_DESCRIPTION of @shared/lib/page-title), the theme color (brand primary of the design-system palette, not a new literal), the favicon (`/favicon.ico`, 16/32/48 px cropped from public/images/logo.png) and the Apple touch icon (`/apple-touch-icon.png`, 180 px). The per-route `<title>` is set by each page with next/head (default in _app), never here. Depends on next/document, @shared/lib/page-title and the design-system palette. v1.1 (Bloque 5): the server renders data-mui-color-scheme="dark" on <html> (the default July dark scheme, D1), the same attribute the ThemeProvider sets after hydration, so the first paint already uses the dark scheme and there is no flash of the light one.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { Head, Html, Main, NextScript } from "next/document";
import { APP_DESCRIPTION } from "@shared/lib/page-title";
import { colors } from "@shared/design-system/theme/palette";

export default function Document() {
  return (
    <Html lang="es" data-mui-color-scheme="dark">
      <Head>
        <meta name="description" content={APP_DESCRIPTION} />
        <meta name="theme-color" content={colors.primary} />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
