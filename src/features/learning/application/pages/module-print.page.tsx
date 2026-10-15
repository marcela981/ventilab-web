/*
* Funcionalidad: ModulePrintPage
* Descripción: Print view of a whole module (/learn/modules/[moduleId]/print, TEACHER and ADMIN) built from exactly ONE request (GET /api/modules/{id}/full; no tree, lessons or progress queries). It renders a cover (title, description, difficulty, estimated time, lesson count and the print date; the payload has no level or section names), then every lesson in order starting on a new printed page (break-before: page) with its Pages and blocks in order through the shared ContentBlocks in print mode (KaTeX equations, images fitted to the page width, videos as a visible link with their URL), and the Pages without a lesson at the end. "Descargar PDF" opens the browser print dialog (window.print(); the user picks "Guardar como PDF") and is hidden when printing, like the "Volver al módulo" link. Loading skeleton, 404 not-found state and error state with retry. ContentBlocks is a lazy chunk (C1 code splitting). Depends on MUI, next/head, next/link, @shared/design-system, @shared/lib, useModuleFull, the learning URLs and error messages and the print CSS Module.
* Versión: 1.0 (L7)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import Button from "@mui/material/Button";
import Head from "next/head";
import Link from "next/link";
import { lazy, Suspense } from "react";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { retryImport } from "@shared/lib/retry-import";
import { getLearningErrorMessage } from "../entities/learning-error-messages";
import { buildModuleUrl, LEARN_HOME_URL } from "../entities/learning-urls";
import { difficultyLabel } from "../entities/module-print.entity";
import type { PrintModule, PrintPage } from "../entities/module-print.entity";
import { useModuleFull } from "../hooks/use-module-full";
import styles from "../../UI/module-print.module.css";

const ContentBlocks = lazy(() =>
  retryImport(() => import("@shared/rich-content/blocks/content-blocks")).then((imported) => ({ default: imported.ContentBlocks })),
);

// TODO(i18n): move to a learning namespace in src/i18n.
const COPY = {
  documentTitle: (title: string) => `${title} (imprimir) | VentyLab`,
  loading: "Cargando el módulo…",
  loadErrorTitle: "No se pudo cargar el módulo",
  notFoundTitle: "Módulo no disponible",
  notFoundDescription: "El módulo no existe o fue eliminado.",
  backHome: "Volver a Aprender",
  backToModule: "Volver al módulo",
  download: "Descargar PDF",
  downloadHint: "En el diálogo de impresión elige «Guardar como PDF».",
  lessonCount: (count: number) => (count === 1 ? "1 lección" : `${count} lecciones`),
  difficulty: (label: string) => `Dificultad: ${label}`,
  estimatedTime: (minutes: number) => `Tiempo estimado: ${minutes} min`,
  printedOn: (date: string) => `Impreso el ${date}`,
  emptyLesson: "Esta lección no tiene páginas.",
  unassignedTitle: "Páginas sin lección",
  loadingPage: "Cargando la página…",
} as const;

const PRINT_DATE_FORMAT = new Intl.DateTimeFormat("es", { dateStyle: "long" });

function PrintedPage({ page }: { page: PrintPage }) {
  const titleId = `print-page-${page.id}`;

  return (
    <article className={cx(styles.page)} aria-labelledby={titleId}>
      <h3 id={titleId} className={cx(styles.pageTitle)}>{page.title}</h3>
      <RouteErrorBoundary resetKey={page.id}>
        <Suspense fallback={<CardSkeleton label={COPY.loadingPage} />}>
          <ContentBlocks blocks={page.blocks} mode="print" />
        </Suspense>
      </RouteErrorBoundary>
    </article>
  );
}

function ModuleCover({ content }: { content: PrintModule }) {
  return (
    <header className={cx(styles.cover)}>
      <h1 className={cx(styles.coverTitle)}>{content.title}</h1>
      {content.description ? <p className={cx(styles.coverDescription)}>{content.description}</p> : null}
      <ul className={cx(styles.coverFacts)}>
        <li>{COPY.lessonCount(content.lessons.length)}</li>
        {content.difficulty ? <li>{COPY.difficulty(difficultyLabel(content.difficulty))}</li> : null}
        {content.estimatedMinutes ? <li>{COPY.estimatedTime(content.estimatedMinutes)}</li> : null}
        <li>{COPY.printedOn(PRINT_DATE_FORMAT.format(new Date()))}</li>
      </ul>
    </header>
  );
}

function ModuleDocument({ content }: { content: PrintModule }) {
  return (
    <>
      <div className={cx(styles.toolbar, styles.noPrint)}>
        <Link href={buildModuleUrl(content.id)} className={cx(styles.backLink)}>
          <ArrowBackIcon fontSize="small" aria-hidden />
          {COPY.backToModule}
        </Link>
        <span className={cx(styles.hint)}>{COPY.downloadHint}</span>
        <Button variant="contained" startIcon={<PictureAsPdfIcon />} onClick={() => window.print()}>
          {COPY.download}
        </Button>
      </div>
      <ModuleCover content={content} />
      {content.lessons.map((lesson) => (
        <section key={lesson.id} className={cx(styles.lesson)} aria-labelledby={`print-lesson-${lesson.id}`}>
          <h2 id={`print-lesson-${lesson.id}`} className={cx(styles.lessonTitle)}>{lesson.title}</h2>
          {lesson.pages.length === 0 ? <p className={cx(styles.hint)}>{COPY.emptyLesson}</p> : null}
          {lesson.pages.map((page) => <PrintedPage key={page.id} page={page} />)}
        </section>
      ))}
      {content.unassignedPages.length > 0 ? (
        <section className={cx(styles.lesson)} aria-labelledby="print-unassigned">
          <h2 id="print-unassigned" className={cx(styles.lessonTitle)}>{COPY.unassignedTitle}</h2>
          {content.unassignedPages.map((page) => <PrintedPage key={page.id} page={page} />)}
        </section>
      ) : null}
    </>
  );
}

export type ModulePrintPageProps = {
  moduleId: string
};

export function ModulePrintPage({ moduleId }: ModulePrintPageProps) {
  const { module: content, isLoading, error, reload } = useModuleFull(moduleId);
  const notFound = error?.status === 404;

  return (
    <div className={cx(styles.document)}>
      <Head>
        <title>{COPY.documentTitle(content?.title ?? COPY.notFoundTitle)}</title>
      </Head>
      {content ? <ModuleDocument content={content} /> : null}
      {!content && isLoading ? <CardSkeleton label={COPY.loading} /> : null}
      {!content && notFound ? (
        <EmptyState
          icon={<MenuBookIcon />}
          title={COPY.notFoundTitle}
          description={COPY.notFoundDescription}
          action={<Link href={LEARN_HOME_URL} className={cx(styles.backLink)}>{COPY.backHome}</Link>}
        />
      ) : null}
      {!content && !isLoading && error && !notFound ? (
        <ErrorState title={COPY.loadErrorTitle} description={getLearningErrorMessage(error)} onRetry={() => void reload()} />
      ) : null}
    </div>
  );
}
