/*
* Funcionalidad: Provider chain editor tests
* Descripción: The provider chain editor offers only the configured providers that are not in the chain, labels a chain provider without credentials, keeps "Quitar" disabled at the minimum length and "Agregar proveedor" disabled at the maximum, adds a provider with an empty model input and reorders with the arrow buttons. Depends on vitest, Testing Library and the provider chain editor. v1.1 (closure B2): the AI catalog fixtures (configured + models); unconfigured catalog providers are disabled options "(no configurado)"; a provider with known models gets a model select (the current model kept), without them free text.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import type { ConfiguredProvider, ProviderChainState } from "../entities/provider-chain.entity";
import type { ProviderChainField } from "../entities/setting-form.entity";
import { PROVIDER_CHAIN_COPY, ProviderChainEditor } from "./provider-chain-editor";

const FIELD: ProviderChainField = {
  kind: "providerChain",
  id: "providerChain",
  path: ["providerChain"],
  modelsPath: ["models"],
  label: "Cadena de proveedores",
  limits: { minLength: 1, maxLength: 2 },
};

const CONFIGURED: ConfiguredProvider[] = [
  { provider: "gemini", configured: true, models: [] },
  { provider: "openai", configured: true, models: [] },
];

function Harness({ initial, configured = CONFIGURED }: { initial: ProviderChainState, configured?: ConfiguredProvider[] | null }) {
  const [state, setState] = useState(initial);

  return (
    <>
      <ProviderChainEditor field={FIELD} state={state} errors={{}} configured={configured} providersFailed={false} onChange={setState} />
      <output data-testid="chain">{state.chain.join(",")}</output>
    </>
  );
}

function addSelect() {
  return screen.getByLabelText(PROVIDER_CHAIN_COPY.addLabel);
}

function optionValues(select: HTMLElement): string[] {
  return within(select).getAllByRole("option").map((option) => (option as HTMLOptionElement).value);
}

describe("ProviderChainEditor", () => {
  it("offers only configured providers that are not in the chain and labels one without credentials", () => {
    render(<Harness initial={{ chain: ["gemini", "anthropic"], models: { gemini: "g", anthropic: "a" } }} configured={[...CONFIGURED, { provider: "mistral", configured: true, models: [] }]} />);

    expect(optionValues(addSelect())).toEqual(["", "mistral", "openai"]);
    expect(within(screen.getByRole("listitem", { name: "gemini" })).queryByText(PROVIDER_CHAIN_COPY.noCredentials)).not.toBeInTheDocument();
    expect(within(screen.getByRole("listitem", { name: "anthropic" })).getByText(PROVIDER_CHAIN_COPY.noCredentials)).toBeInTheDocument();
  });

  it("enforces the minimum and maximum chain length", () => {
    render(<Harness initial={{ chain: ["gemini"], models: { gemini: "g" } }} />);

    expect(screen.getByRole("button", { name: PROVIDER_CHAIN_COPY.remove("gemini") })).toBeDisabled();
    expect(optionValues(addSelect())).toEqual(["", "openai"]);

    fireEvent.change(addSelect(), { target: { value: "openai" } });
    fireEvent.click(screen.getByRole("button", { name: PROVIDER_CHAIN_COPY.add }));

    expect(screen.getByTestId("chain")).toHaveTextContent("gemini,openai");
    expect(screen.getByLabelText(PROVIDER_CHAIN_COPY.model("openai"))).toHaveValue("");
    expect(addSelect()).toBeDisabled();
    expect(screen.getByRole("button", { name: PROVIDER_CHAIN_COPY.add })).toBeDisabled();
    expect(screen.getByText(PROVIDER_CHAIN_COPY.atMax)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: PROVIDER_CHAIN_COPY.remove("gemini") })).toBeEnabled();
  });

  it("reorders the chain with the arrow buttons", () => {
    render(<Harness initial={{ chain: ["gemini", "openai"], models: { gemini: "g", openai: "o" } }} />);

    fireEvent.click(screen.getByRole("button", { name: PROVIDER_CHAIN_COPY.down("gemini") }));

    expect(screen.getByTestId("chain")).toHaveTextContent("openai,gemini");
  });

  it("shows the unconfigured providers of the catalog as disabled options", () => {
    render(<Harness initial={{ chain: ["gemini"], models: { gemini: "g" } }} configured={[...CONFIGURED, { provider: "anthropic", configured: false, models: [] }]} />);

    const anthropic = within(addSelect()).getByRole("option", { name: PROVIDER_CHAIN_COPY.notConfiguredOption("anthropic") });

    expect(anthropic).toBeDisabled();
    expect(within(addSelect()).getByRole("option", { name: "openai" })).toBeEnabled();
  });

  it("offers the known models of a provider as a select and keeps a model the catalog does not list", () => {
    const catalog: ConfiguredProvider[] = [
      { provider: "gemini", configured: true, models: ["gemini-2.0-flash", "gemini-2.5-pro"] },
      { provider: "openai", configured: true, models: [] },
    ];

    render(<Harness initial={{ chain: ["gemini", "openai"], models: { gemini: "gemini-old", openai: "gpt-4o" } }} configured={catalog} />);

    const gemini = screen.getByLabelText(PROVIDER_CHAIN_COPY.model("gemini"));

    expect(optionValues(gemini)).toEqual(["gemini-old", "gemini-2.0-flash", "gemini-2.5-pro"]);
    fireEvent.change(gemini, { target: { value: "gemini-2.5-pro" } });
    expect(screen.getByLabelText(PROVIDER_CHAIN_COPY.model("gemini"))).toHaveValue("gemini-2.5-pro");
    // No known models: free text.
    expect(screen.getByLabelText(PROVIDER_CHAIN_COPY.model("openai"))).toHaveValue("gpt-4o");
    expect(screen.getByLabelText(PROVIDER_CHAIN_COPY.model("openai")).tagName).toBe("INPUT");
  });

  it("offers nothing to add while the configured providers are unknown", () => {
    render(<Harness initial={{ chain: ["gemini"], models: { gemini: "g" } }} configured={null} />);

    expect(optionValues(addSelect())).toEqual([""]);
    expect(screen.getByText(PROVIDER_CHAIN_COPY.loadingProviders)).toBeInTheDocument();
  });
});
