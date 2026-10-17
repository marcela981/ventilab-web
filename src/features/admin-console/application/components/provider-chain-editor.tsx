/*
* Funcionalidad: ProviderChainEditor
* Descripción: Editor of the provider chain of an `ai.useCase.*` setting: ordered list reordered by drag and drop (@hello-pangea/dnd, keyboard dragging included) or the up/down buttons, one model text input per provider, remove (disabled at limits.providerChain.minLength) and "Agregar proveedor" offering only the providers with credentials (`configured: true` in `GET /api/system/status`) that are not in the chain yet (disabled at maxLength). A provider already in the chain without credentials is labelled "Sin credenciales". Errors of the chain and of each model are shown on their inputs. Depends on @hello-pangea/dnd, MUI, the design-system form field, @shared/lib and the provider chain entity and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import { useId, useState } from "react";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import {
  addableProviders,
  addProvider,
  canAddProvider,
  canRemoveProvider,
  changeModel,
  moveProvider,
  removeProvider,
} from "../entities/provider-chain.entity";
import type { ConfiguredProvider, ProviderChainState } from "../entities/provider-chain.entity";
import { describeLimits, modelErrorKey } from "../entities/setting-form.entity";
import type { FieldErrors, ProviderChainField } from "../entities/setting-form.entity";
import styles from "../../UI/admin-settings.module.css";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const PROVIDER_CHAIN_COPY = {
  listLabel: (label: string) => `${label}: orden de uso`,
  hint: "Se usan en orden: si un proveedor falla, se intenta el siguiente. Solo se pueden agregar proveedores con credenciales configuradas.",
  model: (provider: string) => `Modelo de ${provider}`,
  drag: (provider: string) => `Arrastrar ${provider}`,
  up: (provider: string) => `Subir ${provider}`,
  down: (provider: string) => `Bajar ${provider}`,
  remove: (provider: string) => `Quitar ${provider}`,
  noCredentials: "Sin credenciales",
  addLabel: "Proveedor para agregar",
  add: "Agregar proveedor",
  choose: "Elige un proveedor",
  loadingProviders: "Cargando los proveedores con credenciales…",
  providersFailed: "No se pudo leer qué proveedores tienen credenciales; por ahora no se pueden agregar proveedores.",
  noneAvailable: "No hay más proveedores con credenciales para agregar.",
  atMax: "La cadena ya tiene el máximo de proveedores.",
  atMin: "La cadena ya tiene el mínimo de proveedores.",
} as const;

const NATIVE_SELECT = { select: { native: true }, inputLabel: { shrink: true } } as const;

export type ProviderChainEditorProps = {
  field: ProviderChainField
  state: ProviderChainState
  errors: FieldErrors
  configured: readonly ConfiguredProvider[] | null
  providersFailed: boolean
  disabled?: boolean
  onChange: (next: ProviderChainState) => void
};

function addHint(configuredKnown: boolean, providersFailed: boolean, atMax: boolean, options: number): string | null {
  if (providersFailed) {
    return PROVIDER_CHAIN_COPY.providersFailed;
  }

  if (!configuredKnown) {
    return PROVIDER_CHAIN_COPY.loadingProviders;
  }

  if (atMax) {
    return PROVIDER_CHAIN_COPY.atMax;
  }

  return options === 0 ? PROVIDER_CHAIN_COPY.noneAvailable : null;
}

export function ProviderChainEditor({ field, state, errors, configured, providersFailed, disabled = false, onChange }: ProviderChainEditorProps) {
  // dnd ids end up in attribute selectors: keep them to plain characters.
  const droppableId = `chain-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const errorId = useId();
  const [selected, setSelected] = useState("");
  const options = configured ? addableProviders(configured, state) : [];
  const choice = options.includes(selected) ? selected : "";
  const allowAdd = canAddProvider(state, field.limits);
  const allowRemove = canRemoveProvider(state, field.limits);
  const chainError = errors[field.id];
  const hint = addHint(configured !== null, providersFailed, !allowAdd, options.length);
  const count = state.chain.length;

  const onDragEnd = ({ source, destination }: DropResult) => {
    if (destination && destination.index !== source.index) {
      onChange(moveProvider(state, source.index, destination.index));
    }
  };

  const add = () => {
    onChange(addProvider(state, choice, field.limits));
    setSelected("");
  };

  return (
    <fieldset className={cx(styles.fieldset)} aria-describedby={chainError ? errorId : undefined}>
      <legend className={cx(styles.legend)}>{field.label}</legend>
      <p className={cx(styles.hint)}>{PROVIDER_CHAIN_COPY.hint}</p>
      <p className={cx(styles.hint)}>{describeLimits(field)}</p>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId={droppableId}>
          {(provided) => (
            <ol
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cx(styles.chain)}
              aria-label={PROVIDER_CHAIN_COPY.listLabel(field.label)}
            >
              {state.chain.map((provider, index) => {
                const missingCredentials = configured !== null && !configured.some((item) => item.provider === provider);

                return (
                  <Draggable key={provider} draggableId={`${droppableId}-${provider}`} index={index} isDragDisabled={disabled}>
                    {(dragProvided, snapshot) => (
                      <li
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={cx(styles.chainItem, snapshot.isDragging && styles.dragging)}
                        aria-label={provider}
                      >
                        <span {...(dragProvided.dragHandleProps ?? {})} aria-label={PROVIDER_CHAIN_COPY.drag(provider)} className={cx(styles.handle)}>
                          <DragIndicatorIcon fontSize="small" aria-hidden />
                        </span>
                        <span className={cx(styles.chainPosition)}>{index + 1}</span>
                        <span className={cx(styles.chainProvider)}>
                          {provider}
                          {missingCredentials ? <span className={cx(styles.warningBadge)}>{PROVIDER_CHAIN_COPY.noCredentials}</span> : null}
                        </span>
                        <FormField
                          className={cx(styles.chainModel)}
                          size="small"
                          label={PROVIDER_CHAIN_COPY.model(provider)}
                          value={state.models[provider] ?? ""}
                          disabled={disabled}
                          error={errors[modelErrorKey(provider)]}
                          onChange={(event) => onChange(changeModel(state, provider, event.target.value))}
                        />
                        <div className={cx(styles.chainActions)}>
                          <IconButton size="small" aria-label={PROVIDER_CHAIN_COPY.up(provider)} disabled={disabled || index === 0} onClick={() => onChange(moveProvider(state, index, index - 1))}>
                            <ArrowUpwardIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" aria-label={PROVIDER_CHAIN_COPY.down(provider)} disabled={disabled || index === count - 1} onClick={() => onChange(moveProvider(state, index, index + 1))}>
                            <ArrowDownwardIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={PROVIDER_CHAIN_COPY.remove(provider)}
                            title={allowRemove ? undefined : PROVIDER_CHAIN_COPY.atMin}
                            disabled={disabled || !allowRemove}
                            onClick={() => onChange(removeProvider(state, index, field.limits))}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </div>
                      </li>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </ol>
          )}
        </Droppable>
      </DragDropContext>
      {chainError ? <p id={errorId} className={cx(styles.fieldError)} role="alert">{chainError}</p> : null}
      <div className={cx(styles.chainAdd)}>
        <FormField
          select
          size="small"
          label={PROVIDER_CHAIN_COPY.addLabel}
          value={choice}
          disabled={disabled || !allowAdd || options.length === 0}
          onChange={(event) => setSelected(event.target.value)}
          slotProps={NATIVE_SELECT}
        >
          <option value="">{PROVIDER_CHAIN_COPY.choose}</option>
          {options.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
        </FormField>
        <Button variant="outlined" startIcon={<AddIcon />} disabled={disabled || !allowAdd || !choice} onClick={add}>
          {PROVIDER_CHAIN_COPY.add}
        </Button>
      </div>
      {hint ? <p className={cx(styles.hint)}>{hint}</p> : null}
    </fieldset>
  );
}
