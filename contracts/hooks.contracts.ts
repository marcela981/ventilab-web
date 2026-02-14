/**
 * VENTYLAB - HOOKS CONTRACTS (Frontend)
 * Common contracts for custom React hooks
 */

// ============================================================================
// GENERIC HOOK RETURN TYPES
// ============================================================================

/**
 * Generic data fetching hook return type
 * Standard pattern for all data-fetching hooks
 */
export interface UseDataReturn<T> {
  /** Data */
  data: T | null;
  
  /** Whether data is loading */
  loading: boolean;
  
  /** Error */
  error: Error | null;
  
  /** Actions */
  actions: {
    /** Refetch data */
    refetch: () => Promise<void>;
  };
}

/**
 * Generic mutation hook return type
 * Standard pattern for all mutation hooks (create, update, delete)
 */
export interface UseMutationReturn<TInput, TOutput> {
  /** Execute mutation */
  mutate: (input: TInput) => Promise<TOutput>;
  
  /** Whether mutation is in progress */
  isLoading: boolean;
  
  /** Mutation error */
  error: Error | null;
  
  /** Mutation result */
  data: TOutput | null;
  
  /** Actions */
  actions: {
    /** Reset state */
    reset: () => void;
  };
}

/**
 * Generic paginated data hook return type
 */
export interface UsePaginatedDataReturn<T> {
  /** Items */
  items: T[];
  
  /** Total items count */
  total: number;
  
  /** Current page */
  page: number;
  
  /** Page size */
  limit: number;
  
  /** Total pages */
  totalPages: number;
  
  /** Whether has next page */
  hasNext: boolean;
  
  /** Whether has previous page */
  hasPrev: boolean;
  
  /** Whether data is loading */
  loading: boolean;
  
  /** Error */
  error: Error | null;
  
  /** Actions */
  actions: {
    /** Go to page */
    goToPage: (page: number) => void;
    
    /** Go to next page */
    nextPage: () => void;
    
    /** Go to previous page */
    prevPage: () => void;
    
    /** Change page size */
    changePageSize: (limit: number) => void;
    
    /** Refetch */
    refetch: () => Promise<void>;
  };
}

// ============================================================================
// WEBSOCKET HOOK TYPES
// ============================================================================

/**
 * Return type for useWebSocket hook
 * Manages WebSocket connection
 */
export interface UseWebSocketReturn {
  /** Whether socket is connected */
  isConnected: boolean;
  
  /** Socket instance */
  socket: any | null;
  
  /** Connection error */
  error: Error | null;
  
  /** Actions */
  actions: {
    /** Connect socket */
    connect: () => void;
    
    /** Disconnect socket */
    disconnect: () => void;
    
    /** Emit event */
    emit: (event: string, data: any) => void;
    
    /** Subscribe to event */
    on: (event: string, handler: (...args: any[]) => void) => void;
    
    /** Unsubscribe from event */
    off: (event: string, handler: (...args: any[]) => void) => void;
  };
}

/**
 * Return type for useSocketEvent hook
 * Listens to specific WebSocket event
 */
export interface UseSocketEventReturn<T> {
  /** Latest event data */
  data: T | null;
  
  /** Event history (optional) */
  history?: T[];
  
  /** Whether event has been received */
  hasReceived: boolean;
  
  /** Actions */
  actions: {
    /** Clear data */
    clear: () => void;
  };
}

// ============================================================================
// FORM HOOK TYPES
// ============================================================================

/**
 * Return type for useForm hook
 * Generic form state management
 */
export interface UseFormReturn<T> {
  /** Form values */
  values: T;
  
  /** Form errors */
  errors: Partial<Record<keyof T, string>>;
  
  /** Touched fields */
  touched: Partial<Record<keyof T, boolean>>;
  
  /** Whether form is valid */
  isValid: boolean;
  
  /** Whether form is dirty (has changes) */
  isDirty: boolean;
  
  /** Whether form is submitting */
  isSubmitting: boolean;
  
