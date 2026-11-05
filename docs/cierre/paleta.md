<!--
* Funcionalidad: Paletas de color de VentyLab (modo × paleta)
* Descripción: Fuentes de los colores oficiales de la Universidad del Valle (Manual de Identidad Visual Corporativa, URL y fecha de consulta), las cuatro combinaciones de la interfaz (VentyLab y Univalle en modo claro y oscuro) con sus valores principales y los resultados de contraste WCAG AA verificados por theme-palettes.contrast.test.ts. v1.0 (Ajustes D4): primera versión.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
-->

# Paletas de color: VentyLab y Univalle, claro y oscuro

Diseño: `DISENO_AJUSTES_D.md` §6 (raíz del proyecto). Fuente única en código: `src/shared/design-system/theme/theme-palettes.ts`; los valores por combinación salen en `src/shared/design-system/UI/theme-palettes.generated.css` (`npm run generate:palettes`). El modo va en `<html data-mui-color-scheme="light|dark">` y la paleta en `<html data-palette="ventylab|univalle">`.

## 1. Fuentes

| Fuente | Qué se tomó | Consulta |
|---|---|---|
| Universidad del Valle, *Manual de Identidad Visual Corporativa*, enlazado desde https://www.univalle.edu.co/la-universidad/nuestros-simbolos/manual-de-identidad-visual-corporativa (PDF en Google Drive: https://drive.google.com/file/d/1XnZlzgVXcjbhNEUDjySarGD-PCB2i5YM/view) | p. 30 (tabla de color) y p. 44 (paleta web) | 2026-11-04 |
| Logo de VentyLab (`public/images/logo.png`) | azul `#64bcf6` y verde `#8cd94a` aproximados del logotipo | 2026-11-04 |
| Bloque 5 (`DISENO_BLOQUE5.md` §4) | VentyLab oscuro: la piel de julio sin cambios | — |

Colores del manual usados:

| Color | Valor | Datos del manual | Uso en VentyLab |
|---|---|---|---|
| Rojo Univalle | `#C20E1A` | C25 M100 Y100 K25; RGB 194, 14, 26 (p. 30) | primario de Univalle claro, enlaces, indicadores |
| Rojo funcional | `#C73735` | p. 30 | primario claro (hover) |
| Vino funcional | `#9B1D1C` | p. 30 | primario oscuro, vino secundario |
| Vino tinto | `#841F1C` | p. 30 | secundario y acento de Univalle claro |
| Vino muy oscuro | `#3F1517` | p. 30 | texto de Univalle claro |
| Gris | `#636363` | p. 44 (solo paleta web) | texto atenuado de Univalle claro |
| Gris claro | `#CFCFCF` | p. 44 (solo paleta web) | texto atenuado y acento de Univalle oscuro |
| Expresivos (≤ 10 %) | `#DC911B`, `#A2C037`, `#599876`, `#42A8BF`, `#3D5AA2`, `#532888`, `#AA087C` | p. 30; el azul aparece impreso como `#RD5AA2` (RGB 61, 90, 162 = `#3D5AA2`) | `#3D5AA2` informativo en claro; `#42A8BF` informativo en oscuro y resaltado "pendiente" de la consola |

- El manual **no da equivalencias Pantone**.
- El sitio web de la universidad usa `#E71C24` / `#E81C25` en su CSS: **no coincide con el manual**; se usa el del manual (§7b-9).
- En Univalle oscuro el rojo oficial sobre gris oscuro da 3,3:1 (falla AA como texto): se aclara a `#F26B73` para el primario y los enlaces (texto `#121212` encima, 6,36:1).

## 2. Las cuatro combinaciones (valores principales)

| Rol | VentyLab claro | VentyLab oscuro | Univalle claro | Univalle oscuro |
|---|---|---|---|---|
| Fondo | `#f5f9fc` | `#0a112b` | `#f8f5f5` | `#121212` |
| Superficie | `#ffffff` | `#161d36` | `#ffffff` | `#1e1e1e` |
| Superficie elevada | `#eef4f9` | `#1e243c` | `#f6eeee` | `#2a2a2a` |
| Texto | `#0a112b` | `#e8f4fd` | `#3f1517` | `#f5f5f5` |
| Texto atenuado | `#5b6472` | `#e8f4fd` 70 % | `#636363` | `#cfcfcf` |
| Primario / texto encima | `#0b6e99` / `#ffffff` | `#10aede` / `#0a112b` | `#c20e1a` / `#ffffff` | `#f26b73` / `#121212` |
| Acento / texto encima | `#3b7a1e` / `#ffffff` | `#8cd94a` / `#0a112b` | `#841f1c` / `#ffffff` | `#cfcfcf` / `#121212` |
| Enlace | `#0b6e99` | `#10aede` | `#c20e1a` | `#f26b73` |
| Sidebar del panel docente | `#ffffff` | `#1a237e` (índigo de julio) | `#ffffff` | `#1a1a1a` |
| Fondo del login | azul → verde muy claros | navy → azul océano | rojo → vino | negro → vino muy oscuro |
| Consola | `#0a112b` | `#0a112b` | `#161616` | `#161616` (gris casi negro, §7b-11) |

