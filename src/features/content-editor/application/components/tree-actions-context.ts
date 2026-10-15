/*
* Funcionalidad: Tree actions context
* Descripción: Context shared by the recursive tree components of the content editor (provided by ContentTreePage): the active filter, expansion state and toggle, the optimistic order of each sibling group, the registry of displayed sibling ids per drop list (read by the drag and drop handler) and the node actions (create child, edit, change status, delete). Depends on React and the content editor entities.
* Versión: 1.0 (C1)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { createContext, useContext } from "react";
import type { ContentNode, ContentStatus, SiblingGroup } from "../entities/content-node.entity";
import type { TreeFilter } from "../entities/content-tree-filter";

export type TreeActions = {
  filter: TreeFilter
  filterActive: boolean
  isExpanded: (key: string) => boolean
  toggle: (key: string) => void
  orderOf: (group: SiblingGroup) => readonly string[] | undefined
  registerGroup: (group: SiblingGroup, ids: readonly string[]) => () => void
  onCreate: (group: SiblingGroup, parent: ContentNode | null) => void
  onEdit: (node: ContentNode) => void
  onStatus: (node: ContentNode, status: ContentStatus) => void
  onDelete: (node: ContentNode) => void
};

export const TreeActionsContext = createContext<TreeActions | null>(null);

export function useTreeActions(): TreeActions {
  const actions = useContext(TreeActionsContext);

  if (!actions) {
    throw new Error("useTreeActions must be used inside ContentTreePage.");
  }

  return actions;
}
