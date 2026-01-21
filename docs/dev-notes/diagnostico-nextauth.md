# 🔍 Diagnóstico: NextAuth 404 - /api/auth/session

## ✅ Verificaciones Realizadas

### 1. Archivo de Configuración
- ✅ **Archivo existe:** `pages/api/auth/[...nextauth].js`
- ✅ **Configuración correcta:** Importa `authOptions` de `lib/auth.ts`
- ✅ **Adaptador Prisma:** Configurado correctamente

### 2. Dependencias
- ✅ `next-auth`: ^4.24.13
- ✅ `@next-auth/prisma-adapter`: ^1.0.7
- ✅ `@prisma/client`: ^6.19.2`

### 3. Configuración de Next.js
- ✅ `next.config.ts` no bloquea rutas `/api/auth/*`
- ✅ Rewrites solo afectan `/backend/*`, no `/api/*`

## 🔧 Soluciones Posibles

### Solución 1: Verificar que el servidor Next.js esté corriendo

```powershell
cd c:\Marcela\TESIS\ventilab-web
npm run dev
```

Luego verifica que la ruta esté disponible:
- Abre: http://localhost:3000/api/auth/session
- Debería retornar JSON (vacío si no hay sesión, o datos de sesión si estás autenticado)

### Solución 2: Verificar variables de entorno

Asegúrate de que `.env.local` tenga:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu-secret-aqui
DATABASE_URL=postgresql://...
```

### Solución 3: Limpiar caché de Next.js

```powershell
cd c:\Marcela\TESIS\ventilab-web
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev
```

### Solución 4: Verificar que Prisma esté generado

```powershell
cd c:\Marcela\TESIS\ventilab-web
npx prisma generate
```

### Solución 5: Verificar logs del servidor

Cuando ejecutes `npm run dev`, revisa los logs para ver si hay errores relacionados con:
- Prisma Client
- NextAuth
- Variables de entorno faltantes

## 🧪 Test Manual

1. **Iniciar servidor:**
   ```powershell
   cd c:\Marcela\TESIS\ventilab-web
   npm run dev
   ```

2. **Probar endpoint directamente:**
   - Abre: http://localhost:3000/api/auth/session
   - Debería retornar: `{}` si no hay sesión
   - O datos de sesión si estás autenticado

3. **Probar desde el navegador (consola):**
   ```javascript
   fetch('/api/auth/session')
     .then(r => r.json())
     .then(console.log)
   ```

## 🐛 Errores Comunes

### Error: "Cannot find module '@prisma/client'"
**Solución:**
```powershell
npx prisma generate
```

### Error: "NEXTAUTH_SECRET is missing"
**Solución:**
Agrega a `.env.local`:
```env
NEXTAUTH_SECRET=tu-secret-generado
```

Genera un secret:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Error: "Prisma Client is not generated"
**Solución:**
```powershell
npx prisma generate
```

### Error: "Database connection failed"
**Solución:**
Verifica que `DATABASE_URL` en `.env.local` sea correcta y que la BD esté corriendo.

## 📝 Checklist de Verificación

- [ ] Servidor Next.js está corriendo (`npm run dev`)
- [ ] Archivo `pages/api/auth/[...nextauth].js` existe
- [ ] Archivo `lib/auth.ts` existe y exporta `authOptions`
- [ ] Variables de entorno configuradas (`.env.local`)
- [ ] Prisma Client generado (`npx prisma generate`)
- [ ] Base de datos accesible
- [ ] No hay errores en la consola del servidor
- [ ] La ruta `/api/auth/session` responde (no 404)

## 🔗 Archivos Relacionados

- `pages/api/auth/[...nextauth].js` - Handler de NextAuth
- `lib/auth.ts` - Configuración de NextAuth
- `lib/prisma.ts` - Cliente Prisma
- `.env.local` - Variables de entorno
- `next.config.ts` - Configuración de Next.js
