/*
* Funcionalidad: Design-system base components public API
* Descripción: Public entry of the base components shared by new pages: PageHeader, EmptyState, ErrorState, LoadingState, ConfirmDialog and RouteErrorBoundary. Thin MUI wrappers styled with CSS Modules and tokens.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { ConfirmDialog } from "./confirm-dialog";
export type { ConfirmDialogProps } from "./confirm-dialog";
export { EmptyState } from "./empty-state";
export type { EmptyStateProps } from "./empty-state";
export { ErrorState } from "./error-state";
export type { ErrorStateProps } from "./error-state";
export { LoadingState } from "./loading-state";
export type { LoadingStateProps } from "./loading-state";
export { PageHeader } from "./page-header";
export type { PageHeaderProps } from "./page-header";
export { RouteErrorBoundary } from "./route-error-boundary";
export type { RouteErrorBoundaryProps } from "./route-error-boundary";
