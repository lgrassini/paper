/**
 * errors.ts — Typed application error classes shared across all services.
 * Each code maps directly to the error taxonomy defined in the API contract.
 */

/** The three distinct failure modes in the conversion pipeline. */
export type AppErrorCode =
  | "FETCH_FAILED"
  | "EXTRACTION_FAILED"
  | "RENDER_FAILED";

/**
 * A domain error that carries a machine-readable code alongside a human-readable
 * message. Route handlers translate these into the appropriate HTTP responses.
 */
export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly cause: unknown;

  constructor(code: AppErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.cause = cause;
  }
}