  /** Actions */
  actions: {
    /** Set field value */
    setFieldValue: <K extends keyof T>(field: K, value: T[K]) => void;
    
    /** Set field touched */
    setFieldTouched: (field: keyof T, touched: boolean) => void;
    
    /** Set field error */
    setFieldError: (field: keyof T, error: string) => void;
    
    /** Handle field change */
    handleChange: (event: React.ChangeEvent<any>) => void;
    
    /** Handle field blur */
    handleBlur: (event: React.FocusEvent<any>) => void;
    
    /** Handle form submit */
    handleSubmit: (event: React.FormEvent) => void;
    
    /** Reset form */
    reset: () => void;
    
    /** Validate form */
    validate: () => boolean;
  };
}

/**
 * Form validation rule
 */
export interface FormValidationRule<T> {
  /** Field name */
  field: keyof T;
  
  /** Validation function */
  validator: (value: any, values: T) => string | undefined;
}

// ============================================================================
// LOCAL STORAGE HOOK TYPES
// ============================================================================

/**
 * Return type for useLocalStorage hook
 */
export interface UseLocalStorageReturn<T> {
  /** Stored value */
  value: T;
  
  /** Set value */
  setValue: (value: T | ((prev: T) => T)) => void;
  
  /** Remove value */
  removeValue: () => void;
}

// ============================================================================
// DEBOUNCE AND THROTTLE HOOK TYPES
// ============================================================================

/**
 * Return type for useDebounce hook
 */
export interface UseDebounceReturn<T> {
  /** Debounced value */
  debouncedValue: T;
  
  /** Whether debouncing */
  isDebouncing: boolean;
}

/**
 * Return type for useThrottle hook
 */
export interface UseThrottleReturn<T> {
  /** Throttled value */
  throttledValue: T;
  
  /** Whether throttling */
  isThrottling: boolean;
}

// ============================================================================
// MEDIA QUERY HOOK TYPES
// ============================================================================

/**
 * Return type for useMediaQuery hook
 */
export interface UseMediaQueryReturn {
  /** Whether query matches */
  matches: boolean;
}

/**
 * Return type for useBreakpoint hook
 */
export interface UseBreakpointReturn {
  /** Current breakpoint */
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  
  /** Breakpoint checks */
  is: {
    xs: boolean;
    sm: boolean;
    md: boolean;
    lg: boolean;
    xl: boolean;
  };
  
  /** Greater than checks */
  gt: {
    xs: boolean;
    sm: boolean;
    md: boolean;
    lg: boolean;
  };
  
  /** Less than checks */
  lt: {
    sm: boolean;
    md: boolean;
    lg: boolean;
    xl: boolean;
  };
}

// ============================================================================
// SCROLL HOOK TYPES
// ============================================================================

/**
 * Return type for useScroll hook
 */
export interface UseScrollReturn {
  /** Scroll position X */
  scrollX: number;
  
  /** Scroll position Y */
  scrollY: number;
  
  /** Scroll direction */
  direction: 'up' | 'down' | null;
  
  /** Whether scrolling */
  isScrolling: boolean;
  
  /** Whether at top */
  isAtTop: boolean;
  
  /** Whether at bottom */
  isAtBottom: boolean;
  
  /** Actions */
  actions: {
    /** Scroll to top */
    scrollToTop: (smooth?: boolean) => void;
    
    /** Scroll to bottom */
    scrollToBottom: (smooth?: boolean) => void;
    
    /** Scroll to position */
    scrollTo: (x: number, y: number, smooth?: boolean) => void;
  };
}

/**
 * Return type for useInfiniteScroll hook
 */
export interface UseInfiniteScrollReturn {
  /** Loading ref (attach to sentinel element) */
  loadingRef: React.RefObject<HTMLDivElement>;
  
  /** Whether loading more */
  isLoadingMore: boolean;
  
  /** Whether has more */
  hasMore: boolean;
  
  /** Actions */
  actions: {
    /** Reset */
    reset: () => void;
  };
}

// ============================================================================
// TIMER HOOK TYPES
// ============================================================================

/**
 * Return type for useTimer hook
 */
export interface UseTimerReturn {
  /** Time in seconds */
  time: number;
  
  /** Whether timer is running */
  isRunning: boolean;
  
  /** Formatted time (MM:SS) */
  formattedTime: string;
  
  /** Actions */
  actions: {
    /** Start timer */
    start: () => void;
    
    /** Pause timer */
    pause: () => void;
    
    /** Resume timer */
    resume: () => void;
    
    /** Reset timer */
    reset: () => void;
    
    /** Set time */
    setTime: (seconds: number) => void;
  };
}

