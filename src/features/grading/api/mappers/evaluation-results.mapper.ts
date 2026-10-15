/*
* Funcionalidad: Evaluation results mappers
* Descripción: Maps the results-page DTOs to the grading view models without computing anything: the evaluation analytics (counts, grade statistics, pass rate, passing grade, histogram buckets and question stats as returned), the evaluation assignments (group, state, window and attempt counts) and, from a group dashboard, the published grade of each student for one evaluation (students without a published grade for it are left out; names are trimmed, empty names become null). Depends on the grading DTOs and entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { EvaluationAnalyticsDTO, EvaluationAssignmentDTO, GroupDashboardDTO } from "../dtos/grading.dto";
import type { EvaluationAssignment, EvaluationStats, StudentResult } from "../../application/entities/evaluation-results.entity";
import type { GradingEvaluationType } from "../../application/entities/grading.entity";

const EVALUATION_TYPES = new Set<string>(["EXAM", "QUIZ", "WORKSHOP"]);

function toEvaluationType(type: string): GradingEvaluationType | null {
  return EVALUATION_TYPES.has(type) ? type as GradingEvaluationType : null;
}

export function toEvaluationStats(dto: EvaluationAnalyticsDTO): EvaluationStats {
  return {
    evaluationId: dto.evaluationId,
    title: dto.title,
    type: toEvaluationType(dto.type),
    totalAttempts: dto.totalAttempts,
    gradedCount: dto.gradedCount,
    publishedCount: dto.publishedCount,
    averageGrade: dto.averageGrade,
    medianGrade: dto.medianGrade,
    minGrade: dto.minGrade,
    maxGrade: dto.maxGrade,
    passRate: dto.passRate,
    passingGrade: dto.passingGrade,
    histogram: dto.histogram.map((bucket) => ({ from: bucket.from, to: bucket.to, count: bucket.count })),
    questions: dto.questions.map((question) => ({
      questionId: question.questionId,
      order: question.order,
      type: question.type,
      points: question.points,
      answeredCount: question.answeredCount,
      correctCount: question.correctCount,
      correctRate: question.correctRate,
      difficultyIndex: question.difficultyIndex,
    })),
  };
}

export function toEvaluationAssignment(dto: EvaluationAssignmentDTO): EvaluationAssignment {
  return {
    id: dto.id,
    groupId: dto.groupId,
    groupName: dto.groupName,
    state: dto.state,
    startsAt: dto.startsAt,
    endsAt: dto.endsAt,
    attemptCounts: {
      inProgress: dto.attemptCounts.inProgress,
      submitted: dto.attemptCounts.submitted,
      pendingReview: dto.attemptCounts.pendingReview,
      graded: dto.attemptCounts.graded,
    },
  };
}

export function toStudentResults(dto: GroupDashboardDTO, evaluationId: string): StudentResult[] {
  return dto.students.flatMap((student) => {
    const grade = student.grades.evaluations.find((entry) => entry.evaluationId === evaluationId);

    if (!grade) {
      return [];
    }

    return [{
      userId: student.userId,
      name: student.name?.trim() || null,
      email: student.email,
      grade: grade.grade,
      passed: grade.passed,
      attemptNumber: grade.attemptNumber,
      publishedAt: grade.publishedAt,
    }];
  });
}
