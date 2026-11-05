/*
* Funcionalidad: Texto con LaTeX de un documento Tiptap de evaluación
* Descripción: Regla pura del visor de enunciados, escenarios y descripciones (ajustes C2): el editor de evaluaciones guarda documentos Tiptap sin nodo matemático, así que una fórmula escrita como $…$, $$…$$, \(…\) o \[…\] llegaba como texto literal. Si el documento solo tiene párrafos, texto (las marcas se ignoran) y saltos de línea, y contiene esos delimitadores, devuelve su texto en markdown (párrafos separados por una línea en blanco) para que RichContent lo dibuje con KaTeX; en cualquier otro caso devuelve null y el documento se dibuja tal cual. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

type DocNode = { type?: unknown, text?: unknown, content?: unknown };

const MATH_DELIMITERS = /\$\$[\s\S]+?\$\$|\$[^$\n]+\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\]/u;

function children(node: DocNode): DocNode[] {
  return Array.isArray(node.content) ? (node.content as DocNode[]) : [];
}

function paragraphText(paragraph: DocNode): string | null {
  let text = "";

  for (const child of children(paragraph)) {
    if (child.type === "text" && typeof child.text === "string") {
      text += child.text;
    } else if (child.type === "hardBreak") {
      text += "  \n";
    } else {
      return null;
    }
  }

  return text;
}

/** Markdown of a plain-paragraph Tiptap document that contains LaTeX delimiters; null otherwise. */
export function mathMarkdownOf(doc: unknown): string | null {
  const root = doc as DocNode | null;

  if (!root || root.type !== "doc") {
    return null;
  }

  const paragraphs: string[] = [];

  for (const node of children(root)) {
    if (node.type !== "paragraph") {
      return null;
    }

    const text = paragraphText(node);

    if (text === null) {
      return null;
    }

    paragraphs.push(text);
  }

  const markdown = paragraphs.join("\n\n");

  return MATH_DELIMITERS.test(markdown) ? markdown : null;
}
