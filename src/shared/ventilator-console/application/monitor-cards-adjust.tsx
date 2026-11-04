/*
* Funcionalidad: Monitor value cards in "Ajustar"
* Descripción: The adjustable value list, mounted only while "Ajustar" is on (loaded on demand by monitor-cards.tsx, so @hello-pangea/dnd costs nothing during monitoring): a DragDropContext over the cards on screen, each card with its drag handle "Mover <tarjeta>" (dnd keyboard sensor: Space lifts, arrows move, Space drops, Escape cancels, with the dnd live announcements), the deterministic buttons "Subir <tarjeta>" / "Bajar <tarjeta>" and the toggle "Ocultar <tarjeta>" / "Mostrar <tarjeta>" (aria-pressed = hidden); hidden cards stay in the list dimmed with "Oculta". Every change is written once through the controller (onDragEnd or a click), never during the gesture, and the drag state lives inside the DragDropContext, so only this list re-renders while dragging. v0.1 (Bloque 5, C5): first version. Depends on React, @hello-pangea/dnd, MUI icons and the monitor cards module.
* Versión: 0.1
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
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { cx } from "@shared/lib/class-names";
import type { MonitorCardId } from "./config/console.config";
import {
  cardDefinition,
  MONITOR_CARDS_COPY,
  MonitorCardTile,
  moveCardInView,
  reorderCardsInView,
  toggleHiddenCard,
} from "./monitor-cards";
import type { MonitorCardData, MonitorCardsController, MonitorCardsLayout } from "./monitor-cards";
import styles from "../UI/july-layout.module.css";

const DROPPABLE_ID = "monitor-cards";

type MonitorCardsAdjustProps = {
  /** The cards on screen (hidden ones included), in order. */
  cards: readonly MonitorCardData[]
  layout: MonitorCardsLayout
  controller: MonitorCardsController
};

export default function MonitorCardsAdjust({ cards, layout, controller }: MonitorCardsAdjustProps) {
  const onScreen: readonly MonitorCardId[] = cards.map((card) => card.id);
  const hidden = new Set(layout.hidden);

  const onDragEnd = (result: DropResult) => {
    if (result.destination) {
      controller.setLayout(reorderCardsInView(layout, onScreen, result.source.index, result.destination.index));
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId={DROPPABLE_ID}>
        {(provided) => (
          <ul ref={provided.innerRef} {...provided.droppableProps} className={cx(styles.cards)} aria-label={MONITOR_CARDS_COPY.list} data-adjusting="true">
            {cards.map((card, index) => {
              const label = cardDefinition(card).label;
              const isHidden = hidden.has(card.id);

              return (
                <Draggable key={card.id} draggableId={card.id} index={index}>
                  {(draggable) => (
                    <li
                      ref={draggable.innerRef}
                      {...draggable.draggableProps}
                      className={cx(styles.card, styles.adjustCard)}
                      data-card={card.id}
                      data-hidden={isHidden}
                    >
                      <MonitorCardTile {...card} />
                      <div className={cx(styles.adjustTools)}>
                        <span {...draggable.dragHandleProps} className={cx(styles.dragHandle)} aria-label={MONITOR_CARDS_COPY.move(label)}>
                          <DragIndicatorIcon fontSize="small" aria-hidden />
                        </span>
                        <button
                          type="button"
                          className={cx(styles.adjustButton)}
                          aria-label={MONITOR_CARDS_COPY.up(label)}
                          disabled={index === 0}
                          onClick={() => controller.setLayout(moveCardInView(layout, onScreen, card.id, -1))}
                        >
                          <ArrowUpwardIcon fontSize="small" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className={cx(styles.adjustButton)}
                          aria-label={MONITOR_CARDS_COPY.down(label)}
                          disabled={index === cards.length - 1}
                          onClick={() => controller.setLayout(moveCardInView(layout, onScreen, card.id, 1))}
                        >
                          <ArrowDownwardIcon fontSize="small" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className={cx(styles.adjustButton)}
                          aria-label={isHidden ? MONITOR_CARDS_COPY.show(label) : MONITOR_CARDS_COPY.hide(label)}
                          aria-pressed={isHidden}
                          onClick={() => controller.setLayout(toggleHiddenCard(layout, card.id))}
                        >
                          {isHidden ? <VisibilityOffIcon fontSize="small" aria-hidden /> : <VisibilityIcon fontSize="small" aria-hidden />}
                        </button>
                        {isHidden ? <span className={cx(styles.hiddenTag)}>{MONITOR_CARDS_COPY.hidden}</span> : null}
                      </div>
                    </li>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </ul>
        )}
      </Droppable>
    </DragDropContext>
  );
}
