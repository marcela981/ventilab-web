/*
* Funcionalidad: PageBlockList
* Descripción: Ordered block list of the page editor. Each block is a card with a drag handle (@hello-pangea/dnd, same library as the content tree; reorder inside the page only), its type label and position, move up/down buttons (keyboard and screen reader alternative to dragging), duplicate and delete actions, the optional title (not for dividers), the type-specific BlockFields and the block validation message. Changes only touch the local draft; nothing is sent until the page is saved. Depends on @hello-pangea/dnd, MUI, @shared/design-system, @shared/lib, the page draft entity, BlockFields and the page editor CSS Module. v1.1 (C4 review): a drop on the same index no longer calls onMove.
* Versión: 1.1 (C4)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import IconButton from "@mui/material/IconButton";
import type { ChangeEvent } from "react";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import { blockError, blockTypeLabel } from "../entities/page-draft.entity";
import type { DraftBlock } from "../entities/page-draft.entity";
import type { BlockChange } from "../hooks/use-page-editor";
import { BlockFields } from "./block-fields";
import styles from "../../UI/page-editor.module.css";

const DROPPABLE_ID = "page-blocks";

// TODO(i18n): move to a content-editor namespace in src/i18n.
const COPY = {
  drag: (label: string) => `Arrastrar ${label}`,
  up: (label: string) => `Subir ${label}`,
  down: (label: string) => `Bajar ${label}`,
  duplicate: (label: string) => `Duplicar ${label}`,
  remove: (label: string) => `Eliminar ${label}`,
  title: "Título del bloque (opcional)",
} as const;

export type PageBlockListProps = {
  blocks: readonly DraftBlock[]
  onMove: (from: number, to: number) => void
  onDuplicate: (key: string) => void
  onDelete: (block: DraftBlock) => void
  onChange: (key: string, change: BlockChange) => void
};

type BlockCardProps = Omit<PageBlockListProps, "blocks" | "onMove"> & {
  block: DraftBlock
  index: number
  count: number
  onMove: (from: number, to: number) => void
};

function BlockCard({ block, index, count, onMove, onDuplicate, onDelete, onChange }: BlockCardProps) {
  // "bloque 2 (Ecuación)": unique per position for the action labels.
  const label = `bloque ${index + 1} (${blockTypeLabel(block.type)})`;
  const error = blockError(block);

  return (
    <Draggable draggableId={block.key} index={index}>
      {(provided, snapshot) => (
        <li
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cx(styles.block, snapshot.isDragging && styles.dragging)}
          aria-label={label}
        >
          <div className={cx(styles.blockHeader)}>
            <span {...(provided.dragHandleProps ?? {})} aria-label={COPY.drag(label)} className={cx(styles.handle)}>
              <DragIndicatorIcon fontSize="small" aria-hidden />
            </span>
            <span className={cx(styles.blockType)}>{blockTypeLabel(block.type)}</span>
            <span className={cx(styles.blockPosition)}>{index + 1} / {count}</span>
            <div className={cx(styles.blockActions)}>
              <IconButton size="small" aria-label={COPY.up(label)} disabled={index === 0} onClick={() => onMove(index, index - 1)}>
                <ArrowUpwardIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" aria-label={COPY.down(label)} disabled={index === count - 1} onClick={() => onMove(index, index + 1)}>
                <ArrowDownwardIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" aria-label={COPY.duplicate(label)} onClick={() => onDuplicate(block.key)}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" color="error" aria-label={COPY.remove(label)} onClick={() => onDelete(block)}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </div>
          </div>
          <div className={cx(styles.blockBody)}>
            {block.type === "DIVIDER" ? null : (
              <FormField
                label={COPY.title}
                size="small"
                value={block.title}
                onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(block.key, { title: event.target.value })}
              />
            )}
            <BlockFields block={block} error={error} onContentChange={(content) => onChange(block.key, { content })} />
          </div>
        </li>
      )}
    </Draggable>
  );
}

export function PageBlockList({ blocks, onMove, ...actions }: PageBlockListProps) {
  const onDragEnd = ({ source, destination }: DropResult) => {
    // A drop on its own position is not a change.
    if (destination && destination.droppableId === source.droppableId && destination.index !== source.index) {
      onMove(source.index, destination.index);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId={DROPPABLE_ID}>
        {(provided) => (
          <ol ref={provided.innerRef} {...provided.droppableProps} className={cx(styles.blocks)}>
            {blocks.map((block, index) => (
              <BlockCard key={block.key} block={block} index={index} count={blocks.length} onMove={onMove} {...actions} />
            ))}
            {provided.placeholder}
          </ol>
        )}
      </Droppable>
    </DragDropContext>
  );
}
