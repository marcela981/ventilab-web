<!--
* Funcionalidad: Índice de la propuesta visual de temas (Ajustes D)
* Descripción: Capturas de la parada visual de D3/D4 (login, sidebar, Monitoreo, Enseñanza y Panel en VentyLab y Univalle, modo claro y oscuro, a 1280×720 y 375×812), generadas por e2e/ajustes-d/capturas.spec.ts. Marcela aprueba con ellas antes del merge de feat/ajustes-d-tema. v1.0 (Ajustes D3/D4): primera versión.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
-->

# Propuesta visual: temas (modo × paleta)

**Parada visual:** el merge de `feat/ajustes-d-tema` (web y server) espera la aprobación de Marcela sobre estas capturas.

- Generadas el 2026-11-05 con `E2E_CAPTURES=1 E2E_BASE_URL=… E2E_API_URL=… npx playwright test --project=e2e e2e/ajustes-d/capturas.spec.ts` sobre el stack local (base `ventylab_d`, usuarios demo).
- Nombre: `<página>-<paleta>-<modo>-<ancho>.png`. Viewports 1280×720 y 375×812, factor de escala 1.
- Colores, fuentes y contraste: [`../paleta.md`](../paleta.md). Diseño: `DISENO_AJUSTES_D.md` §5-§6.
- El logo claro (`public/images/logo-light.png`) se deriva del PNG existente: **no hay SVG del logo**.

## 1280×720

| Página | VentyLab claro | VentyLab oscuro | Univalle claro | Univalle oscuro |
|---|---|---|---|---|
| Login (/auth/login, sin sesión) | [ver](01-login-ventylab-claro-1280.png) | [ver](01-login-ventylab-oscuro-1280.png) | [ver](01-login-univalle-claro-1280.png) | [ver](01-login-univalle-oscuro-1280.png) |
| Sidebar del estudiante con «Apariencia» (/learn; a 375 px, el drawer abierto) | [ver](02-sidebar-ventylab-claro-1280.png) | [ver](02-sidebar-ventylab-oscuro-1280.png) | [ver](02-sidebar-univalle-claro-1280.png) | [ver](02-sidebar-univalle-oscuro-1280.png) |
| Enseñanza (/learn?tab=curriculo) | [ver](03-ensenanza-ventylab-claro-1280.png) | [ver](03-ensenanza-ventylab-oscuro-1280.png) | [ver](03-ensenanza-univalle-claro-1280.png) | [ver](03-ensenanza-univalle-oscuro-1280.png) |
| Monitoreo (/simulador?tab=monitoreo con una sesión digital en curso) | [ver](04-monitoreo-ventylab-claro-1280.png) | [ver](04-monitoreo-ventylab-oscuro-1280.png) | [ver](04-monitoreo-univalle-claro-1280.png) | [ver](04-monitoreo-univalle-oscuro-1280.png) |
| Panel docente (/teacher, docente) | [ver](05-panel-ventylab-claro-1280.png) | [ver](05-panel-ventylab-oscuro-1280.png) | [ver](05-panel-univalle-claro-1280.png) | [ver](05-panel-univalle-oscuro-1280.png) |

## 375×812

| Página | VentyLab claro | VentyLab oscuro | Univalle claro | Univalle oscuro |
|---|---|---|---|---|
| Login (/auth/login, sin sesión) | [ver](01-login-ventylab-claro-375.png) | [ver](01-login-ventylab-oscuro-375.png) | [ver](01-login-univalle-claro-375.png) | [ver](01-login-univalle-oscuro-375.png) |
| Sidebar del estudiante con «Apariencia» (/learn; a 375 px, el drawer abierto) | [ver](02-sidebar-ventylab-claro-375.png) | [ver](02-sidebar-ventylab-oscuro-375.png) | [ver](02-sidebar-univalle-claro-375.png) | [ver](02-sidebar-univalle-oscuro-375.png) |
| Enseñanza (/learn?tab=curriculo) | [ver](03-ensenanza-ventylab-claro-375.png) | [ver](03-ensenanza-ventylab-oscuro-375.png) | [ver](03-ensenanza-univalle-claro-375.png) | [ver](03-ensenanza-univalle-oscuro-375.png) |
| Monitoreo (/simulador?tab=monitoreo con una sesión digital en curso) | [ver](04-monitoreo-ventylab-claro-375.png) | [ver](04-monitoreo-ventylab-oscuro-375.png) | [ver](04-monitoreo-univalle-claro-375.png) | [ver](04-monitoreo-univalle-oscuro-375.png) |
| Panel docente (/teacher, docente) | [ver](05-panel-ventylab-claro-375.png) | [ver](05-panel-ventylab-oscuro-375.png) | [ver](05-panel-univalle-claro-375.png) | [ver](05-panel-univalle-oscuro-375.png) |

