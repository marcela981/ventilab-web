# Propuesta visual del Bloque 5 (lado a lado con julio)

Maquetas estáticas de la **propuesta** del Bloque 5: la app actual con los tokens, íconos y disposición propuestos en `DISENO_BLOQUE5.md` (raíz del workspace), usando el valor por defecto de cada decisión (`D1`…`D29`, §10 del diseño). No son la app: usan HTML y CSS propios y pueden llevar estilos inline; la app seguirá con CSS Modules y tokens.

Cada composición pone la captura de julio (`../referencias-julio/`, commit `62c9d68`) a la izquierda y la propuesta a la derecha, con la barra "Julio (62c9d68) | Propuesta Bloque 5".

## Índice

| Composición (`lado-a-lado/`) | Pantalla | Captura de julio | Decisiones que asume |
|---|---|---|---|
| `01-login-1280.png`, `01-login-1920.png` | Login | `01-login` | D2, D5, D6 |
| `02-sidebar-expandido-estudiante-1280/1920.png` | Sidebar expandido, estudiante (contenido: Aprender, Inicio) | `02-sidebar-expandido-estudiante` | D1, D7, D10, D12, D15 |
| `02b-sidebar-expandido-docente-1280/1920.png` | Sidebar expandido, docente (Aprender en modo staff) | `02b-sidebar-expandido-docente` | D1, D7, D8, D10, D15 |
| `03-sidebar-colapsado-estudiante-1280/1920.png` | Sidebar colapsado, estudiante, con tooltip | `03-sidebar-colapsado` | D7, D10, D11, D13 |
| `03b-sidebar-colapsado-docente-1280/1920.png` | Sidebar colapsado, docente, con badge y tooltip | `03-sidebar-colapsado` (julio no tiene docente colapsado) | D7, D8, D10, D11, D13 |
| `05-monitoreo-digital-1280/1920.png` | Monitoreo digital con datos y un cambio pendiente (FR 14 → 16) | `05-simulador-monitoreo-con-datos` | D4, D18, D20, D21, D22, D23, D24, D25, D26, D27 |
| `05r-monitoreo-real-1280/1920.png` | Monitoreo Real (operador): franja con latencia, control, Grabar sesión; Límites; Comandos recientes | `05-simulador-monitoreo-con-datos` (julio no tenía Real) | D4, D18, D19, D20, D21, D26, D27 |
| `10-ensenanza-curriculo-1280/1920.png` | Enseñanza: currículo con acordeones y tarjetas de módulo | `10-teaching-curriculum-acordeones` | D1, D7, D17 |
| `12-evaluacion-estudiante-1280/1920.png` | Evaluación del estudiante: secciones por tipo y tarjetas | `12-evaluation-estudiante` | D1, D16 |
| `13-panel-docente-1280/1920.png` | Panel docente: dashboard con vidrio y sidebar índigo | `13-panel-docente` | D8, D9, D10, D15 |

Las capturas crudas de la propuesta están en `render/` con el mismo nombre.

## Qué no se maquetó

- Estados interactivos: menú "Opciones", popover de la campana, drawers (Asesoría IA, Alertas detalladas, Caso clínico), modo Ajustar con arrastre, resumen de confirmación en Real, menú "Más modos", EXAM y móvil < 900 px.
- El esquema claro: `tokens.css` lo define, pero no se renderizó.
- Las curvas son polilíneas SVG estáticas; no usan el painter de la app.

## Fuentes

- `maquetas/tokens.css`: set de tokens propuesto (§4.1 del diseño). Esquema oscuro por defecto en `:root` y `[data-mui-color-scheme="dark"]`; claro en `[data-mui-color-scheme="light"]`; alcances `[data-surface="panel"]` y `[data-surface="auth"]`.
- `maquetas/base.css`, `learn.css`, `monitor.css`: componentes.
- `maquetas/shell.js` (sidebar global y del panel), `learn-content.js`, `monitor.js`: contenido compartido, configurado con atributos `data-*` en `<body>`.
- `maquetas/icons.js`: sprite SVG generado desde `node_modules/@mui/icons-material/esm/<Name>.js` (83 íconos, sin CDN).
- `maquetas/curves.js`: curvas en `--vl-console-curve-*` (`#ef5350`, `#42a5f5`, `#66bb6a`).
- `maquetas/fonts/roboto-latin-var.woff2`: Roboto variable (subset latin) copiada del caché de `next/font` de `ventilab-web` (`.next/static/media/ce62453a442c7f35-s.p.124b2306.woff2`). No hay `@fontsource` en `node_modules`. El render verificó `document.fonts.check('16px "Roboto"')` en todas las pantallas.
- Logos: `../../../../public/images/logo.png` y `logo-univalle.svg` (rutas relativas al repo).

## Cómo regenerar

Las maquetas se abren directamente en el navegador (`file://`). El script de render no está versionado: está en el scratchpad de la sesión de la Fase 1 (`b5/render.js`). Para regenerar sin él:

1. Con el Playwright de `ventilab-web` (`node_modules/playwright`), abrir cada `maquetas/<pantalla>.html` a 1280×720 y 1920×1080 con `deviceScaleFactor` 1, esperar `load` y `document.fonts.ready`, y guardar `render/<pantalla>-<ancho>.png` (sin `fullPage`).
2. Componer cada par en una página de `2 × ancho` por `alto + 32` px: barra superior de 32 px ("Julio (62c9d68)" sobre gris a la izquierda, "Propuesta Bloque 5" sobre azul a la derecha), la captura de julio `../referencias-julio/<captura>-<ancho>.png` a la izquierda y el render a la derecha. Las imágenes van como `data:` URL, porque una página creada con `setContent` no puede leer `file://`. Guardar en `lado-a-lado/<pantalla>-<ancho>.png`.
3. Si se cambia un ícono, regenerar `icons.js` leyendo los paths de `@mui/icons-material/esm`.
