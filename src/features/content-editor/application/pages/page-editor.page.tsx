/*
* Funcionalidad: PageEditorPage
* Descripción: Page editor of the content editor (/content/pages/[pageId], staff only). Loads the Page and its blocks (usePageEditor), lists them in a local draft (PageBlockList: drag and drop or up/down reorder, duplicate, delete with confirmation, type-specific fields: lazy Tiptap rich text, LaTeX with KaTeX live preview, YouTube/Vimeo video with preview, image/file shells for C5, code, divider), adds blocks from the "Agregar bloque" menu and saves explicitly ("Guardar cambios": deletes, updates, creates, reorder). Shows a "Cambios sin guardar" status, disables saving while a block is invalid (and says which), maps save failures to the content editor error messages and warns before leaving with pending changes (useUnsavedChangesGuard: router and beforeunload). Depends on React, MUI, next/link, @shared/design-system, @shared/lib, the page editor hooks and components, the content tree status badge and the page editor CSS Module.
* Versión: 1.0 (C4)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArticleIcon from "@mui/icons-material/Article";
import SaveIcon from "@mui/icons-material/Save";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { useToast } from "@shared/design-system/components/use-toast";
import { cx } from "@shared/lib/class-names";
import { getContentErrorMessage } from "../entities/content-editor-error-messages";
import { ADDABLE_BLOCK_TYPES, blockTypeLabel } from "../entities/page-draft.entity";
import type { DraftBlock } from "../entities/page-draft.entity";
import { usePageEditor } from "../hooks/use-page-editor";
import { useUnsavedChangesGuard } from "../hooks/use-unsaved-changes-guard";
import { StatusBadge } from "../components/node-actions-menu";
import { PageBlockList } from "../components/page-block-list";
import styles from "../../UI/page-editor.module.css";

// TODO(i18n): move to a content-editor namespace in src/i18n.
const COPY = {
  subtitle: "Editor de página",
  back: "Volver al contenido",
  loading: "Cargando la página…",
  loadError: "No se pudo cargar la página",
  add: "Agregar bloque",
  save: "Guardar cambios",
  saved: "Página guardada.",
  dirty: "Cambios sin guardar",
  clean: "Todos los cambios están guardados",
  invalid: (position: number) => `Revisa el bloque ${position} antes de guardar.`,
  empty: "Esta página no tiene bloques",
  emptyDescription: "Agrega el primer bloque con «Agregar bloque».",
  deleteTitle: "¿Eliminar este bloque?",
  deleteDescription: (label: string) => `Se quitará el bloque «${label}» de la página al guardar los cambios.`,
  deleteConfirm: "Eliminar",
  leave: "Hay cambios sin guardar en esta página. ¿Salir de todos modos?",
} as const;

const CONTENT_URL = "/content";

export type PageEditorPageProps = {
  pageId: string
};

export function PageEditorPage({ pageId }: PageEditorPageProps) {
  const editor = usePageEditor(pageId);
  const { page, blocks, dirty, invalidKey, saving } = editor;
  const toast = useToast();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DraftBlock | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useUnsavedChangesGuard(dirty, COPY.leave);

  const invalidPosition = blocks && invalidKey !== null ? blocks.findIndex((block) => block.key === invalidKey) + 1 : 0;

  const save = async() => {
    setSaveError(null);

    const outcome = await editor.save();

    if (outcome.status === "success") {
      toast.success(COPY.saved);
    } else if (outcome.status === "error") {
      setSaveError(outcome.message);
    }
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      editor.remove(deleteTarget.key);
      setDeleteTarget(null);
    }
  };

  if (!page || !blocks) {
    return (
      <div className={cx(styles.page)}>
        {editor.error ? (
          <ErrorState title={COPY.loadError} description={getContentErrorMessage(editor.error)} onRetry={() => void editor.reload()} />
        ) : <ListSkeleton rows={3} label={COPY.loading} />}
      </div>
    );
  }

  return (
    <div className={cx(styles.page)}>
      <Button component={Link} href={CONTENT_URL} startIcon={<ArrowBackIcon />} className={cx(styles.back)}>
        {COPY.back}
      </Button>
      <PageHeader
        title={page.title}
        subtitle={COPY.subtitle}
        actions={(
          <>
            <Button variant="outlined" startIcon={<AddIcon />} aria-haspopup="menu" onClick={(event) => setMenuAnchor(event.currentTarget)}>
              {COPY.add}
            </Button>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" aria-hidden /> : <SaveIcon />}
              disabled={!dirty || saving || invalidKey !== null}
              onClick={() => void save()}
            >
              {COPY.save}
            </Button>
          </>
        )}
      />
      <div className={cx(styles.statusBar)}>
        <StatusBadge status={page.status} />
        <span role="status" className={cx(styles.saveState, dirty && styles.saveStateDirty)}>{dirty ? COPY.dirty : COPY.clean}</span>
        {invalidPosition > 0 ? <span className={cx(styles.fieldError)}>{COPY.invalid(invalidPosition)}</span> : null}
      </div>
      {saveError ? <p role="alert" className={cx(styles.saveError)}>{saveError}</p> : null}
      <Menu anchorEl={menuAnchor} open={menuAnchor !== null} onClose={() => setMenuAnchor(null)}>
        {ADDABLE_BLOCK_TYPES.map((type) => (
          <MenuItem
            key={type}
            onClick={() => {
              editor.add(type);
              setMenuAnchor(null);
            }}
          >
            {blockTypeLabel(type)}
          </MenuItem>
        ))}
      </Menu>
      {blocks.length === 0 ? <EmptyState icon={<ArticleIcon />} title={COPY.empty} description={COPY.emptyDescription} /> : (
        <PageBlockList
          blocks={blocks}
          onMove={editor.move}
          onDuplicate={editor.duplicate}
          onDelete={setDeleteTarget}
          onChange={editor.change}
        />
      )}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={COPY.deleteTitle}
        description={deleteTarget ? COPY.deleteDescription(deleteTarget.title.trim() || blockTypeLabel(deleteTarget.type)) : undefined}
        confirmLabel={COPY.deleteConfirm}
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
