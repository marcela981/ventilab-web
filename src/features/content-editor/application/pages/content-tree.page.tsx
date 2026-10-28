/*
* Funcionalidad: ContentTreePage
* Descripción: Content editor tree (/content, TEACHER and ADMIN): the whole hierarchy Sección > Nivel > Módulo > Lección > Página composed by useContentTree (sections + levels + teaching tree; levels without a section under "Sin sección"; lesson pages loaded only when the lesson is expanded). Every node shows its status badge and can be expanded/collapsed. Filters by title text and by status keep the ancestors of every match visible and expanded. Actions per node: create the child of the next level and edit (NodeFormDialog with the DTO fields), change the status (PATCH for sections, PUT {status} for the rest) with a confirmation when publishing under a draft/archived ancestor (students would not see it), and delete with confirmation; when the backend answers 409 curriculum.node_has_student_data the "Archivar en su lugar" dialog sets ARCHIVED instead. Drag and drop (@hello-pangea/dnd) reorders siblings of the same parent with an optimistic update and the per-parent batch endpoint (reverted with a toast on failure); it is disabled while a filter is active. Loading skeleton, error state with retry and empty state. v1.1 (C3): "Prerrequisitos" on levels and modules opens PrerequisitesDialog (candidates from the composed tree, never the node itself) and saves the whole selection with the replace endpoint (PUT); every content read, prerequisite reads included, is revalidated after it. A 409 circular dependency is explained in the dialog by walking the dependents of the edited node (findCycleChain over GET /api/levels/{id}/prerequisites or GET /api/modules/{id}; the backend does not name the dependency) and naming the selected item that already depends on it; when the walk finds nothing the generic cycle message is shown. Depends on MUI, @hello-pangea/dnd, @shared/design-system, the content editor services, entities, hooks, components and CSS Module. v1.2 (B5): document title "Contenido | VentyLab" through formatPageTitle (next/head). v1.3 (W6, Bloque 2): focusNode (the /content?node=level:<id> | module:<id> deep link): once the tree is loaded the node's ancestors and the node itself are expanded (expansion keys kind:id) and its row is scrolled into view and focused; each value is applied once.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { DragDropContext } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import AddIcon from "@mui/icons-material/Add";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Head from "next/head";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { FormField } from "@shared/design-system/components/form-field";
import { PageHeader } from "@shared/design-system/components/page-header";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { useToast } from "@shared/design-system/components/use-toast";
import { cx } from "@shared/lib/class-names";
import { formatPageTitle } from "@shared/lib/page-title";
import { changeNodeStatus, createNode, deleteNode, updateNode } from "../../api/services/content-editor.service";
import { fetchDependents, setNodePrerequisites } from "../../api/services/content-prerequisites.service";
import {
  CONTENT_STATUSES,
  GROUP_NODE_KIND,
  groupKey,
  hiddenAncestor,
  KIND_LABELS,
  NEW_NODE_LABELS,
  nextChildOrder,
  STATUS_LABELS,
} from "../entities/content-node.entity";
import type { AncestorRef, ContentNode, ContentStatus, NodeFormValues, SiblingGroup } from "../entities/content-node.entity";
import { isCircularDependency, isStudentDataConflict } from "../entities/content-editor-error-messages";
import { nodeDomId, nodeLinkExpansion, parseNodeParam } from "../entities/content-node-link";
import { cycleMessage, findCycleChain, hasPrerequisites, prerequisiteOptions } from "../entities/content-prerequisites";
import type { PrerequisiteKind } from "../entities/content-prerequisites";
import { filterNodes, isFilterActive, NO_FILTER } from "../entities/content-tree-filter";
import type { StatusFilter, TreeFilter } from "../entities/content-tree-filter";
import { useContentMutation } from "../hooks/use-content-mutation";
import { useContentTree } from "../hooks/use-content-tree";
import { useSiblingReorder } from "../hooks/use-sibling-reorder";
import { SiblingList } from "../components/content-tree-list";
import { EMPTY_FORM_VALUES, NodeFormDialog } from "../components/node-form-dialog";
import { PrerequisitesDialog } from "../components/prerequisites-dialog";
import { TreeActionsContext } from "../components/tree-actions-context";
import type { TreeActions } from "../components/tree-actions-context";
import styles from "../../UI/content-tree.module.css";

// TODO(i18n): move to a content-editor namespace in src/i18n.
const COPY = {
  title: "Contenido",
  subtitle: "Organiza secciones, niveles, módulos, lecciones y páginas.",
  loading: "Cargando el contenido…",
  loadError: "No se pudo cargar el contenido",
  empty: "Todavía no hay contenido",
  emptyDescription: "Crea la primera sección para empezar.",
  noMatches: "Ningún contenido coincide con los filtros.",
  search: "Buscar por título",
  status: "Estado",
  allStatuses: "Todos",
  dndHint: "Arrastra un elemento para reordenarlo entre sus hermanos (no se puede mover a otro padre).",
  dndDisabled: "Quita los filtros para reordenar.",
  unsectioned: "Sin sección",
  noUnsectioned: "No hay niveles sin sección.",
  edit: (kind: string) => `Editar ${kind.toLowerCase()}`,
  created: "Contenido creado.",
  saved: "Cambios guardados.",
  statusChanged: (status: string) => `Estado actualizado: ${status}.`,
  deleted: "Contenido eliminado.",
  deleteTitle: (title: string) => `¿Eliminar «${title}»?`,
  deleteDescription: "Se eliminará junto con todo su contenido interno. Esta acción no se puede deshacer.",
  archiveTitle: "No se puede eliminar",
  archiveDescription: (title: string) => `«${title}» tiene progreso o notas de estudiantes. Archívalo para ocultarlo sin perder esos datos.`,
  archiveConfirm: "Archivar en su lugar",
  publishTitle: (title: string) => `¿Publicar «${title}»?`,
  publishDescription: (ancestor: AncestorRef) =>
    `Los estudiantes no lo verán mientras ${KIND_LABELS[ancestor.kind].toLowerCase()} «${ancestor.title}» esté en estado ${STATUS_LABELS[ancestor.status].toLowerCase()}.`,
  publishConfirm: "Publicar de todos modos",
  prerequisitesSaved: "Prerrequisitos guardados.",
} as const;

const SECTIONS_GROUP: SiblingGroup = { kind: "sections" };
const UNSECTIONED_GROUP: SiblingGroup = { kind: "levels", sectionId: null };

type FormState =
  | { mode: "create", group: SiblingGroup }
  | { mode: "edit", node: ContentNode };

type PublishState = { node: ContentNode, ancestor: AncestorRef };

type GroupEntry = { group: SiblingGroup, ids: readonly string[] };

type PrerequisitesTarget = { kind: PrerequisiteKind, id: string, title: string };

function formValuesOf(node: ContentNode): NodeFormValues {
  return { title: node.title, slug: node.slug ?? "", description: node.description ?? "" };
}

export type ContentTreePageProps = {
  // Raw ?node= value (level:<id> | module:<id>): the node is revealed (ancestors expanded), scrolled to and focused.
  focusNode?: string | null
};

export function ContentTreePage({ focusNode = null }: ContentTreePageProps) {
  const { tree, isLoading, error, reload } = useContentTree();
  const toast = useToast();
  const { run, pending } = useContentMutation();
  const { orderOf, reorder } = useSiblingReorder();
  const [filter, setFilter] = useState<TreeFilter>(NO_FILTER);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContentNode | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ContentNode | null>(null);
  const [publishTarget, setPublishTarget] = useState<PublishState | null>(null);
  const [prerequisitesTarget, setPrerequisitesTarget] = useState<PrerequisitesTarget | null>(null);
  const [prerequisitesError, setPrerequisitesError] = useState<string | null>(null);
  const [explainingCycle, setExplainingCycle] = useState(false);
  // ?node= value already applied to the expansion (each value is applied once, after the tree loads).
  const [appliedFocus, setAppliedFocus] = useState<string | null>(null);
  const groups = useRef(new Map<string, GroupEntry>());
  const focusLink = parseNodeParam(focusNode);
  const focusDomId = focusLink ? nodeDomId(focusLink) : null;

  if (tree && focusNode && focusLink && appliedFocus !== focusNode) {
    const keys = nodeLinkExpansion(tree, focusLink);

    setAppliedFocus(focusNode);

    if (keys) {
      setExpanded((current) => new Set([...current, ...keys]));
    }
  }

  useEffect(() => {
    if (!focusDomId || appliedFocus !== focusNode) {
      return;
    }

    const row = document.getElementById(focusDomId);

    row?.scrollIntoView?.({ block: "center" });
    row?.focus({ preventScroll: true });
  }, [appliedFocus, focusNode, focusDomId]);
  const filterActive = isFilterActive(filter);
  const filtered = useMemo(() => {
    if (!tree) {
      return null;
    }

    const sections = filterNodes(tree.sections, filter);
    const unsectioned = filterNodes(tree.unsectionedLevels, filter);

    return {
      sections: sections.nodes,
      unsectionedLevels: unsectioned.nodes,
      expandedKeys: new Set([...sections.expandedKeys, ...unsectioned.expandedKeys]),
    };
  }, [tree, filter]);

  const candidates = useMemo(
    () => (tree && prerequisitesTarget ? prerequisiteOptions(tree, prerequisitesTarget) : []),
    [tree, prerequisitesTarget],
  );

  const applyStatus = useCallback(async(node: ContentNode, status: ContentStatus) => {
    const outcome = await run(() => changeNodeStatus(node.kind, node.id, status));

    if (outcome.status === "success") {
      toast.success(COPY.statusChanged(STATUS_LABELS[status]));
    } else if (outcome.status === "error") {
      toast.error(outcome.message);
    }
  }, [run, toast]);

  const registerGroup = useCallback((group: SiblingGroup, ids: readonly string[]) => {
    const key = groupKey(group);

    groups.current.set(key, { group, ids });

    return () => {
      if (groups.current.get(key)?.ids === ids) {
        groups.current.delete(key);
      }
    };
  }, []);

  const actions = useMemo<TreeActions>(() => ({
    filter,
    filterActive,
    isExpanded: (key) => expanded.has(key) || (filterActive && Boolean(filtered?.expandedKeys.has(key))),
    toggle: (key) => setExpanded((current) => {
      const next = new Set(current);

      if (!next.delete(key)) {
        next.add(key);
      }

      return next;
    }),
    orderOf,
    registerGroup,
    onCreate: (group) => {
      setFormError(null);
      setForm({ mode: "create", group });
    },
    onEdit: (node) => {
      setFormError(null);
      setForm({ mode: "edit", node });
    },
    onStatus: (node, status) => {
      const ancestor = hiddenAncestor(node);

      if (status === "PUBLISHED" && ancestor) {
        setPublishTarget({ node, ancestor });
      } else {
        void applyStatus(node, status);
      }
    },
    onDelete: setDeleteTarget,
    onPrerequisites: (node) => {
      if (hasPrerequisites(node.kind)) {
        setPrerequisitesError(null);
        setPrerequisitesTarget({ kind: node.kind, id: node.id, title: node.title });
      }
    },
  }), [filter, filterActive, expanded, filtered, orderOf, registerGroup, applyStatus]);

  const submitForm = async(values: NodeFormValues) => {
    if (!form) {
      return;
    }

    const outcome = await run(() => (form.mode === "create"
      ? createNode(form.group, values, tree ? nextChildOrder(tree, form.group) : undefined)
      : updateNode(form.node.kind, form.node.id, values)));

    if (outcome.status === "success") {
      toast.success(form.mode === "create" ? COPY.created : COPY.saved);
      setForm(null);
    } else if (outcome.status === "error") {
      setFormError(outcome.message);
    }
  };

  const savePrerequisites = async(prerequisiteIds: string[]) => {
    const target = prerequisitesTarget;

    if (!target) {
      return;
    }

    setPrerequisitesError(null);

    const outcome = await run(() => setNodePrerequisites(target.kind, target.id, prerequisiteIds));

    if (outcome.status === "success") {
      toast.success(COPY.prerequisitesSaved);
      setPrerequisitesTarget(null);
    } else if (outcome.status === "error") {
      if (!isCircularDependency(outcome.error)) {
        setPrerequisitesError(outcome.message);

        return;
      }

      // The 409 does not say which dependency closes the cycle: walk the dependents of the edited node.
      setExplainingCycle(true);

      const chain = await findCycleChain(target, prerequisiteIds, (id) => fetchDependents(target.kind, id)).catch(() => null);

      setExplainingCycle(false);
      setPrerequisitesError(chain ? cycleMessage(chain) : outcome.message);
    }
  };

  const confirmDelete = async() => {
    const node = deleteTarget;

    if (!node) {
      return;
    }

    const outcome = await run(() => deleteNode(node.kind, node.id));

    setDeleteTarget(null);

    if (outcome.status === "success") {
      toast.success(COPY.deleted);
    } else if (outcome.status === "error") {
      if (isStudentDataConflict(outcome.error)) {
        setArchiveTarget(node);
      } else {
        toast.error(outcome.message);
      }
    }
  };

  const confirmArchive = async() => {
    if (archiveTarget) {
      await applyStatus(archiveTarget, "ARCHIVED");
      setArchiveTarget(null);
    }
  };

  const confirmPublish = async() => {
    if (publishTarget) {
      await applyStatus(publishTarget.node, "PUBLISHED");
      setPublishTarget(null);
    }
  };

  const onDragEnd = ({ source, destination }: DropResult) => {
    if (!destination || destination.droppableId !== source.droppableId) {
      return;
    }

    const entry = groups.current.get(source.droppableId);

    if (!entry) {
      return;
    }

    void reorder(entry.group, entry.ids, source.index, destination.index).then((outcome) => {
      if (outcome.status === "error") {
        toast.error(outcome.message);
      }
    });
  };

  const formKind = form ? (form.mode === "create" ? GROUP_NODE_KIND[form.group.kind] : form.node.kind) : null;
  const isEmpty = tree !== null && tree.sections.length === 0 && tree.unsectionedLevels.length === 0;
  const noMatches = filtered !== null && !isEmpty && filtered.sections.length === 0 && filtered.unsectionedLevels.length === 0;

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{formatPageTitle(COPY.title)}</title>
      </Head>
      <PageHeader
        title={COPY.title}
        subtitle={COPY.subtitle}
        actions={(
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => actions.onCreate(SECTIONS_GROUP, null)}>
            {NEW_NODE_LABELS.section}
          </Button>
        )}
      />
      <div className={cx(styles.filters)}>
        <FormField
          className={cx(styles.search)}
          label={COPY.search}
          type="search"
          value={filter.text}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setFilter((current) => ({ ...current, text: event.target.value }))}
        />
        <FormField
          className={cx(styles.statusFilter)}
          select
          label={COPY.status}
          value={filter.status}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setFilter((current) => ({ ...current, status: event.target.value as StatusFilter }))}
        >
          <MenuItem value="ALL">{COPY.allStatuses}</MenuItem>
          {CONTENT_STATUSES.map((status) => <MenuItem key={status} value={status}>{STATUS_LABELS[status]}</MenuItem>)}
        </FormField>
      </div>
      <p className={cx(styles.hint)}>{filterActive ? COPY.dndDisabled : COPY.dndHint}</p>
      {!tree && isLoading ? <ListSkeleton rows={4} label={COPY.loading} /> : null}
      {!tree && !isLoading && error ? <ErrorState title={COPY.loadError} onRetry={() => void reload()} /> : null}
      {isEmpty ? <EmptyState icon={<AccountTreeIcon />} title={COPY.empty} description={COPY.emptyDescription} /> : null}
      {noMatches ? <EmptyState title={COPY.noMatches} /> : null}
      {filtered && !isEmpty && !noMatches ? (
        <TreeActionsContext.Provider value={actions}>
          <DragDropContext onDragEnd={onDragEnd}>
            <div className={cx(styles.tree)}>
              <SiblingList group={SECTIONS_GROUP} nodes={filtered.sections} emptyLabel={COPY.noMatches} />
              {filtered.unsectionedLevels.length > 0 ? (
                <section aria-label={COPY.unsectioned}>
                  <div className={cx(styles.groupHeader)}>
                    <h2 className={cx(styles.groupTitle)}>{COPY.unsectioned}</h2>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => actions.onCreate(UNSECTIONED_GROUP, null)}>
                      {NEW_NODE_LABELS.level}
                    </Button>
                  </div>
                  <SiblingList group={UNSECTIONED_GROUP} nodes={filtered.unsectionedLevels} emptyLabel={COPY.noUnsectioned} />
                </section>
              ) : null}
            </div>
          </DragDropContext>
        </TreeActionsContext.Provider>
      ) : null}
      {form && formKind ? (
        <NodeFormDialog
          mode={form.mode}
          kind={formKind}
          heading={form.mode === "create" ? NEW_NODE_LABELS[formKind] : COPY.edit(KIND_LABELS[formKind])}
          initialValues={form.mode === "edit" ? formValuesOf(form.node) : EMPTY_FORM_VALUES}
          pending={pending}
          error={formError}
          onSubmit={submitForm}
          onCancel={() => setForm(null)}
        />
      ) : null}
      {prerequisitesTarget && tree ? (
        <PrerequisitesDialog
          kind={prerequisitesTarget.kind}
          nodeId={prerequisitesTarget.id}
          nodeTitle={prerequisitesTarget.title}
          options={candidates}
          pending={pending || explainingCycle}
          error={prerequisitesError}
          onSave={savePrerequisites}
          onCancel={() => setPrerequisitesTarget(null)}
        />
      ) : null}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget ? COPY.deleteTitle(deleteTarget.title) : ""}
        description={COPY.deleteDescription}
        confirmLabel="Eliminar"
        destructive
        isPending={pending}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmDialog
        open={archiveTarget !== null}
        title={COPY.archiveTitle}
        description={archiveTarget ? COPY.archiveDescription(archiveTarget.title) : ""}
        confirmLabel={COPY.archiveConfirm}
        isPending={pending}
        onConfirm={() => void confirmArchive()}
        onCancel={() => setArchiveTarget(null)}
      />
      <ConfirmDialog
        open={publishTarget !== null}
        title={publishTarget ? COPY.publishTitle(publishTarget.node.title) : ""}
        description={publishTarget ? COPY.publishDescription(publishTarget.ancestor) : ""}
        confirmLabel={COPY.publishConfirm}
        isPending={pending}
        onConfirm={() => void confirmPublish()}
        onCancel={() => setPublishTarget(null)}
      />
    </div>
  );
}
