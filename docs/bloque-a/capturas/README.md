<!--
* Funcionalidad: Capturas de referencia del Bloque A (curvas y disposición de Monitoreo)
* Descripción: Índice de las capturas del registro de validación del Bloque A: curvas de la consola de julio en VCV, PCV, PSV y un caso con auto-PEEP a 1920×1080, y el Monitoreo digital a 1280×720 y 1920×1080 para comprobar el tamaño del logo de VentyLab. Explica cómo se generaron (e2e/bloque-a/capturas.spec.ts con E2E_CAPTURES=1), con qué casos y ajustes, y qué mirar en cada una.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
-->

# Capturas de referencia del Bloque A

Tomadas el 2026-11-05 con Playwright (Chromium) sobre el build de producción de la rama `feat/ajustes-a-simulador`
(`next start` en :3110) contra el backend del Bloque A (`wt-a-server`, motor 2.0.0, base `ventylab_a`) y el LLM falso.
Usuario: el estudiante de la semilla demo. Cada captura se toma después de unos 12 s de simulación a ×1 para que la
ventana de 10 s muestre respiraciones estables.

Regenerarlas:

```bash
E2E_CAPTURES=1 E2E_BASE_URL=http://localhost:3110 E2E_API_URL=http://localhost:4110 \
  npx playwright test --project=e2e e2e/bloque-a/capturas.spec.ts
```

## Curvas (1920×1080)

| Archivo | Caso y ajustes | Qué mirar |
|---|---|---|
| `curvas-vcv-1920.png` | Pulmón normal (`engine-normal-lung`), VCV con los ajustes del caso | Flujo cuadrado, presión con pico y meseta, volumen en rampa; PEEP de base |
| `curvas-pcv-1920.png` | La misma sesión después de "Presión control" | Presión en escalón (sin tiempo de subida, brecha documentada en el §2.1 del diseño), flujo desacelerado exponencial |
| `curvas-psv-1920.png` | La misma sesión después de "Más modos" → PSV | Ciclado por porcentaje del flujo pico; el caso no tiene esfuerzo del paciente, así que aparece la alarma de apnea y respira el respaldo |
| `curvas-auto-peep-1920.png` | Exacerbación de EPOC (`engine-copd-exacerbation`) con la FR subida a 30 rpm | El flujo espiratorio no vuelve a cero antes del siguiente ciclo, la tarjeta Auto-PEEP marca "Alto" y aparece la alarma de auto-PEEP |

## Disposición de Monitoreo

| Archivo | Viewport | Qué mirar |
|---|---|---|
| `monitoreo-1280.png` | 1280×720 | Logo de VentyLab más chico (encargo A4) sin quitar alto a las curvas; columna izquierda con el estado del paciente bajo "Paciente activo" |
| `monitoreo-1920.png` | 1920×1080 | Lo mismo a 1920; las tarjetas incluyen FC (lpm) cuando el caso tiene evolución del paciente |

Los valores clínicos de estas capturas son del simulador educativo, no de pacientes reales; los parámetros de la
evolución quedan pendientes de validación experta (registro en `ventylab-server/docs/cierre/validacion-contenido.md`,
sección "Bloque A").
