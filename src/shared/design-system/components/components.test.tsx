/*
* Funcionalidad: Design-system base component tests
* Descripción: Verifies PageHeader, EmptyState, ErrorState, LoadingState, ConfirmDialog and RouteErrorBoundary: rendered states, accessible roles, retry/confirm/cancel callbacks, pending state, chunk-load fallback and reset on retry or resetKey change. Depends on vitest and Testing Library.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./confirm-dialog";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { LoadingState } from "./loading-state";
import { PageHeader } from "./page-header";
import { RouteErrorBoundary } from "./route-error-boundary";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PageHeader", () => {
  it("renders the title as the page heading, subtitle and actions", () => {
    render(<PageHeader title="Mis grupos" subtitle="Grupos activos" actions={<button type="button">Crear</button>} />);

    expect(screen.getByRole("heading", { level: 1, name: "Mis grupos" })).toBeInTheDocument();
    expect(screen.getByText("Grupos activos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear" })).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("renders title, description and action", () => {
    render(<EmptyState title="Sin grupos" description="Aún no hay grupos" action={<button type="button">Crear grupo</button>} />);

    expect(screen.getByText("Sin grupos")).toBeInTheDocument();
    expect(screen.getByText("Aún no hay grupos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear grupo" })).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("announces the error and fires retry", () => {
    const onRetry = vi.fn();

    render(<ErrorState title="Error" description="No se pudo cargar" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar");
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders no retry button without onRetry", () => {
    render(<ErrorState />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("LoadingState", () => {
  it("renders a polite status with its label", () => {
    render(<LoadingState label="Cargando grupos…" />);

    expect(screen.getByRole("status")).toHaveTextContent("Cargando grupos…");
  });
});

describe("ConfirmDialog", () => {
  it("fires confirm and cancel", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        open
        title="¿Eliminar grupo?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole("dialog", { name: "¿Eliminar grupo?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables both actions while pending", () => {
    render(<ConfirmDialog open title="¿Salir?" isPending onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Confirmar/ })).toBeDisabled();
  });

  it("renders nothing when closed", () => {
    render(<ConfirmDialog open={false} title="¿Salir?" onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("RouteErrorBoundary", () => {
  const failure = { shouldThrow: true, error: new Error("boom") as Error };

  function Flaky() {
    if (failure.shouldThrow) {
      throw failure.error;
    }

    return <p>Contenido recuperado</p>;
  }

  it("shows an error state and recovers on retry", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    failure.shouldThrow = true;
    failure.error = new Error("boom");

    render(
      <RouteErrorBoundary>
        <Flaky />
      </RouteErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    failure.shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(screen.getByText("Contenido recuperado")).toBeInTheDocument();
  });

  it("resets when resetKey changes", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    failure.shouldThrow = true;
    failure.error = new Error("boom");

    const { rerender } = render(
      <RouteErrorBoundary resetKey="/a">
        <Flaky />
      </RouteErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    failure.shouldThrow = false;
    rerender(
      <RouteErrorBoundary resetKey="/b">
        <Flaky />
      </RouteErrorBoundary>,
    );

    expect(screen.getByText("Contenido recuperado")).toBeInTheDocument();
  });

  it("offers a user-triggered reload for chunk load errors", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    failure.shouldThrow = true;
    failure.error = Object.assign(new Error("Loading chunk 7 failed."), { name: "ChunkLoadError" });

    const onReload = vi.fn();

    render(
      <RouteErrorBoundary onReload={onReload}>
        <Flaky />
      </RouteErrorBoundary>,
    );

    expect(screen.getByText("No se pudo cargar el contenido")).toBeInTheDocument();
    expect(onReload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Recargar" }));

    expect(onReload).toHaveBeenCalledTimes(1);
  });
});
