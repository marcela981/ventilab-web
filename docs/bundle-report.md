<!--
* Funcionalidad: Bundle report after closure
* Descripción: First Load JS per route of ventilab-web after the closure (B5), measured from a real `npm run build` and compared with odd/baseline-bundle.md.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
-->

# Bundle report after closure (First Load JS)

Measured 2026-10-18 from a real `npm run build` (Next 16.1.1, webpack) on master 6062450. Next 16 prints no size table, so the method of
[`odd/baseline-bundle.md`](../odd/baseline-bundle.md) is repeated: `.next/build-manifest.json` → `polyfillFiles` + `pages['/_app']` +
`pages[route]`, `*.js` only, each file counted once, gzip per file (Node zlib level 6, the default level that .NET `GZipStream` Optimal
also uses; the baseline used .NET). Sizes in kB (1024 bytes).

The baseline (master 62c9d68, 2026-10-13) predates the migration, so most current routes did not exist. Where a route kept its path the
baseline is that route; where the screen replaced a legacy route, the baseline is the legacy equivalent shown in parentheses (for example
`/lab*` and `/simulator*` replace `/simulador`, `/learn*` replaces `/teaching`, `/teacher` replaces `/panel`). "—" means no
equivalent existed. The Sentry SDK chunk is not part of any route's first load (it loads only with `NEXT_PUBLIC_SENTRY_DSN`).

| Route | Baseline gzip kB | Now gzip kB | Delta gzip kB | Now raw kB |
|---|---|---|---|---|
| / | 274 | 206 | -68 | 629 |
| /404 | — | 209 | — | 637 |
| /500 | — | 209 | — | 637 |
| /_app | 273 | 204 | -69 | 621 |
| /_error | 275 | 206 | -69 | 626 |
| /admin/ai | — | 239 | — | 726 |
| /admin/audit | — | 239 | — | 726 |
| /admin/research | — | 239 | — | 726 |
| /admin/settings | 281 (/panel/settings) | 239 | -42 | 726 |
| /admin/status | — | 239 | — | 726 |
| /admin/users | 327 (/panel/admin) | 239 | -88 | 726 |
| /assistant | — | 281 | — | 847 |
| /assistant/[conversationId] | — | 281 | — | 847 |
| /auth/access-denied | 277 | 264 | -13 | 794 |
| /auth/forgot-password | 276 | 264 | -12 | 794 |
| /auth/login | 317 | 264 | -53 | 794 |
| /auth/register | 300 | 264 | -36 | 794 |
| /content | — | 237 | — | 721 |
| /content/pages/[pageId] | — | 237 | — | 721 |
| /dashboard | 274 | 206 | -68 | 629 |
| /evaluations | 306 (/evaluation) | 309 | +3 | 934 |
| /evaluations/[evaluationId] | 313 (/evaluation/[activityId]) | 309 | -4 | 934 |
| /evaluations/[evaluationId]/attempts/[attemptId] | 313 (/evaluation/[activityId]) | 309 | -4 | 934 |
| /evaluations/[evaluationId]/attempts/[attemptId]/result | 313 (/evaluation/[activityId]) | 309 | -4 | 934 |
| /evaluations/manage | 299 (/evaluation/manage) | 287 | -12 | 869 |
| /evaluations/manage/[evaluationId]/assignments | 314 (/evaluation/manage/[activityId]/edit) | 287 | -27 | 869 |
| /evaluations/manage/[evaluationId]/edit | 314 (/evaluation/manage/[activityId]/edit) | 287 | -27 | 869 |
| /evaluations/manage/new | 314 (/evaluation/manage/new) | 287 | -27 | 869 |
| /grading | 297 (/evaluation/grade) | 237 | -60 | 721 |
| /grading/attempts/[attemptId] | 307 (/evaluation/grade/[activityId]) | 237 | -70 | 721 |
| /grading/evaluations/[evaluationId] | 307 (/evaluation/grade/[activityId]) | 237 | -70 | 721 |
| /groups | — | 264 | — | 795 |
| /groups/[groupId] | — | 264 | — | 795 |
| /lab | 464 (/simulador) | 326 | -138 | 985 |
| /lab/live | 464 (/simulador) | 326 | -138 | 985 |
| /lab/recordings | 464 (/simulador) | 326 | -138 | 985 |
| /lab/recordings/[recordingId] | 464 (/simulador) | 326 | -138 | 985 |
| /lab/reservations | 464 (/simulador) | 326 | -138 | 985 |
| /learn | 528 (/teaching) | 289 | -239 | 875 |
| /learn/[sectionId] | 528 (/teaching) | 289 | -239 | 875 |
| /learn/modules/[moduleId] | 528 (/teaching) | 289 | -239 | 875 |
| /learn/modules/[moduleId]/lessons/[lessonId]/[pageNumber] | 467 (/teaching/[moduleId]/[lessonId]) | 289 | -178 | 875 |
| /learn/modules/[moduleId]/print | 528 (/teaching) | 269 | -259 | 811 |
| /me | — | 238 | — | 725 |
| /me/grades | — | 238 | — | 725 |
| /me/notes | — | 238 | — | 725 |
| /my-group | — | 264 | — | 795 |
| /notifications | — | 238 | — | 725 |
| /profile | 329 | 277 | -52 | 838 |
| /simulator | 464 (/simulador) | 346 | -118 | 1043 |
| /simulator/cases | 464 (/simulador) | 339 | -125 | 1024 |
| /simulator/cases/[id]/edit | 464 (/simulador) | 339 | -125 | 1024 |
| /simulator/cases/new | 464 (/simulador) | 339 | -125 | 1024 |
| /simulator/sessions/[sessionId] | 464 (/simulador) | 346 | -118 | 1043 |
| /simulator/sessions/[sessionId]/replay | 464 (/simulador) | 346 | -118 | 1043 |
| /simulator/sessions/[sessionId]/result | 464 (/simulador) | 346 | -118 | 1043 |
| /teacher | 305 (/panel) | 238 | -67 | 725 |
| /teacher/students/[userId] | 329 (/panel/students/[id]) | 238 | -91 | 725 |
