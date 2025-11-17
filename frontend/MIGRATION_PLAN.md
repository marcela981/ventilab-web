# Plan de Migración: Consolidación de Archivos en `src/`

## Objetivo
Migrar archivos desde la raíz de `frontend/` hacia `frontend/src/` para consolidar todo el código fuente en un solo directorio, siguiendo las convenciones de Next.js y simplificando la estructura del proyecto.

---

## 1. ANÁLISIS DE DEPENDENCIAS CRÍTICAS

### 1.1 Componentes que Importan Otros Componentes

**Componentes principales que importan otros componentes:**
- `src/components/teaching/TeachingModule.jsx`
  - Importa: `CurriculumPanel`, `DashboardHeader`, `LessonViewer`, `ProgressTab`, etc.
  - Depende de hooks: `useLearningProgress`, `useModuleProgress`, `useLesson`, etc.

- `src/components/teaching/components/LessonViewer.jsx`
  - Importa: múltiples secciones (`IntroductionSection`, `TheorySection`, etc.)
  - Importa: componentes de AI (`TutorAIPopup`, `AITopicExpander`)
  - Importa: componentes multimedia (lazy loaded)

- `src/features/progress/components/ProgressTab.tsx`
  - Importa: `ProgressSkeleton`, `EmptyState`, `XpLevelCard`, etc.
  - Usa: `useLearningProgress` context

- `src/components/dashboard/*` (varios componentes)
  - Importan componentes comunes y hooks

**Dependencias entre componentes:**
- `teaching/` → depende de `curriculum/`, `navigation/`, `sections/`, `ai/`, `media/`
- `dashboard/` → depende de componentes comunes
- `common/` → componentes base usados por múltiples módulos
- `gamification/` → componentes independientes
- `profile/` → componentes independientes

### 1.2 Hooks que se Usan Dónde

**Hooks más utilizados:**

1. **`useLearningProgress`** (Context Hook)
   - Usado en: 56 archivos
   - Componentes principales:
     - `TeachingModule.jsx`
     - `LessonViewer.jsx`
     - `ProgressTab.tsx`
     - `ModuleCard.jsx`
     - `CurriculumPanel.jsx`
     - Todos los componentes de progress
   - Es crítico para el estado global de progreso

2. **`useAuth`** (Context Hook)
   - Usado en: múltiples componentes
   - Componentes principales:
     - `Sidebar.jsx`
     - `Navbar.jsx`
     - `ProtectedRoute.jsx`
     - `UserProfileButton.jsx`
     - `LevelSettings.jsx`
   - Es crítico para autenticación

3. **`useModuleProgress`**
   - Dos versiones:
     - `src/hooks/useModuleProgress.js` (general)
     - `src/components/teaching/hooks/useModuleProgress.js` (específico de teaching)
   - Usado en: `TeachingModule.jsx`, `ModuleCard.jsx`, `ModuleGrid.jsx`

4. **`useLesson`**
   - Ubicación: `src/components/teaching/hooks/useLesson.js`
   - Usado en: `LessonViewer.jsx`, `TeachingModule.jsx`

5. **`useTopicContext`**
   - Ubicación: `src/hooks/useTopicContext.js`
   - Usado en: `LessonViewer.jsx`, `AITopicExpander.jsx`
   - Depende de: `useAuth`

6. **`useAITutor`**
   - Dos versiones:
     - `src/hooks/ai/useAITutor.js` (general)
     - `src/components/teaching/hooks/useAITutor.js` (específico)
   - Usado en: `TutorAIPopup.jsx`, `AITutorChat.jsx`

7. **`useProgress`**
   - Ubicación: `src/hooks/useProgress.js`
   - Usado en: componentes de dashboard y progress

8. **`useUserProgress`**
   - Ubicación: `src/hooks/useUserProgress.js`
   - Usado en: `TeachingModule.jsx`, componentes de progress

9. **`useTeachingModule`**
   - Ubicación: `src/hooks/useTeachingModule.js`
   - Usado en: `TeachingModule.jsx`
   - Depende de: `TeachingModuleContext`

### 1.3 Datos que Vienen de Contexts

**Contextos principales:**

