/*
* Funcionalidad: ListPager
* Descripción: Spanish MUI TablePagination for the paginated lists of the operation pages (audit log and target history): shows the envelope total and moves by one page; the rows per page are fixed by the page size the list asks for. Pages are 1-based for the caller. Depends on MUI.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import TablePagination from "@mui/material/TablePagination";

const PAGE_BUTTON_LABELS: Record<"first" | "last" | "next" | "previous", string> = {
  first: "Primera página",
  last: "Última página",
  next: "Página siguiente",
  previous: "Página anterior",
};

export type ListPagerProps = {
  page: number
  pages: number
  total: number
  limit: number
  onChange: (page: number) => void
};

export function ListPager({ page, pages, total, limit, onChange }: ListPagerProps) {
  return (
    <TablePagination
      component="div"
      count={total}
      page={Math.max(0, Math.min(page, Math.max(1, pages)) - 1)}
      rowsPerPage={limit}
      rowsPerPageOptions={[limit]}
      onPageChange={(_event, next) => onChange(next + 1)}
      labelRowsPerPage="Filas por página:"
      labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
      getItemAriaLabel={(type) => PAGE_BUTTON_LABELS[type]}
    />
  );
}
