/*
* Funcionalidad: Provider chain entity
* Descripción: Pure editing rules of the provider chain of an `ai.useCase.*` setting: read the chain and the model per provider from the draft value, the providers that may be added (configured in the AI providers catalog and not yet in the chain), add (refused at limits.providerChain.maxLength, starts with an empty model), remove (refused at minLength, drops the provider's model), move (drag and drop or the arrow buttons) and change one model, each returning the new draft value. Depends on the platform setting and setting form entities. v1.1 (closure B2): the catalog of `GET /api/admin/ai/providers` (configured flag and known models per provider) replaces the system status providers: the model options of a provider (current model kept) and the catalog providers to show in the add select (unconfigured ones shown but not addable).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { getAt, isRecord, setAt } from "./platform-setting.entity";
import type { LengthLimits, ProviderChainField } from "./setting-form.entity";

export type ProviderChainState = {
  chain: string[]
  models: Record<string, string>
};

/** One provider of the AI catalog (`GET /api/admin/ai/providers`): credentials configured on the server and its known models. */
export type ConfiguredProvider = {
  provider: string
  configured: boolean
  models: readonly string[]
};

export function isConfiguredProvider(catalog: readonly ConfiguredProvider[], provider: string): boolean {
  return catalog.some((item) => item.provider === provider && item.configured);
}

/**
 * Known models of a provider; the current model stays among the options even when the catalog does not list it.
 * Empty when the catalog knows no model of the provider (the editor then offers free text).
 */
export function modelOptions(catalog: readonly ConfiguredProvider[], provider: string, current: string): string[] {
  const known = catalog.find((item) => item.provider === provider)?.models ?? [];

  if (known.length === 0) {
    return [];
  }

  return current && !known.includes(current) ? [current, ...known] : [...known];
}

/** Providers of the catalog not in the chain yet, configured ones first; the unconfigured ones are shown but cannot be added. */
export function catalogProvidersToShow(catalog: readonly ConfiguredProvider[], state: ProviderChainState): ConfiguredProvider[] {
  return catalog
    .filter((item) => !state.chain.includes(item.provider))
    .sort((a, b) => Number(b.configured) - Number(a.configured) || a.provider.localeCompare(b.provider));
}

export function readProviderChain(field: ProviderChainField, root: unknown): ProviderChainState {
  const chain = getAt(root, field.path);
  const models = getAt(root, field.modelsPath);

  return {
    chain: Array.isArray(chain) ? chain.filter((item): item is string => typeof item === "string") : [],
    models: isRecord(models)
      ? Object.fromEntries(Object.entries(models).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
      : {},
  };
}

export function writeProviderChain(field: ProviderChainField, root: unknown, state: ProviderChainState): unknown {
  return setAt(setAt(root, field.path, state.chain), field.modelsPath, state.models);
}

export function canAddProvider(state: ProviderChainState, limits: LengthLimits): boolean {
  return limits.maxLength === null || state.chain.length < limits.maxLength;
}

export function canRemoveProvider(state: ProviderChainState, limits: LengthLimits): boolean {
  return limits.minLength === null || state.chain.length > limits.minLength;
}

export function addableProviders(catalog: readonly ConfiguredProvider[], state: ProviderChainState): string[] {
  return catalog.filter((item) => item.configured).map((item) => item.provider).filter((provider) => !state.chain.includes(provider));
}

export function addProvider(state: ProviderChainState, provider: string, limits: LengthLimits): ProviderChainState {
  if (!provider || state.chain.includes(provider) || !canAddProvider(state, limits)) {
    return state;
  }

  return { chain: [...state.chain, provider], models: { ...state.models, [provider]: state.models[provider] ?? "" } };
}

export function removeProvider(state: ProviderChainState, index: number, limits: LengthLimits): ProviderChainState {
  const provider = state.chain[index];

  if (provider === undefined || !canRemoveProvider(state, limits)) {
    return state;
  }

  const models = { ...state.models };

  delete models[provider];

  return { chain: state.chain.filter((_, position) => position !== index), models };
}

export function moveProvider(state: ProviderChainState, from: number, to: number): ProviderChainState {
  const provider = state.chain[from];

  if (provider === undefined || to < 0 || to >= state.chain.length || from === to) {
    return state;
  }

  const chain = state.chain.filter((_, position) => position !== from);

  chain.splice(to, 0, provider);

  return { ...state, chain };
}

export function changeModel(state: ProviderChainState, provider: string, model: string): ProviderChainState {
  return { ...state, models: { ...state.models, [provider]: model } };
}
