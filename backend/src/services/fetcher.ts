/**
 * fetcher.ts — Retrieves raw HTML from a URL.
 * Single responsibility: network I/O only. No parsing, no transformation.
 */

import { config } from "../config";
import { AppError } from "../errors";

/**
 * A minimal browser-like User-Agent string.
 * Many sites reject requests with no User-Agent or with obvious bot strings.
 */
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/124.0.0.0 Safari/537.36";

/**
 * Fetches the raw HTML string at the given URL.
 *
 * Uses `AbortController` to enforce `FETCH_TIMEOUT_MS`. Both network-level
 * failures (DNS, connection refused, timeout) and non-2xx HTTP responses are
 * surfaced as an `AppError` with code `FETCH_FAILED`.
 *
 * @param url - The fully-qualified URL to fetch.
 * @returns The response body as a UTF-8 string.
 * @throws {AppError} code `FETCH_FAILED` on any failure.
 */
export async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.fetchTimeoutMs);

  let response: Response;

  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });
  } catch (err) {
    // AbortError means we triggered the timeout; surface a clear message.
    const isTimeout = err instanceof Error && err.name === "AbortError";
    throw new AppError(
      "FETCH_FAILED",
      isTimeout
        ? `Request timed out after ${config.fetchTimeoutMs}ms fetching: ${url}`
        : `Network error fetching ${url}: ${err instanceof Error ? err.message : String(err)}`,
      err,
    );
  } finally {
    // Always clear the timer — even if fetch() threw — to avoid a leaked handle.
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new AppError(
      "FETCH_FAILED",
      `Server returned HTTP ${response.status} (${response.statusText}) for: ${url}`,
    );
  }

  return response.text();
}
