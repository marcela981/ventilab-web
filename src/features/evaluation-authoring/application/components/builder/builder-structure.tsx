/*
* Funcionalidad: BuilderStructure
* Descripción: Scenarios and questions of the evaluation builder with drag-and-drop ordering (@hello-pangea/dnd, the library of content-editor): questions without a scenario first ("Preguntas sin escenario"), then each scenario with its rich text content and its questions. A question can be dragged inside its group or into another scenario (batch `PUT .../questions/order` with the scenarioId of every item); scenarios are dragged by their handle (`PUT .../scenarios/order`). Each group offers "Agregar pregunta" with the type to create; "Agregar escenario" adds an empty scenario. Questions are numbered in layout order and rendered with QuestionCard. This module is ONLY reached through React.lazy (EvaluationBuilderPage), so the dnd library stays in the builder chunk. Depends on @hello-pangea/dnd, MUI, the design-system FormField, the builder hook types, entities, components, copy and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import type { DraggableProvidedDragHandleProps, DropResult } from "@hello-pangea/dnd";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import { useState } from "react";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import { BUILDER_COPY } from "../../entities/builder-copy";
import {
  moveQuestion,
  moveScenario,
  ROOT_DROPPABLE_ID,
  scenarioDroppableId,
  SCENARIOS_DROPPABLE_ID,
  toQuestionOrderItems,
} from "../../entities/builder-layout";
import type { QuestionLayout } from "../../entities/builder-layout";
import { QUESTION_TYPE_LABELS, QUESTION_TYPES, questionDraftFrom, questionIssues } from "../../entities/builder-question.entity";
import type { QuestionType } from "../../entities/builder-question.entity";
import type { UseEvaluationBuilderResult } from "../../hooks/use-evaluation-builder";
import { QuestionCard } from "./question-card";
import { RichTextField } from "./rich-text-field";
import styles from "../../../UI/builder.module.css";

const QUESTION_DND_TYPE = "question";
const SCENARIO_DND_TYPE = "scenario";
const NATIVE_SELECT = { select: { native: true }, inputLabel: { shrink: true } } as const;

export type BuilderStructureProps = {
  builder: UseEvaluationBuilderResult
  layout: QuestionLayout
  newKey: () => string
  onRequestDeleteQuestion: (questionId: string, position: number) => void
  onRequestDeleteScenario: (scenarioId: string) => void
};

function DragHandle({ label, handleProps }: { label: string, handleProps: DraggableProvidedDragHandleProps | null }) {
  return (
    <span {...handleProps} className={cx(styles.dragHandle)} aria-label={label}>
      <DragIndicatorIcon fontSize="small" />
    </span>
  );
}

function AddQuestionControl({ disabled, onAdd }: { disabled: boolean, onAdd: (type: QuestionType) => void }) {
  const [type, setType] = useState<QuestionType>("SINGLE_CHOICE");

  return (
    <div className={cx(styles.addQuestion)}>
      <FormField
        select
        size="small"
        label={BUILDER_COPY.addQuestionType}
        value={type}
        onChange={(event) => setType(event.target.value as QuestionType)}
        slotProps={NATIVE_SELECT}
      >
        {QUESTION_TYPES.map((option) => <option key={option} value={option}>{QUESTION_TYPE_LABELS[option]}</option>)}
      </FormField>
      <Button startIcon={<AddIcon />} disabled={disabled} onClick={() => onAdd(type)}>
        {BUILDER_COPY.addQuestion}
      </Button>
    </div>
  );
}

export function BuilderStructure({ builder, layout, newKey, onRequestDeleteQuestion, onRequestDeleteScenario }: BuilderStructureProps) {
  const evaluation = builder.evaluation;

  if (!evaluation) {
    return null;
  }

  const questions = new Map(evaluation.questions.map((question) => [question.id, question]));
  const scenarios = new Map(evaluation.scenarios.map((scenario) => [scenario.id, scenario]));
  const positions = new Map(toQuestionOrderItems(layout).map((item) => [item.id, item.order + 1]));
  const structuralDisabled = builder.locked || builder.pending;

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    if (result.type === SCENARIO_DND_TYPE) {
      const next = moveScenario(layout, result.source.index, result.destination.index);

      if (next) {
        void builder.applyScenarioLayout(next);
      }

      return;
    }

    const next = moveQuestion(layout, result.source, result.destination);

    if (next) {
      void builder.applyQuestionLayout(next);
    }
  };

  const renderQuestions = (droppableId: string, ids: readonly string[]) => (
    <Droppable droppableId={droppableId} type={QUESTION_DND_TYPE}>
      {(provided) => (
        <ol ref={provided.innerRef} {...provided.droppableProps} className={cx(styles.questionList)}>
          {ids.length === 0 ? <li className={cx(styles.emptyGroup)}>{BUILDER_COPY.emptyGroup}</li> : null}
          {ids.map((id, index) => {
            const question = questions.get(id);

            if (!question) {
              return null;
            }

            const position = positions.get(id) ?? index + 1;

            return (
              <Draggable key={id} draggableId={id} index={index} isDragDisabled={builder.pending}>
                {(draggable) => (
                  <li ref={draggable.innerRef} {...draggable.draggableProps} className={cx(styles.questionItem)}>
                    <QuestionCard
                      question={question}
                      position={position}
                      draft={builder.questionDraft(question) ?? questionDraftFrom(question)}
                      dirty={builder.isQuestionDirty(id)}
                      errors={builder.questionErrors(question)}
                      saveError={builder.saveErrors[id]}
                      issues={builder.showIssues ? questionIssues(evaluation.readinessIssues, id) : []}
                      locked={builder.locked}
                      busy={builder.pending}
                      dragHandle={<DragHandle label={BUILDER_COPY.dragQuestion(position)} handleProps={draggable.dragHandleProps} />}
                      newKey={newKey}
                      onChange={(draft) => builder.updateQuestionDraft(id, draft)}
                      onDelete={() => onRequestDeleteQuestion(id, position)}
                    />
                  </li>
                )}
              </Draggable>
            );
          })}
          {provided.placeholder}
        </ol>
      )}
    </Droppable>
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      {evaluation.questions.length === 0 ? <p className={cx(styles.muted)}>{BUILDER_COPY.noQuestions}</p> : null}
      <section className={cx(styles.group)} aria-label={BUILDER_COPY.rootGroup}>
        <h3 className={cx(styles.groupTitle)}>{BUILDER_COPY.rootGroup}</h3>
        {renderQuestions(ROOT_DROPPABLE_ID, layout.root)}
        <AddQuestionControl disabled={structuralDisabled} onAdd={(type) => void builder.addQuestionOfType(type, null)} />
      </section>
      <Droppable droppableId={SCENARIOS_DROPPABLE_ID} type={SCENARIO_DND_TYPE}>
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className={cx(styles.scenarioList)}>
            {layout.scenarios.map((group, index) => {
              const scenario = scenarios.get(group.id);

              if (!scenario) {
                return null;
              }

              const position = index + 1;
              const saveError = builder.saveErrors[group.id];

              return (
                <Draggable key={group.id} draggableId={`scenario-${group.id}`} index={index} isDragDisabled={builder.pending}>
                  {(draggable) => (
                    <section
                      ref={draggable.innerRef}
                      {...draggable.draggableProps}
                      className={cx(styles.group, styles.scenario)}
                      aria-label={BUILDER_COPY.scenarioLabel(position)}
                    >
                      <header className={cx(styles.cardHeader)}>
                        <DragHandle label={BUILDER_COPY.dragScenario(position)} handleProps={draggable.dragHandleProps} />
                        <h3 className={cx(styles.groupTitle)}>{BUILDER_COPY.scenarioLabel(position)}</h3>
                        <IconButton
                          size="small"
                          className={cx(styles.cardAction)}
                          aria-label={BUILDER_COPY.deleteScenario(position)}
                          disabled={structuralDisabled}
                          onClick={() => onRequestDeleteScenario(group.id)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </header>
                      {saveError ? <Alert severity="error">{saveError}</Alert> : null}
                      <RichTextField
                        key={group.id}
                        label={BUILDER_COPY.scenarioContent(position)}
                        initialValue={builder.scenarioContent(group.id) ?? scenario.content}
                        placeholder={BUILDER_COPY.scenarioPlaceholder}
                        onChange={(content) => builder.updateScenarioContent(group.id, content)}
                      />
                      {renderQuestions(scenarioDroppableId(group.id), group.questionIds)}
                      <AddQuestionControl disabled={structuralDisabled} onAdd={(type) => void builder.addQuestionOfType(type, group.id)} />
                    </section>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      <Button variant="outlined" startIcon={<AddIcon />} disabled={structuralDisabled} onClick={() => void builder.addNewScenario()}>
        {BUILDER_COPY.addScenario}
      </Button>
    </DragDropContext>
  );
}
