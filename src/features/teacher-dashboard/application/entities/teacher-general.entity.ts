/*
* Funcionalidad: Teacher general tab entities
* Descripción: Domain shapes and pure rules of the General tab of /teacher (DISENO_BLOQUE4 §2.2, julio §c.3): the greeting by time of day in America/Bogota (julio DashboardHero: before 12 h "Buenos días", before 19 h "Buenas tardes", otherwise "Buenas noches"), the long Bogotá date under it, the four platform statistic cards (key, title and destination), a recent student row and the progress tone of its bar (julio RecentActivityFeed: ≥ 70 success, ≥ 30 warning, otherwise error). Route strings of other features are local constants so the tab never imports their barrels. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const BOGOTA_TIME_ZONE = "America/Bogota";

// Destinations in other features: local strings, never their barrels (precedent: teacher-dashboard.routes.ts).
export const CONTENT_URL = "/content";
export const EVALUATIONS_URL = "/evaluations";
export const TEACHER_LAB_URL = "/teacher/lab";
export const ADMIN_USERS_URL = "/admin/users";

export const RECENT_STUDENTS_LIMIT = 5;

export type Greeting = "Buenos días" | "Buenas tardes" | "Buenas noches";

const hourFormatter = new Intl.DateTimeFormat("en-US", { timeZone: BOGOTA_TIME_ZONE, hour: "numeric", hourCycle: "h23" });

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: BOGOTA_TIME_ZONE,
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

/** Hour (0–23) of an instant in Bogotá. */
export function bogotaHour(now: Date): number {
  return Number(hourFormatter.format(now)) % 24;
}

export function greetingFor(now: Date): Greeting {
  const hour = bogotaHour(now);

  if (hour < 12) {
    return "Buenos días";
  }

  return hour < 19 ? "Buenas tardes" : "Buenas noches";
}

/** "lunes, 2 de noviembre de 2026" in Bogotá. */
export function formatBogotaLongDate(now: Date): string {
  return dateFormatter.format(now);
}

export type PlatformStatKey = "activeStudents" | "publishedModules" | "totalLessons" | "completionsToday";

export type PlatformStatCard = {
  key: PlatformStatKey
  title: string
  value: number
  href: string
};

export type ProgressTone = "success" | "warning" | "error";

export type RecentStudent = {
  id: string
  name: string
  /** 0–100, rounded down by the API. */
  progress: number
  canView: boolean
};

export function progressTone(progress: number): ProgressTone {
  if (progress >= 70) {
    return "success";
  }

  return progress >= 30 ? "warning" : "error";
}