/**
 * Return type for useCountdown hook
 */
export interface UseCountdownReturn {
  /** Time remaining in seconds */
  timeRemaining: number;
  
  /** Whether countdown is running */
  isRunning: boolean;
  
  /** Whether time is up */
  isComplete: boolean;
  
  /** Formatted time (MM:SS) */
  formattedTime: string;
  
  /** Actions */
  actions: {
    /** Start countdown */
    start: () => void;
    
    /** Pause countdown */
    pause: () => void;
    
    /** Resume countdown */
    resume: () => void;
    
    /** Reset countdown */
    reset: () => void;
  };
}

// ============================================================================
// ASYNC HOOK TYPES
// ============================================================================

/**
 * Return type for useAsync hook
 * Generic async operation handler
 */
export interface UseAsyncReturn<T> {
  /** Async result */
  data: T | null;
  
  /** Whether operation is pending */
  loading: boolean;
  
  /** Error */
  error: Error | null;
  
  /** Operation status */
  status: 'idle' | 'pending' | 'success' | 'error';
  
  /** Actions */
  actions: {
    /** Execute async function */
    execute: (...args: any[]) => Promise<T>;
    
    /** Reset state */
    reset: () => void;
  };
}

// ============================================================================
// CLIPBOARD HOOK TYPES
// ============================================================================

/**
 * Return type for useClipboard hook
 */
export interface UseClipboardReturn {
  /** Copied text */
  copiedText: string | null;
  
  /** Whether copy was successful */
  isCopied: boolean;
  
  /** Actions */
  actions: {
    /** Copy text to clipboard */
    copy: (text: string) => Promise<void>;
    
    /** Reset state */
    reset: () => void;
  };
}

// ============================================================================
// PREVIOUS VALUE HOOK TYPES
// ============================================================================

/**
 * Return type for usePrevious hook
 */
export interface UsePreviousReturn<T> {
  /** Previous value */
  previous: T | undefined;
}

// ============================================================================
// TOGGLE HOOK TYPES
// ============================================================================

/**
 * Return type for useToggle hook
 */
export interface UseToggleReturn {
  /** Current value */
  value: boolean;
  
  /** Actions */
  actions: {
    /** Toggle value */
    toggle: () => void;
    
    /** Set value to true */
    setTrue: () => void;
    
    /** Set value to false */
    setFalse: () => void;
    
    /** Set specific value */
    setValue: (value: boolean) => void;
  };
}

// ============================================================================
// WINDOW SIZE HOOK TYPES
// ============================================================================

/**
 * Return type for useWindowSize hook
 */
export interface UseWindowSizeReturn {
  /** Window width */
  width: number;
  
  /** Window height */
  height: number;
  
  /** Whether window is mobile sized */
  isMobile: boolean;
  
  /** Whether window is tablet sized */
  isTablet: boolean;
  
  /** Whether window is desktop sized */
  isDesktop: boolean;
}

// ============================================================================
// FOCUS TRAP HOOK TYPES
// ============================================================================

/**
 * Return type for useFocusTrap hook
 */
export interface UseFocusTrapReturn {
  /** Container ref */
  containerRef: React.RefObject<HTMLElement>;
  
  /** Whether focus trap is active */
  isActive: boolean;
  
  /** Actions */
  actions: {
    /** Activate focus trap */
    activate: () => void;
    
    /** Deactivate focus trap */
    deactivate: () => void;
  };
}

// ============================================================================
// OUTSIDE CLICK HOOK TYPES
// ============================================================================

/**
 * Return type for useOutsideClick hook
 */
export interface UseOutsideClickReturn {
  /** Ref to attach to element */
  ref: React.RefObject<HTMLElement>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Breakpoint values (in pixels)
 */
export const BREAKPOINTS = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
} as const;

/**
 * Default debounce delay (milliseconds)
 */
export const DEFAULT_DEBOUNCE_DELAY = 300;

/**
 * Default throttle delay (milliseconds)
 */
export const DEFAULT_THROTTLE_DELAY = 300;

/**
 * Local storage key prefix
 */
export const STORAGE_KEY_PREFIX = 'ventylab_';
