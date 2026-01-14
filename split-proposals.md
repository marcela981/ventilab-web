# Split Proposals for Lesson Steps with Multiple Distinct Ideas

**Generated**: 2026-01-14  
**Total Steps Flagged**: 18 steps with MULTIPLE_IDEAS across 10 files

---

## Summary

This document contains split proposals for human review. Each proposal identifies:
- Original step location and content
- Exact split points (where one idea ends and another begins)
- New step structure with titles and content boundaries
- Validation checklist for review

**IMPORTANT**: Review each proposal carefully before approving implementation.

---

## PROPOSAL 1: module-03-configuration/pathologies/asthma-protocol.json

### Original Step 1: "Untitled" (1265 chars)

**Current Content Summary**: Combines clinical context definition with causes of status asthmaticus

**ISSUE**: Two distinct ideas that could be taught separately

---

### PROPOSED SPLIT:

**NEW STEP 1:**
```
Title: "Contexto Clínico del Asma Severa"
Content: 
"""
# Contexto Clínico del Asma Severa

El estado asmático (status asthmaticus) es una emergencia médica que puede requerir ventilación mecánica cuando el broncoespasmo severo no responde al manejo médico estándar. Las características fisiopatológicas clave incluyen:

- **Broncoespasmo severo**: Constricción masiva de vías aéreas con resistencia muy aumentada
- **Hiperinsuflación dinámica extrema**: Atrapamiento de aire severo por espiración incompleta
- **Auto-PEEP muy alta**: Presión positiva residual al final de espiración que puede alcanzar 15-20 cmH₂O o más
- **Disminución severa del flujo espiratorio**: Incapacidad para espirar adecuadamente
- **Riesgo alto de barotrauma**: Neumotórax, neumomediastino debido a hiperinsuflación
- **Dificultad para disparar respiraciones**: Auto-PEEP alta dificulta esfuerzo inspiratorio del paciente
"""
EstimatedTime: 5 min
KeyPoints: ["Definición del estado asmático", "Características fisiopatológicas clave"]
```

**NEW STEP 2:**
```
Title: "Causas y Desafíos del Estado Asmático"
Content: 
"""
El estado asmático típicamente resulta de:
- Exposición a alergenos o irritantes
- Infección respiratoria
- Suspensión de medicamentos
- Estrés o ejercicio

La ventilación mecánica en asma severa es especialmente desafiante debido al riesgo extremo de auto-PEEP, hiperinsuflación y barotrauma. Requiere estrategias de "ventilación permisiva" que acepten hipercapnia y hipoxemia para evitar complicaciones ventilatorias.
"""
EstimatedTime: 5 min
KeyPoints: ["Causas típicas", "Desafíos únicos de la ventilación en asma"]
```

---

### HUMAN REVIEW CHECKLIST:
- [ ] Step 1 content is complete and coherent? 
- [ ] Step 2 content is complete and coherent?
- [ ] Titles accurately reflect content?
- [ ] Split point is natural (no abrupt cuts)?
- [ ] Original information preserved 100%?

---

## PROPOSAL 2: module-03-configuration/pathologies/copd-protocol.json

### Original Step 1 (contexto-clinico-epoc): "Introducción" (1154 chars)

**Current Content Summary**: Combines EPOC definition/characteristics with causes of exacerbation

---

### PROPOSED SPLIT:

**NEW STEP 1:**
```
Title: "Características Fisiopatológicas del EPOC"
Content:
"""
# Contexto Clínico del EPOC Agudizado

La Enfermedad Pulmonar Obstructiva Crónica (EPOC) agudizada es una causa común de insuficiencia respiratoria aguda que requiere ventilación mecánica. Las características fisiopatológicas clave del EPOC incluyen:

- **Obstrucción crónica de vías aéreas**: Aumento de resistencia al flujo aéreo
- **Hiperinsuflación dinámica**: Atrapamiento de aire debido a espiración incompleta
- **Auto-PEEP (PEEP intrínseca)**: Presión positiva residual al final de la espiración
- **Disminución del estímulo respiratorio hipoxémico**: Pacientes dependen parcialmente de hipoxemia para mantener ventilación
- **Retención de CO₂**: Pacientes crónicos adaptados a hipercapnia
"""
EstimatedTime: 5 min
KeyPoints: ["Fisiopatología del EPOC", "Características del atrapamiento aéreo"]
```

