import { describe, it, expect } from "vitest";
import { validateImageBytes, MAX_PHOTO_BYTES } from "../src/avatar/validation";
describe("photo validation", () => {
  it("accepts JPEG, PNG, and WebP magic bytes", () => {
    expect(() =>
      validateImageBytes(new Uint8Array([255, 216, 255]), 100),
    ).not.toThrow();
    expect(() =>
      validateImageBytes(
        new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
        100,
      ),
    ).not.toThrow();
    expect(() =>
      validateImageBytes(new TextEncoder().encode("RIFF0000WEBP"), 100),
    ).not.toThrow();
  });
  it("rejects renamed executable and SVG input", () => {
    expect(() =>
      validateImageBytes(new TextEncoder().encode("<svg onload="), 100),
    ).toThrow("real JPEG");
    expect(() =>
      validateImageBytes(new TextEncoder().encode("MZ executable"), 100),
    ).toThrow("real JPEG");
  });
  it("rejects oversized and empty input", () => {
    expect(() =>
      validateImageBytes(new Uint8Array([255, 216, 255]), MAX_PHOTO_BYTES + 1),
    ).toThrow("10 MB");
    expect(() => validateImageBytes(new Uint8Array(), 0)).toThrow("10 MB");
  });
});
