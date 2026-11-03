/*
* Funcionalidad: cropAvatarImage tests
* Descripción: Unit tests of the canvas crop of the profile photo with createImageBitmap and the canvas stubbed (jsdom has no canvas): the centered square is drawn at 512 px, png stays png and other types become jpeg, the bitmap is always released, and a failed encoding rejects. Depends on vitest.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cropAvatarImage } from "./crop-avatar-image";

const close = vi.fn();
const drawImage = vi.fn();
let encoded: Blob | null;
let encodedType: string | undefined;
let canvas: { width: number, height: number };

beforeEach(() => {
  encoded = new Blob(["out"]);
  vi.stubGlobal("createImageBitmap", vi.fn(() => Promise.resolve({ width: 1600, height: 900, close })));

  const createElement = document.createElement.bind(document);

  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag !== "canvas") {
      return createElement(tag);
    }

    canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage, imageSmoothingQuality: "low" }),
      toBlob: (callback: (blob: Blob | null) => void, type?: string) => {
        encodedType = type;
        callback(encoded);
      },
    } as unknown as HTMLCanvasElement;

    return canvas as unknown as HTMLElement;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  close.mockClear();
  drawImage.mockClear();
});

describe("cropAvatarImage", () => {
  it("draws the centered square at 512 px and keeps png", async() => {
    const result = await cropAvatarImage(new Blob(["in"], { type: "image/png" }));

    expect(canvas).toMatchObject({ width: 512, height: 512 });
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 350, 0, 900, 900, 0, 0, 512, 512);
    expect(encodedType).toBe("image/png");
    expect(result).toEqual({ blob: encoded, fileName: "avatar.png" });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("re-encodes webp as jpeg", async() => {
    const result = await cropAvatarImage(new Blob(["in"], { type: "image/webp" }));

    expect(encodedType).toBe("image/jpeg");
    expect(result.fileName).toBe("avatar.jpg");
  });

  it("rejects and releases the bitmap when encoding fails", async() => {
    encoded = null;

    await expect(cropAvatarImage(new Blob(["in"], { type: "image/jpeg" }))).rejects.toThrow();
    expect(close).toHaveBeenCalledTimes(1);
  });
});
