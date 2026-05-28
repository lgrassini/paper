/**
 * fetcher.test.ts
 *
 * fetchHtml() has three distinct failure modes:
 *   1. fetch() throws (network error, DNS failure, etc.)
 *   2. fetch() throws with name === 'AbortError' (timeout via AbortController)
 *   3. response.ok is false (4xx / 5xx from the target server)
 *
 * All three must surface as AppError with code FETCH_FAILED.
 * global.fetch is replaced with a vi.fn() in each test; real network is never hit.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../errors";
import { fetchHtml } from "./fetcher";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Stub global.fetch with a mock that resolves to a successful HTML response. */
function stubFetchSuccess(
  html = "<html><body>Hello</body></html>",
): ReturnType<typeof vi.fn> {
  const mock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    text: () => Promise.resolve(html),
  } as unknown as Response);
  vi.stubGlobal("fetch", mock);
  return mock;
}

/** Stub global.fetch with a mock that resolves to a non-2xx response. */
function stubFetchError(status: number, statusText: string): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      statusText,
      text: () => Promise.resolve(""),
    } as unknown as Response),
  );
}

/** Stub global.fetch with a mock that rejects with the given error. */
function stubFetchThrows(err: Error): void {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(err));
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("fetchHtml", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it("returns the response body as a string on success", async () => {
    stubFetchSuccess("<html><body>Article content</body></html>");
    const result = await fetchHtml("https://example.com/article");
    expect(result).toBe("<html><body>Article content</body></html>");
  });

  it("calls fetch with the provided URL", async () => {
    const mock = stubFetchSuccess();
    await fetchHtml("https://example.com/article");
    expect(mock).toHaveBeenCalledWith(
      "https://example.com/article",
      expect.any(Object),
    );
  });

  it("sends a User-Agent header", async () => {
    const mock = stubFetchSuccess();
    await fetchHtml("https://example.com/article");
    const [, init] = mock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["User-Agent"]).toMatch(
      /Mozilla/,
    );
  });

  it("passes an AbortSignal so the timeout can fire", async () => {
    const mock = stubFetchSuccess();
    await fetchHtml("https://example.com/article");
    const [, init] = mock.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  // ── Non-2xx responses ──────────────────────────────────────────────────────

  it.each([
    [404, "Not Found"],
    [429, "Too Many Requests"],
    [500, "Internal Server Error"],
    [503, "Service Unavailable"],
  ])(
    "throws AppError(FETCH_FAILED) for HTTP %i response",
    async (status, statusText) => {
      stubFetchError(status, statusText);
      await expect(fetchHtml("https://example.com")).rejects.toMatchObject({
        code: "FETCH_FAILED",
        message: expect.stringContaining(String(status)),
      });
    },
  );

  it("throws an AppError (not a plain Error) for non-2xx", async () => {
    stubFetchError(403, "Forbidden");
    const err = await fetchHtml("https://example.com").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppError);
  });

  // ── Network errors ─────────────────────────────────────────────────────────

  it("throws AppError(FETCH_FAILED) when fetch rejects with a network error", async () => {
    stubFetchThrows(new Error("getaddrinfo ENOTFOUND example.invalid"));
    await expect(fetchHtml("https://example.invalid")).rejects.toMatchObject({
      code: "FETCH_FAILED",
      message: expect.stringContaining("Network error"),
    });
  });

  it("attaches the original error as cause on network failure", async () => {
    const originalError = new Error("getaddrinfo ENOTFOUND");
    stubFetchThrows(originalError);
    const err = await fetchHtml("https://example.invalid").catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).cause).toBe(originalError);
  });

  // ── Timeout ────────────────────────────────────────────────────────────────

  it("throws AppError(FETCH_FAILED) with 'timed out' message when the request is aborted", async () => {
    vi.useFakeTimers();

    // Simulate a fetch that only rejects when the abort signal fires.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            const err = new Error("The operation was aborted.");
            err.name = "AbortError";
            reject(err);
          });
        });
      }),
    );

    const promise = fetchHtml("https://slow.example.com");

    // Attach the assertion handler BEFORE advancing time so the rejection is
    // never transiently "unhandled" (which would trigger a Node.js warning).
    const assertion = expect(promise).rejects.toMatchObject({
      code: "FETCH_FAILED",
      message: expect.stringContaining("timed out"),
    });

    // Advance past the default FETCH_TIMEOUT_MS (10 000 ms), then settle.
    await vi.advanceTimersByTimeAsync(11_000);
    await assertion;
  });

  it("includes the configured timeout duration in the timeout error message", async () => {
    vi.useFakeTimers();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            const err = new Error("The operation was aborted.");
            err.name = "AbortError";
            reject(err);
          });
        });
      }),
    );

    const promise = fetchHtml("https://slow.example.com");

    // Same handler-first pattern to avoid unhandled rejection warnings.
    const assertion = expect(promise).rejects.toMatchObject({
      message: expect.stringContaining("10000ms"),
    });

    await vi.advanceTimersByTimeAsync(11_000);
    await assertion;
  });
});
