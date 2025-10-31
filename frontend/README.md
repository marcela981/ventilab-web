# VentiLab Frontend

Frontend de la aplicación VentiLab construido con Next.js.

## Tecnologías Principales

- **Next.js 15.3.3** - Framework de React
- **React 19** - Biblioteca de UI
- **Material-UI (MUI)** - Componentes de UI
- **Chart.js** - Visualización de datos
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos

## Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start

# Linting
npm run lint
```

## Estructura del Proyecto

```
frontend/
├── src/
│   ├── components/      # Componentes React
│   ├── contexts/        # Context API
│   ├── hooks/          # Custom hooks
│   ├── constants/      # Constantes
│   └── data/           # Datos estáticos
├── pages/              # Páginas de Next.js
├── public/             # Archivos estáticos
└── package.json
```

## Variables de Entorno

Crea un archivo `.env.local` con las siguientes variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).
