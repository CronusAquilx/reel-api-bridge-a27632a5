import { describe, expect, it } from "vitest";
import { nextCaptureDelay } from "./screen-share";

describe("adaptive screen capture", () => {
  it("keeps a clear-picture cadence when capture is cheap", () => {
    expect(nextCaptureDelay(40)).toBe(2200);
  });

  it("backs off when a capture would make the target lag", () => {
    expect(nextCaptureDelay(500)).toBe(6000);
    expect(nextCaptureDelay(2000)).toBe(8000);
  });

  it("uses a safe delay for invalid timing information", () => {
    expect(nextCaptureDelay(Number.NaN)).toBe(6000);
    expect(nextCaptureDelay(-1)).toBe(6000);
  });
});
