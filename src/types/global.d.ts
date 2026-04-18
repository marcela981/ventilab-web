interface AnalyticsInstance {
  track: (event: string, properties?: Record<string, unknown>) => void;
}

interface GtagFunction {
  (command: string, ...args: unknown[]): void;
}

interface VentyDebug {
  debug: {
    disable: () => void;
    enable: () => void;
  };
}

interface Window {
  analytics?: AnalyticsInstance;
  gtag?: GtagFunction;
  trackEvent?: (event: string, payload?: Record<string, unknown>) => void;
  dataLayer?: Record<string, unknown>[];
  __VENTY_DEBUG?: VentyDebug;
}
