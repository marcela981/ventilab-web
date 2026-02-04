# 📝 Instrucciones: Actualizar NEXT_PUBLIC_API_URL

## 🔍 Problema Identificado

Tu archivo `.env` tiene:
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"  ❌ Falta /api
```

Debería ser:
```env
NEXT_PUBLIC_API_URL="http://localhost:3001/api"  ✅
```

## ✅ Solución Automática

Ejecuta el script de actualización:

```powershell
cd c:\Marcela\TESIS\ventilab-web
.\actualizar-env.ps1
```

Este script actualizará automáticamente:
- `.env`
- `.env.local` (si existe)
- Verificará `.env.production`

## 🔧 Solución Manual

Si prefieres hacerlo manualmente:

### 1. Editar `.env`

Abre `c:\Marcela\TESIS\ventilab-web\.env` y cambia:

**Antes:**
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

**Después:**
```env
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

### 2. Editar `.env.local` (si existe)

Si tienes un archivo `.env.local`, actualízalo también:

```env
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

### 3. Para Producción

En `.env.production` o en las variables de entorno de tu plataforma de hosting (Vercel, etc.), asegúrate de que:

```env
NEXT_PUBLIC_API_URL="https://tu-backend.com/api"
```

## 🔄 Después de Actualizar

1. **Reinicia el servidor Next.js:**
   ```powershell
   # Detén el servidor (Ctrl+C)
   # Luego reinicia:
   npm run dev
   ```

2. **Verifica que funcione:**
   - Abre DevTools → Network
   - Navega a una lección
   - Verifica que las peticiones tengan `/api` en la URL:
     - ✅ `http://localhost:3001/api/progress/lesson/...`
     - ❌ `http://localhost:3001/progress/lesson/...`

## 📋 Nota Importante

Aunque he corregido la función `buildUrl` en el código para que agregue `/api` automáticamente si falta, es mejor tener la variable de entorno correcta desde el inicio para evitar problemas.

## 🔗 Archivos Relacionados

- `.env` - Variables de entorno (desarrollo)
- `.env.local` - Variables de entorno locales (sobrescribe .env)
- `.env.production` - Variables de entorno de producción
- `src/services/api/progressService.js` - Función `buildUrl` corregida
