/*
* Funcionalidad: Shell config
* Descripción: Constants shared by the AppShell and the PanelShell without pulling one shell into the other's chunk: the app version printed at the foot of both sidebars ("VentyLab v0.1.0", "VentyLab Admin v0.1.0"; the package.json version, never read at runtime so the bundle does not grow) and the media query of the md breakpoint that the shell CSS uses (permanent sidebar from 900px, thin mobile bar below), with which the shells decide where the tools render. v1.0 (Bloque 5, §5.1): new.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const APP_NAME = "VentyLab";

// package.json "version".
export const APP_VERSION = "0.1.0";

// Same breakpoint as app-shell.module.css and panel-shell.module.css (MUI md).
export const SHELL_DESKTOP_QUERY = "(min-width:900px)";
