/*
* Funcionalidad: Pruebas del texto con LaTeX de un documento Tiptap de evaluación
* Descripción: Verifica que un documento de párrafos con $…$ o $$…$$ se convierte a markdown y que los documentos sin fórmulas o con otros nodos (listas, encabezados) se dibujan tal cual. Depends on vitest.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { mathMarkdownOf } from "./rich-text-math";

const paragraph = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });
const doc = (...content: unknown[]) => ({ type: "doc", content });

describe("mathMarkdownOf", () => {
  it("turns plain paragraphs with inline or block LaTeX into markdown", () => {
    expect(mathMarkdownOf(doc(paragraph("Si $C = \\frac{V_T}{P_{plat} - PEEP}$, ¿qué pasa?"), paragraph("$$\\Delta P = P_{plat} - PEEP$$"))))
      .toBe("Si $C = \\frac{V_T}{P_{plat} - PEEP}$, ¿qué pasa?\n\n$$\\Delta P = P_{plat} - PEEP$$");
  });

  it("keeps hard breaks and ignores marks", () => {
    expect(mathMarkdownOf(doc({ type: "paragraph", content: [{ type: "text", text: "\\(x\\)", marks: [{ type: "bold" }] }, { type: "hardBreak" }, { type: "text", text: "fin" }] })))
      .toBe("\\(x\\)  \nfin");
  });

  it("returns null without formulas, with other nodes or for anything that is not a document", () => {
    expect(mathMarkdownOf(doc(paragraph("Sin fórmulas en este enunciado")))).toBeNull();
    expect(mathMarkdownOf(doc(paragraph("$x$"), { type: "bulletList", content: [] }))).toBeNull();
    expect(mathMarkdownOf("$x$")).toBeNull();
    expect(mathMarkdownOf(null)).toBeNull();
  });
});