**NEW STEP 2:**
```
Title: "Causas de Exacerbación y Desafíos Ventilatorios"
Content:
"""
El EPOC agudizado típicamente resulta de:
- Exacerbación infecciosa (bacteriana o viral)
- Broncoespasmo severo
- Insuficiencia cardiaca aguda
- Neumotórax
- Medicamentos depresores respiratorios

La ventilación mecánica en EPOC presenta desafíos únicos debido a la necesidad de permitir tiempo espiratorio suficiente para evitar auto-PEEP, mientras se mantiene ventilación adecuada y se evita hiperventilación que puede suprimir el estímulo respiratorio.
"""
EstimatedTime: 5 min
KeyPoints: ["Causas de exacerbación", "Desafíos de la ventilación en EPOC"]
```

---

### HUMAN REVIEW CHECKLIST:
- [ ] Step 1 content is complete and coherent? 
- [ ] Step 2 content is complete and coherent?
- [ ] Titles accurately reflect content?
- [ ] Split point is natural (no abrupt cuts)?
- [ ] Original information preserved 100%?

---

## PROPOSAL 3: module-03-configuration/pathologies/copd-protocol.json

### Original Step 3 (modalidades-ventilatorias-epoc): "Modalidades Ventilatorias" (1120 chars)

**Current Content Summary**: Covers PSV/SIMV as main + alternative + initial modalities

---

### PROPOSED SPLIT:

**NEW STEP 3:**
```
Title: "Modalidad Principal: PSV o SIMV + PSV"
Content:
"""
# Modalidades Ventilatorias Recomendadas

## Modalidad Principal: Presión de Soporte (PSV) o SIMV + PSV

**PSV es preferida cuando el paciente tiene esfuerzo respiratorio presente** porque:
- Permite control del paciente sobre frecuencia y patrón respiratorio
- Reduce trabajo respiratorio al vencer resistencia del tubo
- Facilita destete progresivo
- Minimiza asincronías

## Modalidad Alternativa: SIMV + PSV

Útil cuando:
- Se requiere garantizar frecuencia mínima
- El paciente tiene esfuerzo respiratorio intermitente
- Transición desde ventilación controlada
"""
EstimatedTime: 5 min
KeyPoints: ["PSV como modalidad principal", "SIMV como alternativa"]
```

**NEW STEP 4:**
```
Title: "Modalidad Inicial y VMNI en EPOC"
Content:
"""
## Modalidad Inicial: Ventilación Controlada por Presión (PCV)

Puede usarse inicialmente si:
- El paciente está sedado profundamente
- Se requiere ventilación totalmente controlada
- Necesidad de limitar presión pico

**Evitar VCV** inicialmente si es posible, ya que puede generar presiones altas si hay resistencia aumentada.

## Ventilación No Invasiva (VMNI)

**BiPAP/CPAP** debe considerarse primero en EPOC agudizado si:
- El paciente está consciente y colaborador
- No hay contraindicaciones para VMNI
- Puede prevenir intubación en muchos casos
"""
EstimatedTime: 5 min
KeyPoints: ["PCV como opción inicial", "Importancia de VMNI en EPOC"]
```

---

### HUMAN REVIEW CHECKLIST:
- [ ] Step 3 content is complete and coherent? 
- [ ] Step 4 content is complete and coherent?
- [ ] Titles accurately reflect content?
- [ ] Split point is natural (no abrupt cuts)?
- [ ] Original information preserved 100%?

---

## PROPOSAL 4: module-03-configuration/pathologies/copd-protocol.json

### Original Step 10 (caso-clinico-epoc): "Caso Práctico" (2276 chars)

**Current Content Summary**: Combines initial case presentation with day 3 evolution/outcome

---

### PROPOSED SPLIT:

