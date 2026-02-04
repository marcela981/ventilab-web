# 📋 Guía de Variables de Entorno - VentyLab Frontend

## 📁 Archivos de Entorno

### `.env.local` (Desarrollo Local)
- ✅ **Este archivo ya está creado y configurado**
- Contiene las variables para desarrollo local
- **NO se sube a git** (está en `.gitignore`)
- Sobrescribe las variables de `.env`

### `.env` (Desarrollo Base)
- Variables base para desarrollo
- Puede subirse a git si no contiene secretos
- Es sobrescrito por `.env.local`

### `.env.production` (Producción)
- Variables para producción
- Usado cuando `NODE_ENV=production`
- **NO debe contener secretos** (usa variables de entorno del hosting)

### `.env.local.example` (Template)
- Template para crear `.env.local`
- Puede subirse a git como referencia
- No contiene valores reales

## 🔑 Variables Importantes

### `NEXT_PUBLIC_API_URL`
**CRÍTICO:** Debe terminar con `/api`

```env
# ✅ CORRECTO
NEXT_PUBLIC_API_URL="http://localhost:3001/api"

# ❌ INCORRECTO
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

**Por qué:** El backend expone las rutas bajo `/api`, por lo que todas las peticiones deben incluir este prefijo.

### `NEXTAUTH_URL`
Debe coincidir con la URL donde corre Next.js:

```env
# Desarrollo
NEXTAUTH_URL="http://localhost:3000"

# Producción
NEXTAUTH_URL="https://tu-dominio.com"
```

### `DATABASE_URL`
URL de conexión a PostgreSQL para NextAuth:

```env
DATABASE_URL="postgresql://usuario:password@host:puerto/database?schema=public"
```

## 🚀 Configuración Rápida

### 1. Desarrollo Local

El archivo `.env.local` ya está creado con los valores correctos. Solo necesitas:

```powershell
# Verificar que existe
Test-Path .env.local

# Si no existe, copia el template
Copy-Item .env.local.example .env.local

# Edita con tus valores
notepad .env.local
```

### 2. Producción (Vercel/Netlify/etc.)

Configura las variables de entorno en el panel de tu hosting:

```
NEXT_PUBLIC_API_URL=https://tu-backend.com/api
NEXTAUTH_URL=https://tu-dominio.com
NEXTAUTH_SECRET=tu-secret-de-produccion
DATABASE_URL=tu-database-url-de-produccion
```

## 🔍 Verificación

### Verificar Variables Cargadas

```powershell
# En el navegador (consola)
console.log(process.env.NEXT_PUBLIC_API_URL)

# Debe mostrar: http://localhost:3001/api
```

### Verificar que las Peticiones Usen la URL Correcta

1. Abre DevTools → Network
2. Navega a una lección
3. Verifica que las peticiones tengan `/api`:
   - ✅ `http://localhost:3001/api/progress/lesson/...`
   - ❌ `http://localhost:3001/progress/lesson/...`

## 🛠️ Troubleshooting

### Problema: Las peticiones no tienen `/api`

**Solución:**
1. Verifica que `.env.local` tenga `NEXT_PUBLIC_API_URL con /api`
2. Reinicia el servidor Next.js: `npm run dev`
3. Limpia el caché: `Remove-Item -Recurse -Force .next`

### Problema: NextAuth no funciona

**Solución:**
1. Verifica que `NEXTAUTH_SECRET` esté configurado
2. Verifica que `NEXTAUTH_URL` coincida con la URL del frontend
3. Verifica que `DATABASE_URL` sea correcta y la BD esté accesible

### Problema: Variables no se cargan

**Solución:**
1. Las variables `NEXT_PUBLIC_*` solo están disponibles después de reiniciar
2. Asegúrate de que el archivo se llame exactamente `.env.local` (no `.env.local.txt`)
3. Verifica que no haya espacios alrededor del `=`

## 📝 Notas Importantes

1. **Variables `NEXT_PUBLIC_*`**: Son accesibles en el cliente (navegador)
2. **Otras variables**: Solo disponibles en el servidor (API routes, Server Components)
3. **Prioridad**: `.env.local` > `.env` > `.env.production`
4. **Seguridad**: Nunca subas `.env.local` a git (contiene secretos)

## 🔗 Archivos Relacionados

- `.env.local` - Variables de desarrollo local (creado)
- `.env.local.example` - Template para otros desarrolladores
- `src/services/api/progressService.js` - Usa `NEXT_PUBLIC_API_URL`
- `lib/auth.ts` - Usa `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
