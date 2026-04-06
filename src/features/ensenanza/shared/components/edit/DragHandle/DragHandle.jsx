/**
 * DragHandle — Grip de 6 puntos para reordenamiento drag-and-drop.
 *
 * Visible exclusivamente cuando isEditMode === true.
 * Recibe `dragHandleProps` del Draggable de @hello-pangea/dnd y los
 * propaga al elemento span para que la librería controle el inicio del drag.
 *
 * Clases BEM: .drag-handle  /  .drag-handle--dragging
 * Sin sx props — toda la UI está en ui/DragHandle.module.css.
 */
import React from 'react';
import PropTypes from 'prop-types';
import { useEditMode } from '../EditModeContext';
import styles from './ui/DragHandle.module.css';

/** Icono SVG de 6 puntos en grilla 2×3 */
const GripIcon = () => (
  <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true">
    <circle cx="2" cy="2"  r="1.5" />
    <circle cx="8" cy="2"  r="1.5" />
    <circle cx="2" cy="7"  r="1.5" />
    <circle cx="8" cy="7"  r="1.5" />
    <circle cx="2" cy="12" r="1.5" />
    <circle cx="8" cy="12" r="1.5" />
  </svg>
);

export default function DragHandle({ dragHandleProps, isDragging, isCardOverlay }) {
  const { isEditMode } = useEditMode();

  if (!isEditMode) return null;

  const cls = [
    styles['drag-handle'],
    isDragging ? styles['drag-handle--dragging'] : '',
    isCardOverlay ? styles['drag-handle--card-overlay'] : '',
  ].join(' ').trim();

  return (
    <span
      className={cls}
      {...dragHandleProps}
      aria-label="Arrastrar para reordenar"
      title="Arrastrar para reordenar"
    >
      <GripIcon />
    </span>
  );
}

DragHandle.propTypes = {
  /** Props del Draggable de @hello-pangea/dnd para activar el drag */
  dragHandleProps: PropTypes.object,
  /** true mientras el ítem está siendo arrastrado (aplica .drag-handle--dragging) */
  isDragging: PropTypes.bool,
  /** true cuando el handle se usa como overlay absoluto sobre una ModuleCard */
  isCardOverlay: PropTypes.bool,
};

DragHandle.defaultProps = {
  isDragging: false,
  isCardOverlay: false,
};
