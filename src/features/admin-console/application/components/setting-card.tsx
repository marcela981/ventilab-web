/*
* Funcionalidad: SettingCard
* Descripción: Card of one platform setting in /admin/settings: key, description, origin chip (DEFAULT/OVERRIDE), effective value, default value, hard limits, last update, and the form generated from its metadata (SettingFieldEditor). Client validation mirrors the API hard limits and blocks "Guardar"; a 422 is placed on the field its path names or on the card. "Guardar" sends `PATCH /api/platform-settings/{key} {value, version}`; "Restablecer al valor por defecto" (disabled while the origin is DEFAULT) confirms and sends `POST /{key}/reset {version}`. In the `commands` category (ventilator safety) both ask for an extra confirmation listing the previous value, the new value and the hard limits of every changed field. A 409 platform-settings.version_conflict shows "Otro administrador cambió este valor" with "Recargar", which refetches and resets the form to the new value. Depends on MUI, the design-system components, @shared/lib, the admin console entities, the field editor and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { useId, useMemo, useState } from "react";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { useToast } from "@shared/design-system/components/use-toast";
import { cx } from "@shared/lib/class-names";
import { formatDateTime } from "@shared/lib/format";
import { getAdminConsoleErrorMessage, isVersionConflict } from "../entities/admin-console-error-messages";
import { cloneValue, formatSettingValue, valuesEqual } from "../entities/platform-setting.entity";
import type { PlatformSetting } from "../entities/platform-setting.entity";
import {
  buildSettingField,
  describeLimits,
  diffSettingValues,
  mapSettingServerError,
  SETTING_FORM_COPY,
  validateSettingValue,
} from "../entities/setting-form.entity";
import type { SettingChange, SettingField } from "../entities/setting-form.entity";
import { SettingFieldEditor } from "./setting-field-editor";
import type { ProvidersContext } from "./setting-field-editor";
import styles from "../../UI/admin-settings.module.css";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const SETTING_CARD_COPY = {
  originDefault: "DEFAULT · valor por defecto",
  originOverride: "OVERRIDE · valor personalizado",
  effective: "Valor efectivo",
  defaultValue: "Valor por defecto",
  limits: "Límites duros",
  updatedAt: "Última actualización",
  neverUpdated: "Nunca (usa el valor por defecto)",
  save: "Guardar",
  discard: "Descartar cambios",
  reset: "Restablecer al valor por defecto",
  saved: (key: string) => `Se guardó ${key}.`,
  resetDone: (key: string) => `${key} volvió a su valor por defecto.`,
  conflict: "Otro administrador cambió este valor. Recarga para ver el valor actual; tus cambios sin guardar se descartarán.",
  reload: "Recargar",
  invalidForm: "Corrige los campos marcados antes de guardar.",
  resetTitle: (key: string) => `¿Restablecer ${key}?`,
  resetDescription: "Se quitará el valor personalizado y volverá a aplicarse el valor por defecto.",
  commandsSaveTitle: "Confirmar cambio de seguridad del ventilador",
  commandsResetTitle: "Confirmar restablecimiento de seguridad del ventilador",
  commandsIntro: "Este ajuste limita los comandos que se envían al ventilador físico. Revisa el cambio:",
  change: (change: SettingChange) => `${change.label}: ${change.before} → ${change.after} (límites: ${change.limits})`,
  confirmSave: "Guardar cambio",
  confirmReset: "Restablecer",
  cancel: "Cancelar",
} as const;

type PendingConfirm = { action: "save" | "reset", changes: SettingChange[] };

export type SettingCardProps = {
  setting: PlatformSetting
  providers: ProvidersContext
  onSave: (setting: PlatformSetting, value: unknown) => Promise<void>
  onReset: (setting: PlatformSetting) => Promise<void>
  onReload: () => Promise<void>
};

function limitsText(setting: PlatformSetting, field: SettingField): string {
  if (field.kind !== "group" && field.kind !== "json") {
    return describeLimits(field);
  }

  return Object.keys(setting.limits).length === 0 ? SETTING_FORM_COPY.noLimits : JSON.stringify(setting.limits);
}

export function SettingCard({ setting, providers, onSave, onReset, onReload }: SettingCardProps) {
  const toast = useToast();
  const titleId = useId();
  const field = useMemo(() => buildSettingField(setting), [setting]);
  const [draft, setDraft] = useState<unknown>(() => cloneValue(setting.value));
  const [formKey, setFormKey] = useState(0);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [cardError, setCardError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [confirming, setConfirming] = useState<PendingConfirm | null>(null);
  const [pending, setPending] = useState<"save" | "reset" | null>(null);
  const [resync, setResync] = useState(false);
  const isCommands = setting.category === "commands";
  const clientErrors = useMemo(() => validateSettingValue(field, draft), [field, draft]);
  const errors = { ...clientErrors, ...serverErrors };
  const dirty = !valuesEqual(draft, setting.value);
  const invalid = Object.keys(clientErrors).length > 0;

  const resetForm = (value: unknown) => {
    setDraft(cloneValue(value));
    setFormKey((key) => key + 1);
    setServerErrors({});
    setCardError(null);
  };

  // After "Recargar" the next render carries the refetched setting: the form restarts from it.
  if (resync) {
    setResync(false);
    resetForm(setting.value);
  }

  const changeDraft = (next: unknown) => {
    setDraft(next);
    setServerErrors({});
    setCardError(null);
  };

  const run = async(action: "save" | "reset") => {
    setPending(action);
    setCardError(null);

    try {
      if (action === "save") {
        await onSave(setting, draft);
        toast.success(SETTING_CARD_COPY.saved(setting.key));
      } else {
        await onReset(setting);
        toast.success(SETTING_CARD_COPY.resetDone(setting.key));
      }
    } catch (caught) {
      if (isVersionConflict(caught)) {
        setConflict(true);
      } else if (action === "save") {
        const mapped = mapSettingServerError(field, caught);

        setServerErrors(mapped.fieldErrors);
        setCardError(mapped.cardMessage);
      } else {
        setCardError(getAdminConsoleErrorMessage(caught));
      }
    } finally {
      setPending(null);
      setConfirming(null);
    }
  };

  const requestSave = () => {
    if (invalid) {
      setCardError(SETTING_CARD_COPY.invalidForm);

      return;
    }

    if (isCommands) {
      setConfirming({ action: "save", changes: diffSettingValues(field, setting.value, draft) });

      return;
    }

    void run("save");
  };

  const requestReset = () => {
    setConfirming({ action: "reset", changes: isCommands ? diffSettingValues(field, setting.value, setting.defaultValue) : [] });
  };

  const reload = async() => {
    await onReload();
    setConflict(false);
    setResync(true);
  };

  const confirmTitle = () => {
    if (!confirming) {
      return "";
    }

    if (isCommands) {
      return confirming.action === "save" ? SETTING_CARD_COPY.commandsSaveTitle : SETTING_CARD_COPY.commandsResetTitle;
    }

    return SETTING_CARD_COPY.resetTitle(setting.key);
  };

  const confirmDescription = confirming && isCommands ? (
    <>
      <span className={cx(styles.block)}>{SETTING_CARD_COPY.commandsIntro}</span>
      {confirming.changes.map((change) => (
        <span key={change.id} className={cx(styles.block, styles.change)}>{SETTING_CARD_COPY.change(change)}</span>
      ))}
    </>
  ) : SETTING_CARD_COPY.resetDescription;

  return (
    <section className={cx(styles.card)} aria-labelledby={titleId}>
      <header className={cx(styles.cardHeader)}>
        <h2 id={titleId} className={cx(styles.cardTitle)}>{setting.key}</h2>
        <span className={cx(styles.originChip)} data-origin={setting.origin}>
          {setting.origin === "DEFAULT" ? SETTING_CARD_COPY.originDefault : SETTING_CARD_COPY.originOverride}
        </span>
      </header>
      <p className={cx(styles.description)}>{setting.description}</p>
      <dl className={cx(styles.facts)}>
        <div>
          <dt>{SETTING_CARD_COPY.effective}</dt>
          <dd>{formatSettingValue(setting.value)}</dd>
        </div>
        <div>
          <dt>{SETTING_CARD_COPY.defaultValue}</dt>
          <dd>{formatSettingValue(setting.defaultValue)}</dd>
        </div>
        <div>
          <dt>{SETTING_CARD_COPY.limits}</dt>
          <dd>{limitsText(setting, field)}</dd>
        </div>
        <div>
          <dt>{SETTING_CARD_COPY.updatedAt}</dt>
          <dd>{setting.updatedAt ? formatDateTime(setting.updatedAt) : SETTING_CARD_COPY.neverUpdated}</dd>
        </div>
      </dl>
      {conflict ? (
        <Alert
          severity="warning"
          role="alert"
          action={<AsyncButton color="inherit" size="small" onClick={reload}>{SETTING_CARD_COPY.reload}</AsyncButton>}
        >
          {SETTING_CARD_COPY.conflict}
        </Alert>
      ) : null}
      <div className={cx(styles.form)} key={formKey}>
        <SettingFieldEditor
          field={field}
          root={draft}
          errors={errors}
          providers={providers}
          disabled={pending !== null || conflict}
          onChange={changeDraft}
        />
      </div>
      {cardError ? <Alert severity="error" role="alert">{cardError}</Alert> : null}
      <div className={cx(styles.cardActions)}>
        <AsyncButton variant="contained" loading={pending === "save"} disabled={!dirty || conflict || pending !== null} onClick={requestSave}>
          {SETTING_CARD_COPY.save}
        </AsyncButton>
        <Button disabled={!dirty || pending !== null} onClick={() => resetForm(setting.value)}>{SETTING_CARD_COPY.discard}</Button>
        <AsyncButton
          color="warning"
          loading={pending === "reset"}
          disabled={setting.origin === "DEFAULT" || conflict || pending !== null}
          onClick={requestReset}
        >
          {SETTING_CARD_COPY.reset}
        </AsyncButton>
      </div>
      <ConfirmDialog
        open={confirming !== null}
        title={confirmTitle()}
        description={confirmDescription}
        confirmLabel={confirming?.action === "save" ? SETTING_CARD_COPY.confirmSave : SETTING_CARD_COPY.confirmReset}
        cancelLabel={SETTING_CARD_COPY.cancel}
        destructive={isCommands}
        isPending={pending !== null}
        onConfirm={() => (confirming ? void run(confirming.action) : undefined)}
        onCancel={() => setConfirming(null)}
      />
    </section>
  );
}
