/*
* Funcionalidad: Markdown element overrides
* Descripción: react-markdown component overrides shared by the plain and math renderers and the plugin options both use. External links open in a new tab with `noopener noreferrer`; everything else is styled by the RichContent CSS Module. Raw HTML is skipped (stricter than legacy, which also never rendered it). v1.1 (ajustes B): images render as a block figure (lazy loading, async decoding, the markdown title as visible caption) and tables sit in a keyboard-focusable horizontal scroll region, so narrow screens never overflow the page. Depends on react-markdown types.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ComponentPropsWithoutRef } from "react";
import type { Components, ExtraProps } from "react-markdown";
import styles from "./UI/rich-content.module.css";

type AnchorProps = ComponentPropsWithoutRef<"a"> & ExtraProps;

type ImageProps = ComponentPropsWithoutRef<"img"> & ExtraProps;

type TableProps = ComponentPropsWithoutRef<"table"> & ExtraProps;

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

// Markdown wraps images in a paragraph, so the figure is built from spans (a <figure> inside <p> is invalid HTML).
function MarkdownImage({ src, alt, title }: ImageProps) {
  if (typeof src !== "string" || src === "") {
    return null;
  }

  const caption = typeof title === "string" && title.trim() !== "" ? title.trim() : null;

  return (
    <span className={styles.figure} role="figure" {...(caption === null ? {} : { "aria-label": caption })}>
      {/* Lesson diagrams are static same-origin assets; next/image would need sizes the markdown does not carry. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.image} src={src} alt={alt ?? ""} loading="lazy" decoding="async" />
      {caption === null ? null : <span className={styles.figcaption}>{caption}</span>}
    </span>
  );
}

// A scrollable region must be reachable with the keyboard (WCAG 2.1.1), hence the tabIndex.
function MarkdownTable({ children }: TableProps) {
  return (
    <div className={styles.tableScroll} role="region" aria-label="Tabla desplazable" tabIndex={0}>
      <table>{children}</table>
    </div>
  );
}

export const MARKDOWN_COMPONENTS: Components = {
  a: MarkdownLink,
  img: MarkdownImage,
  table: MarkdownTable,
};

export type RendererProps = {
  content: string
};
