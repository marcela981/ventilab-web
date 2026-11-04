/*
* Funcionalidad: E2E layout order helpers
* Descripción: Order checks by bounding box shared by the July Monitoreo specs (Bloque 5): `boxOf` (the element is rendered), `expectVerticalOrder` (each item starts below the previous one's top) and `expectHorizontalOrder` (each item starts right of the previous one's left edge), both with a 1 px tolerance. v0.1 (Bloque 5, W5-1): first version, extracted from monitoreo-julio.spec.ts. Depends on @playwright/test.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, type Locator } from "@playwright/test";

export const TOLERANCE_PX = 1;

export type Box = { x: number, y: number, width: number, height: number };

export async function boxOf(locator: Locator, name: string): Promise<Box> {
  const box = await locator.boundingBox();

  expect(box, `${name} is rendered`).not.toBeNull();

  return box as Box;
}

/** Each item starts below the previous one's top (1 px tolerance), in the given order. */
export async function expectVerticalOrder(items: ReadonlyArray<[string, Locator]>): Promise<void> {
  let previous: { name: string, box: Box } | null = null;

  for (const [name, locator] of items) {
    const box = await boxOf(locator, name);

    if (previous) {
      expect(box.y, `${previous.name} is above ${name}`).toBeGreaterThan(previous.box.y + TOLERANCE_PX);
    }

    previous = { name, box };
  }
}

/** Each item starts right of the previous one's left edge, in the given order. */
export async function expectHorizontalOrder(items: ReadonlyArray<[string, Locator]>): Promise<void> {
  let previous: { name: string, box: Box } | null = null;

  for (const [name, locator] of items) {
    const box = await boxOf(locator, name);

    if (previous) {
      expect(box.x, `${previous.name} is left of ${name}`).toBeGreaterThan(previous.box.x + TOLERANCE_PX);
    }

    previous = { name, box };
  }
}
