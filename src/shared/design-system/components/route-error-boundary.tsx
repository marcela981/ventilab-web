/*
* Funcionalidad: RouteErrorBoundary
* Descripción: Error boundary for new layouts and pages. Chunk-load errors (isChunkLoadError from @shared/lib/retry-import, same semantics as the legacy C1 ChunkErrorBoundary, which stays untouched for legacy pages) show a fallback with a user-triggered reload, never automatic (React.lazy memoizes the rejected promise, so only a reload recovers). Any other error shows ErrorState with a retry that resets the boundary; it also resets when resetKey changes (e.g. the route asPath). Depends on react, ErrorState and @shared/lib/retry-import.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { isChunkLoadError } from "@shared/lib/retry-import";
import { ErrorState } from "./error-state";

export type RouteErrorBoundaryProps = {
  children: ReactNode
  resetKey?: unknown
  onReload?: () => void
};

type RouteErrorBoundaryState = {
  error: unknown
  hasError: boolean
};

function reloadPage() {
  window.location.reload();
}

export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  public override state: RouteErrorBoundaryState = { error: null, hasError: false };

  public static getDerivedStateFromError(error: unknown): RouteErrorBoundaryState {
    return { error, hasError: true };
  }

  public override componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error("RouteErrorBoundary caught an error:", error, errorInfo);
  }

  public override componentDidUpdate(previous: RouteErrorBoundaryProps) {
    if (this.state.hasError && previous.resetKey !== this.props.resetKey) {
      this._reset();
    }
  }

  private _reset = () => {
    this.setState({ error: null, hasError: false });
  };

  public override render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (isChunkLoadError(this.state.error)) {
      return (
        <ErrorState
          title="No se pudo cargar el contenido"
          description="Hubo un problema de conexión o la aplicación se actualizó. Recarga la página para continuar donde estabas."
          retryLabel="Recargar"
          onRetry={this.props.onReload ?? reloadPage}
        />
      );
    }

    return <ErrorState onRetry={this._reset} />;
  }
}
