/*
 * Funcionalidad: Legacy /dashboard redirect
 * Descripción: Client redirect of /dashboard (the students' "Inicio" and their default route). v1.1 (T12
 *   ventilator-lab): target changed from /simulador to /lab, where /simulador now redirects (avoids a double
 *   redirect; the destination is the same).
 * Versión: 1.1
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function DashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/lab');
  }, [router]);
  return null;
}
