/*
* Funcionalidad: PrerequisitesDialog
* Descripción: Prerequisites editor of a level or module ("Prerrequisitos de «título»"): loads the current prerequisites with useNodePrerequisites (skeleton while loading, error with retry) and shows them preselected in a multiple MUI Autocomplete whose candidates come from the page (other levels grouped by section, or other modules grouped by level; never the node itself). A current prerequisite missing from the tree is kept under "Otros" so saving never drops it silently. "Guardar" sends the whole selection (the page replaces the list with PUT); a backend failure, such as the explained 409 cycle, is shown inside the dialog and keeps it open. Controls are disabled while saving. Depends on MUI, @shared/design-system (AsyncButton, ListSkeleton), the prerequisites entity and hook and the CSS Module.
* Versión: 1.0 (C3)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import type { TextFieldProps } from "@mui/material/TextField";
import { useId, useMemo, useState } from "react";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { OTHER_GROUP_LABEL } from "../entities/content-prerequisites";
import type { PrerequisiteKind, PrerequisiteOption } from "../entities/content-prerequisites";
import { useNodePrerequisites } from "../hooks/use-node-prerequisites";
import styles from "../../UI/content-tree.module.css";

// TODO(i18n): move to a content-editor namespace in src/i18n.
const COPY = {
  heading: (title: string) => `Prerrequisitos de «${title}»`,
  label: "Prerrequisitos",
  hint: {
    level: "Los estudiantes deben completar estos niveles antes de acceder a este.",
    module: "Los estudiantes deben completar estos módulos antes de acceder a este.",
  },
  loading: "Cargando los prerrequisitos…",
  loadError: "No se pudieron cargar los prerrequisitos actuales.",
  retry: "Reintentar",
  noOptions: "No hay otros elementos disponibles.",
  open: "Mostrar opciones",
  close: "Ocultar opciones",
  clear: "Quitar todos",
  cancel: "Cancelar",
  save: "Guardar",
} as const;

export type PrerequisitesDialogProps = {
  kind: PrerequisiteKind
  nodeId: string
  nodeTitle: string
  options: readonly PrerequisiteOption[]
  pending: boolean
  error: string | null
  onSave: (prerequisiteIds: string[]) => Promise<void>
  onCancel: () => void
};

// Mounted only while open (the page renders it conditionally), so the selection starts from the loaded list.
export function PrerequisitesDialog({ kind, nodeId, nodeTitle, options, pending, error, onSave, onCancel }: PrerequisitesDialogProps) {
  const titleId = useId();
  const { current, error: loadError, reload } = useNodePrerequisites(kind, nodeId);
  const [selection, setSelection] = useState<PrerequisiteOption[] | null>(null);
  const initial = useMemo(
    () => current?.map((ref) => options.find((option) => option.id === ref.id) ?? { ...ref, group: OTHER_GROUP_LABEL }) ?? null,
    [current, options],
  );
  const allOptions = useMemo(
    () => [...options, ...(initial ?? []).filter((option) => option.group === OTHER_GROUP_LABEL)],
    [options, initial],
  );
  const value = selection ?? initial;

  const save = async() => {
    if (value) {
      await onSave(value.map((option) => option.id));
    }
  };

  return (
    <Dialog open onClose={pending ? undefined : onCancel} aria-labelledby={titleId} fullWidth maxWidth="sm">
      <DialogTitle id={titleId}>{COPY.heading(nodeTitle)}</DialogTitle>
      <DialogContent>
        <div className={cx(styles.formFields)}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {!value && loadError ? (
            <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void reload()}>{COPY.retry}</Button>}>
              {COPY.loadError}
            </Alert>
          ) : null}
          {!value && !loadError ? <ListSkeleton rows={2} label={COPY.loading} /> : null}
          {value ? (
            <Autocomplete
              multiple
              disableCloseOnSelect
              options={allOptions}
              value={value}
              onChange={(_event, next) => setSelection(next)}
              groupBy={(option) => option.group}
              getOptionLabel={(option) => option.title}
              isOptionEqualToValue={(option, selected) => option.id === selected.id}
              getOptionKey={(option) => option.id}
              disabled={pending}
              noOptionsText={COPY.noOptions}
              openText={COPY.open}
              closeText={COPY.close}
              clearText={COPY.clear}
              // The params declare optional members as `| undefined`, which exactOptionalPropertyTypes rejects on TextField.
              renderInput={(params) => <TextField {...(params as TextFieldProps)} label={COPY.label} helperText={COPY.hint[kind]} />}
            />
          ) : null}
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={pending}>{COPY.cancel}</Button>
        <AsyncButton variant="contained" loading={pending} disabled={!value} onClick={save}>
          {COPY.save}
        </AsyncButton>
      </DialogActions>
    </Dialog>
  );
}
