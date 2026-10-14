/*
* Funcionalidad: useAiRating
* Descripción: State of the rating widget. Loads the caller's rating from GET /api/ai-ratings/mine (SWR, skipped when `initialRating` is given), applies a thumb optimistically and rolls back on failure with an error message, saves the optional comment (max 2000) and exposes the saving flag. Depends on api-client and the AI rating service/mapper.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useState } from "react";
import { useSWRConfig } from "swr";
import { invalidateApiQueries, useApiQuery } from "@shared/api-client/use-api-query";
import { toAiRating } from "../api/ai-rating.mapper";
import { AiRatingService } from "../api/ai-rating.service";
import { AI_RATING_COMMENT_MAX } from "./ai-rating.entity";
import type { AiRating, AiRatingTarget } from "./ai-rating.entity";

// TODO(i18n): move the copy to an i18next namespace once src/i18n is in scope.
const SAVE_ERROR = "No se pudo guardar tu valoración. Inténtalo de nuevo.";

export type UseAiRatingOptions = AiRatingTarget & {
  initialRating?: AiRating | null
};

export type AiRatingState = {
  selected: boolean | null
  savedRating: AiRating | null
  hasSaved: boolean
  isLoading: boolean
  isSaving: boolean
  error: string | null
  rate: (helpful: boolean) => void
  saveComment: (comment: string) => Promise<boolean>
};

type SavedEntry = {
  key: string
  rating: AiRating
};

export function useAiRating({ targetType, targetId, initialRating }: UseAiRatingOptions): AiRatingState {
  const { mutate } = useSWRConfig();
  const targetKey = `${targetType}:${targetId}`;
  const query = useApiQuery(initialRating === undefined ? AiRatingService.MINE_PATH : null, {
    query: { targetType, targetId },
  });
  const [saved, setSaved] = useState<SavedEntry | null>(null);
  const [pendingHelpful, setPendingHelpful] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedForTarget = saved?.key === targetKey ? saved.rating : undefined;
  const loadedRating = initialRating === undefined ? toAiRating(query.data?.data) : initialRating;
  const savedRating = savedForTarget ?? loadedRating ?? null;
  const selected = pendingHelpful ?? savedRating?.helpful ?? null;

  const save = async(rating: AiRating): Promise<boolean> => {
    setIsSaving(true);
    setError(null);

    try {
      await AiRatingService.upsert({ targetType, targetId, ...rating });
      setSaved({ key: targetKey, rating: { helpful: rating.helpful, comment: rating.comment.trim() } });
      void invalidateApiQueries(mutate, [AiRatingService.MINE_PATH]);

      return true;
    } catch {
      setError(SAVE_ERROR);

      return false;
    } finally {
      setPendingHelpful(null);
      setIsSaving(false);
    }
  };

  const rate = (helpful: boolean) => {
    if (isSaving || helpful === selected) {
      return;
    }

    setPendingHelpful(helpful);
    void save({ helpful, comment: savedRating?.comment ?? "" });
  };

  const saveComment = (comment: string): Promise<boolean> => {
    if (isSaving || selected === null || comment.length > AI_RATING_COMMENT_MAX) {
      return Promise.resolve(false);
    }

    return save({ helpful: selected, comment });
  };

  return {
    selected,
    savedRating,
    hasSaved: savedForTarget !== undefined,
    isLoading: initialRating === undefined && query.isLoading,
    isSaving,
    error,
    rate,
    saveComment,
  };
}
