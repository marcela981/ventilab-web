/*
* Funcionalidad: Gamification mapper
* Descripción: Maps the gamification DTOs to the gamification entities, copying the server values (no XP is recalculated). The recent activity keeps only the milestone kinds (lesson, module, evaluation, achievement): a page view, which the endpoint never returns, is dropped defensively. Depends on the gamification DTOs and entity.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { GamificationStats, RecentActivity, RecentActivityKind } from "../../application/entities/gamification.entity";
import type { GamificationStatsDTO, RecentActivityItemDTO } from "../dtos/gamification.dto";

const RECENT_KINDS: ReadonlySet<string> = new Set<RecentActivityKind>([
  "LESSON_COMPLETED",
  "MODULE_COMPLETED",
  "EVALUATION_PASSED",
  "ACHIEVEMENT_UNLOCKED",
]);

export function toGamificationStats(dto: GamificationStatsDTO): GamificationStats {
  return {
    xpTotal: dto.xpTotal,
    level: dto.level,
    xpIntoLevel: dto.xpIntoLevel,
    nextLevelXp: dto.nextLevelXp,
    streakDays: dto.streakDays,
    longestStreak: dto.longestStreak,
    xpToday: dto.xpToday,
  };
}

function isRecentKind(kind: string): kind is RecentActivityKind {
  return RECENT_KINDS.has(kind);
}

export function toRecentActivity(items: readonly RecentActivityItemDTO[]): RecentActivity[] {
  return items.flatMap((item) => (isRecentKind(item.kind)
    ? [{ id: item.id, kind: item.kind, refId: item.refId, xp: item.xp, occurredAt: item.occurredAt, title: item.title }]
    : []));
}