1. **`LearningProgressContext`** (`src/contexts/LearningProgressContext.jsx`)
   - Proporciona:
     - `progressByModule` - Progreso organizado por módulo
     - `getLessonProgress` - Obtener progreso de una lección
     - `updateLessonProgress` - Actualizar progreso
     - `markLessonComplete` - Marcar lección como completa
     - `completedLessons` - Lista de lecciones completadas
     - `flashcards` - Sistema de flashcards
     - `quizScores` - Puntuaciones de quizzes
   - Hooks internos:
     - `useTokenManager`
     - `useProgressPersistence`
     - `useProgressLoader`
     - `useProgressUpdater`
     - `useOutboxReconciliation`
   - Servicios dependientes:
     - `@/services/api/progressService`
     - `@/services/authService`
     - `@/utils/progressOutbox`

2. **`AuthContext`** (`src/contexts/AuthContext.jsx`)
   - Proporciona:
     - `user` - Usuario autenticado
     - `isAuthenticated` - Estado de autenticación
     - `login`, `logout` - Funciones de autenticación
   - Servicios dependientes:
     - `@/services/authService`

3. **`AchievementContext`** (`src/contexts/AchievementContext.jsx`)
   - Proporciona: Sistema de logros y gamificación
   - Usado en: Componentes de gamificación

4. **`NotificationContext`** (`src/contexts/NotificationContext.jsx`)
   - Proporciona: Sistema de notificaciones
   - Usado en: Varios componentes

5. **`PatientDataContext`** (`src/contexts/PatientDataContext.js`)
   - Proporciona: Datos del paciente para simulación
   - Usado en: Componentes de ventilator

6. **`TeachingModuleContext`** (`src/components/teaching/contexts/TeachingModuleContext.jsx`)
   - Proporciona: Estado del módulo de enseñanza
   - Usado en: `TeachingModule.jsx` y componentes relacionados

### 1.4 Servicios y Utilidades

**Servicios principales:**
- `src/services/api/progressService.js` - API de progreso
- `src/services/authService.js` - Autenticación
- `src/services/http.ts` - Cliente HTTP
- `src/services/ai/*` - Servicios de IA
- `src/services/progress/*` - Servicios de progreso

**Utilidades:**
- `src/utils/debug.ts` - Utilidades de debug
- `src/utils/progressOutbox.js` - Sistema de outbox para progreso
- `src/data/curriculumData.js` - Datos del currículo
- `src/data/helpers/lessonLoader.js` - Cargador de lecciones

---

## 2. ARCHIVOS ACTUALES QUE REQUIEREN MIGRACIÓN

### 2.1 Archivos en Raíz que Necesitan Moverse a `src/`

**Directorio `lib/`:**
- ✅ `frontend/lib/prisma.ts` → `frontend/src/lib/prisma.ts`
  - **Estado**: Existe duplicado en `src/lib/prisma.js`
  - **Uso**: Importado desde `app/api/progress/route.ts`, `pages/api/auth/[...nextauth].js`
  - **Importaciones**: Usa `@/lib/prisma` que resuelve a `src/lib/prisma`
  - **Nota**: Versión TypeScript más actualizada, debe reemplazar `.js`

- ✅ `frontend/lib/db-logger.ts` → `frontend/src/lib/db-logger.ts`
  - **Estado**: No existe en `src/lib/`
  - **Uso**: Importado desde `app/api/progress/route.ts`
  - **Importaciones**: Usa `@/lib/db-logger` que resuelve a `src/lib/db-logger`
  - **Dependencias**: Importa `@prisma/client`

- ✅ `frontend/lib/services/` → `frontend/src/lib/services/`
  - **Estado**: Directorio vacío, se puede eliminar

**Directorio `components/`:**
- ✅ Vacío, se puede eliminar

**Directorio `hooks/`:**
- ✅ Vacío, se puede eliminar

**Directorio `data/`:**
- ✅ Vacío, se puede eliminar

### 2.2 Archivos Duplicados/Conflictivos

1. **`prisma.ts` vs `prisma.js`:**
   - `frontend/lib/prisma.ts` (TypeScript, más reciente)
   - `frontend/src/lib/prisma.js` (JavaScript, legacy)
   - **Acción**: Mover `.ts` a `src/lib/`, eliminar `.js`

2. **`auth-config.js`:**
   - Ya existe en `src/lib/auth-config.js`
   - No necesita migración

---

