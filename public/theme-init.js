/*
* Funcionalidad: Theme bootstrap before the first paint
* Descripción: Synchronous script loaded by pages/_document.tsx in <head> (an external file because the CSP only allows 'self' scripts, DISENO_AJUSTES_D §6.3): reads the appearance preference of this browser in localStorage `ventylab.theme.v1` ({ mode, palette }) and sets data-mui-color-scheme (light|dark; without a stored mode, the system mode as MUI resolves it: dark when prefers-color-scheme is dark, else light; dark without matchMedia) and data-palette (ventylab|univalle; VentyLab by default) on <html>, so the page paints with the right tokens before React hydrates (no flash). Kept in sync with src/shared/design-system/theme/theme-preference.ts (theme-init.test.ts). No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
(function initTheme() {
  var root = document.documentElement;
  var stored = {};
  try {
    stored = JSON.parse(window.localStorage.getItem("ventylab.theme.v1") || "{}") || {};
  } catch (error) {
    stored = {};
  }
  var mode = stored.mode === "light" || stored.mode === "dark" ? stored.mode : null;
  if (!mode) {
    // Same rule as MUI's "system" mode: dark when the system prefers dark, else light (dark without matchMedia).
    var media = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    mode = !media || media.matches ? "dark" : "light";
  }
  root.setAttribute("data-mui-color-scheme", mode);
  root.setAttribute("data-palette", stored.palette === "univalle" ? "univalle" : "ventylab");
})();
