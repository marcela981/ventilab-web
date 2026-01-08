# Log de Migración - VentyLab

**Fecha de migración:** 13 de Diciembre, 2025
**Proyecto frontend:** ventilab-web
**Proyecto backend:** ventylab-server

---

## Resumen Ejecutivo

El proyecto VentyLab ha sido restructurado en una arquitectura de **monorepo con proyectos separados**:

- **ventilab-web/** - Frontend Next.js (este directorio)
- **ventylab-server/** - Backend Express + TypeScript + Prisma (nuevo)

---

## Estado Anterior

El proyecto `ventilab-web` era un **frontend puro de Next.js**:

- ❌ No tenía backend separado
- ❌ No tenía base de datos
- ❌ No tenía API routes de Next.js
- ✅ Solo era una SPA con estado en memoria
- ✅ Usaba servicios de IA del cliente (Google Gemini)
- ✅ No tenía persistencia de datos

---

## Qué se Creó (Backend Nuevo)

Se creó un **nuevo backend** en `ventylab-server/` con:

### Base de Datos (Prisma + PostgreSQL)
- 13 modelos de datos
- User, Account, Session, VerificationToken (NextAuth)
- Module, Lesson, Progress, Quiz, QuizAttempt, Achievement
- ClinicalCase, ExpertConfiguration, EvaluationAttempt

### Servicios
- **Autenticación:** NextAuth con Google OAuth y Credentials
- **Progreso:** Tracking de progreso, XP, niveles, logros
- **Evaluación:** Casos clínicos, comparación de configuraciones, feedback de IA
- **IA:** GeminiProvider (implementado), OpenAI/Claude/Ollama (plantillas)

### Endpoints API
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login
- `GET /api/users/me` - Perfil de usuario
- `GET /api/progress/overview` - Overview de progreso
- `GET /api/progress/modules/:id` - Progreso de módulo
- `POST /api/progress/lessons/:id/complete` - Completar lección
- `GET /api/cases` - Listar casos clínicos
- `POST /api/cases/:id/evaluate` - Evaluar configuración
- Y más...

---

## Qué se Modificó (Frontend)

Se agregaron al frontend:

### Nuevos Servicios de API
- `src/service/api/httpClient.js` - Cliente HTTP centralizado
- `src/service/api/progressService.js` - Servicio de progreso
- `src/service/api/evaluationService.js` - Servicio de evaluación

### Nuevos Hooks
- `src/hooks/useApiClient.js` - Hook para integrar NextAuth con httpClient

### Nuevas Páginas
- `pages/evaluation.js` - Lista de casos clínicos
- `pages/evaluation/[caseId].jsx` - Evaluación de caso específico

### Documentación
- `FRONTEND_BACKEND_INTEGRATION.md` - Guía de integración

---

## Qué se Eliminó

**❌ NADA** - El proyecto original no tenía backend para eliminar.

---

## Qué se Mantuvo en Frontend

### Servicios de IA del Cliente
Los siguientes archivos se **mantienen** en el frontend para uso directo del cliente:

- `src/service/ai/AIServiceManager.js`
- `src/service/ai/providers/GeminiProvider.js`
- `src/service/ai/FallbackManager.js`
- `src/service/ai/PromptTemplateManager.js`
- `src/service/ai/ResponseParser.js`
- `src/service/ai/providers/OpenAIProvider.js`
- `src/service/ai/providers/ClaudeProvider.js`
- `src/service/ai/providers/OllamaProvider.js`

**Razón:** Estos servicios permiten al frontend usar IA directamente (ej: análisis en tiempo real) sin pasar por el backend.

### Constantes y Utilidades de IA
- `src/constants/ai/` - Configuraciones de modelos, templates, etc.
- `src/utils/ai/` - Utilidades para formatear y validar respuestas

---

## Estructura de Proyectos

```
C:\Marcela\TESIS\
├── ventilab-web/          # Frontend Next.js
│   ├── pages/             # Páginas Next.js
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── hooks/         # Hooks personalizados
│   │   ├── service/
│   │   │   ├── ai/        # Servicios de IA del cliente
│   │   │   └── api/       # Servicios para consumir backend
│   │   └── ...
│   └── package.json       # Dependencias frontend
│
└── ventylab-server/       # Backend Express + TypeScript
    ├── prisma/
    │   └── schema.prisma  # Schema de base de datos
    ├── src/
    │   ├── config/        # Configuración (Prisma, Auth, AI)
    │   ├── controllers/   # Controladores REST
    │   ├── middleware/    # Middleware (auth, errors)
    │   ├── routes/        # Rutas de API
    │   ├── services/      # Lógica de negocio
    │   ├── types/         # Tipos TypeScript
    │   └── index.ts       # Punto de entrada
    └── package.json       # Dependencias backend
```

---

## Instrucciones para Desarrolladores

### Requisitos
- Node.js 18+
- PostgreSQL 14+
- npm o yarn

### Instalación

```bash
# Clonar repositorio
cd C:\Marcela\TESIS

# Instalar dependencias del frontend
cd ventilab-web
npm install

# Instalar dependencias del backend
cd ../ventylab-server
npm install

# Generar cliente Prisma
npx prisma generate

# Crear base de datos (requiere PostgreSQL corriendo)
npx prisma migrate dev --name init
```

### Variables de Entorno

**Frontend (`ventilab-web/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu-secret-aqui
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret
```

**Backend (`ventylab-server/.env`):**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/ventylab
NEXTAUTH_SECRET=tu-secret-aqui
NEXTAUTH_URL=http://localhost:3001
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret
GEMINI_API_KEY=tu-gemini-api-key
FRONTEND_URL=http://localhost:3000
PORT=3001
NODE_ENV=development
```

### Ejecutar en Desarrollo

```bash
# Terminal 1: Backend (puerto 3001)
cd ventylab-server
npm run dev

# Terminal 2: Frontend (puerto 3000)
cd ventilab-web
npm run dev
```

### Acceder a la Aplicación

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Prisma Studio:** http://localhost:5555 (ejecutar `npx prisma studio` en ventylab-server)

---

## Verificación Post-Migración

### ✅ Verificar Backend

```bash
cd ventylab-server

# Verificar que el servidor inicia
npm run dev

# Verificar endpoint de salud
curl http://localhost:3001/health
# Debería retornar: {"status":"ok","message":"Servidor funcionando correctamente"}
```

### ✅ Verificar Frontend

```bash
cd ventilab-web

# Verificar que el frontend inicia
npm run dev

# Acceder a http://localhost:3000
# Verificar que la aplicación carga sin errores
```

### ✅ Verificar Conexión Frontend-Backend

1. Abrir DevTools en el navegador
2. Ir a Network tab
3. Navegar a `/evaluation`
4. Verificar que los requests a `http://localhost:3001/api/*` respondan correctamente

---

## Próximos Pasos

1. **Configurar Base de Datos de Producción**
   - Crear base de datos PostgreSQL en producción
   - Configurar variables de entorno

2. **Configurar NextAuth**
   - Crear proyecto en Google Cloud Console
   - Obtener Client ID y Secret
   - Configurar callbacks de OAuth

3. **Agregar Datos de Seed**
   - Agregar módulos y lecciones de ejemplo
   - Agregar casos clínicos de prueba
   - Ejecutar `npm run prisma:seed`

4. **Deploy**
   - Frontend: Vercel
   - Backend: Railway, Render, o servidor propio
   - Base de datos: Supabase, Railway, o PostgreSQL propio

---

## Documentación Adicional

Ver en `ventylab-server/`:
- `BACKEND_CHECKLIST.md` - Checklist de verificación del backend
- `BACKEND_COMPARISON_REPORT.md` - Comparación de estructuras
- `PRISMA_SCHEMA_COMPARISON_REPORT.md` - Análisis del schema Prisma
- `SERVICES_MIGRATION_REPORT.md` - Estado de migración de servicios
- `CONTROLLERS_ROUTES_MIGRATION_REPORT.md` - Estado de controladores y rutas
- `FRONTEND_BACKEND_DEPENDENCIES_REPORT.md` - Dependencias frontend-backend
- `CLEANUP_PLAN.md` - Plan de limpieza (no fue necesario)

---

## Contacto

Para preguntas sobre la migración, revisar la documentación o contactar al equipo de desarrollo.

---

*Documento generado automáticamente durante la migración del proyecto VentyLab.*