## 3. MAPEO ARCHIVO ACTUAL → UBICACIÓN NUEVA

| Archivo Actual | Ubicación Nueva | Tipo | Prioridad |
|----------------|-----------------|------|-----------|
| `frontend/lib/prisma.ts` | `frontend/src/lib/prisma.ts` | TypeScript | CRÍTICA |
| `frontend/lib/db-logger.ts` | `frontend/src/lib/db-logger.ts` | TypeScript | CRÍTICA |
| `frontend/lib/services/` | Eliminar (vacío) | Directorio | BAJA |
| `frontend/components/` | Eliminar (vacío) | Directorio | BAJA |
| `frontend/hooks/` | Eliminar (vacío) | Directorio | BAJA |
| `frontend/data/` | Eliminar (vacío) | Directorio | BAJA |

**Archivos a eliminar después de migración:**
- `frontend/src/lib/prisma.js` (reemplazado por `.ts`)

---

## 4. ORDEN DE MIGRACIÓN SEGURO (Paso a Paso)

### FASE 1: Preparación (Sin cambios de código)
**Objetivo**: Verificar estado actual y preparar entorno

1. ✅ Documentar archivos actuales (ESTE DOCUMENTO)
2. ⏳ Verificar que no haya imports rotos
3. ⏳ Hacer backup del proyecto
4. ⏳ Verificar que tests pasen antes de migración

---

### FASE 2: Migración de `db-logger.ts` (Alta prioridad)
**Objetivo**: Mover `db-logger.ts` primero porque no tiene duplicados

**Paso 2.1**: Mover archivo
- Mover: `frontend/lib/db-logger.ts` → `frontend/src/lib/db-logger.ts`

**Paso 2.2**: Verificar imports
- ✅ `app/api/progress/route.ts` ya usa `@/lib/db-logger` (correcto)
- No requiere cambios de imports

**Paso 2.3**: Verificar compilación
- Ejecutar: `npm run build`
- Verificar: No hay errores de importación

**Dependencias a actualizar**: Ninguna (ya usa alias `@/`)

---

### FASE 3: Consolidación de `prisma.ts` (Alta prioridad)
**Objetivo**: Reemplazar versión JavaScript con TypeScript

**Paso 3.1**: Comparar versiones
- Comparar `lib/prisma.ts` vs `src/lib/prisma.js`
- Identificar diferencias importantes
- Verificar que la versión `.ts` tenga todas las funcionalidades

**Paso 3.2**: Mover y reemplazar
- Mover: `frontend/lib/prisma.ts` → `frontend/src/lib/prisma.ts`
- **NO eliminar** `src/lib/prisma.js` aún (por si acaso)

**Paso 3.3**: Verificar imports
- ✅ `app/api/progress/route.ts` ya usa `@/lib/prisma` (correcto)
- ✅ `pages/api/auth/[...nextauth].js` ya usa `@/lib/prisma` (correcto)
- ✅ `pages/api/auth/signup.js` ya usa `@/lib/prisma` (correcto)
- No requiere cambios de imports

**Paso 3.4**: Verificar compilación TypeScript
- Ejecutar: `npm run build`
- Verificar: TypeScript compila correctamente
- Verificar: Next.js resuelve el archivo `.ts`

**Paso 3.5**: Verificar funcionalidad
- Probar: Login funciona
- Probar: API de progreso funciona
- Probar: Conexión a base de datos funciona

**Paso 3.6**: Eliminar archivo legacy (solo después de verificar)
- Eliminar: `frontend/src/lib/prisma.js`
- Verificar: Todo sigue funcionando

**Dependencias a actualizar**: Ninguna (ya usa alias `@/`)

---

### FASE 4: Limpieza de Directorios Vacíos (Baja prioridad)
**Objetivo**: Eliminar directorios vacíos en raíz

**Paso 4.1**: Verificar que estén vacíos
- Verificar: `frontend/lib/services/` está vacío
- Verificar: `frontend/components/` está vacío
- Verificar: `frontend/hooks/` está vacío
- Verificar: `frontend/data/` está vacío

**Paso 4.2**: Eliminar directorios
- Eliminar: `frontend/lib/services/`
- Eliminar: `frontend/components/`
- Eliminar: `frontend/hooks/`
- Eliminar: `frontend/data/`

