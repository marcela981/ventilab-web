# Baseline bundle (First Load JS)

Measured 2026-10-13 from a real `npm run build` on master 62c9d68 (Next 16 prints no size table). Method: `.next/build-manifest.json` -> pages[route] + pages['/_app'] + polyfillFiles, `*.js` only, gzip via .NET GZipStream (Optimal).

| Route | raw kB | gzip kB |
|---|---|---|
| / | 854 | 274 |
| /_app | 853 | 273 |
| /_error | 858 | 275 |
| /achievements | 1011 | 325 |
| /admin/search-analytics | 1084 | 352 |
| /auth/access-denied | 863 | 277 |
| /auth/error | 872 | 279 |
| /auth/forgot-password | 859 | 276 |
| /auth/login | 981 | 317 |
| /auth/register | 934 | 300 |
| /dashboard | 854 | 274 |
| /evaluation | 944 | 306 |
| /evaluation/[activityId] | 973 | 313 |
| /evaluation/grade | 918 | 297 |
| /evaluation/grade/[activityId] | 953 | 307 |
| /evaluation/manage | 923 | 299 |
| /evaluation/manage/[activityId]/edit | 973 | 314 |
| /evaluation/manage/new | 973 | 314 |
| /flashcards | 1110 | 351 |
| /panel | 943 | 305 |
| /panel/admin | 1013 | 327 |
| /panel/settings | 872 | 281 |
| /panel/students | 1044 | 337 |
| /panel/students/[id] | 1023 | 329 |
| /profile | 1021 | 329 |
| /search | 985 | 315 |
| /simulador | 1463 | 464 |
| /teaching | 1668 | 528 |
| /teaching/[moduleId]/[lessonId] | 1497 | 467 |

