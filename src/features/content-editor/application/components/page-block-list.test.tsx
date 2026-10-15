/*
* Funcionalidad: PageBlockList tests
* Descripción: Drag and drop handling of the page block list with @hello-pangea/dnd mocked (the mock captures the onDragEnd handler and renders the droppable and draggables with inert props): a drop on another index moves the block, a drop on the same index or outside the list does nothing. Depends on vitest, Testing Library, the page draft entity and PageBlockList.
* Versión: 1.0 (C4)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { createDraftBlock } from "../entities/page-draft.entity";
import { PageBlockList } from "./page-block-list";

type DropResultLike = { source: { droppableId: string, index: number }, destination: { droppableId: string, index: number } | null };

const dnd = vi.hoisted(() => ({ onDragEnd: null as ((result: DropResultLike) => void) | null }));

vi.mock("@hello-pangea/dnd", () => {
  const provided = { innerRef: () => undefined, draggableProps: {}, droppableProps: {}, dragHandleProps: null, placeholder: null };

  return {
    DragDropContext: ({ onDragEnd, children }: { onDragEnd: (result: DropResultLike) => void, children: ReactNode }) => {
      dnd.onDragEnd = onDragEnd;

      return children;
    },
    Droppable: ({ children }: { children: (value: typeof provided) => ReactNode }) => children(provided),
    Draggable: ({ children }: { children: (value: typeof provided, snapshot: { isDragging: boolean }) => ReactNode }) => children(provided, { isDragging: false }),
  };
});

function renderList() {
  const onMove = vi.fn();

  render(
    <PageBlockList
      blocks={[createDraftBlock("DIVIDER", "a"), createDraftBlock("DIVIDER", "b")]}
      onMove={onMove}
      onDuplicate={() => undefined}
      onDelete={() => undefined}
      onChange={() => undefined}
    />,
  );

  return { onMove, drop: (result: DropResultLike) => dnd.onDragEnd?.(result) };
}

const LIST = "page-blocks";

describe("PageBlockList drag and drop", () => {
  it("moves a block dropped on another position", () => {
    const { onMove, drop } = renderList();

    drop({ source: { droppableId: LIST, index: 0 }, destination: { droppableId: LIST, index: 1 } });

    expect(onMove).toHaveBeenCalledWith(0, 1);
  });

  it("ignores a drop on the same position or outside the list", () => {
    const { onMove, drop } = renderList();

    drop({ source: { droppableId: LIST, index: 1 }, destination: { droppableId: LIST, index: 1 } });
    drop({ source: { droppableId: LIST, index: 1 }, destination: null });

    expect(onMove).not.toHaveBeenCalled();
  });
});
