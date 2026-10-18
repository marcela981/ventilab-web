/*
* Funcionalidad: Provider chain entity tests
* Descripción: The provider chain rules: only configured providers not yet in the chain can be added, adding stops at maxLength, removing stops at minLength and drops the model, moving reorders, and reading/writing the chain keeps the rest of the draft value. Depends on vitest and the admin console entities. v1.1 (closure B2): AI catalog providers (configured flag and models): unconfigured ones are never addable, the providers to show and the model options of a provider.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  addableProviders,
  addProvider,
  catalogProvidersToShow,
  isConfiguredProvider,
  modelOptions,
  moveProvider,
  readProviderChain,
  removeProvider,
  writeProviderChain,
} from "./provider-chain.entity";
import type { ProviderChainState } from "./provider-chain.entity";
import type { ProviderChainField } from "./setting-form.entity";

const LIMITS = { minLength: 1, maxLength: 2 };
const STATE: ProviderChainState = { chain: ["gemini"], models: { gemini: "g-1" } };
const FIELD: ProviderChainField = { kind: "providerChain", id: "providerChain", path: ["providerChain"], modelsPath: ["models"], label: "Cadena", limits: LIMITS };

describe("provider chain", () => {
  it("offers only configured providers that are not in the chain", () => {
    expect(addableProviders([
      { provider: "gemini", configured: true, models: [] },
      { provider: "openai", configured: true, models: [] },
      { provider: "anthropic", configured: false, models: [] },
    ], STATE)).toEqual(["openai"]);
  });

  it("lists the catalog providers to show (configured first) and the model options of a provider", () => {
    const catalog = [
      { provider: "anthropic", configured: false, models: [] },
      { provider: "openai", configured: true, models: ["gpt-4o"] },
      { provider: "gemini", configured: true, models: ["g-1", "g-2"] },
    ];

    expect(catalogProvidersToShow(catalog, STATE).map((item) => item.provider)).toEqual(["openai", "anthropic"]);
    expect(modelOptions(catalog, "gemini", "g-1")).toEqual(["g-1", "g-2"]);
    expect(modelOptions(catalog, "gemini", "g-old")).toEqual(["g-old", "g-1", "g-2"]);
    expect(modelOptions(catalog, "mistral", "")).toEqual([]);
    expect(modelOptions([{ provider: "openai", configured: true, models: [] }], "openai", "gpt-4o")).toEqual([]);
    expect(isConfiguredProvider(catalog, "anthropic")).toBe(false);
  });

  it("adds a provider with an empty model and refuses beyond the maximum", () => {
    const added = addProvider(STATE, "openai", LIMITS);

    expect(added).toEqual({ chain: ["gemini", "openai"], models: { gemini: "g-1", openai: "" } });
    expect(addProvider(added, "anthropic", LIMITS)).toBe(added);
    expect(addProvider(STATE, "gemini", LIMITS)).toBe(STATE);
  });

  it("removes a provider and its model but never below the minimum", () => {
    const two = { chain: ["gemini", "openai"], models: { gemini: "g-1", openai: "o-1" } };

    expect(removeProvider(two, 0, LIMITS)).toEqual({ chain: ["openai"], models: { openai: "o-1" } });
    expect(removeProvider(STATE, 0, LIMITS)).toBe(STATE);
  });

  it("moves a provider to another position", () => {
    const three = { chain: ["a", "b", "c"], models: {} };

    expect(moveProvider(three, 0, 2).chain).toEqual(["b", "c", "a"]);
    expect(moveProvider(three, 2, 3)).toBe(three);
  });

  it("reads and writes the chain without touching the other fields", () => {
    const root = { providerChain: ["gemini"], models: { gemini: "g-1" }, timeoutMs: 5000 };
    const state = readProviderChain(FIELD, root);

    expect(state).toEqual(STATE);
    expect(writeProviderChain(FIELD, root, addProvider(state, "openai", LIMITS))).toEqual({
      providerChain: ["gemini", "openai"],
      models: { gemini: "g-1", openai: "" },
      timeoutMs: 5000,
    });
  });
});
