/*
* Funcionalidad: API contract check tests
* Descripción: Verifies the contract banner decision: contract match, mismatch, missing endpoint (404), other failures, loading, ADMIN-only visibility and the Spanish texts. Depends on vitest and the API contract check.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  contractBannerMessage,
  evaluateApiContract,
  REQUIRED_API_CONTRACT,
  shouldShowContractBanner,
} from "./api-contract";
import type { ApiContractCheck, ApiVersion } from "./api-contract";

const version = (contract: number): ApiVersion => ({ sha: "0123456789", shortSha: "0123456", builtAt: "2026-11-04T10:00:00.000Z", contract });

describe("evaluateApiContract", () => {
  it("is ok when the server contract matches", () => {
    expect(evaluateApiContract({ version: version(REQUIRED_API_CONTRACT), error: null })).toEqual({ status: "ok", version: version(REQUIRED_API_CONTRACT) });
  });

  it("is a mismatch when the server reports another contract", () => {
    expect(evaluateApiContract({ version: version(2), error: null }, 1).status).toBe("mismatch");
  });

  it("is missing when the endpoint answers 404", () => {
    expect(evaluateApiContract({ version: null, error: { status: 404 } })).toEqual({ status: "missing" });
  });

  it("is unavailable for any other failure", () => {
    expect(evaluateApiContract({ version: null, error: { status: 500 } })).toEqual({ status: "unavailable" });
    expect(evaluateApiContract({ version: null, error: { status: 0 } })).toEqual({ status: "unavailable" });
  });

  it("is loading before an answer", () => {
    expect(evaluateApiContract({ version: null, error: null })).toEqual({ status: "loading" });
  });
});

describe("shouldShowContractBanner", () => {
  const problems: ApiContractCheck[] = [{ status: "mismatch", version: version(2) }, { status: "missing" }, { status: "unavailable" }];

  it.each(problems)("shows $status to admins", (check) => {
    expect(shouldShowContractBanner("ADMIN", check)).toBe(true);
  });

  it.each(["TEACHER", "STUDENT", null])("hides every problem from %s", (role) => {
    for (const check of problems) {
      expect(shouldShowContractBanner(role, check)).toBe(false);
    }
  });

  it("hides the banner while loading or when the contract matches", () => {
    expect(shouldShowContractBanner("ADMIN", { status: "loading" })).toBe(false);
    expect(shouldShowContractBanner("ADMIN", { status: "ok", version: version(REQUIRED_API_CONTRACT) })).toBe(false);
  });
});

describe("contractBannerMessage", () => {
  it("names the short sha and both contracts on a mismatch", () => {
    expect(contractBannerMessage({ status: "mismatch", version: version(2) }, 1)).toBe(
      "El servidor (versión 0123456, contrato v2) no coincide con el contrato que espera la web (v1). Redespliegue el servidor.",
    );
  });

  it("explains a server older than the endpoint", () => {
    expect(contractBannerMessage({ status: "missing" }, 1)).toBe(
      "El servidor no informa su versión: es anterior al contrato que espera la web (v1). Redespliegue el servidor.",
    );
  });

  it("has no text when nothing is wrong", () => {
    expect(contractBannerMessage({ status: "loading" })).toBeNull();
    expect(contractBannerMessage({ status: "ok", version: version(1) })).toBeNull();
  });
});
