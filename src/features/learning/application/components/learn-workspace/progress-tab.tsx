/*
* Funcionalidad: ProgressTab
* Descripción: Mi Progreso panel of the /learn workspace (W3, Bloque 2). Temporary empty state: XP, level, streak, activity calendar, achievements, milestones and the skill tree (DISENO_BLOQUE2 §2.11) arrive with W9. Lazy loaded by the workspace (lazyPanel). Depends on MUI icons and the design-system EmptyState.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import InsightsIcon from "@mui/icons-material/Insights";
import { EmptyState } from "@shared/design-system/components/empty-state";

// TODO(i18n): move to a learning namespace in src/i18n.
const COPY = {
  title: "Mi Progreso",
  description: "Pronto verás aquí tu experiencia, tu racha y tus logros.",
} as const;

export function ProgressTab() {
  return <EmptyState icon={<InsightsIcon />} title={COPY.title} description={COPY.description} />;
}
