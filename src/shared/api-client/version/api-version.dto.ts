/*
* Funcionalidad: API version DTO
* Descripción: Response type of the public `GET /api/version` of ventylab-server: `{ sha, builtAt, contract }` (sha and builtAt are "unknown" when the build did not record them; contract is the server API_CONTRACT_VERSION). The server answers it raw, like /health; it is not in the generated OpenAPI schema, so the type is written here and the mapper validates every field. Types only.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const API_VERSION_PATH = "/api/version";

export type ApiVersionDTO = {
  /** Git commit of the server build, or "unknown". */
  sha: string
  /** ISO date of the server build, or "unknown". */
  builtAt: string
  /** API contract version the server implements (API_CONTRACT_VERSION). */
  contract: number
};
