import { useState, useEffect, useCallback } from 'react';
import type { Notification } from '../simulator.types';

const AUTO_CLEAR_MS = 3000;

/**
 * Hook for managing transient UI notifications.
 * Auto-clears after AUTO_CLEAR_MS.
 */
export const useNotifications = () => {
  const [notification, setNotification] = useState<Notification | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), AUTO_CLEAR_MS);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const notify = useCallback((type: Notification['type'], message: string) => {
    setNotification({ type, message, timestamp: Date.now() });
  }, []);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return { notification, notify, clearNotification, setNotification };
};
