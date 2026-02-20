import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Tracks scroll depth and active reading time for lesson completion.
 */
const useScrollCompletion = ({
  contentRef,
  estimatedTimeMinutes = 0,
  scrollThreshold = 0.9,
  minTimeRatio = 0.6,
}) => {
  const [scrollPercent, setScrollPercent] = useState(0);
  const [timeSpentMinutes, setTimeSpentMinutes] = useState(0);
  const activeSecondsRef = useRef(0);
  const isTabVisibleRef = useRef(true);
  const timerRef = useRef(null);

  const updateScrollPercent = useCallback(() => {
    if (!contentRef?.current || typeof window === 'undefined') {
      return;
    }

    const contentTop = contentRef.current.offsetTop || 0;
    const contentHeight = contentRef.current.offsetHeight || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const viewportBottom = scrollY + viewportHeight;

    if (contentHeight <= 0) {
      setScrollPercent(0);
      return;
    }

    const rawProgress = (viewportBottom - contentTop) / contentHeight;
    setScrollPercent(clamp(rawProgress, 0, 1));
  }, [contentRef]);

  useEffect(() => {
    updateScrollPercent();
    window.addEventListener('scroll', updateScrollPercent, { passive: true });
    window.addEventListener('resize', updateScrollPercent);

    return () => {
      window.removeEventListener('scroll', updateScrollPercent);
      window.removeEventListener('resize', updateScrollPercent);
    };
  }, [updateScrollPercent]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return () => {};
    }

    const handleVisibilityChange = () => {
      isTabVisibleRef.current = document.visibilityState === 'visible';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    isTabVisibleRef.current = document.visibilityState === 'visible';

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      if (!isTabVisibleRef.current) {
        return;
      }

      activeSecondsRef.current += 1;
      if (activeSecondsRef.current % 15 === 0) {
        setTimeSpentMinutes(Math.floor(activeSecondsRef.current / 60));
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const isScrolledEnough = useMemo(
    () => scrollPercent >= scrollThreshold,
    [scrollPercent, scrollThreshold]
  );

  const requiredMinutes = useMemo(() => {
    if (!estimatedTimeMinutes || estimatedTimeMinutes <= 0) {
      return 0;
    }
    return Math.ceil(estimatedTimeMinutes * minTimeRatio);
  }, [estimatedTimeMinutes, minTimeRatio]);

  const meetsReadingTime = useMemo(
    () => timeSpentMinutes >= requiredMinutes,
    [timeSpentMinutes, requiredMinutes]
  );

  return {
    scrollPercent,
    timeSpentMinutes,
    isScrolledEnough,
    meetsReadingTime,
    requiredMinutes,
  };
};

export default useScrollCompletion;
