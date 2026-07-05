## Arquitectura del proyecto

La arquitectura de este proyecto sigue un **patrón fractal**: cada módulo, feature o carpeta relevante replica la misma estructura interna.

- **Carpeta `UI` obligatoria**:  
  - Cada carpeta de dominio/feature debe contener una subcarpeta llamada `UI`.  
  - Dentro de `UI` se gestionan exclusivamente los estilos (`.css`, u hojas de estilo asociadas).  
  - **No se definen estilos directamente en React** (ni CSS-in-JS, ni estilos embebidos en componentes). Toda la presentación se organiza en la subcarpeta `UI`.

## Principios de diseño

El código del proyecto sigue estos principios:

- **SOLID**: diseño orientado a objetos modular, extensible y fácil de mantener.
- **KISS (Keep It Simple, Stupid)**: preferimos soluciones simples y claras frente a complejidad innecesaria.
- **YAGNI (You Aren't Gonna Need It)**: evitamos implementar funcionalidad que no sea necesaria hoy, incluso si podría ser útil en el futuro.

Estos principios deben guiar las decisiones de arquitectura, la organización de carpetas y la implementación de nuevas funcionalidades.
