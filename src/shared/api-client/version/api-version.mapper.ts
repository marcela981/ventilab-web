/*
* Funcionalidad: API version mapper
* Descripción: Maps the payload of `GET /api/version` to the ApiVersion entity. Accepts the raw body (`{ sha, builtAt, contract }`, like /health) and, to be safe, the same object wrapped as `{ data: { ... } }`; returns null when the payload is not a version (contract not a finite number). A missing or blank sha or builtAt becomes "unknown". Depends on the API version DTO and the API contract entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { UNKNOWN_BUILD_VALUE } from "./api-contract";
import type { ApiVersion } from "./api-contract";
import type { ApiVersionDTO } from "./api-version.dto";

const SHORT_SHA_LENGTH = 7;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrap(payload: unknown): Partial<ApiVersionDTO> | null {
  if (!isRecord(payload)) {
    return null;
  }

  return "contract" in payload ? payload : isRecord(payload.data) ? payload.data : null;
}

function text(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : UNKNOWN_BUILD_VALUE;
}

export function toApiVersion(payload: unknown): ApiVersion | null {
  const dto = unwrap(payload);

  if (!dto || typeof dto.contract !== "number" || !Number.isFinite(dto.contract)) {
    return null;
  }

  const sha = text(dto.sha);

  return {
    sha,
    shortSha: sha === UNKNOWN_BUILD_VALUE ? sha : sha.slice(0, SHORT_SHA_LENGTH),
    builtAt: text(dto.builtAt),
    contract: dto.contract,
  };
}
