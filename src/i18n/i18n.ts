/**
 * =============================================================================
 * i18next Configuration
 * =============================================================================
 * 
 * Configuración de i18next para internacionalización.
 * Carga traducciones desde archivos JSON estáticos.
 * 
 * @module
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Importar traducciones estáticas
import aiEs from './locales/es/ai.json';
import aiEn from './locales/en/ai.json';
import teachingEs from '../features/ensenanza/config/locales/es/teaching.json';
import teachingEn from '../features/ensenanza/config/locales/en/teaching.json';

i18n
  .use(initReactI18next)
  .init({
    lng: 'es',
    fallbackLng: 'es',
    ns: ['ai', 'teaching'],
    defaultNS: 'ai',
    resources: {
      es: {
        ai: aiEs,
        teaching: teachingEs,
      },
      en: {
        ai: aiEn,
        teaching: teachingEn,
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

