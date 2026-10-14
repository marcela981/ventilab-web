/*
* Funcionalidad: Tiptap document renderer
* Descripción: Small pure recursive React renderer of stored Tiptap JSON documents, so read-only views never load the Tiptap editor bundle. Supports paragraph, heading 1-6, text with bold/italic/underline/strike/code/link/highlight/subscript/superscript marks (textStyle and color are ignored), bullet/ordered/task lists, blockquote, codeBlock, hardBreak and horizontalRule; unknown nodes render their children. Links keep only http, https, mailto and same-site (`/`, `#`) targets; text is always rendered as React text, never as HTML. Depends on react.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { Fragment } from "react";
import type { ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import { isRecord } from "./content-block.types";
import styles from "../UI/content-blocks.module.css";

type TiptapMark = {
  type: string
  attrs?: Record<string, unknown>
};

type TiptapNode = {
  type: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: TiptapMark[]
  content?: unknown[]
};

export type TiptapDocViewProps = {
  doc: unknown
  className?: string | undefined
};

// Same depth limit as the backend validator (page-block-content.ts).
const MAX_DEPTH = 40;
const SAFE_HREF = /^(https?:\/\/|mailto:|\/(?!\/)|#)/i;
const EXTERNAL_HREF = /^https?:\/\//i;

function asNode(value: unknown): TiptapNode | null {
  return isRecord(value) && typeof value.type === "string" ? (value as TiptapNode) : null;
}

export function safeHref(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const href = value.trim();

  return SAFE_HREF.test(href) ? href : null;
}

function wrapMark(mark: TiptapMark, child: ReactNode, key: number): ReactNode {
  switch (mark.type) {
    case "bold":
      return <strong key={key}>{child}</strong>;
    case "italic":
      return <em key={key}>{child}</em>;
    case "underline":
      return <u key={key}>{child}</u>;
    case "strike":
      return <s key={key}>{child}</s>;
    case "code":
      return <code key={key}>{child}</code>;
    case "highlight":
      return <mark key={key}>{child}</mark>;
    case "subscript":
      return <sub key={key}>{child}</sub>;
    case "superscript":
      return <sup key={key}>{child}</sup>;
    case "link": {
      const href = safeHref(mark.attrs?.href);

      if (!href) {
        return child;
      }

      return EXTERNAL_HREF.test(href)
        ? <a key={key} href={href} target="_blank" rel="noopener noreferrer">{child}</a>
        : <a key={key} href={href}>{child}</a>;
    }
    default:
      // textStyle (color), unknown marks: the text keeps the theme typography.
      return child;
  }
}

function renderText(node: TiptapNode): ReactNode {
  const marks = Array.isArray(node.marks) ? node.marks.filter((mark): mark is TiptapMark => asNode(mark) !== null) : [];

  // The first mark is the outermost element, as Tiptap serializes it.
  return marks.reduceRight<ReactNode>((child, mark, index) => wrapMark(mark, child, index), node.text ?? "");
}

function renderChildren(node: TiptapNode, depth: number): ReactNode[] {
  if (!Array.isArray(node.content) || depth >= MAX_DEPTH) {
    return [];
  }

  return node.content.map((child, index) => renderNode(child, index, depth + 1));
}

function headingLevel(attrs: Record<string, unknown> | undefined): 1 | 2 | 3 | 4 | 5 | 6 {
  const level = typeof attrs?.level === "number" ? Math.round(attrs.level) : 2;

  return Math.min(6, Math.max(1, level)) as 1 | 2 | 3 | 4 | 5 | 6;
}

function renderNode(value: unknown, key: number, depth: number): ReactNode {
  const node = asNode(value);

  if (!node) {
    return null;
  }

  const children = renderChildren(node, depth);

  switch (node.type) {
    case "text":
      return <Fragment key={key}>{renderText(node)}</Fragment>;
    case "paragraph":
      return <p key={key}>{children}</p>;
    case "heading": {
      const Heading = `h${headingLevel(node.attrs)}` as const;

      return <Heading key={key}>{children}</Heading>;
    }
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList": {
      const start = typeof node.attrs?.start === "number" && node.attrs.start !== 1 ? node.attrs.start : undefined;

      return <ol key={key} {...(start === undefined ? {} : { start })}>{children}</ol>;
    }
    case "listItem":
      return <li key={key}>{children}</li>;
    case "taskList":
      return <ul key={key} className={styles.taskList}>{children}</ul>;
    case "taskItem":
      return (
        <li key={key} className={styles.taskItem}>
          <input type="checkbox" checked={node.attrs?.checked === true} disabled readOnly aria-label="Tarea" />
          <div>{children}</div>
        </li>
      );
    case "blockquote":
      return <blockquote key={key}>{children}</blockquote>;
    case "codeBlock":
      return <pre key={key}><code>{children}</code></pre>;
    case "hardBreak":
      return <br key={key} />;
    case "horizontalRule":
      return <hr key={key} />;
    default:
      return children.length > 0 ? <div key={key} className={styles.unknownNode}>{children}</div> : null;
  }
}

export function TiptapDocView({ doc, className }: TiptapDocViewProps) {
  const root = asNode(doc);

  if (!root || root.type !== "doc") {
    return null;
  }

  return <div className={cx(styles.tiptapDoc, className)}>{renderChildren(root, 0)}</div>;
}