**Paso 4.3**: Verificar que no haya referencias
- Buscar en código: Referencias a estos directorios
- Verificar: No hay imports rotos

**Dependencias a actualizar**: Ninguna

---

### FASE 5: Verificación Final (Sin cambios)
**Objetivo**: Asegurar que todo funciona correctamente

**Paso 5.1**: Verificar estructura
- ✅ Todos los archivos están en `src/`
- ✅ No hay archivos duplicados
- ✅ Directorios vacíos eliminados

**Paso 5.2**: Verificar compilación
- Ejecutar: `npm run build`
- Verificar: Sin errores
- Verificar: Sin warnings importantes

**Paso 5.3**: Verificar runtime
- Probar: Aplicación inicia correctamente
- Probar: Login funciona
- Probar: Dashboard carga
- Probar: Teaching module funciona
- Probar: API routes funcionan

**Paso 5.4**: Verificar imports
- Buscar: Imports que usen rutas relativas incorrectas
- Buscar: Imports que apunten fuera de `src/`
- Verificar: Todos los imports usan alias `@/` o rutas relativas correctas

---

## 5. DEPENDENCIAS A ACTUALIZAR EN CADA PASO

### Paso 2: Migración de `db-logger.ts`
**Archivos afectados:**
- Ninguno (ya usan alias `@/`)

**Imports a actualizar:**
- Ninguno

---

### Paso 3: Consolidación de `prisma.ts`
**Archivos afectados:**
- `frontend/app/api/progress/route.ts` - Ya usa `@/lib/prisma` ✅
- `frontend/pages/api/auth/[...nextauth].js` - Ya usa `@/lib/prisma` ✅
- `frontend/pages/api/auth/signup.js` - Ya usa `@/lib/prisma` ✅

**Imports a actualizar:**
- Ninguno (todos ya usan el alias correcto)

**Archivos a eliminar:**
- `frontend/src/lib/prisma.js` (solo después de verificar que `.ts` funciona)

---

### Paso 4: Limpieza de directorios
**Archivos afectados:**
- Ninguno

**Imports a actualizar:**
- Ninguno

---

## 6. RIESGOS Y CONSIDERACIONES

### Riesgos Altos
1. **Cambio de `.js` a `.ts` para Prisma**
   - **Riesgo**: Next.js podría tener problemas resolviendo `.ts` en algunos contextos
   - **Mitigación**: Verificar compilación antes y después
   - **Rollback**: Mantener `.js` como backup hasta verificar

2. **Dependencias de `db-logger.ts` en Prisma**
   - **Riesgo**: `prisma.ts` importa `db-logger.ts`
   - **Mitigación**: Mover `db-logger.ts` primero (Fase 2), luego `prisma.ts` (Fase 3)

### Riesgos Medios
1. **Hot reload en desarrollo**
   - **Riesgo**: Cambios podrían causar problemas de hot reload
   - **Mitigación**: Reiniciar servidor de desarrollo después de cambios

2. **Cache de Next.js**
   - **Riesgo**: Next.js podría cachear rutas antiguas
   - **Mitigación**: Limpiar `.next/` después de migración

### Riesgos Bajos
1. **Directorio `lib/` vacío**
   - **Riesgo**: Ninguno si está realmente vacío
   - **Mitigación**: Verificar antes de eliminar

---

## 7. CHECKLIST DE VERIFICACIÓN

### Antes de Empezar
- [ ] Backup del proyecto completo
- [ ] Tests pasan: `npm test` (si existen)
- [ ] Build funciona: `npm run build`
- [ ] Aplicación funciona en desarrollo: `npm run dev`
- [ ] Documentado estado actual (este documento)

### Durante Migración
- [ ] Fase 2: `db-logger.ts` movido
- [ ] Fase 2: Build funciona después de mover
- [ ] Fase 3: Comparación de `prisma.ts` vs `prisma.js` realizada
- [ ] Fase 3: `prisma.ts` movido
- [ ] Fase 3: Build funciona con `.ts`
- [ ] Fase 3: Funcionalidad verificada (login, API)
- [ ] Fase 3: `prisma.js` eliminado (solo después de verificar)
- [ ] Fase 4: Directorios vacíos verificados
- [ ] Fase 4: Directorios vacíos eliminados