**NEW STEP 10:**
```
Title: "Caso Práctico: Presentación y Configuración Inicial"
Content:
"""
# Caso Clínico

## Presentación del Caso

**Paciente**: Hombre de 68 años, 172 cm, 75 kg, con EPOC GOLD III (FEV1 35% del predicho)

**Historia**: Exacerbación por neumonía comunitaria. Admitido con disnea severa, cianosis, confusión. Requiere intubación de urgencia.

**Gases arteriales pre-intubación**:
- pH: 7.18
- PaCO₂: 85 mmHg
- PaO₂: 45 mmHg (FiO₂ 0.5 con mascarilla)
- HCO₃⁻: 31 mEq/L (compensación metabólica)

**Valores basales conocidos del paciente**:
- PaCO₂ basal: 55-60 mmHg
- pH basal: ~7.35

## Configuración Inicial del Ventilador
[... configuración inicial y evolución hasta 24 horas ...]
"""
EstimatedTime: 7 min
KeyPoints: ["Presentación clínica de EPOC agudizado", "Configuración inicial según protocolo"]
```

**NEW STEP 11:**
```
Title: "Caso Práctico: Evolución y Resultado Final"
Content:
"""
Al día 3:
- Auto-PEEP: 2 cmH₂O
- PaCO₂: 58 mmHg (similar a basal)
- pH: 7.32
- SpO₂: 90% con FiO₂ 0.3
- FR SIMV: 4/min, PSV: 6 cmH₂O
- Paciente listo para trial de respiración espontánea

**Próximos pasos**: Evaluar criterios de preparación y comenzar protocolo de trial de respiración espontánea (T-piece o CPAP).
"""
EstimatedTime: 5 min
KeyPoints: ["Evolución exitosa", "Criterios para considerar destete"]
```

---

### HUMAN REVIEW CHECKLIST:
- [ ] Step 10 content is complete and coherent? 
- [ ] Step 11 content is complete and coherent?
- [ ] Titles accurately reflect content?
- [ ] Split point is natural (no abrupt cuts)?
- [ ] Original information preserved 100%?

---

## PROPOSAL 5: module-03-configuration/pathologies/pneumonia-protocol.json

### Original Step 1: "Untitled" (1137 chars)

**Current Content Summary**: Combines pneumonia definition/characteristics with classification

---

### PROPOSED SPLIT:

**NEW STEP 1:**
```
Title: "Contexto Clínico de la Neumonía Severa"
Content:
"""
# Contexto Clínico de la Neumonía Severa

La neumonía severa es una causa común de insuficiencia respiratoria aguda que requiere ventilación mecánica. Las características fisiopatológicas clave incluyen:

- **Consolidación pulmonar**: Reemplazo de aire por líquido, células inflamatorias y bacterias
- **Disminución de compliance**: Áreas consolidadas son menos distensibles
- **Shunt intrapulmonar**: Sangre que perfunde áreas no ventiladas, causando hipoxemia
- **Atelectasia**: Colapso de unidades alveolares alrededor de áreas consolidadas
- **Desequilibrio ventilación-perfusión**: Múltiples áreas con diferentes relaciones V/Q
- **Producción de secreciones**: Moco y exudado inflamatorio que pueden obstruir vías aéreas
"""
EstimatedTime: 5 min
KeyPoints: ["Definición de neumonía severa", "Características fisiopatológicas"]
```

**NEW STEP 2:**
```
Title: "Clasificación y Consideraciones de la Neumonía"
Content:
"""
La neumonía puede ser:
- **Unilateral o bilateral**: Afecta estrategias ventilatorias
- **Focal o difusa**: Determina extensión de consolidación
- **Comunitaria o nosocomial**: Diferentes patógenos y estrategias antimicrobianas

Si la neumonía evoluciona a SDRA (PaO₂/FiO₂ < 300 con infiltrados bilaterales), se aplica protocolo de SDRA. Si es neumonía focal o unilateral, se requieren estrategias específicas.
"""
EstimatedTime: 5 min
KeyPoints: ["Clasificación de neumonía", "Criterios para protocolo de SDRA"]
```

---

