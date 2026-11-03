/*
* Funcionalidad: BulkPublishTab
* Descripción: "Publicación masiva" tab of the unified grading screen: publishes at once the graded and unpublished grades of every group or of one (EvaluationResultsBody, section publicacion). Depends on the grading workspace context and the results body.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { EvaluationResultsBody } from "../../pages/evaluation-results.page";
import { useGradingWorkspace } from "./grading-workspace-context";

export function BulkPublishTab() {
  const { evaluationId } = useGradingWorkspace();

  return <EvaluationResultsBody evaluationId={evaluationId} section="publicacion" />;
}
