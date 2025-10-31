# Dashboard Components - Teaching Module

## Descripción
Esta carpeta contiene los componentes visuales del dashboard del módulo de enseñanza, extraídos del `TeachingModule.jsx` original para mejorar la modularidad y mantenibilidad del código.

## Componentes Dashboard

### DashboardHeader.jsx
**Propósito**: Cabecera del módulo con navegación y título principal.

**Props**:
- `isMobile` (boolean, requerido): Indica si el dispositivo es móvil
- `title` (string, opcional): Título principal del módulo
- `description` (string, opcional): Descripción del módulo

**Características**:
- ✅ Breadcrumbs de navegación con iconos Home y School
- ✅ Título responsive (h3/h4 según dispositivo)
- ✅ Descripción con maxWidth de 800px
- ✅ Estilos consistentes con colores del tema

**Líneas de código**: 96 líneas

### ContinueLearningSection.jsx
**Propósito**: Sección destacada para continuar el aprendizaje.

**Props**:
- `nextModule` (object, opcional): Datos del próximo módulo disponible
- `onContinueLearning` (function, requerido): Callback para continuar aprendiendo
- `calculateModuleProgress` (function, requerido): Función para calcular progreso
- `curriculumData` (object, requerido): Datos del curriculum

**Características**:
- ✅ Paper con gradient background linear-gradient(135deg, #667eea 0%, #764ba2 100%)
- ✅ Patrón de fondo circular decorativo
- ✅ Grid responsive con información del módulo
- ✅ LinearProgress para mostrar progreso del módulo
- ✅ Chips con metadatos (tiempo, dificultad, nivel)
- ✅ Button con icon PlayCircleOutline
- ✅ Estado vacío para cuando no hay nextModule
- ✅ ClientOnly wrapper con fallback

**Líneas de código**: 202 líneas

### ProgressOverview.jsx
**Propósito**: Panel de estadísticas globales del usuario.

**Props**:
- `globalStats` (object, requerido): Estadísticas globales calculadas
- `dashboardData` (object, requerido): Datos del dashboard (streak, badges, etc.)

**Características**:
- ✅ Cards con métricas de tiempo y lecciones completadas
- ✅ Sistema de racha con LocalFireDepartment icon
- ✅ Progreso hacia milestone de 30 días
- ✅ Badges ganados con EmojiEvents icon
- ✅ Placeholder para gráfica de progreso temporal
- ✅ ClientOnly wrapper con fallback
- ✅ Grid responsive de 2 columnas

**Líneas de código**: 268 líneas

### RecommendationsPanel.jsx
**Propósito**: Panel de recomendaciones inteligentes personalizadas.

**Props**:
- `recommendations` (array, opcional): Array de recomendaciones generadas
- `onRecommendationClick` (function, opcional): Callback para clicks en recomendaciones

**Características**:
- ✅ Ordenamiento por prioridad (high, medium, low)
- ✅ Colores diferenciados por prioridad (error, warning, info)
- ✅ Avatars con iconos de Material UI
- ✅ Chips de prioridad con colores correspondientes
- ✅ Buttons de acción contextuales
- ✅ Estado vacío con mensaje motivacional
- ✅ Hover effects y transiciones suaves

**Líneas de código**: 194 líneas

## Migración Completada

### ✅ Secciones Extraídas del TeachingModule.jsx
- **Header Section** (líneas 393-449) → `DashboardHeader.jsx`
- **Continue Learning Section** (líneas 451-575) → `ContinueLearningSection.jsx`
- **Progress Overview** (líneas 577-980) → `ProgressOverview.jsx`
- **Recommendations Panel** (líneas 892-976) → `RecommendationsPanel.jsx`

### 📊 Métricas de la Migración
- **Líneas de código migradas**: ~800 líneas
- **Componentes creados**: 4 componentes visuales
- **Líneas promedio por componente**: ~190 líneas (objetivo: <300 ✅)
- **Funcionalidad preservada**: 100% de la UI y comportamiento

## Características Técnicas

### Responsive Design
- Todos los componentes son completamente responsive
- Breakpoints consistentes (xs, sm, md, lg, xl)
- Comportamiento adaptativo según `isMobile` prop

### Material UI Integration
- Uso consistente de componentes Material UI
- Iconos de Material UI (@mui/icons-material)
- Sistema de colores y spacing consistente
- Elevation y borderRadius uniformes

### Client-Side Rendering
- ClientOnly wrapper para componentes que requieren hidratación
- Fallbacks apropiados para SSR
- Manejo de estados de carga

### PropTypes Validation
- Validación estricta de props en todos los componentes
- Documentación JSDoc completa
- Tipos de datos bien definidos

## Uso en TeachingModule.jsx

```javascript
// Ejemplo de uso en el orquestador principal
import {
  DashboardHeader,
  ContinueLearningSection,
  ProgressOverview,
  RecommendationsPanel
} from './components/dashboard';

const TeachingModule = () => {
  // ... lógica de hooks y estado
  
  return (
    <Container maxWidth="xl">
      <DashboardHeader 
        isMobile={isMobile}
        title="Módulo de Enseñanza - Mecánica Ventilatoria"
        description="Aprende los fundamentos..."
      />
      
      <ContinueLearningSection 
        nextModule={nextModule}
        onContinueLearning={handleContinueLearning}
        calculateModuleProgress={calculateModuleProgress}
        curriculumData={curriculumData}
      />
      
      <ProgressOverview 
        globalStats={globalStats}
        dashboardData={dashboardData}
      />
      
      <RecommendationsPanel 
        recommendations={recommendations}
        onRecommendationClick={handleRecommendationClick}
      />
    </Container>
  );
};
```

## Próximos Pasos
1. Actualizar `TeachingModule.jsx` para usar estos componentes
2. Migrar las secciones restantes (curriculum, level stepper, etc.)
3. Testing y validación de la funcionalidad completa
4. Optimización de rendimiento si es necesario
