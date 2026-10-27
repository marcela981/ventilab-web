/*
* Funcionalidad: Simulator workspace page
* Descripción: Page of /simulador, the unified simulator workspace and the home of every role (Bloque 1). v0.1 (W1): a
*   placeholder that lazy loaded the existing page of each tab. v0.2 (W4): each panel from its feature entry point.
*   v0.3 (W5): composes the workspace: the session provider (active digital session in `?session=`, its worker,
*   outbox and tab claim) and the lab connection provider ABOVE the tabs, then the shell with the bottom tabs and the
*   panels mounted once (DISENO_BLOQUE1 §2.4 and §3). `deps` injects the session dependencies (tests). Depends on
*   next/head and the workspace providers and shell.
* Versión: 0.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Head from "next/head";
import type { SimSessionHostDeps } from "@features/simulator/session.entry";
import { LabConnectionProvider } from "../components/lab-connection-provider";
import type { LabConnectionValue } from "../components/lab-connection-provider";
import { SimulatorWorkspace } from "../components/simulator-workspace";
import { WorkspaceSessionProvider } from "../components/workspace-session-provider";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const SIMULATOR_WORKSPACE_PAGE_COPY = {
  documentTitle: "Simulador | VentyLab",
} as const;

export type SimulatorWorkspacePageProps = {
  /** Injectable session dependencies (tests). */
  deps?: SimSessionHostDeps | undefined
  /** Fixed lab connection (tests); omitted: the provider's own state. */
  connection?: LabConnectionValue | undefined
};

export function SimulatorWorkspacePage({ deps, connection }: SimulatorWorkspacePageProps = {}) {
  return (
    <WorkspaceSessionProvider deps={deps}>
      <LabConnectionProvider value={connection}>
        <Head>
          <title>{SIMULATOR_WORKSPACE_PAGE_COPY.documentTitle}</title>
        </Head>
        <SimulatorWorkspace />
      </LabConnectionProvider>
    </WorkspaceSessionProvider>
  );
}
