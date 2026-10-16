/*
* Funcionalidad: Sweep painter tests
* Descripción: Covers the chrome span copy of the sweep painter: with a fractional device pixel ratio the source rectangle read from the offscreen chrome layer is clamped to the layer backing store, so rounding never reads outside it. Depends on Vitest only.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it, vi } from "vitest";
import { blitChrome, computeSweepLayout } from "./sweep-painter";
import type { ChromeLayer } from "./sweep-painter";

function makeTarget(): { ctx: CanvasRenderingContext2D, drawImage: ReturnType<typeof vi.fn> } {
  const drawImage = vi.fn();
  const ctx = { drawImage, clearRect: vi.fn() } as unknown as CanvasRenderingContext2D;

  return { ctx, drawImage };
}

describe("blitChrome", () => {
  it("clamps the source rectangle of a span copy to the chrome layer backing store", () => {
    // 66.67 CSS px at DPR 1.5 rounds to a 100 px backing store; a span ending at the right edge would read to 105 px.
    const layout = computeSweepLayout(66.67, 33.4, 2);
    const layer = { canvas: { width: 100, height: 50 }, ctx: {}, dpr: 1.5 } as unknown as ChromeLayer;
    const { ctx, drawImage } = makeTarget();

    blitChrome(ctx, layer, layout, [[60, 70], [-2, 4]]);

    expect(drawImage).toHaveBeenCalledTimes(2);

    for (const call of drawImage.mock.calls) {
      const [, sx, sy, sw, sh] = call as [unknown, number, number, number, number];

      expect(sx).toBeGreaterThanOrEqual(0);
      expect(sy).toBe(0);
      expect(sw).toBeGreaterThan(0);
      expect(sx + sw).toBeLessThanOrEqual(100);
      expect(sh).toBeLessThanOrEqual(50);
    }
  });

  it("skips a span that falls entirely outside the layer", () => {
    const layout = computeSweepLayout(100, 50, 1);
    const layer = { canvas: { width: 100, height: 50 }, ctx: {}, dpr: 1 } as unknown as ChromeLayer;
    const { ctx, drawImage } = makeTarget();

    blitChrome(ctx, layer, layout, [[120, 130]]);

    expect(drawImage).not.toHaveBeenCalled();
  });
});
