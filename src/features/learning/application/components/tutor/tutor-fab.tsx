/*
* Funcionalidad: TutorFab
* Descripción: TutorAI floating action button of the lesson viewer ("Abrir TutorAI", July FAB at the bottom right; the viewer places it in its fixed tutor slot). The popup is a lazy chunk (React.lazy + retryImport): it is requested when the pointer or focus reaches the button and mounted on the first click, then kept mounted so its tab state survives closing and reopening. The button announces the dialog (aria-haspopup, aria-expanded); MUI returns focus to it when the dialog closes. Depends on React, MUI (Fab, icons), @shared/design-system (RouteErrorBoundary), @shared/lib/retry-import and the TutorPopup types.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import SmartToyIcon from "@mui/icons-material/SmartToy";
import Fab from "@mui/material/Fab";
import { lazy, Suspense, useState } from "react";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { retryImport } from "@shared/lib/retry-import";
import type { TutorContext } from "./tutor-popup";

type TutorPopupModule = typeof import("./tutor-popup");

let popupChunk: Promise<TutorPopupModule> | null = null;

function loadPopup(): Promise<TutorPopupModule> {
  popupChunk ??= retryImport(() => import("./tutor-popup")).catch((error: unknown) => {
    popupChunk = null;
    throw error;
  });

  return popupChunk;
}

const TutorPopup = lazy(() => loadPopup().then((module) => ({ default: module.TutorPopup })));

// TODO(i18n): move to a learning namespace in src/i18n.
export const TUTOR_FAB_COPY = {
  open: "Abrir TutorAI",
} as const;

export function TutorFab(context: TutorContext) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const preload = () => {
    loadPopup().catch(() => undefined);
  };

  return (
    <>
      <Fab
        color="primary"
        aria-label={TUTOR_FAB_COPY.open}
        aria-haspopup="dialog"
        aria-expanded={open}
        onPointerEnter={preload}
        onFocus={preload}
        onClick={() => {
          setLoaded(true);
          setOpen(true);
        }}
      >
        <SmartToyIcon />
      </Fab>
      {loaded ? (
        <RouteErrorBoundary resetKey={context.lessonId}>
          <Suspense fallback={null}>
            <TutorPopup {...context} open={open} onClose={() => setOpen(false)} />
          </Suspense>
        </RouteErrorBoundary>
      ) : null}
    </>
  );
}
