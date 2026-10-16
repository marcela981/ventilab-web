/*
* Funcionalidad: Case editor mechanics section
* Descripción: "Mecánica y fisiología" of the case editor, exactly the fields of ClinicalCaseMechanicsDTO grouped as
*   respiratory mechanics (C, R, VD, basal shunt), metabolism and gas exchange (VCO2, HCO3, hemoglobin, a-v O2
*   difference, time constants), patient effort, hemodynamic effect and progressive deterioration, plus the
*   recruitment curve (shunt fraction by PEEP, ascending PEEP; rows added and removed) and the initial blood gases
*   (ClinicalCaseInitialStateDTO). Every value shows its plausible range from the vendored backend ranges; the block is
*   saved complete or not at all, as the contract requires. Depends on MUI, the case editor config, draft entity,
*   fields, section frame and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import { memo } from "react";
import { cx } from "@shared/lib/class-names";
import { INITIAL_STATE_FIELDS, MECHANICS_GROUPS, RECRUITMENT_FIELDS } from "../config/case-editor.config";
import { addCurvePoint, removeCurvePoint, updateCurvePoint } from "../entities/case-draft.entity";
import { NumericField } from "./case-fields";
import { EditorSection } from "./editor-section";
import { sameSectionProps } from "./section-props";
import type { SectionWithKeysProps } from "./section-props";
import styles from "../../UI/case-editor.module.css";

// TODO(i18n): move to a case-editor namespace in src/i18n.
export const MECHANICS_COPY = {
  description: "Los valores de mecánica se guardan completos o vacíos: un caso simulable necesita todos.",
  curve: "Curva de reclutamiento (shunt según PEEP)",
  curveHelp: "PEEP ascendente; el motor interpola el shunt entre puntos.",
  curveEmpty: "Sin puntos: el shunt no depende de la PEEP.",
  addPoint: "Agregar punto",
  removePoint: (index: number) => `Quitar punto ${index}`,
  point: (index: number) => `Punto ${index}`,
  initialState: "Gases arteriales iniciales",
} as const;

function MechanicsSectionView({ draft, errors, update, disabled, newKey }: SectionWithKeysProps) {
  return (
    <EditorSection id="mechanics" description={MECHANICS_COPY.description}>
      {MECHANICS_GROUPS.map((group) => (
        <fieldset key={group.id} className={cx(styles.group)}>
          <legend className={cx(styles.groupTitle)}>{group.title}</legend>
          <div className={cx(styles.formGrid)}>
            {group.fields.map((field) => (
              <NumericField
                key={field.path}
                definition={field}
                value={draft.mechanics[field.path] ?? ""}
                disabled={disabled}
                error={errors[field.path]}
                onChange={(value) => update((current) => ({ ...current, mechanics: { ...current.mechanics, [field.path]: value } }))}
              />
            ))}
          </div>
        </fieldset>
      ))}
      <fieldset className={cx(styles.group)}>
        <legend className={cx(styles.groupTitle)}>{MECHANICS_COPY.curve}</legend>
        <p className={cx(styles.muted)}>{MECHANICS_COPY.curveHelp}</p>
        {draft.recruitmentCurve.length === 0 ? <p className={cx(styles.muted)}>{MECHANICS_COPY.curveEmpty}</p> : null}
        <ol className={cx(styles.rows)}>
          {draft.recruitmentCurve.map((point, index) => {
            const base = `mechanics.recruitmentCurve.${point.key}`;

            return (
              <li key={point.key} className={cx(styles.row)} aria-label={MECHANICS_COPY.point(index + 1)}>
                <NumericField
                  definition={RECRUITMENT_FIELDS.peepCmH2O}
                  value={point.peepCmH2O}
                  disabled={disabled}
                  error={errors[`${base}.peepCmH2O`]}
                  onChange={(peepCmH2O) => update((current) => updateCurvePoint(current, point.key, { peepCmH2O }))}
                />
                <NumericField
                  definition={RECRUITMENT_FIELDS.shuntFraction}
                  value={point.shuntFraction}
                  disabled={disabled}
                  error={errors[`${base}.shuntFraction`]}
                  onChange={(shuntFraction) => update((current) => updateCurvePoint(current, point.key, { shuntFraction }))}
                />
                <IconButton
                  aria-label={MECHANICS_COPY.removePoint(index + 1)}
                  disabled={disabled}
                  onClick={() => update((current) => removeCurvePoint(current, point.key))}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </li>
            );
          })}
        </ol>
        <Button startIcon={<AddIcon />} disabled={disabled} onClick={() => {
          const key = newKey();

          update((current) => addCurvePoint(current, key));
        }}>
          {MECHANICS_COPY.addPoint}
        </Button>
      </fieldset>
      <fieldset className={cx(styles.group)}>
        <legend className={cx(styles.groupTitle)}>{MECHANICS_COPY.initialState}</legend>
        <div className={cx(styles.formGrid)}>
          {INITIAL_STATE_FIELDS.map((field) => (
            <NumericField
              key={field.path}
              definition={field}
              value={draft.initialState[field.path] ?? ""}
              disabled={disabled}
              error={errors[field.path]}
              onChange={(value) => update((current) => ({ ...current, initialState: { ...current.initialState, [field.path]: value } }))}
            />
          ))}
        </div>
      </fieldset>
    </EditorSection>
  );
}

export const MechanicsSection = memo(MechanicsSectionView, sameSectionProps<SectionWithKeysProps>(["mechanics", "recruitmentCurve", "initialState"], "mechanics"));