### HUMAN REVIEW CHECKLIST:
- [ ] Step 1 content is complete and coherent? 
- [ ] Step 2 content is complete and coherent?
- [ ] Titles accurately reflect content?
- [ ] Split point is natural (no abrupt cuts)?
- [ ] Original information preserved 100%?

---

## PROPOSAL 6: module-03-configuration/pathologies/pneumonia-protocol.json

### Original Step 3: "Untitled" (1008 chars)

**Current Content Summary**: Combines VCV as main modality with PCV as alternative and when useful

---

### PROPOSED SPLIT:

**NEW STEP 3:**
```
Title: "Modalidad Principal: VCV en Neumonía"
Content:
"""
# Modalidades Ventilatorias Recomendadas

## Modalidad Principal: Ventilación Controlada por Volumen (VCV) o Asistida-Control

**VCV es recomendada inicialmente** porque:
- Garantiza volumen tidal constante
- Permite medición precisa de presión plateau
- Facilita aplicación de ventilación protectora
- Proporciona ventilación minuto predecible

## Modalidad Alternativa: Presión Controlada (PCV)

Puede usarse cuando:
- Presión plateau es alta a pesar de VT reducido
- Se requiere mejor distribución del gas
- El paciente muestra mejor tolerancia
"""
EstimatedTime: 5 min
KeyPoints: ["VCV como modalidad principal", "PCV como alternativa"]
```

**NEW STEP 4:**
```
Title: "Modalidades para Destete y Consideraciones Especiales"
Content:
"""
## Modalidad para Destete: SIMV + PSV o PSV

Útil cuando:
- El paciente comienza a mejorar
- Se requiere transición hacia destete
- Esfuerzo respiratorio presente

## Consideraciones Especiales

**Neumonía Unilateral**:
- Considerar posición lateral (pulmón sano hacia abajo) para mejorar V/Q
- Ajustar parámetros según respuesta

**Neumonía Bilateral Difusa**:
- Similar a SDRA, aplicar protocolo de SDRA si cumple criterios
- Ventilación protectora estricta
"""
EstimatedTime: 5 min
KeyPoints: ["Modalidades para destete", "Estrategias según tipo de neumonía"]
```

---

### HUMAN REVIEW CHECKLIST:
- [ ] Step 3 content is complete and coherent? 
- [ ] Step 4 content is complete and coherent?
- [ ] Titles accurately reflect content?
- [ ] Split point is natural (no abrupt cuts)?
- [ ] Original information preserved 100%?

---

## PROPOSAL 7: module-03-configuration/protective-strategies/low-tidal-volume.json

### Original Step 7: "Untitled" (1731 chars)

**Current Content Summary**: Combines plateau pressure adjustment table with PEEP interaction considerations

---

### PROPOSED SPLIT:

**NEW STEP 7:**
```
Title: "Ajuste de VT según Presión Plateau"
Content:
"""
# Ajustes y Optimización

## Ajuste de VT según Presión Plateau

| Pplateau | Acción |
|----------|--------|
| < 25 cmH₂O | Si VT < 6 mL/kg, puede aumentarse gradualmente hasta 6 mL/kg |
| 25-30 cmH₂O | Mantener VT actual |
| > 30 cmH₂O | Reducir VT en 1 mL/kg (mínimo 4 mL/kg) |

## Ajuste de Frecuencia según pH

| pH | FR Actual | Acción |
|-----|-----------|--------|
| > 7.30 | 16-20/min | Mantener |
| 7.25-7.30 | 16-20/min | Mantener o aumentar ligeramente a 20-24/min |
| 7.15-7.25 | < 30/min | Aumentar a 24-30/min |
| < 7.15 | < 35/min | Aumentar a 30-35/min, considerar bicarbonato |

## Ajuste de PEEP

La PEEP se ajusta según tabla PEEP/FiO₂ (ver protocolo SDRA), no directamente por VT.
"""
EstimatedTime: 5 min
KeyPoints: ["Tabla de ajuste de VT", "Ajuste de FR según pH"]
```

