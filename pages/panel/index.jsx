/*
 * Funcionalidad: Legacy /panel redirect
 * Descripción: v2.0 (O6 operation): the legacy staff panel is replaced by the teacher dashboard: this route only redirects, on the server, to /teacher (temporary redirect, legacyPanelRedirect of @shared/session). Before v2.0 it rendered PanelLayout > PanelDashboard behind withTeacherAuth. The legacy components under src/features/admin/components/panel stay in the code until the closure (removal only with the author's approval).
 * Versión: 2.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import { legacyPanelRedirect } from '@shared/session/legacy-redirects';

export const getServerSideProps = async () => legacyPanelRedirect('/panel');

export default function LegacyPanelRedirect() {
  return null;
}
