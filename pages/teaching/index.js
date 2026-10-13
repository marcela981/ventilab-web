/*
* Funcionalidad: Teaching page (/teaching)
* Descripción: Next.js route of the teaching module. Wraps TeachingModule in LearningProgressProvider. v1.1: the root container paints the dark background the page was designed for (TeachingPage.module.css) and carries the global `vl-legacy-dark` scope (src/index.css), because the global body now follows the light MUI theme.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
import React from 'react';
import { LearningProgressProvider } from '@/features/progress/LearningProgressContext';
import TeachingModule from '@/features/ensenanza/shared/components/pages/TeachingModule';
import styles from '@/features/ensenanza/shared/dashboard/ui/TeachingPage.module.css';

export default function Teaching() {
  return (
    <LearningProgressProvider>
      <div className={`${styles.root} vl-legacy-dark`}>
        <TeachingModule />
      </div>
    </LearningProgressProvider>
  );
}
