/*
* Funcionalidad: Security headers and CSP tests
* Descripción: config/csp.mjs (served by next.config.mjs headers()): the backend origin follows the same precedence as src/shared/lib/env.ts and is allowed for HTTP/SSE and its WebSocket twin; Google Identity Services, the video players, fonts with data:, inline styles and the optional media origin and report-uri are in the policy; scripts are only 'self' plus the GSI client in production and add 'unsafe-eval' in development; the policy is Report-Only by default and enforcing only with CSP_REPORT_ONLY=false; the fixed security headers are always present. Depends on vitest, config/csp.mjs and env.ts.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
  resolvePublicBackendOrigin,
  toWebSocketOrigin,
} from "../../../config/csp.mjs";
import type { CspEnv } from "../../../config/csp.mjs";
import { resolveBackendOrigin } from "./env";

function directive(policy: string, name: string): string[] {
  const entry = policy.split("; ").find((item) => item.startsWith(`${name} `));

  return entry ? entry.split(" ").slice(1) : [];
}

const PROD_ENV: CspEnv = { NEXT_PUBLIC_BACKEND_URL: "https://api.ventylab.test/" };

describe("resolvePublicBackendOrigin", () => {
  it.each<[string, CspEnv]>([
    ["public backend URL", { NEXT_PUBLIC_BACKEND_URL: "https://api.ventylab.test" }],
    ["legacy API URL without /api", { NEXT_PUBLIC_API_URL: "https://legacy.ventylab.test/api" }],
    ["default", {}],
  ])("matches the browser bundle origin (%s)", (_, env) => {
    const expected = resolveBackendOrigin({
      isServer: false,
      publicBackendUrl: env.NEXT_PUBLIC_BACKEND_URL,
      legacyApiUrl: env.NEXT_PUBLIC_API_URL,
    });

    expect(resolvePublicBackendOrigin(env)).toBe(expected);
  });

  it("maps http(s) to ws(s)", () => {
    expect(toWebSocketOrigin("https://api.ventylab.test")).toBe("wss://api.ventylab.test");
    expect(toWebSocketOrigin("http://localhost:4000")).toBe("ws://localhost:4000");
  });
});

describe("buildContentSecurityPolicy", () => {
  it("allows the backend for HTTP, SSE and Socket.io, plus Google Identity Services", () => {
    const policy = buildContentSecurityPolicy(PROD_ENV);

    expect(directive(policy, "connect-src")).toEqual([
      "'self'",
      "https://api.ventylab.test",
      "wss://api.ventylab.test",
      "https://accounts.google.com/gsi/",
    ]);
    expect(directive(policy, "frame-src")).toContain("https://accounts.google.com/gsi/");
    expect(directive(policy, "style-src")).toEqual(["'self'", "'unsafe-inline'", "https://accounts.google.com/gsi/style"]);
  });

  it("keeps scripts to self and the GSI client in production and adds unsafe-eval only in development", () => {
    expect(directive(buildContentSecurityPolicy(PROD_ENV), "script-src")).toEqual(["'self'", "https://accounts.google.com/gsi/client"]);
    expect(directive(buildContentSecurityPolicy(PROD_ENV, { isDev: true }), "script-src")).toContain("'unsafe-eval'");
    expect(buildContentSecurityPolicy(PROD_ENV)).not.toContain("'unsafe-eval'");
  });

  it("allows self-hosted fonts with data:, the video players and locks framing, objects and the base URI", () => {
    const policy = buildContentSecurityPolicy(PROD_ENV);

    expect(directive(policy, "font-src")).toEqual(["'self'", "data:"]);
    expect(directive(policy, "frame-src")).toEqual(expect.arrayContaining(["https://www.youtube-nocookie.com", "https://player.vimeo.com"]));
    expect(directive(policy, "frame-ancestors")).toEqual(["'none'"]);
    expect(directive(policy, "object-src")).toEqual(["'none'"]);
    expect(directive(policy, "base-uri")).toEqual(["'self'"]);
  });

  it("adds the media origin to images and video and an optional report-uri", () => {
    const policy = buildContentSecurityPolicy({
      ...PROD_ENV,
      NEXT_PUBLIC_MEDIA_ORIGIN: "https://media.supabase.test/storage/v1",
      CSP_REPORT_URI: "https://reports.ventylab.test/csp",
    });

    expect(directive(policy, "img-src")).toEqual(expect.arrayContaining(["data:", "blob:", "https://api.ventylab.test", "https://media.supabase.test"]));
    expect(directive(policy, "media-src")).toContain("https://media.supabase.test");
    expect(directive(policy, "report-uri")).toEqual(["https://reports.ventylab.test/csp"]);
  });

  it("ignores an invalid media origin and omits report-uri when unset", () => {
    const policy = buildContentSecurityPolicy({ ...PROD_ENV, NEXT_PUBLIC_MEDIA_ORIGIN: "not a url" });

    expect(policy).not.toContain("not a url");
    expect(directive(policy, "report-uri")).toEqual([]);
  });
});

describe("buildSecurityHeaders", () => {
  it("sends the policy as Report-Only by default", () => {
    const keys = buildSecurityHeaders(PROD_ENV).map((header) => header.key);

    expect(keys).toContain("Content-Security-Policy-Report-Only");
    expect(keys).not.toContain("Content-Security-Policy");
  });

  it("enforces the policy only with CSP_REPORT_ONLY=false", () => {
    expect(buildSecurityHeaders({ ...PROD_ENV, CSP_REPORT_ONLY: "false" }).map((header) => header.key)).toContain("Content-Security-Policy");
    expect(buildSecurityHeaders({ ...PROD_ENV, CSP_REPORT_ONLY: "true" }).map((header) => header.key)).toContain("Content-Security-Policy-Report-Only");
  });

  it("always sends the fixed security headers", () => {
    const headers = Object.fromEntries(buildSecurityHeaders(PROD_ENV).map((header) => [header.key, header.value]));

    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
  });
});
