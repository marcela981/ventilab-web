/*
* Funcionalidad: Markdown element overrides
* Descripción: react-markdown component overrides shared by the plain and math renderers and the plugin options both use. External links open in a new tab with `noopener noreferrer`; everything else is styled by the RichContent CSS Module. Raw HTML is skipped (stricter than legacy, which also never rendered it). Depends on react-markdown types.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ComponentPropsWithoutRef } from "react";
import type { Components, ExtraProps } from "react-markdown";

type AnchorProps = ComponentPropsWithoutRef<"a"> & ExtraProps;

function MarkdownLink({ href, title, children }: AnchorProps) {
  const isExternal = typeof href === "string" && /^https?:\/\//i.test(href);

  return (
    <a
      {...(href === undefined ? {} : { href })}
      {...(title === undefined ? {} : { title })}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

export const MARKDOWN_COMPONENTS: Components = {
  a: MarkdownLink,
};

export type RendererProps = {
  content: string
};
