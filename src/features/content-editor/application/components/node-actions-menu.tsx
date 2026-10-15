/*
* Funcionalidad: NodeActionsMenu and StatusBadge
* Descripción: StatusBadge shows the status of a node (Borrador / Publicado / Archivado) as a small outlined MUI Chip (success color when published). NodeActionsMenu is the "Acciones de <título>" button of every tree row: create the child of the next level (Nuevo nivel / módulo / lección / página), Editar, change the status (Borrador / Publicado / Archivado; the current one is disabled) and Eliminar. It only calls the tree actions; dialogs and requests live in the page. Depends on MUI, the content node entity and the tree actions context.
* Versión: 1.0 (C1)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import MoreVertIcon from "@mui/icons-material/MoreVert";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListSubheader from "@mui/material/ListSubheader";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useId, useState } from "react";
import type { MouseEvent } from "react";
import {
  childGroupOf,
  CONTENT_STATUSES,
  GROUP_NODE_KIND,
  NEW_NODE_LABELS,
  STATUS_LABELS,
} from "../entities/content-node.entity";
import type { ContentNode, ContentStatus } from "../entities/content-node.entity";
import { useTreeActions } from "./tree-actions-context";

export function StatusBadge({ status }: { status: ContentStatus }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      color={status === "PUBLISHED" ? "success" : "default"}
      label={STATUS_LABELS[status]}
    />
  );
}

export function NodeActionsMenu({ node }: { node: ContentNode }) {
  const actions = useTreeActions();
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const childGroup = childGroupOf(node);

  const close = () => {
    setAnchor(null);
  };

  const choose = (action: () => void) => () => {
    close();
    action();
  };

  return (
    <>
      <IconButton
        size="small"
        aria-label={`Acciones de ${node.title}`}
        aria-haspopup="menu"
        aria-controls={anchor ? menuId : undefined}
        aria-expanded={anchor ? "true" : undefined}
        onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu id={menuId} anchorEl={anchor} open={anchor !== null} onClose={close}>
        {childGroup ? (
          <MenuItem onClick={choose(() => actions.onCreate(childGroup, node))}>{NEW_NODE_LABELS[GROUP_NODE_KIND[childGroup.kind]]}</MenuItem>
        ) : null}
        <MenuItem onClick={choose(() => actions.onEdit(node))}>Editar</MenuItem>
        <Divider />
        <ListSubheader>Cambiar estado</ListSubheader>
        {CONTENT_STATUSES.map((status) => (
          <MenuItem key={status} disabled={status === node.status} onClick={choose(() => actions.onStatus(node, status))}>
            {STATUS_LABELS[status]}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={choose(() => actions.onDelete(node))}>Eliminar</MenuItem>
      </Menu>
    </>
  );
}
