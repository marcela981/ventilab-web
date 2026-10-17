/*
 * Funcionalidad: Legacy /simulador redirect
 * Descripción: v3.0 (T12 ventilator-lab): the legacy real-ventilator page (reservation, connection tab and live data
 *   of the physical ventilator in one dashboard) is replaced by the lab: this route now only redirects, on the
 *   server, to /lab (temporary redirect, legacyLabRedirect of @features/ventilator-lab). The legacy components under
 *   src/features/simulador stay in the code until P2 (removal only with the author's approval). Before v3.0 this page
 *   rendered LearningProgressProvider > ConexionVentiladorProvider > VentilatorDashboardWrapper. v3.1 (T12 review fix
 *   S2): imports legacyLabRedirect by its direct module path (application/config/legacy-redirects), not the whole
 *   feature barrel, so the route's server bundle does not pull the lab pages (this legacy page file may import a feature
 *   module path under the eslint boundaries, like pages/_app.js does).
 * Versión: 3.1
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import { legacyLabRedirect } from '@features/ventilator-lab/application/config/legacy-redirects';

export const getServerSideProps = async () => legacyLabRedirect("/simulador");

export default function LegacySimuladorRedirect() {
  return null;
}
