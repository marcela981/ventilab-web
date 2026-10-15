/*
* Funcionalidad: MediaUploadField tests
* Descripción: Rendering tests of the shared upload field: the default labels ("Subir archivo", "Reemplazar archivo", "Quitar archivo") and the accept list of the kinds, the copy override used when several fields share a screen, the progress row with "Cancelar subida", and the upload error as an alert. Depends on vitest, Testing Library and MediaUploadField.
* Versión: 1.0 (S1)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MediaUploadField } from "./media-upload-field";
import { IDLE_MEDIA_UPLOAD } from "./use-media-uploader";

const handlers = { onSelect: vi.fn(), onCancel: vi.fn(), onRemove: vi.fn() };

describe("MediaUploadField", () => {
  it("offers the upload of the accepted kinds and hands the chosen file", () => {
    const onSelect = vi.fn();
    const file = new File(["png"], "curva.png", { type: "image/png" });

    render(<MediaUploadField kind={["IMAGE", "VIDEO"]} hasMedia={false} state={IDLE_MEDIA_UPLOAD} validationError={null} {...handlers} onSelect={onSelect} />);

    const input = screen.getByLabelText("Subir archivo");

    expect(input).toHaveAttribute("accept", "image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm");
    expect(screen.queryByRole("button", { name: "Quitar archivo" })).not.toBeInTheDocument();

    fireEvent.change(input, { target: { files: [file] } });

    expect(onSelect).toHaveBeenCalledWith(file);
  });

  it("uses the copy override for replace and remove", () => {
    const onRemove = vi.fn();

    render(
      <MediaUploadField
        kind="IMAGE"
        hasMedia
        state={IDLE_MEDIA_UPLOAD}
        validationError={null}
        copy={{ replace: "Reemplazar imagen de la opción 1", remove: "Quitar imagen de la opción 1" }}
        {...handlers}
        onRemove={onRemove}
      />,
    );

    expect(screen.getByLabelText("Reemplazar imagen de la opción 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Quitar imagen de la opción 1" }));
    expect(onRemove).toHaveBeenCalled();
  });

  it("shows the progress with a cancel action, and the upload error as an alert", () => {
    const onCancel = vi.fn();
    const { rerender } = render(
      <MediaUploadField kind="VIDEO" hasMedia={false} state={{ ...IDLE_MEDIA_UPLOAD, progress: 0.5 }} validationError={null} {...handlers} onCancel={onCancel} />,
    );

    expect(screen.getByText("Subiendo… 50 %")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar subida" }));
    expect(onCancel).toHaveBeenCalled();

    rerender(<MediaUploadField kind="VIDEO" hasMedia={false} state={{ ...IDLE_MEDIA_UPLOAD, error: "Formato no permitido." }} validationError={null} {...handlers} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Formato no permitido.");
  });
});
