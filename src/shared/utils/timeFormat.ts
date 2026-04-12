/**
 * Time formatting utilities
 */

/**
 * Format relative time (e.g., "hace 2 horas", "hace 5 minutos")
 */
export function formatRelativeTime(date: Date | string | null): string {
  if (!date) return 'Nunca';

  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) {
    return 'Hace un momento';
  } else if (diffMinutes < 60) {
    return `Hace ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`;
  } else if (diffHours < 24) {
    return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  } else if (diffDays < 30) {
    return `Hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
  } else if (diffMonths < 12) {
    return `Hace ${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`;
  } else {
    return `Hace ${diffYears} ${diffYears === 1 ? 'año' : 'años'}`;
  }
}

/**
 * Format hours from minutes (e.g., "2.5 horas", "45 minutos")
 */
export function formatHours(minutes: number): string {
  if (minutes < 1) {
    return '0 minutos';
  }

  if (minutes < 60) {
    return `${Math.round(minutes)} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  }

  const hours = minutes / 60;
  
  if (hours < 1) {
    return `${Math.round(minutes)} minutos`;
  }

  // Format with 1 decimal place
  const formattedHours = Math.round(hours * 10) / 10;
  
  return `${formattedHours} ${formattedHours === 1 ? 'hora' : 'horas'}`;
}

/**
 * Format time duration (e.g., "1h 30m", "45m", "2h")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 1) {
    return '0m';
  }

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours === 0) {
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}

/**
 * Format date and time (e.g., "14 de enero, 2:30 PM")
 */
export function formatDateTime(date: Date | string | null): string {
  if (!date) return 'Nunca';

  const d = new Date(date);
  
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  return d.toLocaleDateString('es-ES', options);
}

/**
 * Format date only (e.g., "14 de enero de 2026")
 */
export function formatDate(date: Date | string | null): string {
  if (!date) return 'Nunca';

  const d = new Date(date);
  
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };

  return d.toLocaleDateString('es-ES', options);
}

/**
 * Format time only (e.g., "2:30 PM")
 */
export function formatTime(date: Date | string | null): string {
  if (!date) return '';

  const d = new Date(date);
  
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  return d.toLocaleTimeString('es-ES', options);
}

/**
 * Check if date is today
 */
export function isToday(date: Date | string | null): boolean {
  if (!date) return false;

  const d = new Date(date);
  const today = new Date();

  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if date is this week
 */
export function isThisWeek(date: Date | string | null): boolean {
  if (!date) return false;

  const d = new Date(date);
  const today = new Date();
  const firstDayOfWeek = new Date(today);
  firstDayOfWeek.setDate(today.getDate() - today.getDay());
  firstDayOfWeek.setHours(0, 0, 0, 0);

  const lastDayOfWeek = new Date(firstDayOfWeek);
  lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 7);

  return d >= firstDayOfWeek && d < lastDayOfWeek;
}

export default {
  formatRelativeTime,
  formatHours,
  formatDuration,
  formatDateTime,
  formatDate,
  formatTime,
  isToday,
  isThisWeek,
};