### Después de Migración
- [ ] Build exitoso: `npm run build`
- [ ] Dev server inicia: `npm run dev`
- [ ] Login funciona
- [ ] Dashboard carga
- [ ] Teaching module funciona
- [ ] API routes funcionan
- [ ] No hay imports rotos
- [ ] Estructura verificada
- [ ] `.next/` limpiado si es necesario

---

## 8. ORDEN DE EJECUCIÓN RECOMENDADO

```
1. FASE 1: Preparación
   └─> Verificar estado actual
   └─> Backup del proyecto
   └─> Tests iniciales

2. FASE 2: db-logger.ts
   └─> Mover archivo
   └─> Verificar imports (ninguno necesario)
   └─> Build y verificación

3. FASE 3: prisma.ts
   └─> Comparar versiones
   └─> Mover archivo
   └─> Verificar imports (ninguno necesario)
   └─> Build y verificación
   └─> Verificar funcionalidad
   └─> Eliminar prisma.js (solo después de verificar)

4. FASE 4: Limpieza
   └─> Verificar directorios vacíos
   └─> Eliminar directorios vacíos

5. FASE 5: Verificación final
   └─> Build completo
   └─> Runtime verification
   └─> Imports verification
```

---

## 9. COMANDOS ÚTILES

### Verificar imports
```bash
# Buscar imports que usen rutas incorrectas
grep -r "from ['\"]\.\./lib" frontend/
grep -r "from ['\"]\.\.\/\.\./lib" frontend/

# Buscar imports que usen @/lib (correctos)
grep -r "from ['\"]@/lib" frontend/
```

### Verificar estructura
```bash
# Ver archivos en lib/
find frontend/lib -type f
find frontend/src/lib -type f

# Ver directorios vacíos
find frontend/components frontend/hooks frontend/data -type d -empty
```

### Limpiar cache
```bash
# Limpiar cache de Next.js
rm -rf frontend/.next
rm -rf frontend/node_modules/.cache
```

### Build y verificación
```bash
# Build
cd frontend && npm run build

# Dev server
cd frontend && npm run dev

# TypeScript check (si existe)
cd frontend && npx tsc --noEmit
```

---

## 10. NOTAS ADICIONALES

### Archivos que NO requieren migración
- `frontend/app/` - Next.js App Router (debe quedarse en raíz)
- `frontend/pages/` - Next.js Pages Router (debe quedarse en raíz)
- `frontend/public/` - Archivos estáticos (debe quedarse en raíz)
- `frontend/src/` - Ya está en la ubicación correcta
- Archivos de configuración en raíz (`.json`, `.ts`, `.js`, `.mjs`)

### Estructura Final Esperada
```
frontend/
├── app/                    # Next.js App Router (raíz)
├── pages/                  # Next.js Pages Router (raíz)
├── public/                 # Archivos estáticos (raíz)
├── src/                    # TODO EL CÓDIGO FUENTE
│   ├── lib/
│   │   ├── prisma.ts       # ✅ Migrado desde lib/
│   │   ├── db-logger.ts   # ✅ Migrado desde lib/
│   │   └── auth-config.js  # ✅ Ya estaba aquí
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   ├── services/
│   ├── utils/
│   └── ... (resto)
├── lib/                    # ❌ ELIMINAR (vacío después de migración)
├── components/             # ❌ ELIMINAR (vacío)
├── hooks/                  # ❌ ELIMINAR (vacío)
└── data/                   # ❌ ELIMINAR (vacío)
```

---

## RESUMEN EJECUTIVO

**Archivos a migrar**: 2 archivos críticos
- `lib/prisma.ts` → `src/lib/prisma.ts`
- `lib/db-logger.ts` → `src/lib/db-logger.ts`

**Archivos a eliminar**: 1 archivo legacy
- `src/lib/prisma.js` (después de verificar)

**Directorios a eliminar**: 4 directorios vacíos
- `lib/services/`, `components/`, `hooks/`, `data/`

**Cambios de imports requeridos**: 0
- Todos los archivos ya usan el alias `@/` correctamente

**Riesgo**: BAJO
- Migración simple de archivos
- No hay cambios de código necesarios
- Solo mover archivos a ubicación correcta

**Tiempo estimado**: 30-60 minutos
- Incluyendo verificación y testing

---

**Estado**: ✅ PLAN COMPLETO - LISTO PARA EJECUCIÓN

