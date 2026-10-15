/*
* Funcionalidad: RichTextField
* Descripción: Labeled rich text field of the evaluation builder. Loads the Tiptap RichTextEditor with React.lazy + retryImport (Suspense shows a skeleton, RouteErrorBoundary a retry), so Tiptap only reaches the browser when a builder field is shown. The editor starts from the given value (a Tiptap document or plain text) and reports every change as a Tiptap document. Depends on React, the design-system boundary and skeleton, @shared/lib and the builder copy and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { lazy, Suspense, useId } from "react";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { retryImport } from "@shared/lib/retry-import";
import { BUILDER_COPY } from "../../entities/builder-copy";
import type { RichDoc, RichTextValue } from "../../entities/builder-rich-text";
import styles from "../../../UI/builder.module.css";

const RichTextEditor = lazy(() =>
  retryImport(() => import("./rich-text-editor")).then((module) => ({ default: module.RichTextEditor })),
);

export type RichTextFieldProps = {
  label: string
  initialValue: RichTextValue | null
  placeholder?: string | undefined
  disabled?: boolean | undefined
  onChange: (doc: RichDoc) => void
};

export function RichTextField({ label, initialValue, placeholder, disabled, onChange }: RichTextFieldProps) {
  const labelId = useId();

  return (
    <div className={cx(styles.richField)} role="group" aria-labelledby={labelId}>
      <span id={labelId} className={cx(styles.fieldLabel)}>{label}</span>
      <RouteErrorBoundary>
        <Suspense fallback={<CardSkeleton label={BUILDER_COPY.loadingEditor} />}>
          <RichTextEditor
            label={label}
            initialValue={initialValue}
            placeholder={placeholder}
            disabled={disabled}
            onChange={onChange}
          />
        </Suspense>
      </RouteErrorBoundary>
    </div>
  );
}
