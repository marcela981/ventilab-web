/*
* Funcionalidad: HomeTab
* Descripción: Inicio panel of the /learn workspace (W3, Bloque 2). Temporary empty state: the real cards (continue where you left off, recent activity, pending evaluations, notifications; DISENO_BLOQUE2 §2.12) arrive with W8. Lazy loaded by the workspace (lazyPanel). Depends on MUI icons and the design-system EmptyState.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import HomeIcon from "@mui/icons-material/Home";
import { EmptyState } from "@shared/design-system/components/empty-state";

// TODO(i18n): move to a learning namespace in src/i18n.
const COPY = {
  title: "Tu inicio",
  description: "Pronto verás aquí dónde continuar, tu actividad reciente y tus evaluaciones pendientes.",
} as const;

export function HomeTab() {
  return <EmptyState icon={<HomeIcon />} title={COPY.title} description={COPY.description} />;
}
