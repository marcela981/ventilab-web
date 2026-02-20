import { useState, useCallback } from 'react';
import { DEFAULT_CARD_CONFIG } from '../constants/ventilator-limits';
import type { CardConfigItem, VentilationMode } from '../simulator.types';

/**
 * Hook for managing monitoring card layout configuration.
 * Handles drag & drop reordering, visibility toggles, and adjust mode.
 */
export const useCardConfig = () => {
  const [isAdjustMode, setIsAdjustMode] = useState(false);
  const [cardConfig, setCardConfig] = useState<CardConfigItem[]>(
    DEFAULT_CARD_CONFIG.map((c) => ({ ...c })),
  );
  const [draggedCard, setDraggedCard] = useState<string | null>(null);

  const toggleAdjustMode = useCallback(() => {
    setIsAdjustMode((prev) => !prev);
  }, []);

  const toggleCardVisibility = useCallback((cardId: string) => {
    setCardConfig((prev) =>
      prev.map((card) => (card.id === cardId ? { ...card, visible: !card.visible } : card)),
    );
  }, []);

  const handleDragStart = useCallback(
    (e: React.DragEvent, cardId: string) => {
      if (!isAdjustMode) return;
      setDraggedCard(cardId);
      e.dataTransfer.effectAllowed = 'move';
    },
    [isAdjustMode],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetCardId: string) => {
      e.preventDefault();
      if (!draggedCard || draggedCard === targetCardId) return;

      setCardConfig((prev) => {
        const draggedCfg = prev.find((c) => c.id === draggedCard);
        const targetCfg = prev.find((c) => c.id === targetCardId);
        if (!draggedCfg || !targetCfg) return prev;

        return prev
          .map((card) => {
            if (card.id === draggedCard) return { ...card, order: targetCfg.order };
            if (card.id === targetCardId) return { ...card, order: draggedCfg.order };
            return card;
          })
          .sort((a, b) => a.order - b.order);
      });

      setDraggedCard(null);
    },
    [draggedCard],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedCard(null);
  }, []);

  const resetCardConfiguration = useCallback((ventilationMode: VentilationMode) => {
    setCardConfig(
      DEFAULT_CARD_CONFIG.map((c) => ({
        ...c,
        visible: c.id === 'compliance' ? ventilationMode === 'pressure' : c.visible,
      })),
    );
  }, []);

  const updateCardVisibilityForMode = useCallback((newMode: VentilationMode) => {
    setCardConfig((prev) =>
      prev.map((card) =>
        card.id === 'compliance' ? { ...card, visible: newMode === 'pressure' } : card,
      ),
    );
  }, []);

  return {
    isAdjustMode,
    cardConfig,
    draggedCard,
    toggleAdjustMode,
    toggleCardVisibility,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    resetCardConfiguration,
    updateCardVisibilityForMode,
  };
};
