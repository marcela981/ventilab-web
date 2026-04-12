import { createTheme, alpha } from '@mui/material/styles';

/**
 * Utilidad para calcular el contraste WCAG entre dos colores
 * Implementa la fórmula estándar WCAG usando sRGB→lineal y luminancia relativa
 * 
 * @param {string} textHex - Color del texto en formato hexadecimal (ej: '#0288d1')
 * @param {string} bgHex - Color de fondo en formato hexadecimal (ej: '#BBECFC')
 * @param {string} context - Contexto para el mensaje de advertencia
 * @returns {number} Ratio de contraste WCAG
 */
const assertContrastDev = (textHex, bgHex, context) => {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  /**
   * Convierte un valor de componente de color (0-255) a luminancia relativa
   * Aplica la función gamma sRGB para linealizar el valor
   */
  const getRelativeLuminance = (component) => {
    const normalized = component / 255;
    if (normalized <= 0.03928) {
      return normalized / 12.92;
    }
    return Math.pow((normalized + 0.055) / 1.055, 2.4);
  };

  /**
   * Convierte un color hexadecimal a componentes RGB
   */
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  /**
   * Calcula la luminancia relativa de un color
   */
  const calculateLuminance = (hex) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;

    const rLum = getRelativeLuminance(rgb.r);
    const gLum = getRelativeLuminance(rgb.g);
    const bLum = getRelativeLuminance(rgb.b);

    return 0.2126 * rLum + 0.7152 * gLum + 0.0722 * bLum;
  };

  const textLuminance = calculateLuminance(textHex);
  const bgLuminance = calculateLuminance(bgHex);

  // Ratio de contraste = (L1 + 0.05) / (L2 + 0.05)
  // donde L1 es la luminancia del color más claro y L2 la del más oscuro
  const lighter = Math.max(textLuminance, bgLuminance);
  const darker = Math.min(textLuminance, bgLuminance);
  const contrast = (lighter + 0.05) / (darker + 0.05);

  // WCAG AA requiere:
  // - AA normal: mínimo 4.5:1 para texto normal
  // - AA large: mínimo 3.0:1 para texto grande (18pt+ o 14pt+ bold)
  const minContrastNormal = 4.5;
  const minContrastLarge = 3.0;

  // Validar ambos umbrales
  const meetsLarge = contrast >= minContrastLarge;
  const meetsNormal = contrast >= minContrastNormal;

  if (!meetsLarge) {
    console.warn(
      `[A11y][${context}] Contraste ${contrast.toFixed(2)}:1 - AA normal>=4.5, AA large>=3.0 - ⚠️ NO CUMPLE AA`,
      {
        textColor: textHex,
        backgroundColor: bgHex,
        contrastRatio: contrast.toFixed(2),
        'AA normal (4.5)': meetsNormal ? '✓' : '✗',
        'AA large (3.0)': meetsLarge ? '✓' : '✗',
      }
    );
  } else if (!meetsNormal) {
    console.warn(
      `[A11y][${context}] Contraste ${contrast.toFixed(2)}:1 - AA normal>=4.5, AA large>=3.0 - ⚠️ Solo cumple AA large (requiere texto grande/negrita)`,
      {
        textColor: textHex,
        backgroundColor: bgHex,
        contrastRatio: contrast.toFixed(2),
        'AA normal (4.5)': '✗',
        'AA large (3.0)': '✓',
        note: 'Este componente usa fontSize grande y fontWeight 700 para cumplir AA-large',
      }
    );
  }

  return contrast;
};

// ==================== TOKENS DEL MÓDULO DE ENSEÑANZA ====================

const teachingTokens = {
  paperBg: alpha('#BBECFC', 0.05),
  chipPrimaryBg: '#BBECFC',
  // #005b99 sobre #BBECFC → contraste WCAG 5.65:1 (cumple AA normal ≥4.5:1)
  chipPrimaryLabel: '#005b99',
  chipSecondaryBg: '#0BBAF4',
  // #000000 sobre #0BBAF4 → contraste WCAG 9.44:1 (cumple AA normal ≥4.5:1)
  chipSecondaryLabel: '#000000',
};

// ==================== VALIDACIÓN DE CONTRASTE EN DESARROLLO ====================

if (process.env.NODE_ENV !== 'production') {
  /**
   * Validación de contraste WCAG AA para chips del módulo de enseñanza
   *
   * CHIP PRIMARIO (#005b99 sobre #BBECFC):
   * - Contraste calculado: 5.65:1 → cumple AA normal (≥4.5:1) ✓
   *
   * CHIP SECUNDARIO (#000000 sobre #0BBAF4):
   * - Contraste calculado: 9.44:1 → cumple AA normal (≥4.5:1) ✓
   */
  assertContrastDev(teachingTokens.chipPrimaryLabel, teachingTokens.chipPrimaryBg, 'Chip primary');
  assertContrastDev(teachingTokens.chipSecondaryLabel, teachingTokens.chipSecondaryBg, 'Chip secondary');
}

// ==================== CONFIGURACIÓN DEL TEMA ====================

export const teachingModuleTheme = createTheme({
  palette: {
    mode: 'light',
    teaching: teachingTokens,
  },

  components: {
    // === PAPER ===
    // Configuración para Paper con clase utilitaria .LessonViewer-paper
    MuiPaper: {
      styleOverrides: {
        root: {
          '&.LessonViewer-paper': {
            backgroundColor: teachingTokens.paperBg,
          },
        },
      },
    },

    // === CHIP ===
    // Variantes personalizadas para chips primarios y secundarios
    MuiChip: {
      variants: [
        // Variante Primaria — #005b99 sobre #BBECFC (5.65:1, WCAG AA normal ✓)
        {
          props: { color: 'primary', variant: 'filled' },
          style: {
            backgroundColor: teachingTokens.chipPrimaryBg,
            color: teachingTokens.chipPrimaryLabel,
            '& .MuiChip-label': {
              fontWeight: 700,
            },
          },
        },
        // Variante Secundaria — #000000 sobre #0BBAF4 (9.44:1, WCAG AA normal ✓)
        {
          props: { color: 'secondary', variant: 'filled' },
          style: {
            backgroundColor: teachingTokens.chipSecondaryBg,
            color: teachingTokens.chipSecondaryLabel,
            '& .MuiChip-label': {
              fontWeight: 700,
            },
          },
        },
      ],
    },
  },
});