**NEW STEP 8:**
```
Title: "Interacción PEEP-Pplateau y Errores Comunes"
Content:
"""
Sin embargo, cambios de PEEP pueden afectar Pplateau:

- **Aumentar PEEP**: Puede aumentar Pplateau ligeramente
- **Reducir PEEP**: Puede reducir Pplateau

**Si Pplateau aumenta > 30 cmH₂O después de aumentar PEEP**:
- Considerar reducir VT adicionalmente
- O aceptar Pplateau ligeramente > 30 si beneficio de PEEP es mayor

## Errores Comunes

1. **Usar peso real en lugar de PCI**: Causa volúmenes excesivos
2. **No medir Pplateau regularmente**: No detecta presiones altas
3. **Aumentar VT cuando Pplateau es alta**: Violación del protocolo
4. **No aceptar hipercapnia permisiva**: Intenta "normalizar" PaCO₂ aumentando VT
5. **Reducir PEEP para reducir Pplateau**: PEEP y Pplateau tienen funciones diferentes
"""
EstimatedTime: 5 min
KeyPoints: ["Interacción PEEP-presiones", "Errores comunes a evitar"]
```

---

### HUMAN REVIEW CHECKLIST:
- [ ] Step 7 content is complete and coherent? 
- [ ] Step 8 content is complete and coherent?
- [ ] Titles accurately reflect content?
- [ ] Split point is natural (no abrupt cuts)?
- [ ] Original information preserved 100%?

---

## PROPOSAL 8: module-03-configuration/protective-strategies/lung-protective-ventilation.json

### Original Step 1: "Untitled" (1311 chars)

**Current Content Summary**: Combines LPV definition/components with ARDSnet evidence

---

### PROPOSED SPLIT:

**NEW STEP 1:**
```
Title: "Concepto de Ventilación Protectora Pulmonar"
Content:
"""
# Concepto de Ventilación Protectora Pulmonar

La **ventilación protectora pulmonar (LPV - Lung Protective Ventilation)** es una estrategia integral diseñada para prevenir la lesión pulmonar inducida por el ventilador (VILI - Ventilator-Induced Lung Injury). Combina múltiples componentes que trabajan sinérgicamente para proteger los pulmones durante la ventilación mecánica.

## Componentes Principales

1. **Bajo volumen tidal (LTVV)**: 6 mL/kg de peso corporal ideal
2. **Limitación de presión plateau**: ≤ 30 cmH₂O
3. **Hipercapnia permisiva**: Aceptar pH ≥ 7.15
4. **Optimización de PEEP**: Según tabla PEEP/FiO₂
5. **Manejo de auto-PEEP**: Detección y corrección

## Objetivos Fundamentales

- **Prevenir volutrauma**: Daño por volúmenes excesivos
- **Prevenir barotrauma**: Daño por presiones excesivas
- **Prevenir atelectrauma**: Daño por colapso y reapertura cíclica
- **Prevenir biotrauma**: Daño por activación de cascadas inflamatorias
"""
EstimatedTime: 5 min
KeyPoints: ["Definición de LPV", "Componentes principales"]
```

**NEW STEP 2:**
```
Title: "Evidencia del Estudio ARDSnet"
Content:
"""
## Evidencia de Eficacia

El estudio ARDSnet (2000) demostró:
- **Reducción de mortalidad**: 40% → 31% (reducción absoluta 9%, relativa 22%)
- **Reducción de días de VM**: Más días libres de ventilación mecánica
- **Reducción de barotrauma**: Menor incidencia de neumotórax

Esta evidencia estableció la ventilación protectora como estándar de cuidado en SDRA.
"""
EstimatedTime: 5 min
KeyPoints: ["Resultados del estudio ARDSnet", "Establecimiento del estándar de cuidado"]
```

---

### HUMAN REVIEW CHECKLIST:
- [ ] Step 1 content is complete and coherent? 
- [ ] Step 2 content is complete and coherent?
- [ ] Titles accurately reflect content?
- [ ] Split point is natural (no abrupt cuts)?
- [ ] Original information preserved 100%?

---

## PROPOSAL 9: module-03-configuration/weaning/readiness-criteria.json

