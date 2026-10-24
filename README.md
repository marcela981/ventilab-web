<!--
* Funcionalidad: README de la aplicación web
* Descripción: Descripción, requisitos, variables de entorno, scripts, integración continua y decisiones pendientes de ventilab-web. v1.0 (A7): se retiran las referencias a Prisma (prisma/, lib/, prisma-deploy.yml, DATABASE_URL, LOG_DB), eliminado de la web. v1.1 (A8): `.nvmrc` y `.node-version` fijan Node 22, como la CI.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
-->

# VentyLab — aplicación web

VentyLab es el frontend del Sistema Ciberfísico Educativo para la enseñanza de la mecánica ventilatoria, desarrollado como parte de la tesis *Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje* (Universidad del Valle).

La aplicación ofrece, según el rol (estudiante, docente o administrador):

- **Aprendizaje**: secciones, niveles, módulos y lecciones con contenido enriquecido (texto, ecuaciones KaTeX, imágenes y video), notas personales y tutor con IA.
- **Evaluaciones**: presentación de evaluaciones (incluidas preguntas de simulación), resultados, autoría y calificación con rúbricas y retroalimentación generada por modelos de lenguaje.
- **Simulador**: consola de ventilador mecánico con motor de simulación en el navegador, casos clínicos, repetición y resultados.
- **Laboratorio**: reservas del ventilador físico, consola en vivo con telemetría y comandos, y grabaciones de sesiones.
- **Asistente IA**: conversaciones con streaming de respuestas.
- **Operación**: notificaciones en tiempo real, espacio del estudiante, panel docente, grupos y consola de administración (usuarios, configuración, auditoría, analítica de IA, exportación para investigación y estado del sistema).

Toda la lógica de negocio y los datos viven en el backend `ventylab-server` (NestJS); este repositorio es solo la interfaz web.

## Requisitos

- **Node.js 20.9 o superior** (requisito de Next.js 16). `.nvmrc` y `.node-version` fijan Node 22, la misma versión que la CI.
- **npm 10** (`packageManager: npm@10.9.0`).
- El backend `ventylab-server` en ejecución (por defecto en `http://localhost:4000`).

## Arranque local

```bash
npm ci                 # instala dependencias (postinstall genera el manifiesto de lecciones)
cp .env.example .env.local   # y complete los valores
npm run generate:api   # regenera los tipos del contrato OpenAPI desde ../ventylab-server/openapi/openapi.json
npm run dev            # servidor de desarrollo en http://localhost:3000 (Next con webpack)
```

`generate:api` solo es necesario cuando cambia el contrato del backend; si el repositorio del backend no está al lado, reutiliza la copia de `openapi/openapi.json`.

## Variables de entorno

Todas están documentadas en [`.env.example`](.env.example). Resumen:

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | Origen del backend sin `/api` (HTTP, SSE, Socket.io y CSP). |
| `NEXT_PUBLIC_API_URL` | Heredada; solo si la anterior está vacía. |
| `BACKEND_URL` | Origen del backend para el renderizado en el servidor (opcional). |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | ID público de Google Identity Services; vacío oculta el botón de Google. |
| `NEXT_PUBLIC_MEDIA_ORIGIN` | Origen de las URL firmadas de archivos (Supabase Storage) para la CSP. |
| `NEXT_PUBLIC_SENTRY_DSN` | DSN de Sentry; vacío desactiva la captura de errores (no se carga el SDK). |
| `CSP_REPORT_ONLY` | `true` (defecto) envía la CSP solo como reporte; `false` la aplica. |
| `CSP_REPORT_URI` | URL opcional para los reportes de violaciones de la CSP. |
| `BACKEND_SPEC_PATH` | Ruta opcional al `openapi.json` del backend para `generate:api`/`check:api` (la usa la CI). |

