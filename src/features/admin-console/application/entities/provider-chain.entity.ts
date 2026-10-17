/*
* Funcionalidad: Provider chain entity
* Descripción: Pure editing rules of the provider chain of an `ai.useCase.*` setting: read the chain and the model per provider from the draft value, the providers that may be added (configured in the system status and not yet in the chain), add (refused at limits.providerChain.maxLength, starts with an empty model), remove (refused at minLength, drops the provider's model), move (drag and drop or the arrow buttons) and change one model, each returning the new draft value. Depends on the platform setting and setting form entities.
* Versión: 1.0
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

export type ConfiguredProvider = {
  provider: string
  available: boolean
};

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

export function addableProviders(configured: readonly ConfiguredProvider[], state: ProviderChainState): string[] {
  return configured.map((item) => item.provider).filter((provider) => !state.chain.includes(provider));
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
