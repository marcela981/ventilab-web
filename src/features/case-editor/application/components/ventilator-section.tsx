/*
* Funcionalidad: Case editor initial ventilator settings section
* Descripción: "Ajustes iniciales del ventilador" of the case editor: the shared VentilatorConsole in its `configure`
*   variant with exactly the controls the student sees in a session (mode selector and parameters through the shared
*   engine ↔ console binding; min/max from the vendored ventilator limits, steps from the same binding), with no
*   engine behind it: no frames, no metrics, no alarms. "Aplicar" writes the confirmed mode and values into the draft
*   settings. The enum settings that are not console controls (flow pattern, trigger type, SIMV mandatory breath) are
*   selects below. A case without initial settings offers "Definir ajustes iniciales" (engine defaults) and the settings
*   can be removed again. The engine validation error (e.g. too short an expiratory time) shows here. The section sees
*   only its block and is memoized, so typing elsewhere in the case does not re-render the console. Depends on MUI,
*   the shared ventilator console, the sim-engine and its console binding, the design-system FormField, the draft
*   entity, the section frame and the CSS Module.
*   v1.1 (review of 50ed812): `onPendingChange` forwards the console report of edits not applied yet, so the page
*   counts them as unsaved and blocks the save until they are applied or discarded.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { memo, useMemo } from "react";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import { DEFAULT_VENTILATOR_SETTINGS, FLOW_PATTERNS, MANDATORY_BREATH_TYPES, TRIGGER_TYPES } from "@shared/sim-engine";
import type { FlowPattern, MandatoryBreathType, TriggerType, VentilatorSettings } from "@shared/sim-engine";
import {
  applicabilityFor,
  buildConsoleLimits,
  MODE_OPTIONS,
  toConsoleSettings,
  toSettingsChanges,
} from "@shared/sim-engine/console-binding";
import { VentilatorConsole } from "@shared/ventilator-console";
import type { ConsoleConfirmation, ConsoleFrameSource, VentilatorConsoleAdapter } from "@shared/ventilator-console";
import { mergeVentilatorChanges } from "../entities/case-draft.entity";
import { EditorSection } from "./editor-section";
import styles from "../../UI/case-editor.module.css";

// TODO(i18n): move to a case-editor namespace in src/i18n.
export const VENTILATOR_COPY = {
  description: "Configura el ventilador con los mismos controles que verá el estudiante. Ajusta y pulsa «Aplicar» para guardarlo en el borrador.",
  none: "El caso no tiene ajustes iniciales: la sesión empezará con los valores por defecto del motor.",
  define: "Definir ajustes iniciales",
  remove: "Quitar ajustes iniciales",
  flowPattern: "Patrón de flujo",
  triggerType: "Tipo de disparo",
  simvMandatoryType: "Respiraciones obligatorias en SIMV",
} as const;

const FLOW_PATTERN_LABELS = { SQUARE: "Cuadrado", DECELERATING: "Desacelerado" } as const satisfies Record<FlowPattern, string>;
const TRIGGER_LABELS = { FLOW: "Por flujo", PRESSURE: "Por presión" } as const satisfies Record<TriggerType, string>;
const MANDATORY_LABELS = { VCV: "Volumen control", PCV: "Presión control" } as const satisfies Record<MandatoryBreathType, string>;
const NATIVE_SELECT = { select: { native: true }, inputLabel: { shrink: true } } as const;

/** No engine in the editor: the curves never receive samples. */
const NO_FRAMES: ConsoleFrameSource = { sourceId: "case-editor", subscribe: () => () => undefined };

export function buildConfigureAdapter(
  settings: VentilatorSettings,
  onConfirm: (confirmation: ConsoleConfirmation) => void,
  disabled = false,
  onPendingChange?: (pending: boolean) => void,
): VentilatorConsoleAdapter {
  const values = toConsoleSettings(settings);

  return {
    ...(onPendingChange ? { onPendingChange } : {}),
    frames: NO_FRAMES,
    settings: { current: values, applied: values },
    mode: { current: settings.mode, options: MODE_OPTIONS },
    metrics: {},
    patient: { values: {} },
    alarms: [],
    permissions: { canControl: !disabled },
    limits: buildConsoleLimits(settings),
    onConfirm,
    capabilities: { maneuvers: false },
  };
}

export type VentilatorSectionProps = {
  /** null: the case has no initial settings. */
  settings: VentilatorSettings | null
  error: string | undefined
  onChange: (settings: VentilatorSettings | null) => void
  /** Console edits not applied yet ("Aplicar"): the page counts them as unsaved. */
  onPendingChange?: ((pending: boolean) => void) | undefined
  disabled: boolean
};

function VentilatorSectionView({ settings, error, onChange, onPendingChange, disabled }: VentilatorSectionProps) {
  const adapter = useMemo(
    () => (settings
      ? buildConfigureAdapter(
        settings,
        (confirmation) => onChange(mergeVentilatorChanges(settings, toSettingsChanges(confirmation))),
        disabled,
        onPendingChange,
      )
      : null),
    [disabled, onChange, onPendingChange, settings],
  );
  const applicability = settings ? applicabilityFor(settings) : undefined;

  if (!settings || !adapter) {
    return (
      <EditorSection id="ventilator">
        <p className={cx(styles.muted)}>{VENTILATOR_COPY.none}</p>
        <Button variant="outlined" disabled={disabled} onClick={() => onChange({ ...DEFAULT_VENTILATOR_SETTINGS })}>
          {VENTILATOR_COPY.define}
        </Button>
      </EditorSection>
    );
  }

  const setEnum = (changes: Partial<VentilatorSettings>) => onChange(mergeVentilatorChanges(settings, changes));

  return (
    <EditorSection id="ventilator" description={VENTILATOR_COPY.description}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <div className={cx(styles.consoleFrame)}>
        <VentilatorConsole adapter={adapter} variant="configure" alarmsSlot={null} {...(applicability ? { applicability } : {})} />
      </div>
      <div className={cx(styles.formGrid)}>
        <FormField
          select
          label={VENTILATOR_COPY.flowPattern}
          value={settings.flowPattern}
          disabled={disabled}
          onChange={(event) => setEnum({ flowPattern: event.target.value as FlowPattern })}
          slotProps={NATIVE_SELECT}
        >
          {FLOW_PATTERNS.map((pattern) => <option key={pattern} value={pattern}>{FLOW_PATTERN_LABELS[pattern]}</option>)}
        </FormField>
        <FormField
          select
          label={VENTILATOR_COPY.triggerType}
          value={settings.triggerType}
          disabled={disabled}
          onChange={(event) => setEnum({ triggerType: event.target.value as TriggerType })}
          slotProps={NATIVE_SELECT}
        >
          {TRIGGER_TYPES.map((trigger) => <option key={trigger} value={trigger}>{TRIGGER_LABELS[trigger]}</option>)}
        </FormField>
        <FormField
          select
          label={VENTILATOR_COPY.simvMandatoryType}
          value={settings.simvMandatoryType}
          disabled={disabled}
          onChange={(event) => setEnum({ simvMandatoryType: event.target.value as MandatoryBreathType })}
          slotProps={NATIVE_SELECT}
        >
          {MANDATORY_BREATH_TYPES.map((type) => <option key={type} value={type}>{MANDATORY_LABELS[type]}</option>)}
        </FormField>
      </div>
      <div>
        <Button color="inherit" disabled={disabled} onClick={() => onChange(null)}>{VENTILATOR_COPY.remove}</Button>
      </div>
    </EditorSection>
  );
}

export const VentilatorSection = memo(VentilatorSectionView);
