/**
 * config.ts — Single source of truth for all runtime configuration.
 * All environment variables are read and validated here; no other module
 * should access process.env directly.
 */

import "dotenv/config";

/** Read an env var, returning a fallback if absent. Throws if neither exists. */
function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/** Parse a positive integer env var; throws a descriptive error on bad input. */
function parsePositiveInt(raw: string, name: string): number {
  const n = parseInt(raw, 10);
  if (isNaN(n) || n <= 0) {
    throw new Error(`${name} must be a positive integer, got: "${raw}"`);
  }
  return n;
}

export const config = {
  port: parsePositiveInt(requireEnv("PORT", "3001"), "PORT"),
  frontendOrigin: requireEnv("FRONTEND_ORIGIN", "http://localhost:5173"),
  puppeteerTimeoutMs: parsePositiveInt(
    requireEnv("PUPPETEER_TIMEOUT_MS", "30000"),
    "PUPPETEER_TIMEOUT_MS",
  ),
  fetchTimeoutMs: parsePositiveInt(
    requireEnv("FETCH_TIMEOUT_MS", "10000"),
    "FETCH_TIMEOUT_MS",
  ),
  logLevel: requireEnv("LOG_LEVEL", "info") as
    | "debug"
    | "info"
    | "warn"
    | "error",
} as const;
