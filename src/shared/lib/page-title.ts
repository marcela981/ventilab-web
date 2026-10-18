/*
* Funcionalidad: Page title helper
* Descripción: Single source of the document title format of every route: formatPageTitle joins the non-empty sections with " | " and appends the application name ("Calificar | VentyLab", "Ana | Grupos | VentyLab"); with no section it returns the application name alone. APP_NAME and APP_DESCRIPTION also feed the default title (_app) and the default meta description (_document). Pure; no dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const APP_NAME = "VentyLab";

export const APP_DESCRIPTION =
  "VentyLab: plataforma educativa para la enseñanza de la mecánica ventilatoria con simulación, laboratorio con ventilador real y retroalimentación con modelos de lenguaje.";

const TITLE_SEPARATOR = " | ";

export function formatPageTitle(...sections: ReadonlyArray<string | null | undefined>): string {
  const parts = sections
    .map((section) => (section ?? "").trim())
    .filter((section) => section !== "");

  return [...parts, APP_NAME].join(TITLE_SEPARATOR);
}
