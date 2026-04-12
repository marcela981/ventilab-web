# Lista de Tareas Frontend - Módulo de Edición In-Place (ventilab-web)

A continuación, la división táctica de las mejoras requeridas sobre React para los modos de administración. Todas las funcionalidades asumen una Arquitectura Fractal y se construirán con módulos y ficheros `.css` dedicados.

### 1. Refactor Base de Estilos y Permisos (Architectural Setup)
- [x] Incorporar el bypass de disponibilidad: Alterar `useModuleAvailability` y componentes anidados (ej. `ModuleProgressCard.jsx`) para que usuarios `TEACHER` y `ADMIN` devuelvan desbloqueo total, removiendo bloqueos UI ("Completa el anterior").
- [x] Preparar carpetas `ui/` en el feature de *Enseñanza*: Emigrar la lógica visual a archivos `.css` aislando las dependencias CSS-in-JS o mui-system agresivas adheridos a principios SOLID y KISS.

### 2. Estructuras de Renderizado Fantasma (Ghost UI)
- [x] Construir componente `<GhostAccordion />` en su propia carpeta `ui/`: Acordeón transparente con línea discontinua y botón `+`, renderizándose al final de elementos listables de currículum con tope máximo de profundidad a 3 niveles.
- [x] Construir componente `<GhostCard />` en su propia carpeta `ui/`: Tarjeta delimitada por border dashed al final de la iteración en lecciones, emitiendo un evento instantáneo de creación al interactuar.

### 3. Drag and Drop y Reordenamiento
- [x] Instalar o adaptar infraestructura Drag y Drop (`@hello-pangea/dnd` u homólogo compatible) envolviendo la lista del árbol del currículum y cards.
- [x] Diseñar bloque `DragHandle` de 6 puntos visible exclusivamente si se detecta que se habilitó la visualización de Editor.
- [x] Corrección: Ghost UI y DragHandle inyectados en componentes existentes (LevelStepper, ModuleGrid), sin panel separado.

### 4. Componente: Modal de Dependencias (Prerequisites)
- [x] Agregar el switch de 'Dependencia' en el encabezado de las ActionCards.
- [x] Construir UI `<DependencyModal />` separada en columnas ("Contenido" vs "Depende de").
- [x] Desarrollar interacciones (Selectors/Checklists listando la currícula adyacente para poder llenar la columna "Depende de").

### 5. Meta-Data Panel UI (Tags, Tiempos, Emojis)
- [x] Incorporar `EmojiPicker` (nativo o light-weight library) e insertarlo anexado a las secciones de Título.
- [x] Generar e integrar componentes de Píldoras (Badges) tipo `<TagBadge />` ("Fácil", "Principiante") modificables.
- [x] Implementar casillero editable general de Tiempos Estimados en min. en cards con posible "lift-up" de datos hacia los acordeones.

### 6. Lección Editor "Notion-Style"
- [x] Alterar visualizador `LessonViewer.jsx`: Establecer la compuerta contextual que divida la renderización entre el modo Secuencial-Pasos vs Scroll-Vertical Documento (si ocurre `isEditMode`).
- [x] Diseñar el bloque flotante de inyección (Menu comando `/` o botón circular) interactivo para añadir `RichText`, `MiniQuiz` o `Simulador`.
- [x] Integrar un botón unificado en el pie del documento como "Guardar Progreso" dedicado a la interacción del estudiante en este nuevo Canvas.
