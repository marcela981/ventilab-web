/*
* Funcionalidad: Content tree list
* Descripción: Recursive rendering of the editor tree. SiblingList renders one sibling group (the children of one parent) in its optimistic order as a @hello-pangea/dnd Droppable whose `type` is the group key, so an item can only be dropped among its own siblings (BACKEND GAP: no move between parents); it registers its displayed ids for the drop handler (callers pass a stable group object). TreeNodeItem is one Draggable row: drag handle (disabled while a filter is active, because a filtered list is not the whole sibling list the backend reorders), expand toggle, kind, title (a page links to /content/pages/[pageId]), status badge and actions menu; when expanded it renders its children list. LessonPagesList loads the pages of a lesson only when that lesson is expanded (useLessonPageNodes) and applies the active filter to them. Depends on MUI, next/link, @hello-pangea/dnd, the content editor entities, hooks, actions context and CSS Module. v1.1 (W6, Bloque 2): each row has a stable id (nodeDomId) and is focusable (tabIndex -1) for the ?node= deep link.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { Draggable, Droppable } from "@hello-pangea/dnd";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { cx } from "@shared/lib/class-names";
import { childGroupOf, groupKey, KIND_LABELS, nodeKey } from "../entities/content-node.entity";
import { nodeDomId } from "../entities/content-node-link";
import type { ContentNode, NodeKind, SiblingGroup } from "../entities/content-node.entity";
import { getContentErrorMessage } from "../entities/content-editor-error-messages";
import { applyOrder } from "../entities/content-reorder";
import { nodeMatches } from "../entities/content-tree-filter";
import { useLessonPageNodes } from "../hooks/use-lesson-page-nodes";
import { NodeActionsMenu, StatusBadge } from "./node-actions-menu";
import { useTreeActions } from "./tree-actions-context";
import styles from "../../UI/content-tree.module.css";

// TODO(i18n): move to a content-editor namespace in src/i18n.
const EMPTY_CHILDREN: Readonly<Record<NodeKind, string>> = {
  section: "Esta sección no tiene niveles.",
  level: "Este nivel no tiene módulos.",
  module: "Este módulo no tiene lecciones.",
  lesson: "Esta lección no tiene páginas.",
  page: "",
};

export const PAGE_EDITOR_URL = (pageId: string): string => `/content/pages/${encodeURIComponent(pageId)}`;

type SiblingListProps = {
  group: SiblingGroup
  nodes: readonly ContentNode[]
  emptyLabel: string
  nested?: boolean
};

export function SiblingList({ group, nodes, emptyLabel, nested = false }: SiblingListProps) {
  const { orderOf, registerGroup } = useTreeActions();
  const ordered = applyOrder(nodes, orderOf(group));
  const key = groupKey(group);
  const idsKey = ordered.map((node) => node.id).join(",");

  useEffect(() => registerGroup(group, idsKey ? idsKey.split(",") : []), [group, idsKey, registerGroup]);

  if (ordered.length === 0) {
    return <p className={cx(styles.childState)}>{emptyLabel}</p>;
  }

  return (
    <Droppable droppableId={key} type={key}>
      {(provided) => (
        <ul ref={provided.innerRef} {...provided.droppableProps} className={cx(styles.list, nested && styles.nested)}>
          {ordered.map((node, index) => <TreeNodeItem key={nodeKey(node)} node={node} index={index} />)}
          {provided.placeholder}
        </ul>
      )}
    </Droppable>
  );
}

function LessonPagesList({ lesson }: { lesson: ContentNode }) {
  const { filter, filterActive } = useTreeActions();
  const { pages, isLoading, error, reload } = useLessonPageNodes(lesson);
  // Stable per node so the drop-list registration effect does not run on every render.
  const group = useMemo(() => childGroupOf(lesson), [lesson]);

  if (!group) {
    return null;
  }

  if (error && !pages) {
    return (
      <p className={cx(styles.childState)} role="alert">
        {getContentErrorMessage(error)}{" "}
        <Button size="small" onClick={() => void reload()}>Reintentar</Button>
      </p>
    );
  }

  if (!pages) {
    return isLoading ? <p className={cx(styles.childState)} role="status">Cargando páginas…</p> : null;
  }

  const visible = filterActive ? pages.filter((page) => nodeMatches(page, filter)) : pages;

  return <SiblingList group={group} nodes={visible} emptyLabel={filterActive ? "Ninguna página coincide." : EMPTY_CHILDREN.lesson} nested />;
}

function NodeChildren({ node }: { node: ContentNode }) {
  const group = useMemo(() => childGroupOf(node), [node]);

  if (!group) {
    return null;
  }

  if (node.kind === "lesson") {
    return <LessonPagesList lesson={node} />;
  }

  return <SiblingList group={group} nodes={node.children} emptyLabel={EMPTY_CHILDREN[node.kind]} nested />;
}

function TreeNodeItem({ node, index }: { node: ContentNode, index: number }) {
  const { filterActive, isExpanded, toggle } = useTreeActions();
  const key = nodeKey(node);
  const expandable = node.kind !== "page";
  const expanded = expandable && isExpanded(key);

  return (
    <Draggable draggableId={key} index={index} isDragDisabled={filterActive}>
      {(provided, snapshot) => (
        <li ref={provided.innerRef} {...provided.draggableProps} className={cx(styles.item, snapshot.isDragging && styles.dragging)}>
          {/* Focusable (not tabbable) row: the target of the /content?node= deep link. */}
          <div id={nodeDomId(node)} tabIndex={-1} className={cx(styles.row)}>
            <span
              {...(provided.dragHandleProps ?? {})}
              aria-label={`Arrastrar ${node.title}`}
              className={cx(styles.handle, filterActive && styles.handleDisabled)}
            >
              <DragIndicatorIcon fontSize="small" aria-hidden />
            </span>
            {expandable ? (
              <IconButton
                size="small"
                aria-expanded={expanded}
                aria-label={`${expanded ? "Contraer" : "Expandir"} ${node.title}`}
                onClick={() => toggle(key)}
              >
                {expanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
              </IconButton>
            ) : <span className={cx(styles.toggleSpacer)} aria-hidden />}
            <span className={cx(styles.kind)}>{KIND_LABELS[node.kind]}</span>
            {node.kind === "page" ? (
              <Link href={PAGE_EDITOR_URL(node.id)} className={cx(styles.title, styles.pageLink)}>{node.title}</Link>
            ) : <span className={cx(styles.title)}>{node.title}</span>}
            <StatusBadge status={node.status} />
            <NodeActionsMenu node={node} />
          </div>
          {expanded ? <NodeChildren node={node} /> : null}
        </li>
      )}
    </Draggable>
  );
}
