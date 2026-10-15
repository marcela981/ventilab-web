/*
* Funcionalidad: NodeFormDialog
* Descripción: Create / edit dialog of a content node with the fields its DTO accepts (NODE_FORM_FIELDS): every kind has a title; sections also a slug (required by CreateSectionDTO, suggested from the title on create until the user edits it) and a description; levels and modules a description. Client validation with validateNodeForm before submitting; a backend failure is shown inside the dialog (Alert) and keeps it open. Submit is disabled while the request runs. Depends on MUI, @shared/design-system (FormField, AsyncButton), the content node entity and the CSS Module.
* Versión: 1.0 (C1)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useId, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import { NODE_FORM_FIELDS, slugify, validateNodeForm } from "../entities/content-node.entity";
import type { NodeFormErrors, NodeFormField, NodeFormValues, NodeKind } from "../entities/content-node.entity";
import styles from "../../UI/content-tree.module.css";

const FIELD_LABELS: Readonly<Record<NodeFormField, string>> = {
  title: "Título",
  slug: "Identificador (slug)",
  description: "Descripción",
};

export const EMPTY_FORM_VALUES: NodeFormValues = { title: "", slug: "", description: "" };

export type NodeFormDialogProps = {
  mode: "create" | "edit"
  kind: NodeKind
  heading: string
  initialValues: NodeFormValues
  pending: boolean
  error: string | null
  onSubmit: (values: NodeFormValues) => Promise<void>
  onCancel: () => void
};

// Mounted only while open (the page renders it conditionally), so the state starts fresh each time.
export function NodeFormDialog({ mode, kind, heading, initialValues, pending, error, onSubmit, onCancel }: NodeFormDialogProps) {
  const titleId = useId();
  const fields = NODE_FORM_FIELDS[kind];
  const [values, setValues] = useState<NodeFormValues>(initialValues);
  const [errors, setErrors] = useState<NodeFormErrors>({});
  const [slugTouched, setSlugTouched] = useState(mode === "edit");

  const change = (field: NodeFormField) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { value } = event.target;

    setValues((current) => ({
      ...current,
      [field]: value,
      ...(field === "title" && !slugTouched && fields.includes("slug") ? { slug: slugify(value) } : {}),
    }));

    if (field === "slug") {
      setSlugTouched(true);
    }
  };

  const submit = async(event?: FormEvent) => {
    event?.preventDefault();

    const found = validateNodeForm(kind, values);

    setErrors(found);

    if (Object.keys(found).length === 0) {
      await onSubmit(values);
    }
  };

  return (
    <Dialog open onClose={pending ? undefined : onCancel} aria-labelledby={titleId} fullWidth maxWidth="sm">
      <form noValidate onSubmit={(event) => void submit(event)}>
        <DialogTitle id={titleId}>{heading}</DialogTitle>
        <DialogContent>
          <div className={cx(styles.formFields)}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            {fields.map((field) => (
              <FormField
                key={field}
                label={FIELD_LABELS[field]}
                value={values[field]}
                onChange={change(field)}
                error={errors[field]}
                required={field !== "description"}
                {...(field === "description" ? { multiline: true, minRows: 3 } : {})}
                autoFocus={field === "title"}
                disabled={pending}
                fullWidth
              />
            ))}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCancel} disabled={pending}>Cancelar</Button>
          <AsyncButton type="submit" variant="contained" loading={pending}>
            {mode === "create" ? "Crear" : "Guardar"}
          </AsyncButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
