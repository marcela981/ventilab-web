/*
* Funcionalidad: Browser error reporting tests
* Descripción: Without a DSN startErrorReporting loads nothing; with a DSN it loads the Sentry client once and passes the DSN and environment; a failed load resolves false. scrubText/scrubEvent remove e-mails, JWTs, Bearer credentials, sensitive query parameters, the user (except its id) and the request cookies, headers and body. readPublicEnv reads the trimmed DSN. Depends on vitest and the observability and env modules.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readPublicEnv } from "../env";
import { REDACTED, scrubEvent, scrubText } from "./scrub-event";
import { resetErrorReportingForTests, startErrorReporting } from "./start-error-reporting";

const DSN = "https://public@o1.ingest.sentry.test/42";

beforeEach(() => {
  resetErrorReportingForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("startErrorReporting", () => {
  it("loads nothing without a DSN", async() => {
    const load = vi.fn();

    await expect(startErrorReporting({ env: { sentryDsn: "", environment: "production" }, load })).resolves.toBe(false);
    expect(load).not.toHaveBeenCalled();
  });

  it("loads and initializes the Sentry client once with the DSN", async() => {
    const initSentryClient = vi.fn();
    const load = vi.fn(() => Promise.resolve({ initSentryClient }));
    const env = { sentryDsn: DSN, environment: "production" };

    await expect(startErrorReporting({ env, load })).resolves.toBe(true);
    await expect(startErrorReporting({ env, load })).resolves.toBe(true);

    expect(load).toHaveBeenCalledTimes(1);
    expect(initSentryClient).toHaveBeenCalledWith({ dsn: DSN, environment: "production" });
  });

  it("resolves false when the client chunk cannot be loaded", async() => {
    const load = vi.fn(() => Promise.reject(new Error("chunk failed")));

    await expect(startErrorReporting({ env: { sentryDsn: DSN, environment: "production" }, load })).resolves.toBe(false);
  });
});

describe("readPublicEnv", () => {
  it("returns an empty DSN when the variable is unset and trims it otherwise", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    expect(readPublicEnv().sentryDsn).toBe("");

    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", `  ${DSN} `);
    expect(readPublicEnv().sentryDsn).toBe(DSN);
  });
});

describe("scrubText", () => {
  it("removes e-mails, JWTs, Bearer credentials and sensitive query parameters", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1MSJ9.c2lnbmF0dXJl";
    const text = `ana@correo.edu.co failed with Bearer abc.def ${jwt} at /auth/login?returnTo=/me&token=secret&code=123`;
    const scrubbed = scrubText(text);

    expect(scrubbed).not.toMatch(/ana@correo|abc\.def|eyJ|secret|123/);
    expect(scrubbed).toContain(`Bearer ${REDACTED}`);
    expect(scrubbed).toContain("returnTo=/me");
  });
});

describe("scrubEvent", () => {
  it("keeps only the user id, drops request cookies, headers and body and scrubs nested strings", () => {
    const event = {
      message: "Login failed for ana@correo.edu.co",
      user: { id: "u1", email: "ana@correo.edu.co", ip_address: "203.0.113.10" },
      request: { url: "https://app.test/auth/login?token=abc", cookies: { session: "x" }, headers: { Authorization: "Bearer t" }, data: { password: "p" } },
      breadcrumbs: [{ message: "GET /api/users?email=ana@correo.edu.co" }],
    };
    const scrubbed = scrubEvent(event);

    expect(scrubbed.user).toEqual({ id: "u1" });
    expect(scrubbed.request).toEqual({ url: `https://app.test/auth/login?token=${REDACTED}` });
    expect(JSON.stringify(scrubbed)).not.toContain("ana@correo.edu.co");
    expect(scrubbed.message).toBe(`Login failed for ${REDACTED}`);
  });
});