Las variables con prefijo `NEXT_PUBLIC_` quedan visibles en el navegador: **nunca** se debe usar ese prefijo para secretos (secreto de cliente de Google, claves de API de IA, claves de servicio de Supabase). Dentro de `src/`, `process.env` solo se lee en `src/shared/lib/env.ts` (excepción heredada: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` en `src/features/auth/application/entities/google-config.ts`).

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo. |
| `npm run typecheck` | `tsc` estricto sobre el código migrado (`tsconfig.strict.json`). |
| `npm run lint` | ESLint (incluye las reglas de fronteras entre módulos). |
| `npx vitest run <carpetas> --maxWorkers=2` | Pruebas (ver lotes abajo). |
| `npm run build` | Build de producción (valida el currículo antes). |
| `npm run check:api` | Falla si el cliente generado no coincide con el contrato del backend. |
| `npx --yes knip@5 --no-progress --no-gitignore` | Archivos, exportaciones y dependencias sin uso (debe salir vacío). |

Para no agotar la memoria, las pruebas se ejecutan en 6 lotes en serie:

```bash
npx vitest run src/features/admin-console src/features/ai-chat src/features/auth src/features/case-editor src/features/content-editor src/features/evaluation-authoring src/features/evaluations --maxWorkers=2
npx vitest run src/features/grading src/features/groups src/features/learning --maxWorkers=2
npx vitest run src/features/notifications src/features/profile src/features/student-space --maxWorkers=2
npx vitest run src/features/simulator src/features/ventilator-lab --maxWorkers=2
npx vitest run src/features/teacher-dashboard src/features/teaching --maxWorkers=2
npx vitest run src/shared scripts config --maxWorkers=2
```

## Estructura

```
pages/                      rutas delgadas del Pages Router: componen un layout (getLayout) con la página de una feature
  _app.js, _document.tsx    providers globales, documento HTML (lang="es", favicon, metadatos)
  404.tsx, 500.tsx          páginas de error propias
src/
  features/<feature>/       un dominio por carpeta
    api/                    servicios HTTP, DTO (tipos del contrato generado) y mappers
    application/            entidades puras, hooks, componentes y páginas
    UI/                     estilos (CSS Modules con los tokens del sistema de diseño)
  shared/                   módulos transversales: api-client (cliente tipado, SSE, errores), session, realtime,
                            design-system (tokens, tema MUI, componentes base), layouts, lib (env, utilidades,
                            observabilidad), rich-content, sim-engine, ventilator-console, waveforms, charts, ...
config/                     redirecciones heredadas y cabeceras de seguridad/CSP usadas por next.config.mjs
scripts/                    generación y verificación del contrato, validaciones de contenido, ventilador simulado (e2e)
openapi/                    copia del contrato OpenAPI del backend
```

Convenciones: sin `sx`, `style={}` ni `styled()`; estilos solo en CSS Modules dentro de `UI/` usando los tokens de `src/shared/design-system/UI/tokens.css`; código nuevo en TypeScript; cada archivo inicia con el bloque de encabezado del proyecto.

## Contrato con el backend

- Los tipos del cliente se generan del `openapi/openapi.json` del backend (`npm run generate:api`) en `src/shared/api-client/generated/schema.d.ts`; `npm run check:api` verifica que estén al día.
- El backend responde con el envoltorio `{ success, data, message, code, traceId, pagination }`; los errores se normalizan a `ApiError` (código, estado, `Retry-After`).
- Las rutas del contrato ya incluyen `/api`; el cliente usa como base el **origen** del backend.
- Toda petición envía `Accept-Language: es`, de modo que el backend (nestjs-i18n) responde sus mensajes en español.
- Autenticación con JWT propio del backend (token de acceso + renovación) y Google Identity Services; tiempo real con Socket.io y respuestas de IA por SSE.

## Despliegue

- **Frontend**: Vercel (`vercel.json`), con las variables de `.env.example` configuradas en el proyecto. Un push a `master` puede disparar un despliegue.
- **Backend**: `ventylab-server` en un VPS; `NEXT_PUBLIC_BACKEND_URL` debe apuntar a su origen público (HTTPS) y su CORS debe aceptar el dominio del frontend.
- **Cabeceras de seguridad**: `next.config.mjs` envía `X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy` y la CSP construida por `config/csp.mjs`. La CSP se publica primero como `Content-Security-Policy-Report-Only` (`CSP_REPORT_ONLY=true`, valor por defecto); cuando la autora confirme en producción que no hay violaciones (consola del navegador o `CSP_REPORT_URI`), se cambia a `CSP_REPORT_ONLY=false` para aplicarla.
- **Errores del navegador**: con `NEXT_PUBLIC_SENTRY_DSN` se activa `@sentry/browser` (carga diferida, sin datos personales).

## Integración continua

`.github/workflows/ci.yml` ejecuta en cada push y pull request a `master`: instalación (`npm ci` con caché de npm), `typecheck`, `lint`, las pruebas en los 6 lotes, `build`, knip y la verificación del contrato: clona `marcela981/ventylab-server` en `.ci/ventylab-server` y corre `npm run check:api` con `BACKEND_SPEC_PATH` apuntando a su `openapi/openapi.json`. Si el repositorio del backend es privado, se debe crear el secreto `BACKEND_REPO_TOKEN` (token con lectura de ese repositorio).

## Decisiones pendientes de la autora

- **CSP aplicada**: pasar de Report-Only a aplicada tras validar en producción.
- **Redirecciones heredadas**: son temporales (307) hasta después de la sustentación; luego pueden pasar a permanentes (308).

## Autoría

Marcela Mazo Castro — Universidad del Valle — marcela.mazo@correounivalle.edu.co