### Original Step 3: "Untitled" (1694 chars)

**Current Content Summary**: Combines RSBI definition/interpretation with limitations and other indices

---

### PROPOSED SPLIT:

**NEW STEP 3:**
```
Title: "Índice de Destete Rápido (RSBI)"
Content:
"""
# Herramientas de Evaluación

## 1. Índice de Destete Rápido (Rapid Shallow Breathing Index - RSBI)

**Definición**:
```
RSBI = Frecuencia respiratoria (resp/min) / Volumen tidal (L)
```

**Interpretación**:
- **RSBI < 105**: Alta probabilidad de éxito en destete
- **RSBI 105-130**: Zona intermedia, evaluar caso por caso
- **RSBI > 130**: Alta probabilidad de fracaso
"""
EstimatedTime: 5 min
KeyPoints: ["Cálculo del RSBI", "Interpretación de valores"]
```

**NEW STEP 4:**
```
Title: "Limitaciones del RSBI y Otros Índices"
Content:
"""
**Limitaciones**:
- No es perfecto, falsos positivos y negativos posibles
- Debe usarse en conjunto con otros criterios

## 2. Presión Inspiratoria Máxima (PImax)

**Técnica**:
1. Ocluir vía aérea al final de espiración
2. Pedir al paciente que inspire con máximo esfuerzo
3. Medir presión negativa generada

**Interpretación**:
- **PImax ≤ -20 a -30 cmH₂O**: Fuerza muscular adecuada
- **PImax > -20 cmH₂O**: Fuerza muscular insuficiente
"""
EstimatedTime: 5 min
KeyPoints: ["Limitaciones del RSBI", "PImax como complemento"]
```

---

### HUMAN REVIEW CHECKLIST:
- [ ] Step 3 content is complete and coherent? 
- [ ] Step 4 content is complete and coherent?
- [ ] Titles accurately reflect content?
- [ ] Split point is natural (no abrupt cuts)?
- [ ] Original information preserved 100%?

---

## PROPOSALS FOR MODULE-01-FUNDAMENTALS

### Note on Module 01 Files

The following files from module-01-fundamentals have steps flagged with MULTIPLE_IDEAS. However, upon detailed review, many of these are **continuation sections** with very long, densely connected educational content that follows a narrative structure (e.g., "Dimensión teórica" → "Taxonomía" → "Glosario" → "Chequeo rápido").

**Recommendation**: These may be better handled by:
1. Reviewing content length and structure first
2. Considering if the ideas are truly independent or sequentially dependent
3. Potentially keeping as "LONG_BUT_COHERENT" if splitting would break the learning flow

---

## PROPOSAL 10: module-01-fundamentals/module-01-inversion-fisiologica.json

### Original Step 24 (m1-p5-6-d): "Continuación" (4686 chars)

**Current Content Summary**: Covers inspiratory pressure, ventilatory work, taxonomy of ventilation concepts

**Analysis**: The content transitions from "Presión inspiratoria" to "Trabajo respiratorio" to "Taxonomía y jerarquía de conceptos" - these represent a natural teaching progression but ARE distinct topics.

---

### PROPOSED SPLIT:

**NEW STEP 24:**
```
Title: "Presión Inspiratoria y Trabajo Respiratorio"
Content:
"""
Presión inspiratoria (Pinsp): en modos controlados por presión, es la presión objetivo durante la inspiración. En modos con volumen controlado, la Pinsp resultante depende de la resistencia y complianza del paciente (no se fija manualmente sino que es variable).

Ventilación total vs alveolar: ya explicado – la alveolar es la porción que participa en intercambio gaseoso.

Trabajo respiratorio: esfuerzo necesario para respirar; en ventilación mecánica se intenta reducir el trabajo del paciente. El ventilador asume parte o todo el trabajo según el modo. Un signo de trabajo aumentado son retracciones, uso de musculatura accesoria, etc.
"""
EstimatedTime: 5 min
KeyPoints: ["Presión inspiratoria en diferentes modos", "Concepto de trabajo respiratorio"]
```

