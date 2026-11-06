import { describe, expect, it } from "vitest";
import { fitScreen, screenPoint } from "./screen-geometry";
describe("remote screen coordinates", () => {
  it("fits landscape screens without stretching pointer coordinates", () => {
    expect(fitScreen(1920, 1080, 960, 800)).toBe(0.5);
    expect(screenPoint(490, 290, 10, 20, 0.5)).toEqual({ x: 960, y: 540 });
  });
  it("fits tall screens within the available height", () => {
    expect(fitScreen(1000, 2000, 900, 600)).toBe(0.3);
    expect(screenPoint(160, 320, 10, 20, 0.3)).toEqual({ x: 500, y: 1000 });
  });
});