La consola es oscura en las cuatro combinaciones (los ventiladores de cabecera lo son); las curvas de julio (presión `#ef5350`, flujo `#42a5f5`, volumen `#66bb6a`) y las alarmas (`#f44336`, `#ff9800`, `#10aede`) no cambian con la paleta. La tabla completa de tokens por combinación está en `_coord/tokens.md` (coordinación entre bloques) y en el CSS generado.

## 3. Contraste WCAG 2.2 AA

`src/shared/design-system/theme/theme-palettes.contrast.test.ts` calcula unas 80 parejas por combinación (los colores translúcidos se componen sobre su fondo y los `color-mix()` de `tokens.css` se recalculan) y falla si alguna queda por debajo de 4,5:1 (texto) o 3:1 (componentes de interfaz, curvas y alarmas). `PRINT_CONTRAST=1 npx vitest run src/shared/design-system/theme/theme-palettes.contrast.test.ts` imprime todas. Mínimo de cada grupo (2026-11-04):

| Pares (se muestra el mínimo del grupo) | Umbral | VentyLab claro | VentyLab oscuro | Univalle claro | Univalle oscuro |
|---|---|---|---|---|---|
| Texto sobre fondo, superficie y superficie elevada | 4,5 | 16,79 | 13,69 | 13,81 | 13,17 |
| Texto atenuado sobre fondo, superficie y elevada | 4,5 | 5,40 | 7,42 | 5,26 | 9,21 |
| Enlace y enlace hover | 4,5 | 5,36 | 5,64 | 5,75 | 5,66 |
| Texto sobre primario | 4,5 | 5,67 | 7,21 | 6,23 | 6,36 |
| Texto sobre acento (--vl-color-on-accent) | 4,5 | 5,27 | 10,76 | 9,57 | 12,02 |
| Texto sobre secundario, info, éxito, advertencia, error | 4,5 | 4,98 | 5,06 | 4,98 | 5,09 |
| Textos de estado sobre su tinte y la superficie | 4,5 | 8,21 | 6,55 | 7,03 | 6,63 |
| Roles y chips de evaluación (texto blanco) | 4,5 | 4,51 | 4,51 | 4,51 | 4,51 |
| Sidebar: texto, versión, ítem activo, tarjeta de usuario | 4,5 | 5,65 | 5,09 | 5,54 | 6,77 |
| Panel docente: sidebar, ítem activo, versión, contenido, enlace | 4,5 | 5,01 | 4,98 | 5,26 | 5,66 |
| Pie del login sobre el degradado de fondo | 4,5 | 16,30 | 9,13 | 6,23 | 14,47 |
| Acentos de vidrio y títulos de nivel | 4,5 | 4,72 | 5,32 | 4,72 | 4,99 |
| Consola: texto, atenuado, ticks y texto de alarmas | 4,5 | 5,06 | 5,06 | 4,91 | 4,91 |
| Interfaz: primario y foco, acento, indicador de pestaña, acento del panel | 3 | 5,27 | 3,02 | 5,22 | 5,57 |
| Curvas (presión, flujo, volumen) sobre fondo y superficie de la consola | 3 | 4,77 | 4,77 | 4,58 | 4,58 |
| Alarmas y "pendiente" sobre la consola | 3 | 4,52 | 4,52 | 4,34 | 4,34 |

Ajustes hechos para llegar a AA (antes no se verificaban los modos claros ni los rellenos de estado):

- Texto sobre los rellenos de estado del modo oscuro (`success`, `warning`, `error`, `info`, `secondary`): navy/negro en lugar de blanco (el blanco daba 2,16-3,68:1).
- Modo claro: `success` `#2e7d32`, `warning` `#b45309`, `error` `#d32f2f` (los de julio daban 2,15-3,68:1 como texto sobre blanco); las alarmas de la consola quedan fijas en los tonos de julio.
- Textos de vidrio y de niveles por modo (`--vl-glass-accent-*-text`, `--vl-level-*`): versiones oscuras en claro.
- `--vl-console-applied` (pedido del bloque A): `#81c784`, 9,4:1 sobre navy.
