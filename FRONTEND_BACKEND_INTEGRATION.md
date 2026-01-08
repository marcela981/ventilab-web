# Integración Frontend-Backend - VentyLab

Esta guía explica cómo el frontend se conecta con el nuevo backend Express.

## Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto frontend con:

```env
# URL del backend Express
NEXT_PUBLIC_API_URL=http://localhost:3001

# NextAuth Configuration (apunta al backend)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu-secret-aleatorio-aqui

# Google OAuth (si se usa)
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

## Servicios de API

### httpClient.js

Cliente HTTP centralizado que:
- Configura URL base desde `NEXT_PUBLIC_API_URL`
- Incluye automáticamente token de autenticación
- Maneja errores de red consistentemente
- Implementa retry logic (3 intentos)
- Redirige a login en errores 401
- Configura headers apropiados (Content-Type, Authorization)

**Uso:**
```javascript
import httpClient from '@/service/api/httpClient';

const data = await httpClient.get('/api/progress/overview');
const result = await httpClient.post('/api/cases/123/evaluate', { configuration });
```

### progressService.js

Servicio para gestión de progreso:
- `getProgressOverview()` - Overview de progreso
- `getModuleProgress(moduleId)` - Progreso de módulo
- `getLessonProgress(lessonId)` - Progreso de lección
- `completeLesson(lessonId)` - Completar lección
- `getUserStats()` - Estadísticas del usuario

**Endpoints consumidos:**
- `GET /api/progress/overview`
- `GET /api/progress/modules/:id`
- `GET /api/progress/lessons/:id`
- `POST /api/progress/lessons/:id/complete`

### evaluationService.js

Servicio para evaluación de casos clínicos:
- `getCases(filters)` - Listar casos con filtros
- `getCaseById(caseId)` - Obtener caso específico
- `evaluateCase(caseId, configuration)` - Evaluar configuración
- `getCaseAttempts(caseId)` - Historial de intentos

**Endpoints consumidos:**
- `GET /api/cases`
- `GET /api/cases/:id`
- `POST /api/cases/:id/evaluate`
- `GET /api/cases/:id/attempts`

## Hook useApiClient

Hook para integrar NextAuth con el cliente API:

```javascript
import { useApiClient } from '@/hooks/useApiClient';

function MyComponent() {
  const { isAuthenticated, isLoading, session } = useApiClient();
  
  // El hook configura automáticamente el token en httpClient
  // cuando hay una sesión activa
}
```

## Páginas

### /evaluation

Lista de casos clínicos disponibles:
- Muestra casos con filtros
- Indica si el usuario ya intentó cada caso
- Muestra mejor score obtenido
- Redirige a `/evaluation/[caseId]` al seleccionar

### /evaluation/[caseId]

Página de evaluación de caso:
- Muestra información completa del caso
- Formulario para ingresar configuración del ventilador
- Al submit, evalúa y muestra resultados:
  - Score obtenido
  - Comparación parámetro por parámetro
  - Retroalimentación de IA
  - Configuración experta (después de evaluar)
  - Mejora vs intentos anteriores

## Autenticación

El frontend usa NextAuth para autenticación. El token JWT se obtiene de la sesión y se incluye automáticamente en los requests.

**Nota:** Si NextAuth está configurado para usar el backend Express, asegúrate de que:
1. `NEXTAUTH_URL` apunte a la URL del frontend
2. `NEXTAUTH_SECRET` sea el mismo en frontend y backend
3. Los callbacks de NextAuth estén configurados correctamente

## Manejo de Errores

Todos los servicios retornan objetos con estructura consistente:

```javascript
{
  success: boolean,
  data: any,
  error: string | null
}
```

Los componentes deben verificar `success` antes de usar `data`.

## Próximos Pasos

1. Configurar NextAuth para obtener token JWT de la sesión
2. Actualizar componentes existentes para usar los nuevos servicios
3. Agregar manejo de loading y error states en componentes
4. Implementar refresh token si es necesario

