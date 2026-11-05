/*
* Funcionalidad: Generador del logo para fondos claros
* Descripción: Deriva public/images/logo-light.png de public/images/logo.png (708 x 353, contornos blancos pensados
*   para fondos oscuros): los píxeles casi blancos y sin saturación (el monitor, la línea y los pulmones) pasan al
*   navy de la marca (#0a112b) conservando su transparencia; el azul y el verde del logotipo no cambian. No hay un
*   SVG del logo: cuando exista, este PNG se reemplaza por él (DISENO_AJUSTES_D §6.4, §7b-10). Usa sharp (dependencia
*   de next). Reproducible: la misma entrada da los mismos bytes.
*   Uso: node scripts/generate-logo-light.mjs
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SOURCE = fileURLToPath(new URL("../public/images/logo.png", import.meta.url));
const TARGET = fileURLToPath(new URL("../public/images/logo-light.png", import.meta.url));
const NAVY = [0x0a, 0x11, 0x2b];
// A pixel is part of the white outline when it is light and grey (max - min channel below the threshold).
const MIN_LIGHTNESS = 150;
const MAX_CHROMA = 40;

const { data, info } = await sharp(SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (min >= MIN_LIGHTNESS && max - min <= MAX_CHROMA) {
    [data[i], data[i + 1], data[i + 2]] = NAVY;
  }
}

await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(TARGET);

console.log(`[generate-logo-light] Wrote ${TARGET} (${info.width} x ${info.height})`);
