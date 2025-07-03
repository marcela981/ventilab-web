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

## Instalación Rápida

```bash
npm install
npm run dev
```

Accede a [http://localhost:3000](http://localhost:3000) para usar la aplicación.

---

**Nota**: Este proyecto es de naturaleza educativa y de investigación. No está destinado para uso clínico real sin las certificaciones médicas correspondientes. Proyecto realizado en la Universidad del Valle - 2025
