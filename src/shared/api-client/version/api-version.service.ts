/*
* Funcionalidad: API version service
* Descripción: Reads the public `GET /api/version` of ventylab-server with the shared axios client (BACKEND_ORIGIN, no auth needed) and maps it with toApiVersion. The client is imported on demand so the app shell, which mounts the contract banner, does not ship axios in its chunk. A payload that is not a version rejects with an ApiError (status 0, common.unknown); HTTP errors reject with the ApiError of the client (a 404 means the server predates the endpoint). Depends on the API client, the API version DTO and mapper.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { ApiError, CLIENT_ERROR_CODES } from "../api-error";
import type { ApiVersion } from "./api-contract";
import { API_VERSION_PATH } from "./api-version.dto";
import { toApiVersion } from "./api-version.mapper";

// TODO(i18n): move to a shared namespace in src/i18n.
const INVALID_VERSION_MESSAGE = "La respuesta de la versión del servidor no es válida";

export async function fetchApiVersion(): Promise<ApiVersion> {
  const { httpClient } = await import("../http-client");
  const response = await httpClient.get<unknown>(API_VERSION_PATH);
  const version = toApiVersion(response.data);

  if (!version) {
    throw new ApiError({ code: CLIENT_ERROR_CODES.unknown, message: INVALID_VERSION_MESSAGE, status: 0 });
  }

  return version;
}