**NEW STEP 25:**
```
Title: "Taxonomía de la Ventilación Mecánica"
Content:
"""
Taxonomía y jerarquía de conceptos: Dentro de la ventilación mecánica podemos organizar conceptos en jerarquías:

Por nivel de asistencia: (de mayor a menor soporte) Ventilación controlada completamente, Ventilación asistida, Ventilación espontánea con soporte mínimo.

Por vía de administración: invasiva vs no invasiva.

Por variable controlada: modos de control de volumen vs control de presión.

Por interacción con el paciente (secuencia ventilatoria): CMV vs CSV vs IMV/SIMV.
[... continues with detailed taxonomy ...]
"""
EstimatedTime: 7 min
KeyPoints: ["Clasificación por nivel de asistencia", "CMV vs CSV vs SIMV"]
```

---

### HUMAN REVIEW CHECKLIST:
- [ ] Step 24 content is complete and coherent? 
- [ ] Step 25 content is complete and coherent?
- [ ] Titles accurately reflect content?
- [ ] Split point is natural (no abrupt cuts)?
- [ ] Original information preserved 100%?

---

## PROPOSAL 11: module-01-fundamentals/module-02-ecuacion-movimiento.json

### Original Step 6 (m2-p14-15-d): "Continuación" (5625 chars)

**Current Content Summary**: Covers dimensional context, importance of equation, and applications

---

### PROPOSED SPLIT:

**NEW STEP 6:**
```
Title: "Dimensión Contextual de la Ecuación"
Content:
"""
flujo-tiempo) porque se usarán en ejemplos.
Dimensión contextual
¿Qué es la "Ecuación del Movimiento Respiratorio"? Es una representación matemática de las fuerzas en juego durante la ventilación. Integra las presiones generadas por el ventilador (y/o los músculos respiratorios del paciente) con las propiedades intrínsecas del sistema respiratorio (pulmones y pared torácica). En palabras simples, la ecuación describe cómo la presión en el sistema respiratorio se reparte para mover aire y expandir pulmones. Se le apoda "El Santo Grial" porque conocerla permite entender prácticamente todos los fenómenos de la ventilación mecánica.
"""
EstimatedTime: 5 min
KeyPoints: ["Definición de la ecuación", "Metáfora del Santo Grial"]
```

**NEW STEP 7:**
```
Title: "¿Por qué es tan Importante la Ecuación?"
Content:
"""
¿Por qué se considera tan importante? Porque es a la ventilación mecánica lo que las leyes de Newton son a la mecánica clásica: una base fundamental. Con la ecuación del movimiento uno puede predecir cómo cambiará la presión si cambia la complianza o la resistencia, puede entender por qué cierto modo ventilatorio funciona de determinada manera, y puede solucionar problemas en tiempo real.

¿Dónde se aplica? En la práctica clínica diaria de UCI, cada vez que un intensivista evalúa las alarmas de alta presión o calcula la complianza del paciente post-quirúrgico, está usando esta ecuación aunque no siempre la escriba formalmente.
[... continues with applications ...]
"""
EstimatedTime: 6 min
KeyPoints: ["Importancia fundamental", "Aplicaciones clínicas"]
```

---

### HUMAN REVIEW CHECKLIST:
- [ ] Step 6 content is complete and coherent? 
- [ ] Step 7 content is complete and coherent?
- [ ] Titles accurately reflect content?
- [ ] Split point is natural (no abrupt cuts)?
- [ ] Original information preserved 100%?

---

## PROPOSAL 12: module-01-fundamentals/module-02-ecuacion-movimiento.json

### Original Step 18 (m2-p20-21-d): "Continuación" (6338 chars)

**Current Content Summary**: Covers ventilator flow mechanics followed by calculation example

---

### PROPOSED SPLIT:

