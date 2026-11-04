/*
* Funcionalidad: API contract check
* Descripción: The API contract the web expects (REQUIRED_API_CONTRACT) and the pure decision of the contract banner: the server version entity (sha, short sha, builtAt, contract), the check result (loading, ok, mismatch, missing endpoint, unavailable), whether the banner is shown (ADMIN only, and only for mismatch, missing endpoint or unavailable) and its Spanish text. Depends on nothing.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

/**
 * API contract version this web build expects from ventylab-server.
 * Bump it together with the server's API_CONTRACT_VERSION whenever a breaking change of the
 * HTTP contract ships, so an admin sees the banner while the two deploys are out of step.
 */
export const REQUIRED_API_CONTRACT = 1;

export const UNKNOWN_BUILD_VALUE = "unknown";

export type ApiVersion = {
  sha: string
  /** First 7 characters of the sha, or "unknown". */
  shortSha: string
  builtAt: string
  contract: number
};

export type ApiContractCheck =
  | { status: "loading" }
  | { status: "ok", version: ApiVersion }
  | { status: "mismatch", version: ApiVersion }
  /** `GET /api/version` answered 404: the server predates the version endpoint. */
  | { status: "missing" }
  /** The request failed for another reason or the payload was not a version. */
  | { status: "unavailable" };

export type ApiVersionQueryState = {
  version: ApiVersion | null
  error: { status?: number } | null
};

export function evaluateApiContract(
  { version, error }: ApiVersionQueryState,
  required: number = REQUIRED_API_CONTRACT,
): ApiContractCheck {
  if (version) {
    return version.contract === required ? { status: "ok", version } : { status: "mismatch", version };
  }

  if (error) {
    return error.status === 404 ? { status: "missing" } : { status: "unavailable" };
  }

  return { status: "loading" };
}

export function shouldShowContractBanner(role: string | null, check: ApiContractCheck): boolean {
  return role === "ADMIN" && (check.status === "mismatch" || check.status === "missing" || check.status === "unavailable");
}

// TODO(i18n): move to a shared namespace in src/i18n.
export function contractBannerMessage(check: ApiContractCheck, required: number = REQUIRED_API_CONTRACT): string | null {
  switch (check.status) {
    case "mismatch":
      return `El servidor (versión ${check.version.shortSha}, contrato v${check.version.contract}) no coincide con el contrato que espera la web (v${required}). Redespliegue el servidor.`;
    case "missing":
      return `El servidor no informa su versión: es anterior al contrato que espera la web (v${required}). Redespliegue el servidor.`;
    case "unavailable":
      return `No se pudo verificar la versión del servidor; la web espera el contrato v${required}. Si persiste, redespliegue el servidor.`;
    default:
      return null;
  }
}
