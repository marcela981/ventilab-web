# Inputs Numéricos - VentyLab

Componentes de entrada numérica basados en el diseño de Figma Rectangle 9.

## Componentes Disponibles

### 1. NumericInput (CSS Puro)
Componente de input numérico con estilos personalizados basados exactamente en el diseño de Figma.

#### Características:
- Dimensiones: 160px × 42px (tamaño mediano optimizado)
- Fondo: `rgba(23, 21, 21, 0.3)` (tono #171515)
- Borde: `1px solid #171515`
- Sombra interna: `inset 0px 2px 4px rgba(0, 0, 0, 0.3)`
- Border radius: `5px`

#### Props:
```jsx
{
  value: string | number,
  onChange: (event) => void,
  placeholder?: string,
  min?: number,
  max?: number,
  step?: number,
  disabled?: boolean,
  error?: boolean,
  helperText?: string,
  label?: string,
  unit?: string,
  className?: string,
  style?: object,
  ...htmlInputProps
}
```

#### Ejemplo de uso:
```jsx
import { NumericInput } from '../components/inputs';

<NumericInput
  value={frequency}
  onChange={handleFrequencyChange}
  label="Frecuencia Respiratoria"
  unit="bpm"
  min={12}
  max={60}
  helperText="Respiraciones por minuto"
/>
```

### 2. NumericInputMUI (Material-UI)
Componente basado en MUI TextField con los mismos estilos del diseño de Figma.

#### Ventajas:
- Mejor accesibilidad
- Animaciones incluidas
- Integración con formularios MUI
- Validación incorporada

#### Ejemplo de uso:
```jsx
import { NumericInputMUI } from '../components/inputs';

<NumericInputMUI
  value={pressure}
  onChange={handlePressureChange}
  label="PEEP"
  helperText="Presión positiva al final de la espiración"
  error={pressure > 25}
  min={5}
  max={25}
/>
```

## Variantes de Tamaño

### NumericInput CSS
```jsx
// Pequeño
<NumericInput className="numeric-input--small" />

// Normal (por defecto)
<NumericInput />

// Grande
<NumericInput className="numeric-input--large" />

// Fluido (se adapta al contenedor)
<NumericInput className="numeric-input--fluid" />
```

## Casos de Uso Específicos para Ventiladores

### Parámetros de Presión
```jsx
<NumericInput
  label="PEEP"
  unit="cmH₂O"
  min={5}
  max={25}
  step={1}
/>
```

### Parámetros de Volumen
```jsx
<NumericInput
  label="Volumen Tidal"
  unit="mL"
  min={300}
  max={800}
  step={10}
/>
```

### Parámetros de Oxígeno
```jsx
<NumericInput
  label="FiO₂"
  unit="%"
  min={21}
  max={100}
  step={1}
/>
```

### Parámetros de Frecuencia
```jsx
<NumericInput
  label="Frecuencia Respiratoria"
  unit="bpm"
  min={12}
  max={60}
  step={1}
/>
```

## Estados del Componente

### Estado Normal
```jsx
<NumericInput value="50" onChange={handleChange} />
```

### Estado de Error
```jsx
<NumericInput 
  value="999" 
  onChange={handleChange}
  error={true}
  helperText="Valor fuera del rango permitido"
/>
```

### Estado Deshabilitado
```jsx
<NumericInput 
  value="100" 
  onChange={handleChange}
  disabled={true}
  helperText="Campo bloqueado"
/>
```

## Validación

Los componentes incluyen validación básica de números:
- Solo acepta valores numéricos
- Respeta los límites min/max
- Permite valores vacíos durante la edición
- Mantiene el valor anterior si se ingresa texto no válido

## Responsive

Los componentes son responsive y se adaptan a diferentes tamaños de pantalla:
- En móvil: Se ajustan al ancho del contenedor
- Mantienen la proporción y legibilidad
- Las unidades se redimensionan apropiadamente

## Testing

Incluye un componente `InputsTest` para probar todas las variantes:

```jsx
import { InputsTest } from '../components/inputs';

// En tu página de desarrollo
<InputsTest />
```

## Accesibilidad

- Soporte completo para lectores de pantalla
- Navegación por teclado
- Estados de foco visibles
- Relación semántica entre label, input y helper text
- Colores que cumplen con WCAG 