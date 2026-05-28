/**
 * config.test.ts
 *
 * config.ts evaluates all env vars at module load time, so each test must:
 *   1. vi.resetModules()  — clear the module cache for a fresh evaluation
 *   2. vi.stubEnv(...)    — set the value(s) under test
 *   3. dynamic import()   — trigger a fresh module evaluation
 *
 * Tests that verify fallback defaults explicitly delete the target key from
 * process.env and restore it in a finally block, making them safe even when
 * a real .env file is present on disk.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Load a fresh copy of config with specific env var overrides applied.
 * All other env vars remain as-is (or as dotenv loaded them).
 */
async function loadConfig(overrides: Record<string, string> = {}) {
  vi.resetModules();
  for (const [key, value] of Object.entries(overrides)) {
    vi.stubEnv(key, value);
  }
  const { config } = await import("./config");
  return config;
}

describe("config", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ── Valid values ──────────────────────────────────────────────────────────

  it("reads PORT as a number", async () => {
    const config = await loadConfig({ PORT: "8080" });
    expect(config.port).toBe(8080);
    expect(typeof config.port).toBe("number");
  });

  it("reads FETCH_TIMEOUT_MS as a number", async () => {
    const config = await loadConfig({ FETCH_TIMEOUT_MS: "5000" });
    expect(config.fetchTimeoutMs).toBe(5000);
  });

  it("reads PUPPETEER_TIMEOUT_MS as a number", async () => {
    const config = await loadConfig({ PUPPETEER_TIMEOUT_MS: "25000" });
    expect(config.puppeteerTimeoutMs).toBe(25000);
  });

  it("reads FRONTEND_ORIGIN as a string", async () => {
    const config = await loadConfig({
      FRONTEND_ORIGIN: "https://paper.example.com",
    });
    expect(config.frontendOrigin).toBe("https://paper.example.com");
  });

  it("reads LOG_LEVEL as a string", async () => {
    const config = await loadConfig({ LOG_LEVEL: "debug" });
    expect(config.logLevel).toBe("debug");
  });

  // ── Fallback defaults ─────────────────────────────────────────────────────

  it("falls back to port 3001 when PORT is absent", async () => {
    const saved = process.env["PORT"];
    delete process.env["PORT"];
    try {
      vi.resetModules();
      const { config } = await import("./config");
      expect(config.port).toBe(3001);
    } finally {
      if (saved !== undefined) process.env["PORT"] = saved;
    }
  });

  it("falls back to 10 000 ms for FETCH_TIMEOUT_MS when absent", async () => {
    const saved = process.env["FETCH_TIMEOUT_MS"];
    delete process.env["FETCH_TIMEOUT_MS"];
    try {
      vi.resetModules();
      const { config } = await import("./config");
      expect(config.fetchTimeoutMs).toBe(10_000);
    } finally {
      if (saved !== undefined) process.env["FETCH_TIMEOUT_MS"] = saved;
    }
  });

  // ── Invalid values ────────────────────────────────────────────────────────

  it.each([
    ["PORT", "not-a-number"],
    ["PORT", "0"],
    ["PORT", "-1"],
    ["FETCH_TIMEOUT_MS", "abc"],
    ["FETCH_TIMEOUT_MS", "0"],
    ["PUPPETEER_TIMEOUT_MS", "-5"],
  ])(
    "throws when %s = %j because it is not a positive integer",
    async (key, value) => {
      vi.resetModules();
      vi.stubEnv(key, value);
      await expect(import("./config")).rejects.toThrow(
        "must be a positive integer",
      );
    },
  );
});
