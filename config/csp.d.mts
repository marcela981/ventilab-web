/*
* Funcionalidad: Security headers types
* Descripción: Type declaration of config/csp.mjs so strict TypeScript tests can import the CSP and security header builders (the strict project does not allow JavaScript). The environment is a plain record of the variables the builder reads. v1.1 (B5): sentryIngestOrigin.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type CspEnv = Readonly<Record<string, string | undefined>>;

export type CspOptions = {
  isDev?: boolean
};

export type SecurityHeader = {
  key: string
  value: string
};

export declare const DEFAULT_BACKEND_ORIGIN: string;
export declare const PERMISSIONS_POLICY: string;
export declare function toOrigin(value: unknown): string | null;
export declare function resolvePublicBackendOrigin(env: CspEnv): string;
export declare function toWebSocketOrigin(origin: string): string;
export declare function sentryIngestOrigin(dsn: unknown): string | null;
export declare function isReportOnly(env: CspEnv): boolean;
export declare function buildContentSecurityPolicy(env: CspEnv, options?: CspOptions): string;
export declare function buildSecurityHeaders(env: CspEnv, options?: CspOptions): SecurityHeader[];