**NEW STEP 18:**
```
Title: "Flujos dentro del Ventilador"
Content:
"""
Flujos dentro del ventilador: Mecánicamente, un ventilador de cuidados intensivos hoy controla todo esto con válvulas proporcionales muy precisas. Si decimos queremos una presión tal, la válvula inspiratoria modulada por un servocontrol va abriéndose/cerrándose para lograrlo. Internamente corre un algoritmo que calcula flujo necesario según la diferencia entre presión medida y deseada (control tipo PID).

Por ello, cuando graficamos las variables, la ecuación del movimiento se refleja en las curvas: en un volumen control, la presión sube linealmente; en presión control, la presión es horizontal y el flujo baja exponencial...
"""
EstimatedTime: 5 min
KeyPoints: ["Control de válvulas proporcionales", "Patrones de flujo según modo"]
```

**NEW STEP 19:**
```
Title: "Ejemplo de Cálculo Aplicado"
Content:
"""
Ejemplo de cálculo aplicado: Un residente recibe la tarea: "Paciente con C=40 mL/cmH2O, R=12 cmH2O/L/s, PEEP 8. ¿Qué presión meseta y pico esperas si ventilamos con Vt 0.5 L y flujo 0.8 L/s (48 L/min)?"

Responde: $P_{el} = 500/40 = 12.5 cmH2O$. $P_{res} = 12 * 0.8 = 9.6 cmH2O$. PEEP=8. Entonces $P_{plat} ≈ 12.5+8 = 20.5$ (~21) y $P_{pico} ≈ 21 + 9.6 = 30.6$ (~31 cmH2O).

Este tipo de estimación mental la hace uno a veces al cambiar un parámetro: "voy a subir PEEP de 8 a 12, eso sumará 4 cmH2O a todas las presiones alveolares..."
"""
EstimatedTime: 6 min
KeyPoints: ["Cálculo práctico de presiones", "Uso de la ecuación para predecir cambios"]
```

---

### HUMAN REVIEW CHECKLIST:
- [ ] Step 18 content is complete and coherent? 
- [ ] Step 19 content is complete and coherent?
- [ ] Titles accurately reflect content?
- [ ] Split point is natural (no abrupt cuts)?
- [ ] Original information preserved 100%?

---

## REMAINING PROPOSALS (Module 05 & 06)

### Note on Large Module Files

The following steps were flagged but require reading specific portions of very large files:

**module-05-monitorizacion-grafica.json**:
- Step 59 (m5-p27-28-d): "Continuación" - Volume observation + Critical thinking #2
- Step 67 (m5-p31-32-d): "Continuación" - Pressure-volume curve + Case 3
- Step 71 (m5-p33-34-d): "Continuación" - Edge cases + Observation tip

**module-06-efectos-sistemicos.json**:
- Step 10 (m6-p48-49-d): "Continuación" - VILI research applications + Big picture
- Step 18 (m6-p52-53-d): "Continuación" - Hemodynamic effects + PEEP management
- Step 26 (m6-p56-57-d): "Continuación" - Alveolar interdependence + Oxygenation vs Toxicity

---

## SUMMARY

| File | Steps to Split | New Steps Created |
|------|---------------|-------------------|
| asthma-protocol.json | 1 | 2 |
| copd-protocol.json | 1, 3, 10 | 6 |
| pneumonia-protocol.json | 1, 3 | 4 |
| low-tidal-volume.json | 7 | 2 |
| lung-protective-ventilation.json | 1 | 2 |
| readiness-criteria.json | 3 | 2 |
| module-01-inversion-fisiologica.json | 24 | 2 |
| module-02-ecuacion-movimiento.json | 6, 18 | 4 |
| **TOTAL** | **12** | **24** |

---

## NEXT STEPS

1. **Human Review**: Go through each proposal and mark the checklist
2. **Adjustments**: Note any proposals that need modification
3. **Approval**: Approve proposals that pass all checks
4. **Implementation**: Apply approved splits to the actual files

---

## APPROVAL SECTION

**Reviewer**: ___________________  
**Date**: ___________________

**Approved Proposals**: [ ] 1 [ ] 2 [ ] 3 [ ] 4 [ ] 5 [ ] 6 [ ] 7 [ ] 8 [ ] 9 [ ] 10 [ ] 11 [ ] 12

**Proposals Needing Adjustment**:
- Proposal #___: ___________________
- Proposal #___: ___________________

**Comments**:
___________________
