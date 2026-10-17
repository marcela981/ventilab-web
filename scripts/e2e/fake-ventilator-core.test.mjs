/*
* Funcionalidad: Fake ventilator core tests
* Descripción: The fake ventilator never gets a default broker, parses its options (rate, stop, pause window, rejected parameters), produces frames the backend JSON decoder accepts with realistic breaths for its settings (volume control reaches the set tidal volume, the expiration is passive at PEEP, pressure control holds pressureLimit), and REFLECTS a backend JSON command (ieRatio "1:2" → 0.5) in its reported settings with an "applied" ACK, or keeps its settings and ACKs "rejected" when a --reject parameter changes. Depends on vitest and the fake ventilator core. v1.1 (T8 review fix W4): TEST topics by default; brokerRefusal refuses a remote broker without --allow-remote-test-broker and the backend .env broker without printing it. v1.3 (T8 review fix 3, S1): the local-host-alias cases match the env-file refusal (/backend \.env/), not /lab broker/, which the remote-broker refusal also contains.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  applyCommand,
  BACKEND_ENV_FILES,
  brokerRefusal,
  buildFrame,
  envBrokerUrls,
  createDeviceState,
  DEFAULT_COMMAND_TOPIC,
  DEFAULT_RATE_HZ,
  DEFAULT_TELEMETRY_TOPIC,
  isPublishing,
  lungSample,
  parseArgs,
} from "./fake-ventilator-core.mjs";

describe("brokerRefusal (T8 review W4)", () => {
  const LAB_ENV = "NODE_ENV=development\nMQTT_BROKER_URL=mqtt://user:secret@lab-broker.example.org:1883\n";

  it.each(["mqtt://localhost:1883", "mqtt://127.0.0.1:1883", "ws://[::1]:9001"])("accepts the local broker %s", (broker) => {
    expect(brokerRefusal({ broker, allowRemoteTestBroker: false }, null)).toBeNull();
  });

  it("refuses a remote broker unless --allow-remote-test-broker", () => {
    expect(brokerRefusal({ broker: "mqtt://test-broker.example.org:1883", allowRemoteTestBroker: false }, null)).toMatch(/--allow-remote-test-broker/);
    expect(brokerRefusal({ broker: "mqtt://test-broker.example.org:1883", allowRemoteTestBroker: true }, null)).toBeNull();
  });

  it("refuses the broker of the backend .env (same host and port), without printing its credentials", () => {
    const refusal = brokerRefusal({ broker: "mqtt://lab-broker.example.org:1883", allowRemoteTestBroker: true }, LAB_ENV);

    expect(refusal).toMatch(/MQTT_BROKER_URL/);
    expect(refusal).not.toMatch(/secret|user/);
    expect(brokerRefusal({ broker: "mqtt://localhost:1883", allowRemoteTestBroker: false }, "MQTT_URL='mqtt://localhost:1883'\n")).toMatch(/MQTT_URL/);
    expect(brokerRefusal({ broker: "mqtt://localhost:1884", allowRemoteTestBroker: false }, "MQTT_URL=mqtt://localhost:1883\n")).toBeNull();
  });

  it.each([
    ["mqtt://127.0.0.1:1883", "MQTT_URL=mqtt://localhost:1883\n"],
    ["mqtt://localhost:1883", "MQTT_URL=mqtt://127.0.0.1:1883\n"],
    ["mqtt://[::1]:1883", "MQTT_BROKER_URL=mqtt://localhost:1883\n"],
  ])("treats every local host name as the same machine: refuses %s against %s (T8 review fix 2, S6)", (broker, env) => {
    // T8 review fix 3 (S1): the remote-broker refusal also says "lab broker"; only the env-file refusal names the file.
    expect(brokerRefusal({ broker, allowRemoteTestBroker: false }, env)).toMatch(/backend \.env/);
  });

  it("compares the broker of every backend env file and names the file, never the value (S6)", () => {
    const refusal = brokerRefusal(
      { broker: "mqtt://localhost:1883", allowRemoteTestBroker: false },
      [
        { file: ".env", text: "MQTT_URL=mqtt://localhost:1999\n" },
        { file: ".env.local", text: "MQTT_BROKER_URL=mqtt://admin:pw@127.0.0.1:1883\n" },
      ],
    );

    expect(refusal).toMatch(/\.env\.local/);
    expect(refusal).toMatch(/MQTT_BROKER_URL/);
    expect(refusal).not.toMatch(/admin|pw/);
    expect(BACKEND_ENV_FILES).toEqual([".env", ".env.local", ".env.development"]);
  });

  it("refuses an unparsable broker url", () => {
    expect(brokerRefusal({ broker: "not a url", allowRemoteTestBroker: true }, null)).toMatch(/not a valid/);
  });

  it("reads the broker urls of a .env text, ignoring comments", () => {
    expect(envBrokerUrls("# MQTT_BROKER_URL=mqtt://old:1\nMQTT_BROKER_URL=\"mqtt://a:1\"\nexport MQTT_URL=mqtt://b:2\n")).toEqual([
      { name: "MQTT_BROKER_URL", url: "mqtt://a:1" },
      { name: "MQTT_URL", url: "mqtt://b:2" },
    ]);
  });
});

describe("parseArgs", () => {
  it("has no default broker and uses TEST topics by default (T8 review W4)", () => {
    const options = parseArgs([], {});

    expect(options.broker).toBeNull();
    expect(options.allowRemoteTestBroker).toBe(false);
    expect(options.telemetryTopic).toBe(DEFAULT_TELEMETRY_TOPIC);
    expect(options.commandTopic).toBe(DEFAULT_COMMAND_TOPIC);
    // The backend with NODE_ENV=test prefixes the command topic with MQTT_TEST_TOPIC_PREFIX (default test/ventylab).
    expect(DEFAULT_COMMAND_TOPIC).toBe("test/ventylab/ventilab/device/001/command");
    expect(DEFAULT_TELEMETRY_TOPIC).toBe("test/ventylab/ventynet/data");
    expect(parseArgs(["--allow-remote-test-broker"], {}).allowRemoteTestBroker).toBe(true);
    expect(options.ackTopic).toBeNull();
    expect(options.rateHz).toBe(DEFAULT_RATE_HZ);
  });

  it("reads the broker from the flag or the environment, and every option", () => {
    expect(parseArgs([], { FAKE_VENTILATOR_BROKER_URL: " mqtt://localhost:1883 " }).broker).toBe("mqtt://localhost:1883");

    const options = parseArgs(["--broker", "mqtt://test:1883", "--rate", "30", "--stop-after", "60", "--pause", "10:5", "--reject", "peep", "--reject", "mode", "--ack-topic", "test/ack"], {});

    expect(options).toMatchObject({ broker: "mqtt://test:1883", rateHz: 30, stopAfterS: 60, pause: { afterS: 10, forS: 5 }, ackTopic: "test/ack" });
    expect([...options.reject]).toEqual(["peep", "mode"]);
    expect(parseArgs(["--pause", "10"], {}).pause).toEqual({ afterS: 10, forS: null });
  });

  it("rejects unknown options, missing values and unknown parameters", () => {
    expect(() => parseArgs(["--nope"], {})).toThrow(/unknown option/);
    expect(() => parseArgs(["--broker"], {})).toThrow(/needs a value/);
    expect(() => parseArgs(["--rate", "0"], {})).toThrow(/positive/);
    expect(() => parseArgs(["--reject", "pressure"], {})).toThrow(/--reject expects/);
  });

  it("pauses inside the --pause window only", () => {
    const pause = { afterS: 10, forS: 5 };

    expect(isPublishing(null, 100)).toBe(true);
    expect(isPublishing(pause, 9.9)).toBe(true);
    expect(isPublishing(pause, 12)).toBe(false);
    expect(isPublishing(pause, 15)).toBe(true);
    expect(isPublishing({ afterS: 10, forS: null }, 1_000)).toBe(false);
  });
});

describe("frames", () => {
  it("builds a frame the backend JSON decoder accepts", () => {
    const frame = buildFrame(createDeviceState(), 7, 0.5, 1_760_000_000_000, "fake");

    expect(frame).toMatchObject({ seq: 7, deviceTs: 1_760_000_000_000, mode: "VCV", deviceId: "fake" });
    expect(Number.isFinite(frame.pressure) && Number.isFinite(frame.flow) && Number.isFinite(frame.volume)).toBe(true);
    expect(Object.values(frame.settings).every(Number.isFinite)).toBe(true);
  });

  it("delivers the set tidal volume in VCV and returns to PEEP in a passive expiration", () => {
    const settings = { tidalVolume: 500, respiratoryRate: 15, peep: 5, fio2: 0.4, inspiratoryTime: 1 };
    const endInspiration = lungSample("VCV", settings, 0.999);
    const lateExpiration = lungSample("VCV", settings, 3.9);

    expect(endInspiration.volume).toBeGreaterThan(495);
    expect(endInspiration.flow).toBeCloseTo(30, 0);
    expect(lateExpiration.pressure).toBeCloseTo(5, 1);
    expect(lateExpiration.flow).toBeLessThan(0);
  });

  it("holds the absolute pressure limit during a PCV inspiration", () => {
    expect(lungSample("PCV", { pressureLimit: 20, respiratoryRate: 15, peep: 5, inspiratoryTime: 1 }, 0.5).pressure).toBe(20);
  });
});

describe("applyCommand", () => {
  const command = (body) => JSON.stringify({ correlationId: "c1", ...body });

  it("reflects the received settings in the next frames and ACKs applied", () => {
    const result = applyCommand(createDeviceState(), command({ mode: "SIMV", tidalVolume: 400, respiratoryRate: 12, peep: 6, fio2: 0.5, ieRatio: "1:2" }));

    expect(result.ack).toEqual({ commandId: "c1", status: "applied" });
    expect(result.state).toEqual({ mode: "SIMV", settings: { tidalVolume: 400, respiratoryRate: 12, peep: 6, fio2: 0.5, ieRatio: 0.5 } });
    expect(buildFrame(result.state, 0, 0, 0, "fake").settings).toEqual(result.state.settings);
  });

  it("keeps its settings and ACKs rejected when a --reject parameter changes", () => {
    const state = createDeviceState();
    const rejected = applyCommand(state, command({ mode: "VCV", tidalVolume: 450, respiratoryRate: 14, peep: 8, fio2: 0.4 }), new Set(["peep"]));
    const unchanged = applyCommand(state, command({ mode: "VCV", tidalVolume: 450, respiratoryRate: 14, peep: 5, fio2: 0.6 }), new Set(["peep"]));

    expect(rejected.state).toBe(state);
    expect(rejected.ack).toEqual({ commandId: "c1", status: "rejected", reason: "fake_reject_peep" });
    expect(unchanged.ack?.status).toBe("applied");
  });

  it("rejects invalid payloads without changing", () => {
    const state = createDeviceState();

    expect(applyCommand(state, "not json")).toEqual({ state, ack: null, error: "invalid_json" });
    expect(applyCommand(state, command({ mode: "CPAP" })).ack?.status).toBe("rejected");
    expect(applyCommand(state, command({ mode: "VCV", peep: "x" })).state).toBe(state);
  });
});
