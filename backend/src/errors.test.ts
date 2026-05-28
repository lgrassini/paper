import { describe, it, expect } from "vitest";
import { AppError } from "./errors";

describe("AppError", () => {
  it("is an instance of Error", () => {
    const err = new AppError("FETCH_FAILED", "something went wrong");
    expect(err).toBeInstanceOf(Error);
  });

  it("sets name to 'AppError'", () => {
    const err = new AppError("FETCH_FAILED", "msg");
    expect(err.name).toBe("AppError");
  });

  it("stores the error code", () => {
    expect(new AppError("FETCH_FAILED", "").code).toBe("FETCH_FAILED");
    expect(new AppError("EXTRACTION_FAILED", "").code).toBe(
      "EXTRACTION_FAILED",
    );
    expect(new AppError("RENDER_FAILED", "").code).toBe("RENDER_FAILED");
  });

  it("stores the message", () => {
    const err = new AppError("RENDER_FAILED", "puppeteer crashed");
    expect(err.message).toBe("puppeteer crashed");
  });

  it("stores the cause when provided", () => {
    const root = new Error("root cause");
    const err = new AppError("FETCH_FAILED", "wrapper", root);
    expect(err.cause).toBe(root);
  });

  it("leaves cause undefined when not provided", () => {
    const err = new AppError("FETCH_FAILED", "no cause");
    expect(err.cause).toBeUndefined();
  });
});
