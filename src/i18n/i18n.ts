/*
* Funcionalidad: i18next configuration
* Descripción: i18next setup loaded once by pages/_app.js. Loads the static JSON translations of the `ai` namespace (es/en), Spanish by default. v1.1 (B3.4, D1): the legacy `teaching` namespace (features/ensenanza locales) is removed with the teaching hub; no live code reads it. Depends on i18next and react-i18next.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Importar traducciones estáticas
import aiEs from './locales/es/ai.json';
import aiEn from './locales/en/ai.json';

i18n
  .use(initReactI18next)
  .init({
    lng: 'es',
    fallbackLng: 'es',
    ns: ['ai'],
    defaultNS: 'ai',
    resources: {
      es: {
        ai: aiEs,
      },
      en: {
        ai: aiEn,
      },
    },
    interpolation: {
      escapeValue: false, // React ya escapa los valores
    },
    react: {
      useSuspense: false, // Evitar Suspense para compatibilidad
    },
    // debug: process.env.NODE_ENV === 'development', // Habilitar en desarrollo para debug
  });

export default i18n;
