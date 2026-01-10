# Ventilab Web - Interfaz Web para Respirador

## Descripción

Ventilab Web es una aplicación web desarrollada como parte de la materia práctica de investigación II que tiene como objetivo crear la interfaz web de un respirador mecánico. Esta aplicación representa un prototipo educativo y de aprendizaje que simula el funcionamiento y control de un ventilador médico a través de una interfaz web moderna.

## Objetivo del Proyecto

Este aplicativo web es parte de una investigación académica que busca desarrollar una interfaz de usuario intuitiva y funcional para el control y monitoreo de un respirador mecánico especifico. El proyecto tiene como finalidad:

- Demostrar la viabilidad de interfaces web para dispositivos médicos
- Proporcionar una plataforma de aprendizaje para estudiantes y profesionales de Salud
- Sentar las bases para futuras integraciones con inteligencia artificial

## Funcionalidades Principales

### Dashboard de Control
La aplicación cuenta con un dashboard completo que permite:
- **Control de Parámetros**: Ajuste en tiempo real de variables como volumen tidal, frecuencia respiratoria, presión positiva al final de la espiración (PEEP), entre otros
- **Monitoreo en Tiempo Real**: Visualización de curvas de presión, flujo y volumen
- **Simulador de Paciente**: Interfaz para configurar parámetros fisiológicos del paciente
- **Indicadores de Cumplimiento**: Validación automática de parámetros según estándares médicos

### Cálculos Matemáticos
El sistema implementa algoritmos complejos para:
- **Cálculo de Cumplimiento Pulmonar**: Determinación automática de la distensibilidad del sistema respiratorio
- **Procesamiento de Señales**: Análisis de curvas de presión y flujo en tiempo real
- **Validación de Parámetros**: Verificación matemática de rangos seguros para cada variable
- **Simulación de Respuesta**: Modelado de la respuesta del paciente a diferentes configuraciones

### Componentes Técnicos
- **Comunicación Serial**: Interfaz para conexión con hardware real
- **Procesamiento de Datos**: Algoritmos de filtrado y análisis de señales
- **Gráficos Avanzados**: Visualización de curvas respiratorias y loops
- **Sistema de Alertas**: Notificaciones automáticas para parámetros fuera de rango

## Arquitectura

La aplicación está construida con:
- **Next.js**: Framework React para el frontend
- **Hooks Personalizados**: Lógica de negocio modularizada
- **Context API**: Gestión de estado global
- **Componentes Reutilizables**: Arquitectura modular para fácil mantenimiento

## Estado del Proyecto

Este es un aplicativo web sencillo y de aprendizaje que actualmente incluye:
- Simulación completa del funcionamiento de un respirador
- Interfaz de usuario intuitiva y responsive
- Cálculos matemáticos precisos para parámetros médicos
- Sistema de validación y alertas

### Futuras Integraciones
El proyecto está diseñado para evolucionar hacia:
- **Integración con IA**: Implementación de algoritmos de machine learning para optimización automática de parámetros
- **Conectividad IoT**: Comunicación con dispositivos médicos reales
- **Telemedicina**: Funcionalidades para monitoreo remoto

## Arquitectura de Microservicios

El proyecto está organizado como un monorepo con dos microservicios independientes:

```
ventilab-web/
├── frontend/          # Aplicación Next.js (Puerto 3000)
├── backend/           # API REST (Puerto 3001)
└── package.json       # Gestión del monorepo
```

## Instalación Rápida

### Opción 1: Instalación completa (Recomendado)
```bash
npm run install:all
```

### Opción 2: Instalación manual
```bash
# Instalar dependencias del monorepo
npm install

# Instalar dependencias del frontend
cd frontend
npm install

# Instalar dependencias del backend
cd ../backend
npm install
```

## Ejecución en Desarrollo

### Ejecutar todos los servicios
```bash
npm run dev
```

### Ejecutar servicios individualmente
```bash
# Solo frontend
npm run dev:frontend

# Solo backend
npm run dev:backend
```

Accede a:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:3001](http://localhost:3001)

## Build y Producción

```bash
# Build de todos los servicios
npm run build

# Iniciar todos los servicios en producción
npm start
```

---

**Nota**: Este proyecto es de naturaleza educativa y de investigación. No está destinado para uso clínico real sin las certificaciones médicas correspondientes. Proyecto realizado en la Universidad del Valle - 2025
