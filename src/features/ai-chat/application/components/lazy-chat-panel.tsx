/*
* Funcionalidad: Lazy ChatPanel
* Descripción: Lazy entry point of the AI assistant ChatPanel for hosts outside the /assistant page (the global drawer): loads chat-panel through React.lazy + retryImport inside Suspense (LoadingState fallback), so importing the feature barrel does not bundle the conversation UI. The chat-panel chunk never imports the learning feature. The ref (focusComposer handle) is forwarded once the panel is loaded. Depends on React, the design-system loading state and @shared/lib/retry-import.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { lazy, Suspense } from "react";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { retryImport } from "@shared/lib/retry-import";
import type { ChatPanelProps } from "./chat-panel";

const LoadedChatPanel = lazy(() =>
  retryImport(() => import("./chat-panel")).then((module) => ({ default: module.ChatPanel })),
);

// TODO(i18n): move to an ai-chat namespace in src/i18n.
const LOADING_LABEL = "Cargando el asistente…";

export function ChatPanel(props: ChatPanelProps) {
  return (
    <Suspense fallback={<LoadingState label={LOADING_LABEL} />}>
      <LoadedChatPanel {...props} />
    </Suspense>
  );
}
