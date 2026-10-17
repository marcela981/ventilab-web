/*
* Funcionalidad: session public API
* Descripción: Public surface of the backend session layer for new code: AuthProvider, useSession, the RequireAuth/RequireRole guards, the loading view, the route table helpers (login path, safe returnTo, default route per role) and the session entities. Legacy pages keep NextAuth; `pages/_app.js` imports auth-provider directly to keep the app shell small. v1.1 (T9 follow-up): exports the best-effort NextAuth coexistence bridge (runNextAuthBestEffort, signOutOfNextAuth) for the auth feature. v1.2: exports isPathAllowedForRole. v1.3 (O5 operation): exports RoleHomeRedirect (role-aware entry redirect).
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { AuthProvider } from "./auth-provider";
export { NEXTAUTH_BRIDGE_TIMEOUT_MS, runNextAuthBestEffort, signOutOfNextAuth } from "./nextauth-bridge";
export type { AuthProviderProps } from "./auth-provider";
export { RequireAuth } from "./require-auth";
export type { RequireAuthProps } from "./require-auth";
export { RequireRole } from "./require-role";
export type { RequireRoleProps } from "./require-role";
export { RoleHomeRedirect } from "./role-home-redirect";
export {
  buildLoginUrl,
  DEFAULT_ROUTE_BY_ROLE,
  findRoute,
  isPathAllowedForRole,
  LOGIN_PATH,
  resolvePostLoginRoute,
  RETURN_TO_PARAM,
  ROUTES,
  sanitizeReturnTo,
} from "./routes.config";
export type { RouteAccess, RouteConfig, RoutePath } from "./routes.config";
export { ROLES } from "./session.entity";
export type {
  MeResponse,
  Permission,
  Role,
  RoleChangedEvent,
  SessionStatus,
  SessionTokens,
  SessionUser,
} from "./session.entity";
export type { SessionContextValue } from "./session-context";
export { SessionLoading } from "./session-loading";
export { useSession } from "./use-session";
